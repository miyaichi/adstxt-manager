import { Request, Response } from 'express';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import AdsTxtRecordModel from '../models/AdsTxtRecord';
import RequestModel from '../models/Request';
import { crossCheckAdsTxtRecords, optimizeAdsTxt, parseAdsTxtContent } from '../utils/validation';

// Import the shared fetch function for sellers.json data
import { fetchSellersJsonWithCache } from '../controllers/sellersJsonController';
import { createLogger } from '../utils/logger';

// Create logger for AdsTxt optimization
const logger = createLogger('AdsTxtOptimizer');

/**
 * Update the status of an Ads.txt record
 * @route PATCH /api/adstxt/:id/status
 */
/**
 * Optimize the ads.txt content to remove duplicates and standardize format
 * @route POST /api/adstxt/optimize
 */
export const optimizeAdsTxtContent = asyncHandler(async (req: Request, res: Response) => {
  const { content, publisher_domain, level } = req.body;

  if (!content) {
    throw new ApiError(400, 'Ads.txt content is required', 'errors:missingFields.adsTxtContent');
  }

  try {
    // Check the content length - allow large files but set a limit
    if (content.length > 5000000) {
      // Refuse files larger than 5MB
      throw new ApiError(400, 'File too large (max 5MB)', 'errors:fileTooLarge');
    }

    logger.info(
      `Optimizing ads.txt content with length: ${content.length} characters at level: ${level || 'level1'}`
    );

    // Process the content to remove duplicates and standardize format
    let optimizedContent = optimizeAdsTxt(content, publisher_domain);

    // レベル1の場合は基本的な最適化のみ行う
    if (!level || level === 'level1') {
      logger.info(
        `Level 1 optimization complete. Result length: ${optimizedContent.length} characters`
      );
      // 結果を返す
      return res.status(200).json({
        success: true,
        data: {
          optimized_content: optimizedContent,
          original_length: content.length,
          optimized_length: optimizedContent.length,
          optimization_level: 'level1',
        },
      });
    }

    // レベル2の場合はセラーズJSON連携による補完と詳細分類を行う
    if (level === 'level2') {
      // 1. 最適化されたコンテンツを解析
      const parsedEntries = parseAdsTxtContent(optimizedContent, publisher_domain);

      // 2. レコードエントリのみを処理
      const recordEntries = parsedEntries.filter(
        (entry) => 'domain' in entry && 'account_id' in entry && 'relationship' in entry
      );

      // 3. ドメインを抽出し、sellers.json を並列取得
      const SellersJsonCacheModel = (await import('../models/SellersJsonCache')).default;
      const domainSellersJsonCache: Map<string, any> = new Map();

      // レコードからユニークなドメインを抽出
      const uniqueDomains = new Set<string>();
      for (const record of recordEntries) {
        if ('domain' in record && record.domain) {
          uniqueDomains.add(record.domain);
        }
      }

      logger.info(`Found ${uniqueDomains.size} unique domains for sellers.json lookup`);

      // 並列処理の最大値をコントロールする関数
      async function fetchWithConcurrencyLimit<T, R>(
        items: T[],
        fetchFn: (item: T) => Promise<R>,
        concurrencyLimit: number
      ): Promise<R[]> {
        const results: R[] = [];
        const chunks: T[][] = [];

        // itemsを指定した並列数のチャンクに分割
        for (let i = 0; i < items.length; i += concurrencyLimit) {
          chunks.push(items.slice(i, i + concurrencyLimit));
        }

        // チャンク単位で処理を実行（チャンク内は並列、チャンク間は逐次）
        for (const chunk of chunks) {
          const chunkPromises = chunk.map((item) => fetchFn(item));
          const chunkResults = await Promise.all(chunkPromises);
          results.push(...chunkResults);

          // オプション: チャンク間に短い遅延を入れることでサーバー負荷をさらに分散
          if (chunks.length > 1) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }

        return results;
      }

      // 並列実行の最大値を固定値で設定
      const MAX_CONCURRENT_FETCHES = 10; // 同時に処理するsellers.json取得の最大数
      logger.info(`Using concurrency limit of ${MAX_CONCURRENT_FETCHES} for sellers.json fetches`);

      // 各ドメインのsellers.json取得処理の関数 - メモリ効率化版
      const fetchSellersJson = async (domain: string) => {
        try {
          logger.debug(`Looking up sellers.json for domain (memory-optimized): ${domain}`);

          // メモリ最適化：最初にメタデータだけを取得
          // これにより全体のsellers.jsonデータをメモリに読み込まずに情報を取得
          const SellersJsonCacheModel = (await import('../models/SellersJsonCache')).default;

          // メタデータとseller typeの統計情報だけを取得
          const metadataSummary =
            await SellersJsonCacheModel.getMetadataAndSummarizedSellers(domain);

          if (metadataSummary) {
            // キャッシュの情報を確認して適切に処理
            const status = metadataSummary.domainInfo.status;
            const isCacheMiss = metadataSummary.isCacheMiss;

            // キャッシュデータをメモリに保持 (not_found や error でも保存)
            domainSellersJsonCache.set(domain, {
              // 完全なsellers配列の代わりに必要な情報だけ保持
              __metadata: metadataSummary.metadata,
              __summary: metadataSummary.sellersSummary,
              __domainInfo: metadataSummary.domainInfo,
              __status: status,
            });

            if (status === 'success') {
              // 成功したデータの場合
              logger.debug(
                `Found memory-optimized sellers.json data for ${domain} (status: ${status}, updated: ${metadataSummary.domainInfo.updated_at})`
              );
              logger.debug(
                `Seller counts: ${metadataSummary.metadata.seller_count} total, ${metadataSummary.sellersSummary.confidentialCount} confidential`
              );

              return {
                domain,
                success: true,
                fromCache: true,
                memoryOptimized: true,
                status: 'success',
              };
            } else {
              // not_found や error の場合でも、キャッシュミスでなければ再取得しない
              if (!isCacheMiss) {
                logger.debug(
                  `Using existing cache with status '${status}' for ${domain} (updated: ${metadataSummary.domainInfo.updated_at})`
                );

                return {
                  domain,
                  success: true,
                  fromCache: true,
                  status: status,
                };
              }
            }
          }

          // キャッシュミスの場合のみ従来の方法で取得を試みる
          logger.debug(`Cache miss for ${domain}, falling back to regular method`);
          const { sellersJsonData: fetchedData, cacheInfo } = await fetchSellersJsonWithCache(
            domain,
            false // forceRefreshはfalseのまま（期限切れの場合のみ取得）
          );

          if (fetchedData) {
            domainSellersJsonCache.set(domain, fetchedData);
            logger.debug(
              `Found sellers.json data for ${domain} in cache (status: ${cacheInfo.status}, updated: ${cacheInfo.updatedAt})`
            );
          } else {
            logger.debug(
              `No valid sellers.json data available for ${domain} (status: ${cacheInfo.status})`
            );
          }

          return { domain, success: true, fromCache: cacheInfo.isCached };
        } catch (error) {
          logger.error(`Error retrieving sellers.json for ${domain}:`, error);
          return { domain, success: false, error };
        }
      };

      // 統計情報とデバッグ用の収集オブジェクト
      const stats = {
        uniqueDomains: uniqueDomains.size,
        uniqueAccountIds: 0,
        processingStart: Date.now(),
        cacheHits: 0,
        cacheMisses: 0,
        memoryOptimized: 0,
        failedRequests: 0,
        statusCounts: {
          success: 0,
          not_found: 0,
          error: 0,
          invalid_format: 0,
          pending: 0,
          unknown: 0
        },
        inProgressFetches: new Map<string, Promise<any>>(), // 実行中のfetchを追跡
      };

      // ステップ1: まずaccountIdの一覧を取得（重複を除く）
      // メモリ効率のためには、あとでSeller ID別の検索を最適化するために必要
      const uniqueAccountIds = new Set<string>();
      for (const record of recordEntries) {
        if ('account_id' in record && record.account_id) {
          uniqueAccountIds.add(record.account_id.toString().toLowerCase());
        }
      }
      stats.uniqueAccountIds = uniqueAccountIds.size;

      // ログレベルはdebugに設定
      logger.debug(`Found ${stats.uniqueAccountIds} unique account IDs in ads.txt records`);

      // 並列フェッチを効率化するカスタム関数（実行中のPromiseを再利用）
      const optimizedFetchWithCache = async (domain: string) => {
        // 正規化したドメイン名
        const normalizedDomain = domain.toLowerCase();

        // すでに実行中のリクエストがあれば再利用
        if (stats.inProgressFetches.has(normalizedDomain)) {
          logger.debug(`Reusing in-progress fetch for ${normalizedDomain}`);
          return stats.inProgressFetches.get(normalizedDomain);
        }

        // 新しいfetchを作成して追跡
        const fetchPromise = fetchSellersJson(domain).then((result) => {
          // 完了したらマップから削除
          stats.inProgressFetches.delete(normalizedDomain);

          // 統計情報を更新
          if (result.success) {
            if (result.fromCache) {
              stats.cacheHits++;
              if (result.status) {
                stats.statusCounts[result.status]++;
              } else {
                // ステータスが未定義の場合は未知として集計
                stats.statusCounts.unknown++;
              }
            } else {
              stats.cacheMisses++;
              if (result.status) {
                stats.statusCounts[result.status]++;
              }
            }

            if (result.memoryOptimized) {
              stats.memoryOptimized++;
            }
          } else {
            // 取得に失敗した場合
            stats.failedRequests++;
            stats.statusCounts.error++;
          }

          return result;
        });

        // マップに追加
        stats.inProgressFetches.set(normalizedDomain, fetchPromise);
        return fetchPromise;
      };

      // ステップ2: ドメインごとに並列処理を制限してsellers.jsonのメタデータ取得
      logger.debug(
        `Starting memory-optimized sellers.json lookup with concurrency limit of ${MAX_CONCURRENT_FETCHES}`
      );

      const fetchResults = await fetchWithConcurrencyLimit(
        Array.from(uniqueDomains),
        optimizedFetchWithCache, // 最適化されたフェッチ関数を使用
        MAX_CONCURRENT_FETCHES
      );

      // 処理完了時間を記録
      const processingTimeMs = Date.now() - stats.processingStart;

      // 結果サマリーをログに出力
      logger.info(
        `
------- Sellers.json Processing Summary -------
Timing: ${(processingTimeMs / 1000).toFixed(2)}s (${processingTimeMs}ms)
Domains: ${stats.uniqueDomains} unique domains processed
Results: ${fetchResults.length} total lookups
  - ${stats.cacheHits} cache hits (${Math.round((stats.cacheHits / fetchResults.length) * 100)}%)
  - ${stats.cacheMisses} cache misses (${Math.round((stats.cacheMisses / fetchResults.length) * 100)}%)
  - ${stats.failedRequests} failed requests (${Math.round((stats.failedRequests / fetchResults.length) * 100)}%)
Cache Status Distribution:
  - success: ${stats.statusCounts.success}
  - not_found: ${stats.statusCounts.not_found}
  - error: ${stats.statusCounts.error}
  - invalid_format: ${stats.statusCounts.invalid_format}
  - pending: ${stats.statusCounts.pending}
  - unknown: ${stats.statusCounts.unknown}
Memory optimization: ${stats.memoryOptimized} domains processed with metadata-only approach
Memory savings estimate: ~${Math.round(stats.memoryOptimized * 2.5)}MB (assuming avg 2.5MB per full sellers.json)
Processing rate: ${Math.round(fetchResults.length / (processingTimeMs / 1000))} domains/second
Verification: Hits(${stats.cacheHits}) + Misses(${stats.cacheMisses}) + Failed(${stats.failedRequests}) = ${stats.cacheHits + stats.cacheMisses + stats.failedRequests}/${fetchResults.length}
----------------------------------------------
      `.trim()
      );

      // ステップ3: 後で必要な場合のみ、特定のaccount_idに関するsellersデータのみ取得する準備

      // ステップ3: 後で必要な場合のみ、特定のaccount_idに関するsellersデータのみ取得する準備

      // 処理フロー整理：
      // 1. レベル２オプティマイズでは、ads.txtに記載されているすべてのドメインのsellers.jsonの取得を試みる
      // 2. sellers_json_cacheにstatusにかかわらず、レコードがあり有効期限が切れていなければ、その情報をそのまま使う
      // 3. レコードがない、有効期限が切れているいずれかの場合は、新しくsellers.jsonを取得する

      // 4. レコードを分類とレコードの拡張
      // 分類1: その他
      const otherRecords: any[] = [];
      // 分類2: sellerレコードがis_confidential = 1 のもの
      const confidentialRecords: any[] = [];
      // 分類3: sellers.jsonに記載のないもの
      const missingSellerIdRecords: any[] = [];
      // 分類4: sellers.jsonが提供されていない広告システムのもの
      const noSellerJsonRecords: any[] = [];

      // 各レコードを拡張して分類する - メモリ最適化版
      const enhancedRecords = await Promise.all(
        recordEntries.map(async (record, index) => {
          if (!('domain' in record)) return { record, category: 'other' };

          const domain = record.domain;
          const accountId = record.account_id;
          const sellersJsonData = domainSellersJsonCache.get(domain);

          // Certification Authority ID を探す (同じドメインの他のエントリから)
          let foundCertId: string | null = null;

          for (const otherRecord of recordEntries) {
            if (
              'domain' in otherRecord &&
              otherRecord.domain === domain &&
              otherRecord.certification_authority_id
            ) {
              foundCertId = otherRecord.certification_authority_id || null;
              break;
            }
          }

          // 分類4: sellers.jsonが提供されていない広告システム
          if (!sellersJsonData) {
            const enhancedRecord = { ...record };
            if (foundCertId) enhancedRecord.certification_authority_id = foundCertId;
            return { record: enhancedRecord, category: 'noSellerJson' };
          }

          // メモリ最適化されたデータの場合の処理 (メタデータのみ保持)
          if (sellersJsonData.__metadata && sellersJsonData.__summary) {
            // メモリ使用量削減のため、このレコードに必要な特定のseller情報のみを取得
            try {
              const SellersJsonCacheModel = (await import('../models/SellersJsonCache')).default;
              const specificSeller = await SellersJsonCacheModel.getSpecificSellers(
                domain.toLowerCase(),
                [accountId.toString()]
              );

              const enhancedRecord = { ...record };
              if (foundCertId) enhancedRecord.certification_authority_id = foundCertId;

              // 特定のsellerが見つかったかどうかで分類
              if (
                specificSeller &&
                specificSeller.matchingSellers &&
                specificSeller.matchingSellers.length > 0
              ) {
                const seller = specificSeller.matchingSellers[0];

                // 機密フラグをチェック (booleanとnumber型の両方に対応)
                if (
                  seller.is_confidential === true ||
                  (typeof seller.is_confidential === 'number' && seller.is_confidential === 1)
                ) {
                  return { record: enhancedRecord, category: 'confidential' };
                }

                // 通常のレコード
                return { record: enhancedRecord, category: 'other' };
              } else {
                // マッチするsellerが見つからない
                return { record: enhancedRecord, category: 'missingSellerId' };
              }
            } catch (error) {
              logger.error(
                `Error fetching specific seller data for ${domain}/${accountId}:`,
                error
              );
              // エラーが発生した場合は非SellersJson扱いにする
              const enhancedRecord = { ...record };
              if (foundCertId) enhancedRecord.certification_authority_id = foundCertId;
              return { record: enhancedRecord, category: 'noSellerJson' };
            }
          }

          // 従来の処理 (完全なsellers配列がある場合)
          if (!Array.isArray(sellersJsonData.sellers)) {
            const enhancedRecord = { ...record };
            if (foundCertId) enhancedRecord.certification_authority_id = foundCertId;
            return { record: enhancedRecord, category: 'noSellerJson' };
          }

          // 売り手IDが存在するか確認
          const matchingSeller = sellersJsonData.sellers.find(
            (seller: any) => seller.seller_id && seller.seller_id.toString() === accountId
          );

          // 分類3: sellers.jsonに記載のないもの
          if (!matchingSeller) {
            const enhancedRecord = { ...record };
            if (foundCertId) enhancedRecord.certification_authority_id = foundCertId;
            return { record: enhancedRecord, category: 'missingSellerId' };
          }

          // 分類2: sellerレコードがis_confidential = 1 のもの
          if (matchingSeller.is_confidential === 1) {
            const enhancedRecord = { ...record };
            if (foundCertId) enhancedRecord.certification_authority_id = foundCertId;
            return { record: enhancedRecord, category: 'confidential' };
          }

          // 売り手IDが存在し、非機密なら、TAG-ID を探す
          let certId = foundCertId;

          if (
            !certId &&
            sellersJsonData.identifiers &&
            Array.isArray(sellersJsonData.identifiers)
          ) {
            const tagIdEntry = sellersJsonData.identifiers.find(
              (id: any) => id.name && id.name.toLowerCase().includes('tag-id')
            );

            if (tagIdEntry && tagIdEntry.value) {
              certId = tagIdEntry.value;
            }
          }

          // 分類1: その他 (条件を満たすすべてのレコード)
          const enhancedRecord = { ...record };
          if (certId) enhancedRecord.certification_authority_id = certId;
          return { record: enhancedRecord, category: 'other' };
        })
      );

      // 分類ごとにレコードを整理
      enhancedRecords.forEach(({ record, category }) => {
        switch (category) {
          case 'confidential':
            confidentialRecords.push(record);
            break;
          case 'missingSellerId':
            missingSellerIdRecords.push(record);
            break;
          case 'noSellerJson':
            noSellerJsonRecords.push(record);
            break;
          default:
            otherRecords.push(record);
            break;
        }
      });

      // 各分類内でレコードを整理 (ドメイン→リレーションシップでソート)
      const sortRecords = (records: any[]) => {
        return records.sort((a, b) => {
          // まずドメインでソート
          const domainComparison = a.domain.localeCompare(b.domain);
          if (domainComparison !== 0) return domainComparison;

          // 同じドメインならDIRECTを先に
          if (a.relationship === 'DIRECT' && b.relationship === 'RESELLER') return -1;
          if (a.relationship === 'RESELLER' && b.relationship === 'DIRECT') return 1;

          // 最後にアカウントIDでソート
          return a.account_id.localeCompare(b.account_id);
        });
      };

      // すべての分類でレコードをソート
      const sortedOtherRecords = sortRecords(otherRecords);
      const sortedConfidentialRecords = sortRecords(confidentialRecords);
      const sortedMissingSellerIdRecords = sortRecords(missingSellerIdRecords);
      const sortedNoSellerJsonRecords = sortRecords(noSellerJsonRecords);

      // 5. 新しい最適化されたコンテンツを作成
      // 変数と余分な行を取得
      const variableEntries = parsedEntries.filter((entry) => 'variable_type' in entry);

      // 最終的なコンテンツを構築
      let enhancedContent = '';

      // 変数セクションを先に追加
      if (variableEntries.length > 0) {
        const variablesByType = variableEntries.reduce((acc: any, entry: any) => {
          const type = entry.variable_type;
          if (!acc[type]) acc[type] = [];
          acc[type].push(entry);
          return acc;
        }, {});

        Object.keys(variablesByType)
          .sort()
          .forEach((type) => {
            enhancedContent += `# ${type} Variables\n`;
            variablesByType[type].forEach((variable: any) => {
              enhancedContent += `${variable.variable_type}=${variable.value}\n`;
            });
            enhancedContent += '\n';
          });
      }

      // 他のセクションに適切なヘッダーとコンテンツを追加
      enhancedContent += '# Advertising System Records\n';

      // 分類1: その他
      sortedOtherRecords.forEach((record) => {
        let line = `${record.domain}, ${record.account_id}, ${record.relationship}`;
        if (record.certification_authority_id) {
          line += `, ${record.certification_authority_id}`;
        }
        enhancedContent += line + '\n';
      });

      // 分類2: 機密性のあるレコード
      if (sortedConfidentialRecords.length > 0) {
        enhancedContent += '\n# Confidential Sellers\n';
        sortedConfidentialRecords.forEach((record) => {
          let line = `${record.domain}, ${record.account_id}, ${record.relationship}`;
          if (record.certification_authority_id) {
            line += `, ${record.certification_authority_id}`;
          }
          enhancedContent += line + '\n';
        });
      }

      // 分類3: sellers.jsonに記載のないレコード
      if (sortedMissingSellerIdRecords.length > 0) {
        enhancedContent += '\n# Records Not Found in Sellers.json\n';
        sortedMissingSellerIdRecords.forEach((record) => {
          let line = `${record.domain}, ${record.account_id}, ${record.relationship}`;
          if (record.certification_authority_id) {
            line += `, ${record.certification_authority_id}`;
          }
          enhancedContent += line + '\n';
        });
      }

      // 分類4: sellers.jsonが提供されていない広告システム
      if (sortedNoSellerJsonRecords.length > 0) {
        enhancedContent += '\n# Systems Without Sellers.json\n';
        sortedNoSellerJsonRecords.forEach((record) => {
          let line = `${record.domain}, ${record.account_id}, ${record.relationship}`;
          if (record.certification_authority_id) {
            line += `, ${record.certification_authority_id}`;
          }
          enhancedContent += line + '\n';
        });
      }

      logger.info(
        `Level 2 optimization complete. Result length: ${enhancedContent.length} characters`
      );
      logger.info(
        `Categories breakdown - Other: ${sortedOtherRecords.length}, Confidential: ${sortedConfidentialRecords.length}, Missing: ${sortedMissingSellerIdRecords.length}, No sellers.json: ${sortedNoSellerJsonRecords.length}`
      );

      // 結果を返す
      return res.status(200).json({
        success: true,
        data: {
          optimized_content: enhancedContent,
          original_length: content.length,
          optimized_length: enhancedContent.length,
          optimization_level: 'level2',
          categories: {
            other: sortedOtherRecords.length,
            confidential: sortedConfidentialRecords.length,
            missing_seller_id: sortedMissingSellerIdRecords.length,
            no_seller_json: sortedNoSellerJsonRecords.length,
          },
        },
      });
    }

    // 未知のレベルの場合はレベル1として処理
    logger.warn(`Unknown optimization level: ${level}, using level1 instead`);
    return res.status(200).json({
      success: true,
      data: {
        optimized_content: optimizedContent,
        original_length: content.length,
        optimized_length: optimizedContent.length,
        optimization_level: 'level1',
      },
    });
  } catch (error: unknown) {
    logger.error('Error optimizing ads.txt content:', error);

    // エラーハンドリング - APIエラーとしてフォーマットして返す
    if (error instanceof ApiError) {
      throw error;
    } else {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new ApiError(
        500,
        `Error optimizing ads.txt content: ${errorMessage}`,
        'errors:optimizationFailed',
        { message: errorMessage }
      );
    }
  }
});

