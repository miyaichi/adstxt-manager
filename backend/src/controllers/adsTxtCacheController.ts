import { Request, Response } from 'express';
import axios from 'axios';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import AdsTxtCacheModel, { AdsTxtCacheDTO, AdsTxtCacheStatus } from '../models/AdsTxtCache';
import { logger } from '../utils/logger';
import i18next from '../i18n';
import psl from 'psl';

/**
 * Extract root domain from a domain string using PSL (Public Suffix List)
 * @param domain The domain to extract from (e.g. "www.example.com")
 * @returns The root domain (e.g. "example.com")
 */
function extractRootDomain(domain: string): string {
  // Remove protocol if present
  domain = domain.replace(/^(https?:\/\/)?(www\.)?/i, '');

  // Remove path or query parameters if present
  domain = domain.split('/')[0].split('?')[0].split('#')[0];

  // Check if it's an IP address (simple check)
  const ipRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
  if (ipRegex.test(domain)) {
    return domain; // Return IP addresses as-is
  }

  // Use PSL to get the registered domain (root domain)
  const parsed = psl.parse(domain);

  if (parsed && 'domain' in parsed && parsed.domain) {
    return parsed.domain;
  }

  // Fallback to original input if parsing fails
  return domain;
}

/**
 * Get ads.txt for a domain
 * If the ads.txt is cached and not expired, return the cached version
 * Otherwise, fetch it from the domain and update the cache
 */
export const getAdsTxt = asyncHandler(async (req: Request, res: Response) => {
  const { domain: rawDomain } = req.params;

  if (!rawDomain) {
    throw new ApiError(400, i18next.t('errors:domain_required'));
  }

  // Clean and normalize the domain
  const domain = extractRootDomain(rawDomain);
  logger.info(`[AdsTxtManager] Getting ads.txt for domain: ${domain}`);

  // Try to get the cached ads.txt
  const cachedAdsTxt = await AdsTxtCacheModel.getByDomain(domain);

  // If we have a cache and it's not expired, return it
  if (cachedAdsTxt && !AdsTxtCacheModel.isCacheExpired(cachedAdsTxt.updated_at)) {
    logger.info(`[AdsTxtManager] Serving cached ads.txt for domain: ${domain}`);
    return res.status(200).json({
      success: true,
      data: {
        domain,
        content: cachedAdsTxt.content,
        url: cachedAdsTxt.url,
        status: cachedAdsTxt.status,
        status_code: cachedAdsTxt.status_code,
        created_at: cachedAdsTxt.created_at,
        updated_at: cachedAdsTxt.updated_at,
      },
    });
  }

  // Cache is expired or doesn't exist, fetch fresh ads.txt
  logger.info(`[AdsTxtManager] Fetching ads.txt for domain: ${domain}`);

  // Try common URLs for ads.txt
  const urls = [`https://${domain}/ads.txt`, `https://www.${domain}/ads.txt`];

  let content: string | null = null;
  let url: string | null = null;
  let status: AdsTxtCacheStatus = 'error';
  let statusCode: number | null = null;
  let errorMessage: string | null = null;

  // Try each URL until we get a successful response
  for (const targetUrl of urls) {
    try {
      const response = await axios.get(targetUrl, {
        timeout: 5000, // 5 second timeout
        maxContentLength: 1024 * 1024, // 1MB max
        headers: {
          'User-Agent': 'AdsTxtManager/1.0',
        },
      });

      // If we get here, we have a successful response
      content = response.data.toString();
      url = targetUrl;
      status = 'success';
      statusCode = response.status;

      // No need to try other URLs
      break;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // Request was made and server responded with a status code
          // outside of 2xx range
          if (error.response.status === 404) {
            status = 'not_found';
            statusCode = 404;
            errorMessage = `Ads.txt not found at ${targetUrl}`;
          } else {
            status = 'error';
            statusCode = error.response.status;
            errorMessage = `Error fetching ads.txt: ${error.message}`;
          }
        } else if (error.request) {
          // Request was made but no response received
          status = 'error';
          errorMessage = `No response from ${targetUrl}: ${error.message}`;
        } else {
          // Something happened in setting up the request
          status = 'error';
          errorMessage = `Error setting up request: ${error.message}`;
        }
      } else {
        // Non-axios error
        status = 'error';
        errorMessage = `Error fetching ads.txt: ${(error as Error).message}`;
      }
    }
  }

  // If all URLs failed and status is still 'error', check if any had 404
  if (status === 'error' && statusCode === 404) {
    status = 'not_found';
  }

  // Check if content is valid ads.txt format if we have content
  if (content && status === 'success') {
    const lines = content.split('\n').filter((line) => {
      // Remove comments and empty lines
      const trimmed = line.trim();
      return trimmed.length > 0 && !trimmed.startsWith('#');
    });

    // Check if there are any valid lines
    if (lines.length === 0) {
      status = 'invalid_format';
      errorMessage = 'Ads.txt file is empty or contains only comments';
    } else {
      // Check a sample of lines for correct format
      const checkSample = lines.slice(0, Math.min(5, lines.length));
      const invalidLines = checkSample.filter((line) => {
        const parts = line.split(',').map((part) => part.trim());
        return parts.length < 3; // At minimum, need domain, pub ID, relationship
      });

      // If more than half the sample lines are invalid, flag as invalid format
      if (invalidLines.length > checkSample.length / 2) {
        status = 'invalid_format';
        errorMessage = 'Ads.txt file appears to be in an invalid format';
      }
    }
  }

  // Save or update the cache
  const cacheData: AdsTxtCacheDTO = {
    domain,
    content,
    url,
    status,
    status_code: statusCode,
    error_message: errorMessage,
  };

  const updatedCache = await AdsTxtCacheModel.saveCache(cacheData);

  // Return the result
  return res.status(200).json({
    success: true,
    data: {
      domain,
      content: updatedCache.content,
      url: updatedCache.url,
      status: updatedCache.status,
      status_code: updatedCache.status_code,
      error_message: updatedCache.error_message,
      created_at: updatedCache.created_at,
      updated_at: updatedCache.updated_at,
    },
  });
});
