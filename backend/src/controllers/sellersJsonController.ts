import { Request, Response } from 'express';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import SellersJsonCacheModel, {
  SellersJsonCacheStatus,
  SellersJsonContent,
  SellersJsonCacheModel as SellersJsonCacheClass,
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
  const isTimeout = error.code === 'ECONNABORTED' || errorMessage.includes('timeout');

  let status: SellersJsonCacheStatus = 'error';
  let errorCode = 'SELLERS_JSON_FETCH_ERROR';
  let detailedErrorMessage = errorMessage;
  let suggestedAction = 'retry_after_delay';
  let retryAfter = 300; // 5 minutes default

  // Enhanced error categorization and handling
  if (is404) {
    status = 'not_found';
    errorCode = 'SELLERS_JSON_NOT_FOUND';
    detailedErrorMessage = 'sellers.json file not found at expected URL';
    suggestedAction = 'verify_domain_supports_sellers_json';
    retryAfter = 3600; // 1 hour for 404s
  } else if (errorMessage.includes('ENOTFOUND')) {
    errorCode = 'DNS_LOOKUP_FAILED';
    detailedErrorMessage = `DNS lookup failed for ${domain}`;
    suggestedAction = 'verify_domain_exists';
    retryAfter = 1800; // 30 minutes
  } else if (isTimeout || errorMessage.includes('ETIMEDOUT')) {
    errorCode = 'CONNECTION_TIMEOUT';
    detailedErrorMessage = `Connection timeout for ${domain} (exceeded 30s)`;
    suggestedAction = 'retry_with_smaller_batch';
    retryAfter = 60; // 1 minute for timeouts
  } else if (errorMessage.includes('certificate')) {
    errorCode = 'SSL_CERTIFICATE_ERROR';
    detailedErrorMessage = `SSL certificate issue for ${domain}: ${errorMessage}`;
    suggestedAction = 'contact_domain_administrator';
    retryAfter = 1800; // 30 minutes
  } else if (statusCode === 403) {
    errorCode = 'ACCESS_FORBIDDEN';
    detailedErrorMessage = `Access forbidden for ${domain}/sellers.json`;
    suggestedAction = 'verify_api_permissions';
    retryAfter = 3600; // 1 hour
  } else if (statusCode === 500 || statusCode === 502 || statusCode === 503) {
    errorCode = 'SERVER_ERROR';
    detailedErrorMessage = `Server error from ${domain} (${statusCode})`;
    suggestedAction = 'retry_after_delay';
    retryAfter = 300; // 5 minutes
  } else if (errorMessage.includes('ECONNRESET')) {
    errorCode = 'CONNECTION_RESET';
    detailedErrorMessage = `Connection reset by ${domain}`;
    suggestedAction = 'retry_after_delay';
    retryAfter = 120; // 2 minutes
  }

  // Create enhanced error cache record with detailed metadata
  const errorCacheRecord = {
    domain,
    content: null,
    status: status,
    status_code: statusCode,
    error_message: detailedErrorMessage,
    error_metadata: {
      error_code: errorCode,
      original_error: errorMessage,
      suggested_action: suggestedAction,
      retry_after: retryAfter,
      timestamp: new Date().toISOString(),
      request_timeout: isTimeout,
      network_error: errorMessage.includes('ENOTFOUND') || errorMessage.includes('ECONNRESET'),
    },
  };

  // Save to cache with appropriate status
  await SellersJsonCacheModel.saveCache(errorCacheRecord);

  // Throw enhanced ApiError with detailed information
  throw new ApiError(
    is404 ? 404 : 500,
    '', // Empty message as we'll use keys
    is404 ? 'no-sellers-json' : 'sellers-json-fetch-error',
    {
      domain,
      error: {
        code: errorCode,
        message: detailedErrorMessage,
        details: {
          status_code: statusCode,
          original_error: errorMessage,
          suggested_action: suggestedAction,
          retry_after: retryAfter,
          is_timeout: isTimeout,
          is_network_error:
            errorMessage.includes('ENOTFOUND') || errorMessage.includes('ECONNRESET'),
          timestamp: new Date().toISOString(),
        },
      },
    }
  );
}

