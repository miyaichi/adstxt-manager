import axios from 'axios';
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
  'google.com': 'https://storage.googleapis.com/adx-rtb-dictionaries/sellers.json',
  'advertising.com': 'https://dragon-advertising.com/sellers.json',
};

// HTTP request configuration
const HTTP_REQUEST_CONFIG = {
  timeout: 10000, // 10 seconds timeout
  validateStatus: () => true, // Allow any status code for proper error handling
  maxContentLength: 200 * 1024 * 1024, // 200MB for large files
  decompress: true, // Handle gzipped responses
  headers: {
    'User-Agent': 'AdsTxtManager/1.0',
    Accept: 'application/json',
  },
};

// Cache expiration time in hours
const CACHE_EXPIRATION_HOURS = 24;

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
  logger.info(`[fetchSellersJsonWithCache] Looking up sellers.json for domain: ${domain}`);

  // Check cache first
  const cachedData = await SellersJsonCacheModel.getByDomain(domain);
  const cacheExpired = cachedData
    ? SellersJsonCacheModel.isCacheExpired(cachedData.updated_at, CACHE_EXPIRATION_HOURS)
    : true;

  // Use valid cache if available and not forcing refresh
  if (cachedData && !forceRefresh && !cacheExpired) {
    const status = cachedData.status;
    logger.info(
      `[fetchSellersJsonWithCache] Using cached "${status}" result for ${domain} (cached at ${cachedData.updated_at})`
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

  // Need to fetch new data
  const reason = !cachedData ? 'not in cache' : forceRefresh ? 'force refresh' : 'cache expired';
  logger.info(`[fetchSellersJsonWithCache] Fetching fresh sellers.json for ${domain} (${reason})`);

  // Fetch from URL
  try {
    // Get URL for sellers.json
    const url = getSellersJsonUrl(domain);
    logger.info(`[fetchSellersJsonWithCache] Fetching from URL: ${url}`);

    // Fetch the sellers.json
    const response = await axios.get(url, HTTP_REQUEST_CONFIG);

    logger.info(
      `[fetchSellersJsonWithCache] Got response from ${domain} with status: ${response.status}`
    );

    // Create cache record from response
    const cacheRecord = createCacheRecordFromResponse(domain, response);

    // Save to cache
    const savedCache = await SellersJsonCacheModel.saveCache(cacheRecord);
    logger.info(
      `[fetchSellersJsonWithCache] Saved ${domain} to cache with status: ${savedCache.status}`
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
    logger.error(`[fetchSellersJsonWithCache] Error fetching sellers.json for ${domain}:`, error);

    // Save error to cache
    try {
      // Use handleSellersJsonError but catch the thrown ApiError
      await handleSellersJsonError(domain, error).catch(() => {
        // Catch and ignore the ApiError since we're handling this internally
        logger.info(`[fetchSellersJsonWithCache] Error handled and saved to cache for ${domain}`);
      });

      // Get the newly saved error cache
      const errorCache = await SellersJsonCacheModel.getByDomain(domain);

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
        `[fetchSellersJsonWithCache] Failed to save error to cache for ${domain}:`,
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
      const contentType = response.headers['content-type'];

      // Check if response is JSON
      if (contentType && contentType.includes('application/json')) {
        // Validate that it's a sellers.json format
        const jsonData: SellersJsonContent = response.data;

        if (
          jsonData &&
          (Array.isArray(jsonData.sellers) || jsonData.contact_email || jsonData.identifiers)
        ) {
          cacheRecord.status = 'success';
          cacheRecord.content = JSON.stringify(jsonData);
        } else {
          cacheRecord.status = 'invalid_format';
          cacheRecord.error_message =
            'Response is JSON but does not contain required sellers.json fields';
        }
      } else {
        cacheRecord.status = 'invalid_format';
        cacheRecord.error_message = `Invalid content type: ${contentType}`;
      }
    } catch (error) {
      cacheRecord.status = 'invalid_format';
      cacheRecord.error_message = 'Failed to parse JSON response';
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

  // Check if this is a 404 error, which should be treated as "not_found"
  const statusCode = error.response?.status || null;
  const is404 = statusCode === 404;
  const errorMessage = error.message || 'Unknown error';

  // Create error cache record
  const errorCacheRecord = {
    domain,
    content: null,
    status: is404 ? 'not_found' : ('error' as SellersJsonCacheStatus),
    status_code: statusCode,
    error_message: is404 ? 'sellers.json file not found' : errorMessage,
  };

  // Save to cache with appropriate status
  await SellersJsonCacheModel.saveCache(errorCacheRecord);

  // For 404 errors, return a more specific message
  throw new ApiError(
    is404 ? 404 : 500,
    '', // Empty message as we'll use keys
    is404 ? 'no-sellers-json' : 'sellers-json-fetch-error',
    { domain, message: is404 ? '' : errorMessage }
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
  const expiryDate = new Date(updatedDate.getTime() + CACHE_EXPIRATION_HOURS * 60 * 60 * 1000);
  return expiryDate.toISOString();
}

/**
 * Get a specific seller from a domain's sellers.json by seller_id
 * @route GET /api/sellersjson/:domain/seller/:sellerId
 */
export const getSellerById = asyncHandler(async (req: Request, res: Response) => {
  const { domain, sellerId } = req.params;

  if (!domain) {
    throw new ApiError(400, 'Domain parameter is required', 'errors:domainRequired');
  }

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

    // 通常のJSON解析で売り手を検索
    if (Array.isArray(sellersJsonData.sellers)) {
      // 売り手をデータ内で検索
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
  const { domain } = req.params;

  if (!domain) {
    throw new ApiError(400, 'Domain parameter is required', 'errors:domainRequired');
  }

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
  const { domain } = req.params;

  if (!domain) {
    throw new ApiError(400, 'Domain parameter is required', 'errors:domainRequired');
  }

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
