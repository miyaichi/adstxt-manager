import { Request, Response } from 'express';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import AdsTxtRecordModel from '../models/AdsTxtRecord';
import RequestModel from '../models/Request';
import {
  optimizeAdsTxt,
  parseAdsTxtContent,
  crossCheckAdsTxtRecords,
} from 'adstxt-validator';
import { createValidationApiError } from '../utils/validationHelper';

// Import the shared fetch function for sellers.json data
import { fetchSellersJsonWithCache } from '../controllers/sellersJsonController';
import { createLogger } from '../utils/logger';
import AdsTxtCache from '../models/AdsTxtCache';
import SellersJsonCache from '../models/SellersJsonCache';

// Create logger for AdsTxt optimization
const logger = createLogger('AdsTxtOptimizer');

// Configuration values
const DEFAULT_OPTIMIZATION_LEVEL = 'level1';
const MAX_FILE_SIZE = 5000000; // 5MB
const MAX_CONCURRENT_FETCHES = parseInt(process.env.SELLERS_JSON_CONCURRENCY || '20', 10);

/**
 * Update the status of an Ads.txt record
 * @route PATCH /api/adstxt/:id/status
 */
/**
 * Interface for performance timing utilities
 */
interface PerformanceTimer {
  // Get elapsed time
  getElapsedTime(): { ms: number; seconds: string; minutes: string };
  // Record completion of a step
  logStep(stepName: string): void;
  // Get timing information
  getTiming(): { start: number; steps: Record<string, number> };
  // Calculate time spent on each step
  calculateStepTimes(): Array<{ name: string; duration: number; percentage: string }>;
}

/**
 * Create performance timing utility
 */
function createPerformanceTimer(): PerformanceTimer {
  const startTime = Date.now();
  const timing = {
    start: startTime,
    steps: {} as Record<string, number>,
  };

  return {
    getElapsedTime: () => {
      const elapsed = Date.now() - startTime;
      return {
        ms: elapsed,
        seconds: (elapsed / 1000).toFixed(2),
        minutes: (elapsed / 60000).toFixed(2),
      };
    },

    logStep: (stepName: string) => {
      const now = Date.now();
      timing.steps[stepName] = now;
      const elapsed = Date.now() - startTime;
      logger.info(
        `Step completed: ${stepName} - Time: ${(elapsed / 1000).toFixed(2)}s (${elapsed}ms)`
      );
    },

    getTiming: () => timing,

    calculateStepTimes: () => {
      return Object.entries(timing.steps).map(([name, time], index, array) => {
        const prevTime = index === 0 ? timing.start : array[index - 1][1];
        const duration = time - prevTime;
        const totalTime = Date.now() - startTime;
        return {
          name,
          duration,
          percentage: ((duration / totalTime) * 100).toFixed(1) + '%',
        };
      });
    },
  };
}

/**
 * Function to classify records by processing them in optimized batches
 */
