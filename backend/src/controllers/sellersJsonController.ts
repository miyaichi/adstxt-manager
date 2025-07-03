import { Request, Response } from 'express';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import SellersJsonCacheModel, {
  SellersJsonCacheStatus,
  SellersJsonContent,
} from '../models/SellersJsonCache';
import { logger } from '../utils/logger';

/**
 * Special domains with non-standard sellers.json URLs
 */
const SPECIAL_DOMAINS: Record<string, string> = {
  // Google
  'google.com': 'https://storage.googleapis.com/adx-rtb-dictionaries/sellers.json',
  'doubleclick.net': 'https://storage.googleapis.com/adx-rtb-dictionaries/sellers.json',
  'googlesyndication.com': 'https://storage.googleapis.com/adx-rtb-dictionaries/sellers.json',

  // AOL / Verizon Group
  'advertising.com': 'https://dragon-advertising.com/sellers.json',
};

// Import required modules
const https = require('https');
const http = require('http');

// HTTP request configuration - インポート時に設定から更新される
const HTTP_REQUEST_CONFIG = {
  timeout: 30000, // 30 seconds timeout for slower sites
  maxContentLength: 200 * 1024 * 1024, // 200MB for large files
  decompress: true, // Handle gzipped responses
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    Connection: 'keep-alive',
    'Cache-Control': 'max-age=0',
  },
  // Configure a custom HTTPS agent for more control over the connection
  httpsAgent: new https.Agent({
    rejectUnauthorized: false, // Allow SSL certificates that don't match hostname
    keepAlive: true, // Keep connections alive for better performance
    timeout: 30000, // Match the request timeout
    maxVersion: 'TLSv1.3', // Support up to TLS 1.3
    minVersion: 'TLSv1', // Support from TLS 1.0 (for older servers)
  }),
  // Custom HTTP agent for HTTP connections
  httpAgent: new http.Agent({
    keepAlive: true,
    timeout: 30000,
  }),
  // Allow significantly more redirects (some sites have many redirects)
  maxRedirects: 10,
  // Ensure redirects are followed
  followRedirect: true,
  followAllRedirects: true,
  // Don't throw on 4xx or 5xx responses
  validateStatus: function (status) {
    return status >= 200 && status < 600; // Accept all responses between 200-599
  },
};

// Cache expiration time in hours - status-specific expiration
const CACHE_EXPIRATION = {
  success: 24, // 成功したデータは24時間キャッシュ
  not_found: 72, // 見つからない場合は72時間キャッシュ（頻繁に再試行しない）
  error: 6, // エラーの場合は6時間後に再試行
  invalid_format: 48, // フォーマットエラーの場合は48時間キャッシュ
  default: 24, // デフォルトは24時間
};

/**
 * Common function to fetch sellers.json data with cache handling
 * @param domain Target domain
 * @param forceRefresh Whether to force refresh cache
 * @returns Sellers.json data and cache information
 */