/**
 * Update the status of an Ads.txt record
 * @route PATCH /api/adstxt/:id/status
 */
export const updateRecordStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, token } = req.body;

  if (!token || typeof token !== 'string') {
    throw new ApiError(401, 'Access token is required', 'errors:accessTokenRequired');
  }

  if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
    throw new ApiError(
      400,
      'Valid status is required (pending, approved, or rejected)',
      'errors:invalidStatus'
    );
  }

  // Get the record first to find its request_id
  const record = await AdsTxtRecordModel.getById(id);

  if (!record) {
    throw new ApiError(404, 'Ads.txt record not found', 'errors:recordNotFound');
  }

  // Verify the token with the associated request
  const request = await RequestModel.getByIdWithToken(record.request_id, token);

  if (!request) {
    throw new ApiError(404, 'Request not found or invalid token', 'errors:notFoundOrInvalidToken');
  }

  // Update the status
  const updatedRecord = await AdsTxtRecordModel.updateStatus(
    id,
    status as 'pending' | 'approved' | 'rejected'
  );

  if (!updatedRecord) {
    throw new ApiError(500, 'Failed to update record status', 'errors:failedToUpdate.recordStatus');
  }

  res.status(200).json({
    success: true,
    data: updatedRecord,
  });
});

/**
 * Process Ads.txt content (from file upload or text input)
 * @route POST /api/adstxt/process
 */
