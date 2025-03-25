import { Request, Response } from 'express';
import axios from 'axios';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import SellersJsonCacheModel, {
  SellersJsonContent,
  SellersJsonCacheStatus,
} from '../models/SellersJsonCache';
import { logger } from '../utils/logger';

/**
 * Special domains with non-standard sellers.json URLs
 */
const SPECIAL_DOMAINS: Record<string, string> = {
  'google.com': 'https://realtimebidding.google.com/sellers.json',
  'advertising.com': 'https://dragon-advertising.com/sellers.json',
};

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
    
    // Check if this is a special domain with a custom URL
    if (domain in SPECIAL_DOMAINS) {
      url = SPECIAL_DOMAINS[domain];
      logger.info(`Using special URL for ${domain}: ${url}`);
    } else {
      // Use standard location
      url = `https://${domain}/sellers.json`;
    }
    
    // Fetch the sellers.json
    let response;
    try {
      logger.info(`Fetching from URL: ${url}`);
      response = await axios.get(url, {
        timeout: 10000,
        validateStatus: () => true, // Allow any status code
        maxContentLength: 50 * 1024 * 1024, // 50MB
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