export async function fetchSellersJsonWithCache(
  domain: string,
  forceRefresh = false
): Promise<{
  sellersJsonData: SellersJsonContent | null;
  cacheInfo: {
    isCached: boolean;
    status: SellersJsonCacheStatus | null;
    updatedAt: string | null;
  };
}> {
  // Always normalize domain to lowercase and trim whitespace to avoid case-sensitivity and whitespace issues
  const normalizedDomain = domain.toLowerCase().trim();
  logger.debug(
    `[fetchSellersJsonWithCache] Looking up sellers.json for domain: ${normalizedDomain} (original: ${domain})`
  );

  // Check cache first - use normalized domain for lookup
  // forceRefreshがtrueの場合はskipCacheをtrueにしてメモリキャッシュをスキップ
  const cachedData = await SellersJsonCacheModel.getByDomain(normalizedDomain, forceRefresh);
  const cacheExpired = cachedData
    ? SellersJsonCacheModel.isCacheExpiredByStatus(cachedData, CACHE_EXPIRATION)
    : true;

  // Use valid cache if available and not forcing refresh
  if (cachedData && !forceRefresh && !cacheExpired) {
    const status = cachedData.status;
    logger.debug(
      `[fetchSellersJsonWithCache] Using cached "${status}" result for ${normalizedDomain} (cached at ${cachedData.updated_at})`
    );

    // Standard cache response
    const cacheResponse = {
      isCached: true,
      status,
      updatedAt: cachedData.updated_at,
    };

    // Handle different cache statuses
    if (status === 'success' && cachedData.content) {
      // Return parsed content for success status
      const parsedData = SellersJsonCacheModel.getParsedContent(cachedData);
      return {
        sellersJsonData: parsedData,
        cacheInfo: cacheResponse,
      };
    } else if (status === 'not_found' || status === 'error') {
      // Return null data for error/not found status
      return {
        sellersJsonData: null,
        cacheInfo: cacheResponse,
      };
    }
  }

  // 新しいデータ取得が必要な理由をログに記録
  const reason = !cachedData ? 'not in cache' : forceRefresh ? 'force refresh' : 'cache expired';
  logger.info(
    `[fetchSellersJsonWithCache] Fetching fresh sellers.json for ${normalizedDomain} (${reason})`
  );

  // ＊＊＊ 仕様に基づいた処理に戻す ＊＊＊
  // 前回追加していたフロントエンド処理時の最適化コードをコメントアウト
  /* 
  // フロントエンドのパフォーマンス向上のため取得処理を軽量化
  if (!forceRefresh && !process.env.FORCE_SELLERS_JSON_FETCH) {
    // 強制更新でない場合は、キャッシュミスであっても空のデータを返す
    // バックグラウンドのバッチプロセスがキャッシュを更新する
    logger.info(`[fetchSellersJsonWithCache] Skipping actual fetch for ${normalizedDomain} to reduce load. Will be updated by batch process.`);
    return {
      sellersJsonData: null,
      cacheInfo: {
        isCached: false,
        status: 'pending',
        updatedAt: null,
      }
    };
  }
  */

  // 仕様確認:
  // 1. レベル２オプティマイズでは、すべてのドメインのsellers.jsonの取得を試みる
  // 2. キャッシュにレコードがあり有効期限内→そのデータを使用(上のif文で処理済み)
  // 3. レコードがない or 有効期限切れ→新しくsellers.jsonを取得(この下の処理)

  // Fetch from URL
  try {
    // Get the primary URL for sellers.json - use normalized domain
    const primaryUrl = getSellersJsonUrl(normalizedDomain);

    // Create a standard fallback URL if we're using a special domain
    let fallbackUrl: string | null = null;
    if (normalizedDomain in SPECIAL_DOMAINS) {
      fallbackUrl = `https://${normalizedDomain}/sellers.json`;
      logger.info(`[fetchSellersJsonWithCache] Using fallback URL if needed: ${fallbackUrl}`);
    }

    logger.info(`[fetchSellersJsonWithCache] Fetching from primary URL: ${primaryUrl}`);

    // Fetch the sellers.json with retry and fallback
    const response = await fetchWithRetry(primaryUrl, fallbackUrl, HTTP_REQUEST_CONFIG);

    logger.info(
      `[fetchSellersJsonWithCache] Got response from ${normalizedDomain} with status: ${response.status}`
    );

    // Create cache record from response
    const cacheRecord = createCacheRecordFromResponse(normalizedDomain, response);

    // Save to cache
    const savedCache = await SellersJsonCacheModel.saveCache(cacheRecord);
    logger.info(
      `[fetchSellersJsonWithCache] Saved ${normalizedDomain} to cache with status: ${savedCache.status}`
    );

    // Standard response for freshly fetched data
    const fetchResponse = {
      isCached: false, // Freshly fetched
      status: savedCache.status,
      updatedAt: savedCache.updated_at,
    };

    // Return the appropriate data
    if (savedCache.status === 'success' && savedCache.content) {
      const parsedData = SellersJsonCacheModel.getParsedContent(savedCache);
      return {
        sellersJsonData: parsedData,
        cacheInfo: fetchResponse,
      };
    } else {
      return {
        sellersJsonData: null,
        cacheInfo: fetchResponse,
      };
    }
  } catch (error) {
    logger.error(
      `[fetchSellersJsonWithCache] Error fetching sellers.json for ${normalizedDomain}:`,
      error
    );

    // Save error to cache
    try {
      // Use handleSellersJsonError but catch the thrown ApiError
      await handleSellersJsonError(normalizedDomain, error).catch(() => {
        // Catch and ignore the ApiError since we're handling this internally
        logger.info(
          `[fetchSellersJsonWithCache] Error handled and saved to cache for ${normalizedDomain}`
        );
      });

      // Get the newly saved error cache
      const errorCache = await SellersJsonCacheModel.getByDomain(normalizedDomain);

      // Create error response with cache data if available
      const errorResponse: {
        isCached: boolean;
        status: SellersJsonCacheStatus | null;
        updatedAt: string | null;
      } = {
        isCached: false, // Freshly fetched error
        status: (errorCache?.status as SellersJsonCacheStatus) || 'error',
        updatedAt: errorCache?.updated_at || new Date().toISOString(),
      };

      return {
        sellersJsonData: null,
        cacheInfo: errorResponse,
      };
    } catch (saveError) {
      logger.error(
        `[fetchSellersJsonWithCache] Failed to save error to cache for ${normalizedDomain}:`,
        saveError
      );

      // In case saving to cache also fails, return generic error info
      const fallbackErrorResponse: {
        isCached: boolean;
        status: SellersJsonCacheStatus | null;
        updatedAt: string | null;
      } = {
        isCached: false,
        status: 'error',
        updatedAt: new Date().toISOString(),
      };

      return {
        sellersJsonData: null,
        cacheInfo: fallbackErrorResponse,
      };
    }
  }
}

