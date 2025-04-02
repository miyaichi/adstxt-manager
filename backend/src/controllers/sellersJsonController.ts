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
      message: null
    };
  } else {
    logger.warn(`Seller ID ${normalizedSellerId} not found`);
    return {
      seller: null,
      message: `Seller ID ${normalizedSellerId} not found in sellers.json`
    };
  }
}

/**
 * Create cache record from HTTP response
 * @param domain The domain
 * @param response The HTTP response 
 * @returns Cache record object
 */
function createCacheRecordFromResponse(domain: string, response: any): {
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
  
  return cacheRecord;
}

/**
 * Handle error from fetching sellers.json
 * @param domain The domain
 * @param error The error 
 */
async function handleSellersJsonError(domain: string, error: any): Promise<never> {
  logger.error(`Error fetching sellers.json for domain ${domain}:`, error);
  
  // Save error to cache
  const errorMessage = error.message || 'Unknown error';
  await SellersJsonCacheModel.saveCache({
    domain,
    content: null,
    status: 'error',
    status_code: error.response?.status || null,
    error_message: errorMessage,
  });
  
  throw new ApiError(
    500,
    `Error fetching sellers.json: ${errorMessage}`,
    'errors:sellersFetchError',
    { message: errorMessage }
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
    seller_count: sellers.length
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
      is_cached: false
    };
  }

  return {
    is_cached: true,
    last_updated: cache.updated_at,
    status: cache.status,
    expires_at: getExpiryTime(cache.updated_at)
  };
}

/**
 * Calculate when a cache entry will expire
 * @param updatedAt Last update timestamp
 * @returns Expiry timestamp
 */