export const processAdsTxtFile = asyncHandler(async (req: Request, res: Response) => {
  // Check for file upload first
  if (req.file) {
    try {
      const fileBuffer = req.file.buffer;
      const fileContent = fileBuffer.toString('utf8');

      // Parse the content
      let parsedRecords = parseAdsTxtContent(fileContent);

      // If publisher domain is provided, perform duplicate check (as warnings)
      const publisherDomain = req.body.publisherDomain;
      if (publisherDomain) {
        parsedRecords = await crossCheckAdsTxtRecords(publisherDomain, parsedRecords);
      }

      res.status(200).json({
        success: true,
        data: {
          records: parsedRecords,
          totalRecords: parsedRecords.length,
          validRecords: parsedRecords.filter((r) => r.is_valid).length,
          invalidRecords: parsedRecords.filter((r) => !r.is_valid).length,
        },
      });
      return;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid format';
      throw new ApiError(
        400,
        `Error parsing Ads.txt file: ${errorMessage}`,
        'errors:parsingError',
        {
          message: errorMessage,
        }
      );
    }
  }

  // Check for text content in request body
  if (!req.body.adsTxtContent) {
    throw new ApiError(400, 'No content provided', 'errors:noContentProvided');
  }

  try {
    const content = req.body.adsTxtContent;
    const publisherDomain = req.body.publisherDomain;

    // Parse the content
    let parsedRecords = parseAdsTxtContent(content);

    // If publisher domain is provided, perform duplicate check (as warnings)
    if (publisherDomain) {
      // Force fetching fresh ads.txt data for the domain to ensure we have the latest
      try {
        logger.info(`Force-fetching fresh ads.txt for domain: ${publisherDomain}`);
        const { default: AdsTxtCacheModel } = await import('../models/AdsTxtCache');

        // Force ads.txt fetch by calling the domain validation endpoint directly with force parameter
        const axios = (await import('axios')).default;
        const port = process.env.PORT || 3001; // Use consistent default port
        const cacheResponse = await axios.get(
          `http://localhost:${port}/api/adsTxtCache/domain/${encodeURIComponent(publisherDomain)}?force=true`
        );

        logger.debug(`Ads.txt cache response status: ${cacheResponse.status}`);
        logger.debug(
          `Ads.txt cache response data:`,
          JSON.stringify(cacheResponse.data).substring(0, 300) + '...'
        );

        logger.info(`Performing duplicate check for domain: ${publisherDomain}`);

        // Log entry counts before cross-check
        const cachedData = await AdsTxtCacheModel.getByDomain(publisherDomain);
        if (cachedData && cachedData.content) {
          logger.debug(`Raw ads.txt content length: ${cachedData.content.length}`);
          const lines = cachedData.content.split('\n');
          logger.debug(`Total lines in ads.txt: ${lines.length}`);

          // Count interesting lines (non-comment, non-empty)
          const interestingLines = lines.filter((line) => {
            const trimmed = line.trim();
            return trimmed.length > 0 && !trimmed.startsWith('#');
          });
          logger.debug(`Interesting (non-comment, non-empty) lines: ${interestingLines.length}`);

          // Print the first few entries containing ad-generation.jp
          const adGenLines = interestingLines.filter((line) =>
            line.toLowerCase().includes('ad-generation.jp')
          );
          logger.debug(`Lines containing ad-generation.jp: ${adGenLines.length}`);
          if (adGenLines.length > 0) {
            logger.debug('Sample ad-generation.jp lines:');
            adGenLines.slice(0, 5).forEach((line, i) => logger.debug(`  ${i + 1}: ${line}`));
          }
        }

        parsedRecords = await crossCheckAdsTxtRecords(publisherDomain, parsedRecords);
        logger.info(`Processed ${parsedRecords.length} records after cross-check`);
        logger.info(`Found ${parsedRecords.filter((r) => r.has_warning).length} duplicates`);
      } catch (err) {
        logger.error(`Failed to perform cross-check: ${err}`);
        // Continue with cross-check even if force fetch fails
        try {
          parsedRecords = await crossCheckAdsTxtRecords(publisherDomain, parsedRecords);
        } catch (crossCheckErr) {
          logger.error(`Cross-check also failed: ${crossCheckErr}`);
        }
      }
    }

    res.status(200).json({
      success: true,
      data: {
        records: parsedRecords,
        totalRecords: parsedRecords.length,
        validRecords: parsedRecords.filter((r) => r.is_valid).length,
        invalidRecords: parsedRecords.filter((r) => !r.is_valid).length,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Invalid format';
    throw new ApiError(
      400,
      `Error parsing Ads.txt content: ${errorMessage}`,
      'errors:parsingError',
      {
        message: errorMessage,
      }
    );
  }
});

/**
 * Get all Ads.txt records for a request
 * @route GET /api/adstxt/request/:requestId
 */
export const getRecordsByRequestId = asyncHandler(async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    throw new ApiError(401, 'Access token is required', 'errors:accessTokenRequired');
  }

  // Verify the token and request
  const request = await RequestModel.getByIdWithToken(requestId, token);

  if (!request) {
    throw new ApiError(404, 'Request not found or invalid token', 'errors:notFoundOrInvalidToken');
  }

  // Get all records for the request
  const records = await AdsTxtRecordModel.getByRequestId(requestId);

  res.status(200).json({
    success: true,
    data: records,
  });
});

/**
 * Generate Ads.txt content for approved records
 * @route GET /api/adstxt/generate/:requestId
 */
export const generateAdsTxtContent = asyncHandler(async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    throw new ApiError(401, 'Access token is required', 'errors:accessTokenRequired');
  }

  // Verify the token and request
  const request = await RequestModel.getByIdWithToken(requestId, token);

  if (!request) {
    throw new ApiError(404, 'Request not found or invalid token', 'errors:notFoundOrInvalidToken');
  }

  // Get approved records for the request
  const records = await AdsTxtRecordModel.getByRequestId(requestId);
  const approvedRecords = records.filter((record) => record.status === 'approved');

  // Get requester info from the request
  const requesterName = request.request.requester_name;
  const requesterEmail = request.request.requester_email;

  // Format current date in a readable format
  const currentDate = new Date();
  const formattedDate = currentDate.toISOString().slice(0, 10); // YYYY-MM-DD format

  // Generate the content with detailed comments
  let content = '# Ads.txt file generated by Ads.txt Manager\n';
  content += `# Generated on: ${currentDate.toISOString()}\n`;
  content += `# Requester: ${requesterName}\n`;
  content += `# Approved on: ${formattedDate}\n`;

  // Add description about the file
  content += '# The following entries have been approved for inclusion in your ads.txt file\n';
  content +=
    '# Format: domain, account_id, account_type, relationship[, certification_authority_id]\n\n';

  // Import needed for seller lookup
  const SellersJsonCacheModel = (await import('../models/SellersJsonCache')).default;

  // Group records by domain to reduce DB lookups
  const domainSellersJsonCache: Map<string, any> = new Map();

  // Process each approved record
  for (const record of approvedRecords) {
    let line = `${record.domain}, ${record.account_id}, ${record.account_type}, ${record.relationship}`;

    // Check if certification_authority_id already exists in the record
    if (record.certification_authority_id) {
      line += `, ${record.certification_authority_id}`;
    } else {
      // Try to find certification_authority_id from sellers.json if not present in record
      try {
        // Get sellers.json for the domain, either from cache or db
        let sellersJsonData;
        if (domainSellersJsonCache.has(record.domain)) {
          sellersJsonData = domainSellersJsonCache.get(record.domain);
        } else {
          // Use the shared fetch function
          const { sellersJsonData: fetchedData, cacheInfo } = await fetchSellersJsonWithCache(
            record.domain,
            false
          );

          // Store results for TAG-ID lookup
          if (fetchedData) {
            sellersJsonData = fetchedData;
            domainSellersJsonCache.set(record.domain, fetchedData);
            logger.debug(
              `Using sellers.json for ${record.domain} (${cacheInfo.isCached ? 'from cache' : 'freshly fetched'})`
            );
          } else {
            logger.debug(
              `No valid sellers.json data available for ${record.domain} (status: ${cacheInfo.status})`
            );
          }
        }

        // If we have valid sellers.json data and identifiers are present
        if (
          sellersJsonData &&
          sellersJsonData.identifiers &&
          Array.isArray(sellersJsonData.identifiers)
        ) {
          // Look for a TAG-ID (Trustworthy Accountability Group) identifier
          const tagIdEntry = sellersJsonData.identifiers.find(
            (id: any) => id.name && id.name.toLowerCase().includes('tag-id')
          );

          if (tagIdEntry && tagIdEntry.value) {
            line += `, ${tagIdEntry.value}`;
            // Add a comment to indicate this was auto-added from sellers.json
            line += ' # Certification Authority ID added from sellers.json';
          }
        }
      } catch (error) {
        // If there's an error, just continue without the certification authority ID
        logger.error(`Error getting certification authority ID for ${record.domain}:`, error);
      }
    }

    content += line + '\n';
  }

  // Set the content type for downloading as a text file
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', 'attachment; filename="ads.txt"');

  res.status(200).send(content);
});