async function classifyRecords(
  recordEntries: any[],
  domainSellersJsonCache: Map<string, any>
): Promise<{
  enhancedRecords: Array<{ record: any; category: string }>;
  otherRecords: any[];
  confidentialRecords: any[];
  missingSellerIdRecords: any[];
  noSellerJsonRecords: any[];
}> {
  // Initialize result arrays for each category
  const otherRecords: any[] = [];
  const confidentialRecords: any[] = [];
  const missingSellerIdRecords: any[] = [];
  const noSellerJsonRecords: any[] = [];

  // 1. Preprocessing: Collect Certification Authority IDs by domain
  const domainCertIds = new Map<string, string>();
  for (const record of recordEntries) {
    if ('domain' in record && record.domain && record.certification_authority_id) {
      // Always normalize domain to lowercase and trim whitespace for consistent lookups
      const normalizedDomain = record.domain.toLowerCase().trim();
      domainCertIds.set(normalizedDomain, record.certification_authority_id);
    }
  }

  // 2. Optimization: Group records by domain and collect all accountIds per domain
  // This enables batch queries instead of individual lookups
  const domainAccountGroups = new Map<
    string,
    {
      accountIds: Set<string>;
      records: Map<string, any[]>; // accountId -> records
    }
  >();

  for (const record of recordEntries) {
    if (!('domain' in record)) continue;

    const domain = record.domain;
    // Always normalize domain to lowercase and trim whitespace for consistent lookups
    const normalizedDomain = domain.toLowerCase().trim();
    const accountId = record.account_id?.toString() || '';

    if (!domainAccountGroups.has(normalizedDomain)) {
      domainAccountGroups.set(normalizedDomain, {
        accountIds: new Set(),
        records: new Map(),
      });
    }

    const domainGroup = domainAccountGroups.get(normalizedDomain)!;
    domainGroup.accountIds.add(accountId);

    if (!domainGroup.records.has(accountId)) {
      domainGroup.records.set(accountId, []);
    }
    domainGroup.records.get(accountId)!.push(record);
  }

  // 3. Batch processing function for each domain with all its accountIds
  const processDomainBatch = async (
    domain: string,
    domainGroup: { accountIds: Set<string>; records: Map<string, any[]> }
  ) => {
    const normalizedDomain = domain.toLowerCase().trim();
    const accountIds = Array.from(domainGroup.accountIds);
    const foundCertId = domainCertIds.get(normalizedDomain) || null;
    const sellersJsonData = domainSellersJsonCache.get(normalizedDomain);

    logger.debug(
      `Processing domain ${normalizedDomain} with ${accountIds.length} unique account IDs`
    );

    // Handle missing or invalid sellers.json data
    if (!sellersJsonData) {
      logger.debug(`No sellers.json data for ${normalizedDomain}`);
      return processAccountsWithStatus(domainGroup.records, 'noSellerJson', foundCertId);
    }

    if (sellersJsonData.__status && sellersJsonData.__status !== 'success') {
      logger.debug(
        `Invalid sellers.json status for ${normalizedDomain}: ${sellersJsonData.__status}`
      );
      return processAccountsWithStatus(domainGroup.records, 'noSellerJson', foundCertId);
    }

    // Memory-optimized batch processing
    if (sellersJsonData.__metadata && sellersJsonData.__summary) {
      try {
        // **BATCH OPTIMIZATION**: Use batch query for all accountIds at once
        const SellersJsonCacheModel = (await import('../models/SellersJsonCache')).default;

        // Try JSONB batch optimization first
        try {
          const batchResults = await SellersJsonCacheModel.batchGetSellersOptimized(
            normalizedDomain,
            accountIds
          );
          if (batchResults) {
            logger.debug(
              `Using JSONB batch optimization for ${normalizedDomain} (${batchResults.foundCount}/${accountIds.length} found)`
            );
            return processBatchResults(
              domainGroup.records,
              batchResults,
              foundCertId,
              sellersJsonData
            );
          }
        } catch (batchError) {
          const errorMessage =
            batchError instanceof Error ? batchError.message : String(batchError);
          logger.warn(
            `JSONB batch optimization failed for ${normalizedDomain}, falling back to standard batch: ${errorMessage}`
          );
          // Log additional error details for debugging
          if (batchError instanceof Error && batchError.stack) {
            logger.debug(`JSONB batch optimization stack trace: ${batchError.stack}`);
          }
        }

        // Fallback to standard batch query
        const specificSellers = await SellersJsonCacheModel.getSpecificSellers(
          normalizedDomain,
          accountIds
        );

        if (specificSellers && specificSellers.matchingSellers) {
          logger.debug(
            `Using standard batch query for ${normalizedDomain} (${specificSellers.matchingSellers.length}/${accountIds.length} found)`
          );

          // Create a map for faster lookup
          const sellersMap = new Map();
          specificSellers.matchingSellers.forEach((seller: any) => {
            if (seller.seller_id) {
              sellersMap.set(seller.seller_id.toString(), seller);
            }
          });

          return processAccountsWithSellersMap(
            domainGroup.records,
            sellersMap,
            foundCertId,
            sellersJsonData
          );
        } else {
          logger.debug(`No matching sellers found for ${normalizedDomain}`);
          return processAccountsWithStatus(domainGroup.records, 'missingSellerId', foundCertId);
        }
      } catch (error) {
        logger.error(`Error in batch processing for ${normalizedDomain}:`, error);
        return processAccountsWithStatus(domainGroup.records, 'noSellerJson', foundCertId);
      }
    }

    // Legacy processing - search sellers array directly
    if (
      !Array.isArray(sellersJsonData.sellers) ||
      (sellersJsonData.status && sellersJsonData.status !== 'success')
    ) {
      return processAccountsWithStatus(domainGroup.records, 'noSellerJson', foundCertId);
    }

    // Create sellers map for legacy processing
    const sellersMap = new Map();
    sellersJsonData.sellers.forEach((seller: any) => {
      if (seller.seller_id) {
        sellersMap.set(seller.seller_id.toString(), seller);
      }
    });

    return processAccountsWithSellersMap(
      domainGroup.records,
      sellersMap,
      foundCertId,
      sellersJsonData
    );
  };

  // Helper function to process batch results from JSONB optimization
  const processBatchResults = (
    recordsMap: Map<string, any[]>,
    batchResults: any,
    foundCertId: string | null,
    sellersJsonData: any
  ) => {
    const results: Array<{ record: any; category: string }> = [];
    let certId = foundCertId;

    // Look for TAG-ID in sellers.json if not already found
    if (!certId && sellersJsonData.identifiers && Array.isArray(sellersJsonData.identifiers)) {
      const tagIdEntry = sellersJsonData.identifiers.find(
        (id: any) => id.name && id.name.toLowerCase().includes('tag-id')
      );
      if (tagIdEntry && tagIdEntry.value) {
        certId = tagIdEntry.value;
      }
    }

    // Process each result from batch query
    batchResults.results.forEach((result: any) => {
      const accountId = result.sellerId;
      const records = recordsMap.get(accountId) || [];

      let category = 'other';
      if (!result.found) {
        category = 'missingSellerId';
      } else if (result.seller) {
        // Check confidentiality flag
        if (
          result.seller.is_confidential === true ||
          (typeof result.seller.is_confidential === 'number' && result.seller.is_confidential === 1)
        ) {
          category = 'confidential';
        }
      }

      // Apply results to all records for this accountId
      records.forEach((record) => {
        const enhancedRecord = { ...record };
        if (certId) enhancedRecord.certification_authority_id = certId;
        results.push({ record: enhancedRecord, category });
      });
    });

    return results;
  };

  // Helper function to process accounts with sellers map
  const processAccountsWithSellersMap = (
    recordsMap: Map<string, any[]>,
    sellersMap: Map<string, any>,
    foundCertId: string | null,
    sellersJsonData: any
  ) => {
    const results: Array<{ record: any; category: string }> = [];
    let certId = foundCertId;

    // Look for TAG-ID if not already found
    if (!certId && sellersJsonData.identifiers && Array.isArray(sellersJsonData.identifiers)) {
      const tagIdEntry = sellersJsonData.identifiers.find(
        (id: any) => id.name && id.name.toLowerCase().includes('tag-id')
      );
      if (tagIdEntry && tagIdEntry.value) {
        certId = tagIdEntry.value;
      }
    }

    recordsMap.forEach((records, accountId) => {
      const seller = sellersMap.get(accountId);
      let category = 'other';

      if (!seller) {
        category = 'missingSellerId';
      } else if (seller.is_confidential === true || seller.is_confidential === 1) {
        category = 'confidential';
      }

      records.forEach((record) => {
        const enhancedRecord = { ...record };
        if (certId) enhancedRecord.certification_authority_id = certId;
        results.push({ record: enhancedRecord, category });
      });
    });

    return results;
  };

  // Helper function to process accounts with a fixed status
  const processAccountsWithStatus = (
    recordsMap: Map<string, any[]>,
    status: string,
    foundCertId: string | null
  ) => {
    const results: Array<{ record: any; category: string }> = [];

    recordsMap.forEach((records) => {
      records.forEach((record) => {
        const enhancedRecord = { ...record };
        if (foundCertId) enhancedRecord.certification_authority_id = foundCertId;
        results.push({ record: enhancedRecord, category: status });
      });
    });

    return results;
  };

  // 4. Process all domains in parallel using batch queries
  const domainResults = await Promise.all(
    Array.from(domainAccountGroups.entries()).map(([domain, domainGroup]) =>
      processDomainBatch(domain, domainGroup)
    )
  );

  // 5. Flatten results
  const enhancedRecords = domainResults.flat();

  // Add records without domain attribute
  for (const record of recordEntries) {
    if (!('domain' in record)) {
      enhancedRecords.push({ record, category: 'other' });
    }
  }

  // Organize records by category
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

  return {
    enhancedRecords,
    otherRecords,
    confidentialRecords,
    missingSellerIdRecords,
    noSellerJsonRecords,
  };
}

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
    // Initialize performance timing utilities
    const performanceTimer = createPerformanceTimer();
    const { logStep, getElapsedTime } = performanceTimer;

    logger.info(
      `Starting ads.txt optimization - Content length: ${content.length}, Level: ${level || 'level1'}, Domain: ${publisher_domain || 'none'}`
    );

    // Check the content length - allow large files but set a limit
    if (content.length > MAX_FILE_SIZE) {
      // Refuse files larger than 5MB
      logger.error(`File too large: ${content.length} bytes (max: ${MAX_FILE_SIZE})`);
      throw new ApiError(400, 'File too large (max 5MB)', 'errors:fileTooLarge');
    }

    logger.info(
      `Optimizing ads.txt content with length: ${content.length} characters at level: ${level || 'level1'}`
    );

    // Process the content to remove duplicates and standardize format
    const optimizationStart = Date.now();
    let optimizedContent = optimizeAdsTxt(content, publisher_domain);
    logStep('Basic optimization complete');

    // For level 1, only perform basic optimization
    if (!level || level === DEFAULT_OPTIMIZATION_LEVEL) {
      // Final timing measurement
      const totalTime = getElapsedTime();
      logger.info(
        `Level 1 optimization complete. Result length: ${optimizedContent.length} characters. Total time: ${totalTime.seconds}s`
      );

      // Return the results
      return res.status(200).json({
        success: true,
        data: {
          optimized_content: optimizedContent,
          original_length: content.length,
          optimized_length: optimizedContent.length,
          optimization_level: 'level1',
          execution_time_ms: totalTime.ms,
        },
      });
    }

    // レベル2の場合はここから詳細な分析を開始
    logStep('Level2 optimization started');

    // レベル2の場合はセラーズJSON連携による補完と詳細分類を行う
    if (level === 'level2') {
      try {
        logger.info('Starting level 2 optimization with sellers.json integration');

        // 1. 最適化されたコンテンツを解析
        logger.debug('Parsing ads.txt content...');
        const parsedEntries = parseAdsTxtContent(optimizedContent, publisher_domain);
        logStep('Contents analysis');
        logger.info(`Parsed ${parsedEntries.length} total entries`);

        // 2. レコードエントリのみを処理
        logger.debug('Filtering record entries...');
        const recordEntries = parsedEntries.filter(
          (entry) => 'domain' in entry && 'account_id' in entry && 'relationship' in entry
        );
        logStep('Record filtering');
        logger.info(`Found ${recordEntries.length} record entries for optimization`);

        // 3. ドメインを抽出し、sellers.json を並列取得
        logger.debug('Importing SellersJsonCacheModel...');
        const SellersJsonCacheModel = (await import('../models/SellersJsonCache')).default;
        const domainSellersJsonCache: Map<string, any> = new Map();

        // レコードからユニークなドメインを抽出
        logger.debug('Extracting unique domains from records...');
        const uniqueDomains = new Set<string>();
        for (const record of recordEntries) {
          if ('domain' in record && record.domain) {
            // Always normalize domain to lowercase for consistent lookups
            uniqueDomains.add(record.domain.toLowerCase());
          }
        }
        logStep('Unique domain extraction');

        logger.info(
          `Found ${uniqueDomains.size} unique domains for sellers.json lookup: ${Array.from(uniqueDomains).slice(0, 5).join(', ')}${uniqueDomains.size > 5 ? '...' : ''}`
        );

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

          logger.info(
            `Processing ${items.length} items in ${chunks.length} chunks of max ${concurrencyLimit} each`
          );

          // チャンク単位で処理を実行（チャンク内は並列、チャンク間は逐次）
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            logger.debug(`Processing chunk ${i + 1}/${chunks.length} with ${chunk.length} items`);

            const chunkPromises = chunk.map((item) => fetchFn(item));
            const chunkResults = await Promise.all(chunkPromises);
            results.push(...chunkResults);

            // チャンク完了後の統計情報ログ
            if (chunks.length > 1) {
              const processed = Math.min(items.length, (i + 1) * concurrencyLimit);
              const percentComplete = Math.round((processed / items.length) * 100);
              logger.info(
                `Completed ${i + 1}/${chunks.length} chunks (${percentComplete}% done, ${processed}/${items.length} items)`
              );

              // オプション: チャンク間に短い遅延を入れることでサーバー負荷をさらに分散
              // チャンクの中間時のみ遅延をいれる (最後のチャンクでは不要)
              if (i < chunks.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 100));
              }
            }
          }

          return results;
        }

        // Log the maximum number of concurrent sellers.json fetches
        logger.info(
          `Using concurrency limit of ${MAX_CONCURRENT_FETCHES} for sellers.json fetches`
        );

        // Function to fetch sellers.json for each domain - memory optimized version
        const fetchSellersJson = async (domain: string) => {
          try {
            // Use normalized domain name
            const normalizedDomain = domain.toLowerCase().trim();
            logger.debug(
              `Looking up sellers.json for domain (memory-optimized): ${normalizedDomain}`
            );

            // メモリ最適化：最初にメタデータだけを取得
            // これにより全体のsellers.jsonデータをメモリに読み込まずに情報を取得
            const SellersJsonCacheModel = (await import('../models/SellersJsonCache')).default;

            // メタデータとseller typeの統計情報だけを取得
            const metadataSummary =
              await SellersJsonCacheModel.getMetadataAndSummarizedSellers(normalizedDomain);

            if (metadataSummary) {
              // キャッシュの情報を確認して適切に処理
              const status = metadataSummary.domainInfo.status;
              const isCacheMiss = metadataSummary.isCacheMiss;

              // キャッシュデータをメモリに保持 (not_found や error でも保存)
              domainSellersJsonCache.set(normalizedDomain, {
                // 完全なsellers配列の代わりに必要な情報だけ保持
                __metadata: metadataSummary.metadata,
                __summary: metadataSummary.sellersSummary,
                __domainInfo: metadataSummary.domainInfo,
                __status: status,
              });

              // キャッシュミスでない場合はステータスに関わらず使用する
              if (!isCacheMiss) {
                const description =
                  status === 'success'
                    ? `with ${metadataSummary.metadata.seller_count} sellers, ${metadataSummary.sellersSummary.confidentialCount} confidential`
                    : `with status '${status}'`;

                logger.debug(
                  `Using memory-optimized cache for ${normalizedDomain} ${description} (updated: ${metadataSummary.domainInfo.updated_at})`
                );

                return {
                  domain: normalizedDomain,
                  success: true,
                  fromCache: true,
                  memoryOptimized: true,
                  status: status,
                };
              }
            }

            // キャッシュミスの場合のみ従来の方法で取得を試みる
            logger.debug(`Cache miss for ${normalizedDomain}, falling back to regular method`);
            const { sellersJsonData: fetchedData, cacheInfo } = await fetchSellersJsonWithCache(
              normalizedDomain,
              false // forceRefreshはfalseのまま（期限切れの場合のみ取得）
            );

            if (fetchedData) {
              domainSellersJsonCache.set(normalizedDomain, fetchedData);
              logger.debug(
                `Found sellers.json data for ${normalizedDomain} in cache (status: ${cacheInfo.status}, updated: ${cacheInfo.updatedAt})`
              );
            } else {
              logger.debug(
                `No valid sellers.json data available for ${normalizedDomain} (status: ${cacheInfo.status})`
              );
            }

            return {
              domain: normalizedDomain,
              success: true,
              fromCache: cacheInfo.isCached,
              status: cacheInfo.status,
            };
          } catch (error) {
            logger.error(`Error retrieving sellers.json for ${domain}:`, error);
            return { domain, success: false, error, status: 'error' };
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
          duplicateRequests: 0, // 重複リクエストの数
          processedDomains: new Set<string>(), // 処理済みドメインの追跡
          statusCounts: {
            success: 0,
            not_found: 0,
            error: 0,
            invalid_format: 0,
            pending: 0,
            unknown: 0,
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
          const normalizedDomain = domain.toLowerCase().trim();

          // ドメインを処理済みとして記録
          stats.processedDomains.add(normalizedDomain);

          // すでに実行中のリクエストがあれば再利用
          if (stats.inProgressFetches.has(normalizedDomain)) {
            logger.debug(`Reusing in-progress fetch for ${normalizedDomain}`);
            stats.duplicateRequests++;
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
        logStep('sellers.json retrieval complete');

        // 処理完了時間を記録
        const processingTimeMs = Date.now() - stats.processingStart;

        // 処理済みドメイン数と不一致があれば詳細を調査
        const processedDomainsCount = stats.processedDomains.size;
        const unaccountedDomains =
          stats.uniqueDomains - (stats.cacheHits + stats.cacheMisses + stats.failedRequests);
        const isDomainCountMismatch = processedDomainsCount !== stats.uniqueDomains;

        // 検証ステップ: 重複リクエスト数と未カウントドメイン数が一致するか確認
        const duplicatesMatchUnaccounted = stats.duplicateRequests === unaccountedDomains;

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
  - ${stats.duplicateRequests} duplicate requests detected
Cache Status Distribution:
  - success: ${stats.statusCounts.success}
  - not_found: ${stats.statusCounts.not_found}
  - error: ${stats.statusCounts.error}
  - invalid_format: ${stats.statusCounts.invalid_format}
  - pending: ${stats.statusCounts.pending}
  - unknown: ${stats.statusCounts.unknown}
Memory optimization: ${stats.memoryOptimized} domains processed with metadata-only approach
Memory savings estimate: ~${Math.round(stats.memoryOptimized * 2.5)}MB (assuming avg 2.5MB per full sellers.json)
Processing rate: ${Math.round(stats.uniqueDomains / (processingTimeMs / 1000))} domains/second
Tracking check: ${processedDomainsCount} tracked domains (${isDomainCountMismatch ? 'MISMATCH!' : 'OK'})
Verification: Hits(${stats.cacheHits}) + Misses(${stats.cacheMisses}) + Failed(${stats.failedRequests}) = ${stats.cacheHits + stats.cacheMisses + stats.failedRequests}/${fetchResults.length} ${unaccountedDomains > 0 ? `(${unaccountedDomains} unaccounted for)` : '(all accounted for)'}
Duplicate check: ${duplicatesMatchUnaccounted ? '✓ Duplicates match unaccounted domains' : "✗ Duplicates don't match unaccounted domains"}
----------------------------------------------
      `.trim()
        );

        // 不一致があり、詳細ログが必要な場合
        if (isDomainCountMismatch || unaccountedDomains > 0) {
          if (duplicatesMatchUnaccounted) {
            logger.info(
              `Mismatch explained: ${unaccountedDomains} domains are duplicates and correctly tracked as duplicateRequests.`
            );
          } else {
            logger.warn(
              `Domain count mismatch detected. This could indicate tracking issues in the code.`
            );
            logger.warn(`- Unique domains found: ${stats.uniqueDomains}`);
            logger.warn(`- Domains tracked as processed: ${processedDomainsCount}`);
            logger.warn(
              `- Domains with result status: ${stats.cacheHits + stats.cacheMisses + stats.failedRequests}`
            );
            logger.warn(`- Duplicate requests detected: ${stats.duplicateRequests}`);
            logger.warn(`- Unaccounted for domains: ${unaccountedDomains}`);
          }
        }

        // Step 3: Classify and enhance records

        // Process flow overview:
        // 1. For level 2 optimization, we attempt to fetch sellers.json for all domains listed in ads.txt
        // 2. If a record exists in sellers_json_cache (regardless of status) and is not expired, we use that information
        // 3. If the record doesn't exist or is expired, we fetch a new sellers.json

        // Start record classification process
        logStep('Start classification');

        // Call the classification function to execute the process
        const {
          enhancedRecords,
          otherRecords,
          confidentialRecords,
          missingSellerIdRecords,
          noSellerJsonRecords,
        } = await classifyRecords(recordEntries, domainSellersJsonCache);

        // Sort records within each category (domain → relationship)
        const sortRecords = (records: any[]) => {
          return records.sort((a, b) => {
            // Sort by domain first
            const domainComparison = a.domain.localeCompare(b.domain);
            if (domainComparison !== 0) return domainComparison;

            // For same domain, put DIRECT before RESELLER
            if (a.relationship === 'DIRECT' && b.relationship === 'RESELLER') return -1;
            if (a.relationship === 'RESELLER' && b.relationship === 'DIRECT') return 1;

            // Finally sort by account ID
            return a.account_id.localeCompare(b.account_id);
          });
        };

        // Sort records in all categories
        const sortedOtherRecords = sortRecords(otherRecords);
        const sortedConfidentialRecords = sortRecords(confidentialRecords);
        const sortedMissingSellerIdRecords = sortRecords(missingSellerIdRecords);
        const sortedNoSellerJsonRecords = sortRecords(noSellerJsonRecords);

        logStep('Classification complete');

        // ステップ4: 新しい最適化されたコンテンツを作成
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

        logStep('Final content generation');

        // Final timing measurement
        const totalTime = getElapsedTime();

        logger.info(
          `Level 2 optimization complete. Result length: ${enhancedContent.length} characters. Total time: ${totalTime.seconds}s (${totalTime.minutes}m)`
        );
        logger.info(
          `Categories breakdown - Other: ${sortedOtherRecords.length}, Confidential: ${sortedConfidentialRecords.length}, Missing: ${sortedMissingSellerIdRecords.length}, No sellers.json: ${sortedNoSellerJsonRecords.length}`
        );

        // Calculate time spent on each step
        const stepTimes = performanceTimer.calculateStepTimes();

        // Log the time breakdown for each step
        logger.info('Step timing breakdown:', {
          steps: stepTimes.map(
            (s) => `${s.name}: ${(s.duration / 1000).toFixed(2)}s (${s.percentage})`
          ),
        });

        // Return the results
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
            execution_time_ms: totalTime.ms,
            execution_steps: stepTimes.map((s) => ({
              name: s.name,
              duration_ms: s.duration,
              percentage: s.percentage,
            })),
          },
        });
      } catch (level2Error) {
        const errorMessage =
          level2Error instanceof Error ? level2Error.message : String(level2Error);
        logger.error(`Level 2 optimization failed: ${errorMessage}`);
        if (level2Error instanceof Error && level2Error.stack) {
          logger.debug(`Level 2 optimization error stack: ${level2Error.stack}`);
        }

        // Fall back to level 1 optimization on error
        logger.info('Falling back to level 1 optimization due to level 2 error');
        const totalTime = getElapsedTime();
        return res.status(200).json({
          success: true,
          data: {
            optimized_content: optimizedContent,
            original_length: content.length,
            optimized_length: optimizedContent.length,
            optimization_level: 'level1',
            execution_time_ms: totalTime.ms,
            warning: 'Level 2 optimization failed, returned level 1 result',
          },
        });
      }
    }

    // Process as level 1 for unknown optimization levels
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
        const cachedAdsTxt = await AdsTxtCache.getByDomain(publisherDomain);
        const getSellersJson = async (domain: string) => {
          const sellersJson = await SellersJsonCache.getByDomain(domain);
          return sellersJson ? SellersJsonCache.parseContent(sellersJson.content) : null;
        };
        parsedRecords = await crossCheckAdsTxtRecords(
          publisherDomain,
          parsedRecords,
          cachedAdsTxt ? cachedAdsTxt.content : null,
          getSellersJson
        );
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
      throw createValidationApiError(400, 'parsingError', [errorMessage], 'ja');
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

        const getSellersJson = async (domain: string) => {
          const sellersJson = await SellersJsonCache.getByDomain(domain);
          return sellersJson ? SellersJsonCache.parseContent(sellersJson.content) : null;
        };
        parsedRecords = await crossCheckAdsTxtRecords(
          publisherDomain,
          parsedRecords,
          cachedData ? cachedData.content : null,
          getSellersJson
        );
        logger.info(`Processed ${parsedRecords.length} records after cross-check`);
        logger.info(`Found ${parsedRecords.filter((r) => r.has_warning).length} duplicates`);
      } catch (err) {
        logger.error(`Failed to perform cross-check: ${err}`);
        // Continue with cross-check even if force fetch fails
        try {
          const cachedAdsTxt = await AdsTxtCache.getByDomain(publisherDomain);
          const getSellersJson = async (domain: string) => {
            const sellersJson = await SellersJsonCache.getByDomain(domain);
            return sellersJson ? SellersJsonCache.parseContent(sellersJson.content) : null;
          };
          parsedRecords = await crossCheckAdsTxtRecords(
            publisherDomain,
            parsedRecords,
            cachedAdsTxt ? cachedAdsTxt.content : null,
            getSellersJson
          );
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
    throw createValidationApiError(400, 'parsingError', [errorMessage], 'ja');
  }
});

/**
 * Quick validation endpoint - fast syntax-only validation without sellers.json cross-checking
 * Endpoint: POST /api/adsTxt/validate/quick
 *
 * This endpoint is optimized for speed:
 * - No database queries
 * - No sellers.json cross-checking
 * - Only syntax validation and duplicate detection
 *
 * Use this for real-time validation UX where speed is critical.
 */
export const validateQuick = asyncHandler(async (req: Request, res: Response) => {
  const { content, checkDuplicates = true } = req.body;

  if (!content || typeof content !== 'string') {
    throw new ApiError(400, 'Content is required', 'errors:missingFields.adsTxtContent');
  }

  try {
    // Parse content - this is fast and doesn't hit the database
    const parsedEntries = parseAdsTxtContent(content);

    // Filter to get only record entries (not variables or comments)
    const recordEntries = parsedEntries.filter(
      (entry) => 'domain' in entry && 'account_id' in entry && 'relationship' in entry
    );

    // Filter to get variables
    const variableEntries = parsedEntries.filter((entry) => 'variable_type' in entry);

    // Count valid and invalid records
    const validRecords = recordEntries.filter((r) => r.is_valid).length;
    const invalidRecords = recordEntries.filter((r) => !r.is_valid).length;

    // Collect errors
    const errors = parsedEntries
      .filter((entry) => !entry.is_valid && entry.validation_key)
      .map((entry) => ({
        line: entry.line_number || 0,
        message: entry.validation_key || 'Unknown error',
        severity: entry.severity || 'error',
      }));

    // Check for internal duplicates if requested
    let duplicateWarnings: any[] = [];
    if (checkDuplicates && recordEntries.length > 0) {
      const seen = new Map<string, (typeof recordEntries)[0]>();

      for (const record of recordEntries) {
        if (!record.is_valid) continue;

        const key = `${record.domain}|${record.account_id}|${record.relationship}`.toLowerCase();

        if (seen.has(key)) {
          duplicateWarnings.push({
            line: record.line_number || 0,
            message: `Duplicate entry: ${record.domain}, ${record.account_id}, ${record.relationship}`,
            severity: 'warning',
            original_line: seen.get(key)?.line_number || 0,
          });
        } else {
          seen.set(key, record);
        }
      }
    }

    // Calculate statistics
    const totalLines = content.split('\n').length;
    const commentLines = content.split('\n').filter((line) => {
      const trimmed = line.trim();
      return trimmed.startsWith('#') || trimmed === '';
    }).length;

    res.status(200).json({
      success: true,
      data: {
        isValid: errors.length === 0,
        records: recordEntries,
        errors,
        warnings: duplicateWarnings,
        statistics: {
          totalLines,
          validRecords,
          invalidRecords,
          variables: variableEntries.length,
          comments: commentLines,
          duplicates: duplicateWarnings.length,
        },
      },
    });
  } catch (error: unknown) {
    logger.error('Error in quick validation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Invalid format';
    throw createValidationApiError(400, 'parsingError', [errorMessage], 'ja');
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
