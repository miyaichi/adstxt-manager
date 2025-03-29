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

// Map for caching
const domainSellerDataCache: Map<string, any> = new Map();

// Cache for seller IDs (caching search results)
const sellerIdCache: Map<string, any> = new Map();

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

  // Since sellerId can be provided in various types (string or number),
  // prepare a string-converted sellerId for comparison (also removing unnecessary whitespace)
  const normalizedSellerId = String(sellerId).trim();

  try {
    // First, check the cache
    const cacheKey = `${domain}:${normalizedSellerId}`;
    if (sellerIdCache.has(cacheKey)) {
      logger.info(`Using cached result for seller_id: ${normalizedSellerId} from ${domain}`);
      return res.status(200).json({
        success: true,
        data: sellerIdCache.get(cacheKey),
        cached: true,
      });
    }

    // Determine URL to fetch
    let url: string;

    // Use standard URL format (default)
    url = `https://${domain}/sellers.json`;

    // Some domains require special URLs
    if (domain in SPECIAL_DOMAINS) {
      url = SPECIAL_DOMAINS[domain];
      logger.info(`Using special URL for ${domain}: ${url}`);
    }

    logger.info(`Looking for seller_id: ${normalizedSellerId} from ${domain}`);

    // Add debug information
    logger.debug(
      `Request details: domain=${domain}, sellerId=${sellerId}, normalizedSellerId=${normalizedSellerId}`
    );

    let sellerData;

    // Check in-memory cache for fast access
    if (domainSellerDataCache.has(domain)) {
      sellerData = domainSellerDataCache.get(domain);
      logger.info(`Using in-memory cached sellers.json data for ${domain}`);
    }

    // Check if the cached data is valid
    if (sellerData && Array.isArray(sellerData.sellers)) {
      // Find the seller matching the seller_id
      const targetSeller = sellerData.sellers.find(
        (seller: any) => String(seller.seller_id).trim() === normalizedSellerId
      );

      logger.info(
        `Searching among ${sellerData.sellers.length} sellers in ${domain} for ID ${normalizedSellerId}`
      );

      if (targetSeller) {
        // If seller is found
        logger.info(`Found seller with ID ${normalizedSellerId} in ${domain}`);

        const result = {
          contact_email: sellerData.contact_email,
          version: sellerData.version,
          identifiers: sellerData.identifiers || [],
          seller: targetSeller,
        };

        // Save result to cache
        sellerIdCache.set(cacheKey, result);

        return res.status(200).json({
          success: true,
          data: result,
        });
      } else {
        logger.warn(`Seller ID ${normalizedSellerId} not found in ${domain}`);

        // If seller ID is not found, return "not found" information instead of an error
        const notFoundResult = {
          found: false,
          message: `Seller ID ${normalizedSellerId} not found in ${domain}`,
          sellerId: normalizedSellerId,
        };

        // Also cache "not found" results
        sellerIdCache.set(cacheKey, notFoundResult);

        return res.status(200).json({
          success: true,
          data: notFoundResult,
        });
      }
    }

    // If in-memory cache doesn't have the data, check the database
    logger.info(`Checking database cache for ${domain}`);
    const cachedData = await SellersJsonCacheModel.getByDomain(domain);

    if (cachedData && cachedData.status === 'success' && cachedData.content) {
      try {
        const parsedData = SellersJsonCacheModel.parseContent(cachedData.content);

        if (parsedData && Array.isArray(parsedData.sellers)) {
          // Store in-memory for faster access
          domainSellerDataCache.set(domain, parsedData);

          // Find the seller matching the seller_id
          const targetSeller = parsedData.sellers.find(
            (seller: any) => String(seller.seller_id).trim() === normalizedSellerId
          );

          logger.info(
            `Searching among ${parsedData.sellers.length} sellers in ${domain} from DB cache for ID ${normalizedSellerId}`
          );

          if (targetSeller) {
            logger.info(`Found seller with ID ${normalizedSellerId} in ${domain} from DB cache`);

            const result = {
              contact_email: parsedData.contact_email,
              version: parsedData.version,
              identifiers: parsedData.identifiers || [],
              seller: targetSeller,
              from_db_cache: true,
            };

            // Save result to cache
            sellerIdCache.set(cacheKey, result);

            return res.status(200).json({
              success: true,
              data: result,
            });
          } else {
            logger.warn(`Seller ID ${normalizedSellerId} not found in ${domain} in DB cache`);

            const notFoundResult = {
              found: false,
              message: `Seller ID ${normalizedSellerId} not found in ${domain}`,
              sellerId: normalizedSellerId,
              from_db_cache: true,
            };

            sellerIdCache.set(cacheKey, notFoundResult);

            return res.status(200).json({
              success: true,
              data: notFoundResult,
            });
          }
        }
      } catch (error: any) {
        logger.error(`Error parsing cached sellers.json from DB for ${domain}: ${error.message}`);
        // If there's an error parsing the cached data, fall back to fetching from the API
      }
    }

    logger.info(`No sellers data available in cache for ${domain}, will fetch from API`);

    // Use streaming with Axios (default approach or fallback)
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream',
      timeout: 30000,
      headers: {
        'User-Agent': 'AdsTxtManager/1.0',
        Accept: 'application/json',
      },
    });

    const stream = response.data;

    // Variables for processing JSON data
    let sellerFound = false;
    let contactInfo: Record<string, string> = {};
    let identifiers: Array<Record<string, string>> = [];
    let version = '';

    // Simple approach: load the entire JSON into memory and process it
    const processingPromise = new Promise<any>(async (resolve, reject) => {
      try {
        // Simple approach: load the entire JSON into memory and process it
        let responseData = '';

        stream.on('data', (chunk) => {
          responseData += chunk.toString();
        });

        stream.on('end', () => {
          try {
            // Parse the complete response
            const sellersJson = JSON.parse(responseData);
            logger.info(
              `Successfully parsed sellers.json from ${domain}, found ${sellersJson.sellers?.length || 0} sellers`
            );

            // Extract metadata
            if (sellersJson.contact_email) contactInfo.contact_email = sellersJson.contact_email;
            if (sellersJson.contact_address)
              contactInfo.contact_address = sellersJson.contact_address;
            if (sellersJson.version) version = sellersJson.version;
            if (Array.isArray(sellersJson.identifiers)) identifiers = sellersJson.identifiers;

            // Find the target seller
            const targetSeller = sellersJson.sellers?.find(
              (seller: any) => String(seller.seller_id).trim() === normalizedSellerId
            );

            if (targetSeller) {
              sellerFound = true;
              logger.info(`Found seller with ID ${normalizedSellerId} in ${domain}`);

              // Construct the response object
              const result = {
                ...contactInfo,
                version,
                identifiers,
                seller: targetSeller,
              };

              // Save the result to cache
              sellerIdCache.set(cacheKey, result);

              resolve(result);
            } else {
              logger.warn(`Seller ID ${normalizedSellerId} not found in ${domain}`);
              const notFoundResult = {
                error: null,
                found: false,
                message: 'Seller ID not found in sellers.json',
                sellerId: normalizedSellerId,
              };

              // Also cache "not found" results
              sellerIdCache.set(cacheKey, notFoundResult);

              resolve(notFoundResult);
            }
          } catch (err: any) {
            logger.error(`Error parsing sellers.json from ${domain}: ${err.message}`);
            reject(new Error(`Error parsing sellers.json: ${err.message}`));
          }
        });

        stream.on('error', (err) => {
          logger.error(`Stream error for ${url}: ${err.message}`);
          reject(new Error(`Stream error: ${err.message}`));
        });
      } catch (error: any) {
        logger.error(`Error processing sellers.json from ${domain}: ${error.message}`);
        reject(new Error(`Processing error: ${error.message}`));
      }
    });

    // Wait for the processing to complete
    const result = await processingPromise;

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error(`Error fetching seller ${sellerId} from ${domain}:`, error);
    throw new ApiError(
      500,
      `Error fetching seller information: ${error.message}`,
      'errors:sellersFetchError',
      { message: error.message }
    );
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

      return res.status(200).json({
        success: true,
        data: {
          domain,
          content: cachedData.content ? JSON.parse(cachedData.content) : null,
          status: cachedData.status,
          status_code: cachedData.status_code,
          error_message: cachedData.error_message,
          cached: true,
          updated_at: cachedData.updated_at,
        },
      });
    }

    // Either no cache or cache expired, fetch fresh data
    logger.info(`Fetching fresh sellers.json for domain: ${domain}`);

    // Determine URL to fetch
    let url: string;

    // Use standard URL format (default)
    url = `https://${domain}/sellers.json`;

    // Some domains require special URLs
    if (domain in SPECIAL_DOMAINS) {
      url = SPECIAL_DOMAINS[domain];
      logger.info(`Using special URL for ${domain}: ${url}`);
    }

    // Fetch the sellers.json
    let response;
    try {
      logger.info(`Fetching from URL: ${url}`);
      response = await axios.get(url, {
        timeout: 30000, // Increase timeout for large files
        validateStatus: () => true, // Allow any status code
        maxContentLength: 200 * 1024 * 1024, // 200MB to handle Google's ~114MB file
        decompress: true, // Handle gzipped responses
      });
    } catch (error: any) {
      logger.error(`Error fetching from ${url}: ${error.message}`);
      throw new Error(`Failed to fetch sellers.json: ${error.message}`);
    }

    // Prepare cache record
    let cacheRecord: {
      domain: string;
      content: string | null;
      status: SellersJsonCacheStatus;
      status_code: number | null;
      error_message: string | null;
    } = {
      domain,
      content: null,
      status: 'error',
      status_code: response.status,
      error_message: null,
    };

    // Process response based on status code
    if (response.status === 200) {
      try {
        const contentType = response.headers['content-type'];

        // Check if response is JSON
        if (contentType && contentType.includes('application/json')) {
          // Validate that it's a sellers.json format (should have sellers array or other required fields)
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

    // Save to cache
    const savedCache = await SellersJsonCacheModel.saveCache(cacheRecord);

    // Return response
    return res.status(200).json({
      success: true,
      data: {
        domain,
        url: url,
        content: savedCache.content ? JSON.parse(savedCache.content) : null,
        status: savedCache.status,
        status_code: savedCache.status_code,
        error_message: savedCache.error_message,
        cached: false,
        updated_at: savedCache.updated_at,
      },
    });
  } catch (error: any) {
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
});