// Export utility functions for other controllers
export { createCacheRecordFromResponse, getSellersJsonUrl, handleSellersJsonError };

/**
 * Get the URL for a domain's sellers.json file
 * @param domain The domain to get the URL for
 * @returns The URL for the domain's sellers.json file
 */
function getSellersJsonUrl(domain: string): string {
  // Use special URLs for known domains
  if (domain in SPECIAL_DOMAINS) {
    const url = SPECIAL_DOMAINS[domain];
    logger.info(`Using special URL for ${domain}: ${url}`);
    return url;
  }

  // Use standard URL format (default)
  return `https://${domain}/sellers.json`;
}

/**
 * Fetch with retry and fallback mechanism
 * @param url Primary URL to fetch
 * @param fallbackUrl Optional fallback URL to try if primary fails
 * @param options Axios request options
 * @returns Axios response
 */
async function fetchWithRetry(
  url: string,
  fallbackUrl: string | null = null,
  options: any = {}
): Promise<any> {
  const axios = require('axios');
  let lastError;

  // Try primary URL first
  try {
    logger.info(`Attempting to fetch from primary URL: ${url}`);
    const response = await axios.get(url, options);

    // Log final URL after possible redirects
    const finalUrl = response.request?.res?.responseUrl || response.request?.path || url;
    if (finalUrl !== url) {
      logger.info(`Request was redirected from ${url} to ${finalUrl}`);
    }

    // If we got a valid response (200) or it's 404, we consider it a definitive result
    if (response.status === 200 || response.status === 404) {
      logger.info(`Successfully fetched from primary URL: ${url} (status ${response.status})`);
      return response;
    }

    // Other status codes might indicate temporary issues
    logger.warn(`Received status ${response.status} from ${url}`);
    lastError = new Error(`Primary URL returned status ${response.status}`);

    // Only continue to fallback if we have one
    if (!fallbackUrl) {
      return response;
    }
  } catch (error) {
    logger.warn(`Error fetching from primary URL: ${url}`, error);
    lastError = error;

    // If no fallback, rethrow the error
    if (!fallbackUrl) {
      throw error;
    }
  }

  // If we reached here, we need to try the fallback URL
  try {
    logger.info(`Trying fallback URL: ${fallbackUrl}`);
    const fallbackResponse = await axios.get(fallbackUrl, options);

    // Log final URL after possible redirects for fallback
    const finalFallbackUrl =
      fallbackResponse.request?.res?.responseUrl || fallbackResponse.request?.path || fallbackUrl;
    if (finalFallbackUrl !== fallbackUrl) {
      logger.info(`Fallback request was redirected from ${fallbackUrl} to ${finalFallbackUrl}`);
    }

    return fallbackResponse;
  } catch (fallbackError) {
    logger.error(`Both primary and fallback URLs failed:`, {
      primary: url,
      fallback: fallbackUrl,
      primaryError: lastError.message,
      fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
    });

    // Throw the original error since it's more relevant
    throw lastError;
  }
}