/**
 * Add performance monitoring headers to response
 */
function addPerformanceHeaders(
  res: Response,
  metrics: {
    processingTime: number;
    databaseTime?: number;
    cacheHitRate?: number;
    queuePosition?: number;
    method?: string;
    concurrentRequests?: number;
  }
) {
  res.set({
    'X-Processing-Time': `${metrics.processingTime}ms`,
    'X-Database-Time': metrics.databaseTime ? `${metrics.databaseTime}ms` : '0ms',
    'X-Cache-Hit-Rate': metrics.cacheHitRate?.toString() || '0',
    'X-Queue-Position': metrics.queuePosition?.toString() || '0',
    'X-Processing-Method': metrics.method || 'standard',
    'X-Concurrent-Requests': metrics.concurrentRequests?.toString() || '1',
    'X-Response-Timestamp': new Date().toISOString(),
  });
}

/**
 * Calculate system performance metrics
 */
async function getSystemPerformanceMetrics(): Promise<{
  avgResponseTime: number;
  currentLoad: 'low' | 'medium' | 'high';
  suggestedBatchSize: number;
  suggestedDelay: number;
  cacheStatus: 'healthy' | 'degraded' | 'offline';
}> {
  try {
    // Get recent cache performance data from last hour
    const recentPerformance = (await SellersJsonCacheClass.getPerformanceMetrics()) || {
      avgResponseTime: 1000,
      requestCount: 0,
      errorRate: 0,
    };

    // Calculate load based on recent activity and response times
    let currentLoad: 'low' | 'medium' | 'high' = 'low';
    let suggestedBatchSize = 100;
    let suggestedDelay = 0;

    if (recentPerformance.avgResponseTime > 5000) {
      currentLoad = 'high';
      suggestedBatchSize = 20;
      suggestedDelay = 2000;
    } else if (recentPerformance.avgResponseTime > 2000) {
      currentLoad = 'medium';
      suggestedBatchSize = 50;
      suggestedDelay = 1000;
    }

    // Check cache health
    let cacheStatus: 'healthy' | 'degraded' | 'offline' = 'healthy';
    if (recentPerformance.errorRate > 0.1) {
      cacheStatus = 'degraded';
    } else if (recentPerformance.errorRate > 0.5) {
      cacheStatus = 'offline';
    }

    return {
      avgResponseTime: recentPerformance.avgResponseTime,
      currentLoad,
      suggestedBatchSize,
      suggestedDelay,
      cacheStatus,
    };
  } catch (error) {
    logger.warn('Failed to get system performance metrics:', error);
    return {
      avgResponseTime: 1000,
      currentLoad: 'medium',
      suggestedBatchSize: 50,
      suggestedDelay: 1000,
      cacheStatus: 'degraded',
    };
  }
}

/**
 * Health check endpoint for sellers.json API
 * @route GET /api/v1/sellersjson/health
 */