function getExpiryTime(updatedAt: string): string {
  const updatedDate = new Date(updatedAt);
  const expiryHours = 24; // Same as in isCacheExpired
  const expiryDate = new Date(updatedDate.getTime() + expiryHours * 60 * 60 * 1000);
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
    // Get URL for sellers.json
    const url = getSellersJsonUrl(domain);
    
    logger.info(`Looking for seller_id: ${normalizedSellerId} from ${domain}`);
    logger.debug(`Request details: domain=${domain}, sellerId=${sellerId}, normalizedSellerId=${normalizedSellerId}`);
    
    // Check the database cache for this domain
    logger.info(`Checking database cache for ${domain}`);
    const cachedData = await SellersJsonCacheModel.getByDomain(domain);
    const cacheInfo = formatCacheInfo(cachedData);
    
    // If we have a valid cached record, try to use it
    if (cachedData && cachedData.status === 'success') {
      try {
        const parsedData = SellersJsonCacheModel.getParsedContent(cachedData);
        
        if (parsedData && Array.isArray(parsedData.sellers)) {
          // Find seller in cached data
          const result = findSellerInData(parsedData, normalizedSellerId);
          
          // Extract metadata from content
          const metadata = extractMetadata(parsedData);
          
          return res.status(200).json({
            success: true,
            data: {
              domain,
              seller: result.seller || null,
              found: result.seller ? true : false,
              message: result.message,
              metadata,
              cache: cacheInfo
            }
          });
        }
      } catch (error: any) {
        logger.error(`Error parsing cached sellers.json for ${domain}: ${error.message}`);
        // If there's an error parsing the cached data, fall back to API
      }
    }
    
    logger.info(`No valid sellers data in cache for ${domain}, fetching from API`);
    
    // Fetch sellers.json data from API
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'json',
      timeout: 30000,
      headers: {
        'User-Agent': 'AdsTxtManager/1.0',
        Accept: 'application/json',
      },
    });
    
    // Create cache record and save it
    const cacheRecord = createCacheRecordFromResponse(domain, response);
    const savedCache = await SellersJsonCacheModel.saveCache(cacheRecord);
    const freshCacheInfo = formatCacheInfo(savedCache);
    
    // Process the response
    logger.info(`Successfully fetched sellers.json from ${domain}`);
    const sellersJson = response.data;
    const result = findSellerInData(sellersJson, normalizedSellerId);
    
    // Extract metadata from content
    const metadata = extractMetadata(sellersJson);
    
    return res.status(200).json({
      success: true,
      data: {
        domain,
        seller: result.seller || null,
        found: result.seller ? true : false,
        message: result.message,
        metadata,
        cache: freshCacheInfo
      }
    });
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
    // Check if we have a cached version
    const cachedData = await SellersJsonCacheModel.getByDomain(domain);

    // If we have cached data and it's not expired, return it
    if (cachedData && !SellersJsonCacheModel.isCacheExpired(cachedData.updated_at)) {
      logger.info(`Serving cached sellers.json for domain: ${domain}`);

      // Get the parsed content directly without redundant parsing
      const parsedContent = SellersJsonCacheModel.getParsedContent(cachedData);

      return res.status(200).json({
        success: true,
        data: {
          domain,
          content: parsedContent,
          status: cachedData.status,
          status_code: cachedData.status_code,
          error_message: cachedData.error_message,
          cached: true,
          updated_at: cachedData.updated_at,
        },
      });
    }

    logger.info(`Cache expired or not found, fetching fresh sellers.json for: ${domain}`);

    // Get URL for sellers.json
    const url = getSellersJsonUrl(domain);

    // Fetch the sellers.json
    let response;
    try {
      logger.info(`Fetching from URL: ${url}`);
      response = await axios.get(url, {
        timeout: 30000, // Increase timeout for large files
        validateStatus: () => true, // Allow any status code
        maxContentLength: 200 * 1024 * 1024, // 200MB for large files
        decompress: true, // Handle gzipped responses
      });
    } catch (error: any) {
      return handleSellersJsonError(domain, error);
    }

    // Create cache record from response
    const cacheRecord = createCacheRecordFromResponse(domain, response);
    
    // Save to cache
    const savedCache = await SellersJsonCacheModel.saveCache(cacheRecord);

    // Get the parsed content
    const parsedContent = SellersJsonCacheModel.getParsedContent(savedCache);

    // Return response
    return res.status(200).json({
      success: true,
      data: {
        domain,
        url: url,
        content: parsedContent,
        status: savedCache.status,
        status_code: savedCache.status_code,
        error_message: savedCache.error_message,
        cached: false,
        updated_at: savedCache.updated_at,
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
    // Check if we have a cached version
    const cachedData = await SellersJsonCacheModel.getByDomain(domain);
    
    // Parse the content and extract metadata
    const parsedContent = SellersJsonCacheModel.getParsedContent(cachedData);
    const metadata = extractMetadata(parsedContent);
    const cacheInfo = formatCacheInfo(cachedData);

    // If we have valid cached data
    if (cachedData && cachedData.status === 'success') {
      logger.info(`Serving metadata for domain: ${domain} from cache`);
      
      return res.status(200).json({
        success: true,
        data: {
          domain,
          metadata,
          cache: cacheInfo
        }
      });
    }
    
    // If we don't have valid cache or it's expired, fetch fresh data
    logger.info(`Fetching fresh sellers.json metadata for: ${domain}`);
    
    // Get URL for sellers.json
    const url = getSellersJsonUrl(domain);
    
    // Fetch the sellers.json
    let response;
    try {
      logger.info(`Fetching from URL: ${url}`);
      response = await axios.get(url, {
        timeout: 30000,
        validateStatus: () => true,
        maxContentLength: 200 * 1024 * 1024,
        decompress: true,
      });
    } catch (error: any) {
      return handleSellersJsonError(domain, error);
    }
    
    // Create cache record from response
    const cacheRecord = createCacheRecordFromResponse(domain, response);
    
    // Save to cache
    const savedCache = await SellersJsonCacheModel.saveCache(cacheRecord);
    
    // Get the parsed content and extract metadata
    const freshContent = SellersJsonCacheModel.getParsedContent(savedCache);
    const freshMetadata = extractMetadata(freshContent);
    const freshCacheInfo = formatCacheInfo(savedCache);
    
    // Return response
    return res.status(200).json({
      success: true,
      data: {
        domain,
        metadata: freshMetadata,
        cache: freshCacheInfo
      }
    });
    
  } catch (error: any) {
    return handleSellersJsonError(domain, error);
  }
});