/**
 * Process sellers.json data to find a specific seller
 * @param data The sellers.json data
 * @param normalizedSellerId The normalized seller ID to find
 * @returns The found seller or a not found result
 */
function findSellerInData(data: any, normalizedSellerId: string) {
  const sellers = data.sellers || [];
  logger.info(`Searching among ${sellers.length} sellers for ID ${normalizedSellerId}`);

  // Find the target seller
  const targetSeller = sellers.find(
    (seller: any) => String(seller.seller_id).trim() === normalizedSellerId
  );

  if (targetSeller) {
    logger.info(`Found seller with ID ${normalizedSellerId}`);
    return {
      seller: targetSeller,
    };
  } else {
    logger.warn(`Seller ID ${normalizedSellerId} not found`);
    return {
      seller: null,
      key: 'direct-account-id-not-in-sellers-json',
      params: { account_id: normalizedSellerId },
    };
  }
}

/**
 * Create cache record from HTTP response
 * @param domain The domain
 * @param response The HTTP response
 * @returns Cache record object
 */
function createCacheRecordFromResponse(
  domain: string,
  response: any
): {
  domain: string;
  content: string | null;
  status: SellersJsonCacheStatus;
  status_code: number | null;
  error_message: string | null;
} {
  // Get the final URL after possible redirects
  const finalUrl = response.request?.res?.responseUrl || response.request?.path || null;

  // Log if redirects were followed
  if (finalUrl && finalUrl !== `https://${domain}/sellers.json`) {
    logger.info(`Request for ${domain} was redirected to final URL: ${finalUrl}`);
  }

  // Initialize cache record with explicit type to allow for string assignments
  const cacheRecord: {
    domain: string;
    content: string | null;
    status: SellersJsonCacheStatus;
    status_code: number | null;
    error_message: string | null;
  } = {
    domain,
    content: null,
    status: 'error' as SellersJsonCacheStatus,
    status_code: response.status,
    error_message: null,
  };

  // Process response based on status code
  if (response.status === 200) {
    try {
      // Extract content type, defaulting to JSON if none provided
      const contentType = response.headers['content-type'] || 'application/json';
      let responseData = response.data;

      // Handle both JSON and text responses
      if (typeof responseData === 'string') {
        try {
          // Try to parse as JSON if it's a string
          responseData = JSON.parse(responseData);
          logger.info(`Successfully parsed string response as JSON for ${domain}`);
        } catch (parseError) {
          // If parsing fails, it's not valid JSON
          const errorMessage =
            parseError instanceof Error ? parseError.message : String(parseError);
          logger.warn(`Failed to parse string response as JSON for ${domain}: ${errorMessage}`);
          cacheRecord.status = 'invalid_format';
          cacheRecord.error_message = 'Response is not valid JSON';
          return cacheRecord;
        }
      }

      // Now we know we have a JSON object (either original or parsed from string)
      // Validate that it's a sellers.json format
      const jsonData: SellersJsonContent = responseData;

      // Check if response has the minimum requirements to be considered a valid sellers.json
      // Either sellers array or some metadata (contact_email, identifiers)
      if (
        jsonData &&
        ((Array.isArray(jsonData.sellers) && jsonData.sellers.length > 0) ||
          jsonData.contact_email ||
          (Array.isArray(jsonData.identifiers) && jsonData.identifiers.length > 0))
      ) {
        cacheRecord.status = 'success';
        cacheRecord.content = JSON.stringify(jsonData);
        logger.info(
          `Valid sellers.json for ${domain} with ${Array.isArray(jsonData.sellers) ? jsonData.sellers.length : 0} sellers`
        );
      } else {
        // Check for more specific format issues
        if (jsonData.sellers === undefined) {
          cacheRecord.status = 'invalid_format';
          cacheRecord.error_message = 'Response is missing required "sellers" array';
        } else if (Array.isArray(jsonData.sellers) && jsonData.sellers.length === 0) {
          // Empty sellers array is still valid, just log it
          cacheRecord.status = 'success';
          cacheRecord.content = JSON.stringify(jsonData);
          logger.warn(`Valid sellers.json for ${domain} but with empty sellers array`);
        } else {
          cacheRecord.status = 'invalid_format';
          cacheRecord.error_message = 'Response does not contain required sellers.json fields';
        }
      }
    } catch (error) {
      logger.error(`Error processing 200 response for ${domain}:`, error);
      cacheRecord.status = 'invalid_format';
      cacheRecord.error_message = `Failed to process response: ${error instanceof Error ? error.message : String(error)}`;
    }
  } else if (response.status === 404) {
    cacheRecord.status = 'not_found';
    cacheRecord.error_message = 'sellers.json file not found';
  } else {
    cacheRecord.error_message = `HTTP error ${response.status}`;
  }

  // Log the created cache record
  logger.debug(
    `Created cache record for ${domain}: status=${cacheRecord.status}, code=${cacheRecord.status_code}`
  );

  return cacheRecord;
}