export const getHealthCheck = asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Get system performance metrics
    const metrics = await getSystemPerformanceMetrics();

    // Test database connectivity
    let dbHealthy = true;
    let dbResponseTime = 0;
    try {
      const dbStartTime = Date.now();
      dbHealthy = await SellersJsonCacheClass.testConnection();
      dbResponseTime = Date.now() - dbStartTime;
    } catch (dbError) {
      logger.warn('Database health check failed:', dbError);
      dbHealthy = false;
    }

    // Determine overall health status
    const responseTime = Date.now() - startTime;
    const isHealthy =
      dbHealthy &&
      metrics.cacheStatus !== 'offline' &&
      responseTime < 1000 &&
      metrics.avgResponseTime < 10000;

    const healthStatus = isHealthy
      ? 'healthy'
      : dbHealthy && metrics.cacheStatus !== 'offline'
        ? 'degraded'
        : 'unhealthy';

    // Add performance headers
    addPerformanceHeaders(res, {
      processingTime: responseTime,
      databaseTime: dbResponseTime,
      method: 'health_check',
    });

    return res.status(isHealthy ? 200 : 503).json({
      status: healthStatus,
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime,
      metrics: {
        response_time_avg: metrics.avgResponseTime,
        load: metrics.currentLoad,
        recommended_batch_size: metrics.suggestedBatchSize,
        suggested_delay_ms: metrics.suggestedDelay,
        cache_status: metrics.cacheStatus,
        database_healthy: dbHealthy,
        database_response_time_ms: dbResponseTime,
      },
      checks: {
        database: dbHealthy ? 'pass' : 'fail',
        cache: metrics.cacheStatus === 'healthy' ? 'pass' : 'warn',
        response_time: responseTime < 1000 ? 'pass' : 'warn',
        avg_performance: metrics.avgResponseTime < 5000 ? 'pass' : 'warn',
      },
    });
  } catch (error: any) {
    logger.error('Health check error:', error);

    return res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      response_time_ms: Date.now() - startTime,
      error: {
        message: 'Health check failed',
        details: error.message,
      },
    });
  }
});

/**
 * Performance statistics endpoint
 * @route GET /api/v1/sellersjson/stats
 */
export const getPerformanceStats = asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Get comprehensive performance metrics
    const metrics = await getSystemPerformanceMetrics();

    // Get cache statistics
    const cacheStats = (await SellersJsonCacheClass.getCacheStatistics()) || {
      totalDomains: 0,
      successfulCaches: 0,
      errorCaches: 0,
      notFoundCaches: 0,
      lastUpdated: null,
    };

    // Calculate cache hit rate
    const totalCacheEntries =
      cacheStats.successfulCaches + cacheStats.errorCaches + cacheStats.notFoundCaches;
    const cacheHitRate =
      totalCacheEntries > 0 ? cacheStats.successfulCaches / totalCacheEntries : 0;

    // Add performance headers
    addPerformanceHeaders(res, {
      processingTime: Date.now() - startTime,
      cacheHitRate,
      method: 'stats',
    });

    return res.status(200).json({
      timestamp: new Date().toISOString(),
      performance: {
        avg_response_time_ms: metrics.avgResponseTime,
        current_load: metrics.currentLoad,
        suggested_batch_size: metrics.suggestedBatchSize,
        suggested_delay_ms: metrics.suggestedDelay,
      },
      cache: {
        status: metrics.cacheStatus,
        hit_rate: Math.round(cacheHitRate * 100) / 100,
        total_domains: cacheStats.totalDomains,
        statistics: {
          successful: cacheStats.successfulCaches,
          errors: cacheStats.errorCaches,
          not_found: cacheStats.notFoundCaches,
          last_updated: cacheStats.lastUpdated,
        },
      },
      recommendations: {
        optimal_batch_size: metrics.suggestedBatchSize,
        request_delay_ms: metrics.suggestedDelay,
        use_streaming: metrics.avgResponseTime > 3000,
        use_parallel: metrics.currentLoad === 'low',
      },
      endpoints: {
        standard_batch: '/sellersjson/{domain}/sellers/batch',
        streaming_batch: '/sellersjson/{domain}/sellers/batch/stream',
        parallel_batch: '/sellersjson/batch/parallel',
        health_check: '/sellersjson/health',
        stats: '/sellersjson/stats',
      },
    });
  } catch (error: any) {
    logger.error('Performance stats error:', error);

    return res.status(500).json({
      timestamp: new Date().toISOString(),
      error: {
        message: 'Failed to retrieve performance statistics',
        details: error.message,
      },
    });
  }
});

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

        // Add performance monitoring headers
        addPerformanceHeaders(res, {
          processingTime,
          method: 'optimized_jsonb',
          cacheHitRate: 1.0,
        });

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

    // Add performance monitoring headers for standard processing
    const cacheHitRate = cacheInfo.isCached ? 1.0 : 0.0;
    addPerformanceHeaders(res, {
      processingTime,
      method: cacheInfo.isCached ? 'cache_fallback' : 'fresh_fetch',
      cacheHitRate,
    });

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
 * Enhanced batch get sellers with streaming/progressive response
 * Addresses 24-45 second response time issues by providing immediate feedback
 * @route POST /api/v1/sellersjson/:domain/sellers/batch/stream
 */
