import { Request, Response } from 'express';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import AdsTxtRecordModel from '../models/AdsTxtRecord';
import RequestModel from '../models/Request';
import { crossCheckAdsTxtRecords, optimizeAdsTxt, parseAdsTxtContent } from '../utils/validation';

// Import the shared fetch function for sellers.json data
import { fetchSellersJsonWithCache } from '../controllers/sellersJsonController';

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

    console.log(
      `Optimizing ads.txt content with length: ${content.length} characters at level: ${level || 'level1'}`
    );

    // Process the content to remove duplicates and standardize format
    let optimizedContent = optimizeAdsTxt(content, publisher_domain);

    // レベル1の場合は基本的な最適化のみ行う
    if (!level || level === 'level1') {
      console.log(
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

      console.log(`Found ${uniqueDomains.size} unique domains for sellers.json lookup`);

      // ドメインごとに並列でsellers.jsonを取得
      const fetchPromises = Array.from(uniqueDomains).map(async (domain) => {
        try {
          console.log(`Pre-fetching sellers.json for domain: ${domain}`);
          const { sellersJsonData: fetchedData, cacheInfo } = await fetchSellersJsonWithCache(
            domain,
            false
          );

          if (fetchedData) {
            domainSellersJsonCache.set(domain, fetchedData);
            console.log(
              `Pre-fetched sellers.json for ${domain} (${cacheInfo.isCached ? 'from cache' : 'freshly fetched'})`
            );
          } else {
            console.log(
              `No valid sellers.json data available for ${domain} (status: ${cacheInfo.status})`
            );
          }

          return { domain, success: true };
        } catch (error) {
          console.error(`Error pre-fetching sellers.json for ${domain}:`, error);
          return { domain, success: false, error };
        }
      });

      // 並列取得の完了を待つ
      const fetchResults = await Promise.all(fetchPromises);
      console.log(`Completed pre-fetching sellers.json for ${fetchResults.length} domains`);
      console.log(
        `Successfully pre-fetched: ${fetchResults.filter((r) => r.success).length} domains`
      );

      // 4. レコードを分類とレコードの拡張
      // 分類1: その他
      const otherRecords: any[] = [];
      // 分類2: sellerレコードがis_confidential = 1 のもの
      const confidentialRecords: any[] = [];
      // 分類3: sellers.jsonに記載のないもの
      const missingSellerIdRecords: any[] = [];
      // 分類4: sellers.jsonが提供されていない広告システムのもの
      const noSellerJsonRecords: any[] = [];

      // 各レコードを拡張して分類する
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
          if (!sellersJsonData || !Array.isArray(sellersJsonData.sellers)) {
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

      console.log(
        `Level 2 optimization complete. Result length: ${enhancedContent.length} characters`
      );
      console.log(
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
    console.log(`Unknown optimization level: ${level}, using level1 instead`);
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
    console.error('Error optimizing ads.txt content:', error);

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
        console.log(`Force-fetching fresh ads.txt for domain: ${publisherDomain}`);
        const { default: AdsTxtCacheModel } = await import('../models/AdsTxtCache');

        // Force ads.txt fetch by calling the domain validation endpoint directly with force parameter
        const axios = (await import('axios')).default;
        const port = process.env.PORT || 3001; // Use consistent default port
        const cacheResponse = await axios.get(
          `http://localhost:${port}/api/adsTxtCache/domain/${encodeURIComponent(publisherDomain)}?force=true`
        );

        console.log(`Ads.txt cache response status: ${cacheResponse.status}`);
        console.log(
          `Ads.txt cache response data:`,
          JSON.stringify(cacheResponse.data).substring(0, 300) + '...'
        );

        console.log(`Performing duplicate check for domain: ${publisherDomain}`);

        // Log entry counts before cross-check
        const cachedData = await AdsTxtCacheModel.getByDomain(publisherDomain);
        if (cachedData && cachedData.content) {
          console.log(`Raw ads.txt content length: ${cachedData.content.length}`);
          const lines = cachedData.content.split('\n');
          console.log(`Total lines in ads.txt: ${lines.length}`);

          // Count interesting lines (non-comment, non-empty)
          const interestingLines = lines.filter((line) => {
            const trimmed = line.trim();
            return trimmed.length > 0 && !trimmed.startsWith('#');
          });
          console.log(`Interesting (non-comment, non-empty) lines: ${interestingLines.length}`);

          // Print the first few entries containing ad-generation.jp
          const adGenLines = interestingLines.filter((line) =>
            line.toLowerCase().includes('ad-generation.jp')
          );
          console.log(`Lines containing ad-generation.jp: ${adGenLines.length}`);
          if (adGenLines.length > 0) {
            console.log('Sample ad-generation.jp lines:');
            adGenLines.slice(0, 5).forEach((line, i) => console.log(`  ${i + 1}: ${line}`));
          }
        }

        parsedRecords = await crossCheckAdsTxtRecords(publisherDomain, parsedRecords);
        console.log(`Processed ${parsedRecords.length} records after cross-check`);
        console.log(`Found ${parsedRecords.filter((r) => r.has_warning).length} duplicates`);
      } catch (err) {
        console.error(`Failed to perform cross-check: ${err}`);
        // Continue with cross-check even if force fetch fails
        try {
          parsedRecords = await crossCheckAdsTxtRecords(publisherDomain, parsedRecords);
        } catch (crossCheckErr) {
          console.error(`Cross-check also failed: ${crossCheckErr}`);
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
            console.log(
              `Using sellers.json for ${record.domain} (${cacheInfo.isCached ? 'from cache' : 'freshly fetched'})`
            );
          } else {
            console.log(
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
        console.error(`Error getting certification authority ID for ${record.domain}:`, error);
      }
    }

    content += line + '\n';
  }

  // Set the content type for downloading as a text file
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', 'attachment; filename="ads.txt"');

  res.status(200).send(content);
});