/**
 * Handle error from fetching sellers.json
 * @param domain The domain
 * @param error The error
 */
async function handleSellersJsonError(domain: string, error: any): Promise<never> {
  logger.error(`Error fetching sellers.json for domain ${domain}:`, error);

  // Extract status code and determine status
  const statusCode = error.response?.status || null;
  const is404 = statusCode === 404;
  const errorMessage = error.message || 'Unknown error';

  let status: SellersJsonCacheStatus = 'error';
  let detailedErrorMessage = errorMessage;

  // 特定のエラーに対するより詳細な処理
  if (is404) {
    status = 'not_found';
    detailedErrorMessage = 'sellers.json file not found';
  } else if (errorMessage.includes('ENOTFOUND')) {
    // DNSエラー - ドメインが存在しないか、到達できない
    detailedErrorMessage = `DNS lookup failed for ${domain}`;
  } else if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('timeout')) {
    // タイムアウトエラー
    detailedErrorMessage = `Connection timeout for ${domain}`;
  } else if (errorMessage.includes('certificate')) {
    // SSL証明書エラー
    detailedErrorMessage = `SSL certificate issue for ${domain}: ${errorMessage}`;
  }

  // Create error cache record
  const errorCacheRecord = {
    domain,
    content: null,
    status: status,
    status_code: statusCode,
    error_message: detailedErrorMessage,
  };

  // Save to cache with appropriate status
  await SellersJsonCacheModel.saveCache(errorCacheRecord);

  // For 404 errors, return a more specific message
  throw new ApiError(
    is404 ? 404 : 500,
    '', // Empty message as we'll use keys
    is404 ? 'no-sellers-json' : 'sellers-json-fetch-error',
    { domain, message: detailedErrorMessage }
  );
}

/**
 * Extract metadata from sellers.json content according to IAB spec
 * @param content The sellers.json content
 * @returns The extracted metadata and statistics
 */
function extractMetadata(content: SellersJsonContent | null): {
  contact_email?: string;
  contact_address?: string;
  version?: string;
  identifiers?: any[];
  seller_count: number;
  ext?: any;
} {
  if (!content) {
    return { seller_count: 0 };
  }

  const sellers = content.sellers || [];

  return {
    // Standard IAB sellers.json fields
    contact_email: content.contact_email,
    contact_address: content.contact_address,
    version: content.version,
    identifiers: content.identifiers,
    ext: content.ext,
    // Additional statistics
    seller_count: sellers.length,
  };
}

/**
 * Format cache information for API response
 * @param cache The cache data
 * @returns Formatted cache info
 */
function formatCacheInfo(cache: any) {
  if (!cache) {
    return {
      is_cached: false,
    };
  }

  return {
    is_cached: true,
    last_updated: cache.updated_at,
    status: cache.status,
    expires_at: getExpiryTime(cache.updated_at),
  };
}

/**
 * Calculate when a cache entry will expire
 * @param updatedAt Last update timestamp
 * @returns Expiry timestamp
 */
function getExpiryTime(updatedAt: string): string {
  if (!updatedAt) return '';

  const updatedDate = new Date(updatedAt);
  // デフォルトの有効期限を使用
  const expiryDate = new Date(updatedDate.getTime() + CACHE_EXPIRATION.default * 60 * 60 * 1000);
  return expiryDate.toISOString();
}