export const batchGetSellersStream = asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  let { domain } = req.params;
  const {
    sellerIds,
    force = false,
    priority = 'normal',
    timeout = 10000,
    partial_response = true,
  } = req.body;

  if (!domain) {
    throw new ApiError(400, 'Domain parameter is required', 'errors:domainRequired');
  }

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

  const uniqueSellerIds = [...new Set(normalizedSellerIds)];

  // Set up Server-Sent Events headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
    'X-Processing-Strategy': 'streaming',
    'X-Requested-Count': uniqueSellerIds.length.toString(),
  });

  // Send initial processing status
  res.write(
    `data: ${JSON.stringify({
      status: 'processing',
      progress: 0,
      eta: Math.max(timeout / 1000, 15) + 's',
      domain,
      requested_count: uniqueSellerIds.length,
      timestamp: new Date().toISOString(),
    })}\n\n`
  );

  try {
    logger.info(
      `Streaming batch lookup for ${uniqueSellerIds.length} sellers from ${domain} (priority: ${priority})`
    );

    let foundCount = 0;
    const results: any[] = [];
    const processedSellerIds = new Set<string>();

    // Try optimized JSONB query first
    try {
      const optimizedResult = await SellersJsonCacheModel.batchGetSellersOptimized(
        domain,
        uniqueSellerIds
      );

      if (optimizedResult) {
        logger.info(`Using optimized JSONB batch query for ${domain}`);

        foundCount = optimizedResult.foundCount;
        results.push(
          ...optimizedResult.results.map((result: any) => ({
            ...result,
            source: 'cache',
          }))
        );

        // Add all processed seller IDs
        optimizedResult.results.forEach((result: any) => {
          processedSellerIds.add(result.sellerId);
        });

        // Send partial results
        res.write(
          `data: ${JSON.stringify({
            status: 'partial',
            progress: 80,
            found_count: foundCount,
            processed_count: processedSellerIds.size,
            results: results,
            metadata: optimizedResult.metadata,
            cache: {
              is_cached: true,
              last_updated: optimizedResult.cacheRecord.updated_at,
              status: optimizedResult.cacheRecord.status,
              expires_at: getExpiryTime(optimizedResult.cacheRecord.updated_at),
            },
            processing_time_ms: Date.now() - startTime,
            timestamp: new Date().toISOString(),
          })}\n\n`
        );

        // If all sellers found in optimized query, complete immediately
        if (processedSellerIds.size === uniqueSellerIds.length) {
          res.write(
            `data: ${JSON.stringify({
              status: 'completed',
              progress: 100,
              domain,
              requested_count: uniqueSellerIds.length,
              found_count: foundCount,
              results,
              metadata: optimizedResult.metadata,
              cache: {
                is_cached: true,
                last_updated: optimizedResult.cacheRecord.updated_at,
                status: optimizedResult.cacheRecord.status,
                expires_at: getExpiryTime(optimizedResult.cacheRecord.updated_at),
              },
              processing_time_ms: Date.now() - startTime,
              timestamp: new Date().toISOString(),
            })}\n\n`
          );

          res.end();
          return;
        }
      }
    } catch (optimizationError) {
      logger.warn(
        `Optimized JSONB batch query failed, proceeding with fallback: ${optimizationError}`
      );

      res.write(
        `data: ${JSON.stringify({
          status: 'fallback',
          progress: 20,
          message: 'Using fallback processing method',
          timestamp: new Date().toISOString(),
        })}\n\n`
      );
    }

    // Fallback processing for remaining sellers
    const remainingSellerIds = uniqueSellerIds.filter((id) => !processedSellerIds.has(id));

    if (remainingSellerIds.length > 0) {
      // Set a shorter timeout for HTTP requests to prevent blocking
      const adjustedTimeout = Math.min(timeout, 8000); // Max 8 seconds for HTTP fetch

      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('Processing timeout')), adjustedTimeout);
      });

      const fetchPromise = (async () => {
        const forceRefresh = force === true;
        const { sellersJsonData, cacheInfo } = await fetchSellersJsonWithCache(
          domain,
          forceRefresh
        );

        res.write(
          `data: ${JSON.stringify({
            status: 'fetched',
            progress: 60,
            cache_status: cacheInfo.status,
            is_cached: cacheInfo.isCached,
            timestamp: new Date().toISOString(),
          })}\n\n`
        );

        const formattedCacheInfo = {
          is_cached: cacheInfo.isCached,
          last_updated: cacheInfo.updatedAt,
          status: cacheInfo.status,
          expires_at: cacheInfo.updatedAt ? getExpiryTime(cacheInfo.updatedAt) : null,
        };

        if (!sellersJsonData) {
          // No data available - mark all remaining sellers as not found
          for (const sellerId of remainingSellerIds) {
            results.push({
              sellerId,
              seller: null,
              found: false,
              error: 'sellers.json not found for domain',
              source: cacheInfo.isCached ? 'cache' : 'fresh',
            });
          }
        } else {
          // Process sellers from sellers.json data
          const sellers = sellersJsonData.sellers || [];
          const sellersMap = new Map();

          sellers.forEach((seller: any) => {
            if (seller.seller_id) {
              sellersMap.set(String(seller.seller_id).trim(), seller);
            }
          });

          for (const sellerId of remainingSellerIds) {
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

        // Extract metadata
        const metadata = extractMetadata(sellersJsonData);

        const processingTime = Date.now() - startTime;

        // Send final completion
        res.write(
          `data: ${JSON.stringify({
            status: 'completed',
            progress: 100,
            domain,
            requested_count: uniqueSellerIds.length,
            found_count: foundCount,
            results,
            metadata,
            cache: formattedCacheInfo,
            processing_time_ms: processingTime,
            timestamp: new Date().toISOString(),
          })}\n\n`
        );
      })();

      try {
        await Promise.race([fetchPromise, timeoutPromise]);
      } catch (error) {
        if (error instanceof Error && error.message === 'Processing timeout') {
          logger.warn(`Streaming batch request timed out after ${adjustedTimeout}ms for ${domain}`);

          if (partial_response && results.length > 0) {
            // Return partial results on timeout
            res.write(
              `data: ${JSON.stringify({
                status: 'partial_timeout',
                progress: 95,
                domain,
                requested_count: uniqueSellerIds.length,
                found_count: foundCount,
                results,
                timeout_ms: adjustedTimeout,
                processing_time_ms: Date.now() - startTime,
                message: 'Request timed out, returning partial results',
                timestamp: new Date().toISOString(),
              })}\n\n`
            );
          } else {
            // Send timeout error
            res.write(
              `data: ${JSON.stringify({
                status: 'timeout',
                progress: 95,
                error: {
                  code: 'PROCESSING_TIMEOUT',
                  message: 'Request processing timed out',
                  timeout_ms: adjustedTimeout,
                  suggested_action: 'retry_with_smaller_batch',
                },
                timestamp: new Date().toISOString(),
              })}\n\n`
            );
          }
        } else {
          throw error;
        }
      }
    }

    logger.info(
      `Streaming batch lookup completed: ${foundCount}/${uniqueSellerIds.length} sellers found in ${Date.now() - startTime}ms`
    );
  } catch (error: any) {
    logger.error(`Streaming batch lookup error for ${domain}:`, error);

    res.write(
      `data: ${JSON.stringify({
        status: 'error',
        error: {
          code: 'BATCH_PROCESSING_ERROR',
          message: error.message || 'Unknown error occurred',
          details: error.details || {},
          timestamp: new Date().toISOString(),
        },
      })}\n\n`
    );
  }

  res.end();
});
/**
 * Enhanced batch processing with parallel domain fetching
 * For cases where multiple domains need to be processed
 */