/**
 * Get multiple sellers from a domain's sellers.json in a single request
 * @route POST /api/v1/sellersjson/:domain/sellers/batch
 */
export const batchGetSellers = asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  let { domain } = req.params;
  const { sellerIds, force = false } = req.body;

  if (!domain) {
    throw new ApiError(400, 'Domain parameter is required', 'errors:domainRequired');
  }

  // Normalize domain to lowercase and trim whitespace
  domain = domain.toLowerCase().trim();

  // Validate sellerIds array
  if (!Array.isArray(sellerIds) || sellerIds.length === 0) {
    throw new ApiError(400, 'sellerIds must be a non-empty array', 'INVALID_SELLER_IDS', {
      details: `Received ${Array.isArray(sellerIds) ? sellerIds.length : 'non-array'} seller IDs, expected 1-100`,
    });
  }

  if (sellerIds.length > 100) {
    throw new ApiError(400, 'Maximum 100 seller IDs allowed per request', 'TOO_MANY_SELLER_IDS', {
      details: `Received ${sellerIds.length} seller IDs`,
    });
  }

  // Validate and normalize seller IDs
  const normalizedSellerIds = sellerIds.map((id: any) => {
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new ApiError(
        400,
        'All seller IDs must be non-empty strings',
        'INVALID_SELLER_ID_FORMAT',
        { details: `Invalid seller ID: ${id}` }
      );
    }
    return String(id).trim();
  });

  // Remove duplicates while preserving order
  const uniqueSellerIds = [...new Set(normalizedSellerIds)];

  try {
    logger.info(`Batch lookup for ${uniqueSellerIds.length} sellers from ${domain}`);

    // データがある場合、JSONB最適化を試す
    try {
      const optimizedResult = await SellersJsonCacheModel.batchGetSellersOptimized(
        domain,
        uniqueSellerIds
      );

      // JSONB最適化が成功した場合、その結果を使用
      if (optimizedResult) {
        logger.info(`Using optimized JSONB batch query for ${domain}`);

        // キャッシュ情報をフォーマット
        const formattedCacheInfo = {
          is_cached: true, // JSONB最適化はキャッシュから取得
          last_updated: optimizedResult.cacheRecord.updated_at,
          status: optimizedResult.cacheRecord.status,
          expires_at: getExpiryTime(optimizedResult.cacheRecord.updated_at),
        };

        const processingTime = Date.now() - startTime;

        // JSONB結果をフォーマット（sourceフィールドを追加）
        const formattedResults = optimizedResult.results.map((result: any) => ({
          ...result,
          source: 'cache', // JSONB最適化はキャッシュから取得
        }));

        logger.info(
          `JSONB batch lookup completed: ${optimizedResult.foundCount}/${uniqueSellerIds.length} sellers found in ${processingTime}ms`
        );

        return res.status(200).json({
          success: true,
          data: {
            domain,
            requested_count: uniqueSellerIds.length,
            found_count: optimizedResult.foundCount,
            results: formattedResults,
            metadata: optimizedResult.metadata,
            cache: formattedCacheInfo,
            processing_time_ms: processingTime,
          },
        });
      }
    } catch (optimizationError) {
      logger.warn(
        `Optimized JSONB batch query failed, falling back to standard method: ${optimizationError}`
      );
      // 標準メソッドにフォールバック
    }

    // 共通関数を使用してsellers.jsonデータを取得（フォールバック）
    const forceRefresh = force === true;
    const { sellersJsonData, cacheInfo } = await fetchSellersJsonWithCache(domain, forceRefresh);

    // キャッシュ情報をフォーマット
    const formattedCacheInfo = {
      is_cached: cacheInfo.isCached,
      last_updated: cacheInfo.updatedAt,
      status: cacheInfo.status,
      expires_at: cacheInfo.updatedAt ? getExpiryTime(cacheInfo.updatedAt) : null,
    };

    const results: any[] = [];
    let foundCount = 0;

    // データがない場合（not_foundやerror）
    if (!sellersJsonData) {
      logger.info(`No sellers.json data available for ${domain} (status: ${cacheInfo.status})`);

      // すべてのsellerIdについて「見つからない」結果を返す
      for (const sellerId of uniqueSellerIds) {
        results.push({
          sellerId,
          seller: null,
          found: false,
          error: 'sellers.json not found for domain',
          source: cacheInfo.isCached ? 'cache' : 'fresh',
        });
      }
    } else {
      // データがある場合、各sellerIdを検索
      const sellers = sellersJsonData.sellers || [];

      // パフォーマンス向上のため、sellersをMapに変換
      const sellersMap = new Map();
      sellers.forEach((seller: any) => {
        if (seller.seller_id) {
          sellersMap.set(String(seller.seller_id).trim(), seller);
        }
      });

      for (const sellerId of uniqueSellerIds) {
        const seller = sellersMap.get(sellerId);
        if (seller) {
          foundCount++;
          results.push({
            sellerId,
            seller,
            found: true,
            source: cacheInfo.isCached ? 'cache' : 'fresh',
          });
        } else {
          results.push({
            sellerId,
            seller: null,
            found: false,
            error: 'Seller not found in sellers.json',
            source: cacheInfo.isCached ? 'cache' : 'fresh',
          });
        }
      }
    }

    // メタデータを抽出
    const metadata = extractMetadata(sellersJsonData);

    const processingTime = Date.now() - startTime;

    logger.info(
      `Batch lookup completed: ${foundCount}/${uniqueSellerIds.length} sellers found in ${processingTime}ms`
    );

    return res.status(200).json({
      success: true,
      data: {
        domain,
        requested_count: uniqueSellerIds.length,
        found_count: foundCount,
        results,
        metadata,
        cache: formattedCacheInfo,
        processing_time_ms: processingTime,
      },
    });
  } catch (error: any) {
    logger.error(`Batch lookup error for ${domain}:`, error);
    return handleSellersJsonError(domain, error);
  }
});

/**
 * Get a specific seller from a domain's sellers.json by seller_id
 * @route GET /api/sellersjson/:domain/seller/:sellerId
 */
export const getSellerById = asyncHandler(async (req: Request, res: Response) => {
  let { domain, sellerId } = req.params;

  if (!domain) {
    throw new ApiError(400, 'Domain parameter is required', 'errors:domainRequired');
  }

  // Normalize domain to lowercase and trim whitespace
  domain = domain.toLowerCase().trim();

  if (!sellerId) {
    throw new ApiError(400, 'Seller ID parameter is required', 'errors:sellerIdRequired');
  }

  // Normalize seller ID (convert to string and trim whitespace)
  const normalizedSellerId = String(sellerId).trim();

  try {
    logger.info(`Looking for seller_id: ${normalizedSellerId} from ${domain}`);
    logger.debug(
      `Request details: domain=${domain}, sellerId=${sellerId}, normalizedSellerId=${normalizedSellerId}`
    );

    // 共通関数を使用してsellers.jsonデータを取得
    const forceRefresh = req.query.force === 'true';
    const { sellersJsonData, cacheInfo } = await fetchSellersJsonWithCache(domain, forceRefresh);

    // キャッシュ情報をフォーマット
    const formattedCacheInfo = {
      is_cached: cacheInfo.isCached,
      last_updated: cacheInfo.updatedAt,
      status: cacheInfo.status,
      expires_at: cacheInfo.updatedAt ? getExpiryTime(cacheInfo.updatedAt) : null,
    };

    // データがない場合（not_foundやerror）
    if (!sellersJsonData) {
      logger.info(`No sellers.json data available for ${domain} (status: ${cacheInfo.status})`);
      return res.status(200).json({
        success: true,
        data: {
          domain,
          seller: null,
          found: false,
          key: 'no-sellers-json',
          params: { domain },
          metadata: { seller_count: 0 },
          cache: formattedCacheInfo,
        },
      });
    }

    // データがある場合、最適化クエリを試す
    try {
      const optimizedResult = await SellersJsonCacheModel.getSellerByIdOptimized(
        domain,
        normalizedSellerId
      );

      // If optimized query was successful, use its results
      if (optimizedResult) {
        logger.info(`Using optimized JSONB query for ${domain}`);
        return res.status(200).json({
          success: true,
          data: {
            domain,
            seller: optimizedResult.seller,
            found: optimizedResult.found,
            key: optimizedResult.found ? null : 'account-id-not-in-sellers-json',
            params: optimizedResult.found ? null : { domain, account_id: normalizedSellerId },
            metadata: optimizedResult.metadata,
            cache: formattedCacheInfo,
          },
        });
      }
    } catch (optimizationError) {
      logger.warn(
        `Optimized JSONB query failed, falling back to standard method: ${optimizationError}`
      );
      // 標準メソッドにフォールバック
    }

    // 通常のJSON解析でセラーを検索
    if (Array.isArray(sellersJsonData.sellers)) {
      // セラーをデータ内で検索
      const result = findSellerInData(sellersJsonData, normalizedSellerId);

      // メタデータを抽出
      const metadata = extractMetadata(sellersJsonData);

      logger.info(`Using standard search for seller ${normalizedSellerId} in ${domain}`);
      return res.status(200).json({
        success: true,
        data: {
          domain,
          seller: result.seller || null,
          found: result.seller ? true : false,
          key: result.key,
          params: result.params,
          metadata,
          cache: formattedCacheInfo,
        },
      });
    } else {
      // sellers配列がない場合
      logger.warn(`No sellers array in data for ${domain}`);
      return res.status(200).json({
        success: true,
        data: {
          domain,
          seller: null,
          found: false,
          key: 'invalid-sellers-json-format',
          params: { domain },
          metadata: extractMetadata(sellersJsonData),
          cache: formattedCacheInfo,
        },
      });
    }
  } catch (error: any) {
    return handleSellersJsonError(domain, error);
  }
});