export const batchGetSellersParallel = asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { requests, max_concurrent = 5, fail_fast = false, return_partial = true } = req.body;

  // Validate requests array
  if (!Array.isArray(requests) || requests.length === 0) {
    throw new ApiError(400, 'requests must be a non-empty array', 'INVALID_REQUESTS', {
      details: `Received ${Array.isArray(requests) ? requests.length : 'non-array'} requests, expected 1-10`,
    });
  }

  if (requests.length > 10) {
    throw new ApiError(
      400,
      'Maximum 10 domain requests allowed per parallel batch',
      'TOO_MANY_REQUESTS',
      {
        details: `Received ${requests.length} requests`,
      }
    );
  }

  // Validate each request
  const validatedRequests = requests.map((request: any, index: number) => {
    if (!request.domain || !Array.isArray(request.sellerIds)) {
      throw new ApiError(400, `Invalid request at index ${index}`, 'INVALID_REQUEST_FORMAT', {
        details: `Request must have domain and sellerIds array`,
      });
    }

    return {
      domain: request.domain.toLowerCase().trim(),
      sellerIds: [...new Set(request.sellerIds.map((id: any) => String(id).trim()))],
      force: request.force || false,
    };
  });

  const results: any[] = [];
  const errors: any[] = [];
  let completedCount = 0;

  try {
    logger.info(
      `Processing parallel batch with ${validatedRequests.length} domain requests (max_concurrent: ${max_concurrent})`
    );

    // Process requests with controlled concurrency
    const processRequest = async (request: any) => {
      const { domain, sellerIds, force } = request;
      const requestStartTime = Date.now();

      try {
        // Use the optimized JSONB query first
        let optimizedResult;
        try {
          optimizedResult = await SellersJsonCacheModel.batchGetSellersOptimized(domain, sellerIds);
        } catch (optimizationError) {
          logger.warn(`Optimized query failed for ${domain}, using fallback: ${optimizationError}`);
        }

        if (optimizedResult) {
          logger.info(`Parallel processing: Using optimized JSONB for ${domain}`);

          return {
            domain,
            requested_count: sellerIds.length,
            found_count: optimizedResult.foundCount,
            results: optimizedResult.results.map((result: any) => ({
              ...result,
              source: 'cache',
            })),
            metadata: optimizedResult.metadata,
            cache: {
              is_cached: true,
              last_updated: optimizedResult.cacheRecord.updated_at,
              status: optimizedResult.cacheRecord.status,
              expires_at: getExpiryTime(optimizedResult.cacheRecord.updated_at),
            },
            processing_time_ms: Date.now() - requestStartTime,
            processing_method: 'optimized_jsonb',
          };
        }

        // Fallback to standard processing
        const { sellersJsonData, cacheInfo } = await fetchSellersJsonWithCache(domain, force);

        const domainResults: any[] = [];
        let foundCount = 0;

        if (!sellersJsonData) {
          for (const sellerId of sellerIds) {
            domainResults.push({
              sellerId,
              seller: null,
              found: false,
              error: 'sellers.json not found for domain',
              source: cacheInfo.isCached ? 'cache' : 'fresh',
            });
          }
        } else {
          const sellers = sellersJsonData.sellers || [];
          const sellersMap = new Map();

          sellers.forEach((seller: any) => {
            if (seller.seller_id) {
              sellersMap.set(String(seller.seller_id).trim(), seller);
            }
          });

          for (const sellerId of sellerIds) {
            const seller = sellersMap.get(sellerId);
            if (seller) {
              foundCount++;
              domainResults.push({
                sellerId,
                seller,
                found: true,
                source: cacheInfo.isCached ? 'cache' : 'fresh',
              });
            } else {
              domainResults.push({
                sellerId,
                seller: null,
                found: false,
                error: 'Seller not found in sellers.json',
                source: cacheInfo.isCached ? 'cache' : 'fresh',
              });
            }
          }
        }

        return {
          domain,
          requested_count: sellerIds.length,
          found_count: foundCount,
          results: domainResults,
          metadata: extractMetadata(sellersJsonData),
          cache: {
            is_cached: cacheInfo.isCached,
            last_updated: cacheInfo.updatedAt,
            status: cacheInfo.status,
            expires_at: cacheInfo.updatedAt ? getExpiryTime(cacheInfo.updatedAt) : null,
          },
          processing_time_ms: Date.now() - requestStartTime,
          processing_method: 'standard_fetch',
        };
      } catch (error: any) {
        logger.error(`Parallel processing error for ${domain}:`, error);

        if (fail_fast) {
          throw error;
        }

        return {
          domain,
          requested_count: sellerIds.length,
          found_count: 0,
          results: sellerIds.map((sellerId: string) => ({
            sellerId,
            seller: null,
            found: false,
            error: error.message || 'Processing error',
            source: 'error',
          })),
          metadata: null,
          cache: null,
          processing_time_ms: Date.now() - requestStartTime,
          processing_method: 'error',
          error: {
            code: 'DOMAIN_PROCESSING_ERROR',
            message: error.message || 'Unknown error',
            details: error.details || {},
          },
        };
      }
    };

    // Process with controlled concurrency using Promise.allSettled
    const chunks: any[][] = [];
    for (let i = 0; i < validatedRequests.length; i += max_concurrent) {
      chunks.push(validatedRequests.slice(i, i + max_concurrent));
    }

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(processRequest);
      const chunkResults = await Promise.allSettled(chunkPromises);

      chunkResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
          completedCount++;
        } else {
          const request = chunk[index];
          errors.push({
            domain: request.domain,
            error: result.reason?.message || 'Unknown error',
            requested_count: request.sellerIds.length,
          });

          if (!return_partial) {
            throw new ApiError(
              500,
              `Processing failed for ${request.domain}`,
              'PARALLEL_PROCESSING_ERROR',
              {
                error: result.reason?.message,
              }
            );
          }
        }
      });
    }

    const totalProcessingTime = Date.now() - startTime;
    const totalRequested = results.reduce((sum, r) => sum + r.requested_count, 0);
    const totalFound = results.reduce((sum, r) => sum + r.found_count, 0);

    logger.info(
      `Parallel batch completed: ${completedCount}/${validatedRequests.length} domains processed, ${totalFound}/${totalRequested} sellers found in ${totalProcessingTime}ms`
    );

    return res.status(200).json({
      success: true,
      data: {
        parallel_processing: {
          total_domains: validatedRequests.length,
          completed_domains: completedCount,
          failed_domains: errors.length,
          max_concurrent,
          total_requested_sellers: totalRequested,
          total_found_sellers: totalFound,
        },
        results,
        errors: errors.length > 0 ? errors : undefined,
        processing_time_ms: totalProcessingTime,
        performance_headers: {
          'X-Processing-Strategy': 'parallel',
          'X-Concurrent-Limit': max_concurrent.toString(),
          'X-Total-Domains': validatedRequests.length.toString(),
          'X-Completed-Domains': completedCount.toString(),
          'X-Processing-Time': totalProcessingTime.toString(),
        },
      },
    });
  } catch (error: any) {
    logger.error(`Parallel batch processing error:`, error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'PARALLEL_BATCH_ERROR',
        message: error.message || 'Parallel processing failed',
        details: {
          completed_count: completedCount,
          total_requests: validatedRequests.length,
          errors: errors,
        },
      },
    });
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