/**
 * Fetch sellers.json from a domain and return cached or fresh data
 * @route GET /api/sellersjson/:domain
 */
export const getSellersJson = asyncHandler(async (req: Request, res: Response) => {
  let { domain } = req.params;

  if (!domain) {
    throw new ApiError(400, 'Domain parameter is required', 'errors:domainRequired');
  }

  // Normalize domain to lowercase and trim whitespace
  domain = domain.toLowerCase().trim();

  try {
    // 共通関数を使用してsellers.jsonデータを取得
    const forceRefresh = req.query.force === 'true';
    const { sellersJsonData, cacheInfo } = await fetchSellersJsonWithCache(domain, forceRefresh);

    // 元のキャッシュデータを取得して詳細情報を返す
    const cachedData = await SellersJsonCacheModel.getByDomain(domain);

    return res.status(200).json({
      success: true,
      data: {
        domain,
        url: getSellersJsonUrl(domain),
        content: sellersJsonData,
        status: cachedData?.status || cacheInfo.status,
        status_code: cachedData?.status_code || null,
        error_message: cachedData?.error_message || null,
        cached: cacheInfo.isCached,
        updated_at: cachedData?.updated_at || cacheInfo.updatedAt,
      },
    });
  } catch (error: any) {
    return handleSellersJsonError(domain, error);
  }
});

/**
 * Get metadata from a domain's sellers.json without the full sellers array
 * @route GET /api/sellersjson/:domain/metadata
 */
export const getSellersJsonMetadata = asyncHandler(async (req: Request, res: Response) => {
  let { domain } = req.params;

  if (!domain) {
    throw new ApiError(400, 'Domain parameter is required', 'errors:domainRequired');
  }

  // Normalize domain to lowercase and trim whitespace
  domain = domain.toLowerCase().trim();

  try {
    // 共通関数を使用してsellers.jsonデータを取得
    const forceRefresh = req.query.force === 'true';
    const { sellersJsonData, cacheInfo } = await fetchSellersJsonWithCache(domain, forceRefresh);

    // メタデータを抽出
    const metadata = extractMetadata(sellersJsonData);

    // キャッシュ情報をフォーマット
    const formattedCacheInfo = {
      is_cached: cacheInfo.isCached,
      last_updated: cacheInfo.updatedAt,
      status: cacheInfo.status,
      expires_at: cacheInfo.updatedAt ? getExpiryTime(cacheInfo.updatedAt) : null,
    };

    // レスポンスを返す
    return res.status(200).json({
      success: true,
      data: {
        domain,
        metadata,
        cache: formattedCacheInfo,
      },
    });
  } catch (error: any) {
    return handleSellersJsonError(domain, error);
  }
});
