import { Request, Response } from 'express';
import axios from 'axios';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import AdsTxtCacheModel, { AdsTxtCacheStatus } from '../models/AdsTxtCache';
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

  // If PSL couldn't parse the domain, return the original (cleaned) domain
  return domain;
}

/**
 * Check if ads.txt content has SUBDOMAIN directive for the given subdomain
 * @param content The ads.txt content
 * @param subdomain The subdomain to check for
 * @returns True if the subdomain directive exists, false otherwise
 */
function hasSubdomainDirective(content: string, subdomain: string): boolean {
  const lines = content.split('\n');
  const directiveRegex = new RegExp(`^\\s*SUBDOMAIN\\s*=\\s*${subdomain}\\s*`, 'i');

  return lines.some((line) => {
    // Remove comments and trim
    const cleanLine = line.split('#')[0].trim();
    return directiveRegex.test(cleanLine);
  });
}

/**
 * Try to fetch ads.txt from a domain using multiple variations (http/https, www/no-www)
 * @param domain The domain to fetch from
 * @param subdomain Optional subdomain to check for in SUBDOMAIN directive
 * @returns Object containing the successful URL, content, and status code
 */
async function tryFetchAdsTxt(
  domain: string,
  subdomain?: string
): Promise<{
  url: string;
  content: string;
  statusCode: number;
}> {
  // 1. Extract root domain if not a subdomain check
  const rootDomain = subdomain ? domain : extractRootDomain(domain);

  // 2. Create URLs to try
  const urlsToTry = [
    `https://${rootDomain}/ads.txt`,
    `https://www.${rootDomain}/ads.txt`,
    `http://${rootDomain}/ads.txt`,
    `http://www.${rootDomain}/ads.txt`,
  ];

  // 3. Try each URL, stopping at the first success
  let lastError: any = null;
  let redirectUrl: string | null = null;

  for (const url of urlsToTry) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: () => true, // Allow any status code
        headers: {
          'User-Agent': 'Ads.txt Manager/1.0',
        },
      });

      // If redirect happened, store the final URL
      if (response.request && response.request.res && response.request.res.responseUrl) {
        redirectUrl = response.request.res.responseUrl;
      } else if (response.request && response.request.responseURL) {
        // Alternative property in some axios versions
        redirectUrl = response.request.responseURL;
      }

      // If status is successful
      if (response.status === 200) {
        const content = response.data;

        // If the content is not a string or is too large, reject
        if (typeof content !== 'string' || content.length > 1000000) {
          // 1MB limit
          throw new Error('Invalid content type or size');
        }

        // If checking for a subdomain directive
        if (subdomain) {
          // If the root domain ads.txt has a subdomain directive for this subdomain
          if (hasSubdomainDirective(content, subdomain)) {
            // Now try to fetch the subdomain's ads.txt
            return tryFetchAdsTxt(`${subdomain}.${rootDomain}`); // Recursive call without subdomain param
          }
          // No subdomain directive, return the root domain content
        }

        return {
          url: redirectUrl || url,
          content,
          statusCode: response.status,
        };
      }

      // For 404s and other errors, try the next URL
      lastError = {
        status: response.status,
        message: `HTTP error ${response.status}`,
      };
    } catch (error) {
      lastError = error;
      // Continue to the next URL
    }
  }

  // If we got here, all attempts failed
  throw lastError || new Error('Failed to fetch ads.txt');
}

/**
 * Fetch ads.txt from a domain and return cached or fresh data
 * @route GET /api/adstxt/domain/:domain
 */
export const getAdsTxt = asyncHandler(async (req: Request, res: Response) => {
  const { domain } = req.params;
  const subdomain = req.query.subdomain as string | undefined;

  if (!domain) {
    throw new ApiError(400, 'Domain parameter is required', 'errors:domainRequired');
  }

  try {
    // Clean domain (remove protocol, path, etc.)
    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/i, '').split('/')[0];

    // Lookup key combines domain and subdomain if present
    const lookupKey = subdomain ? `${subdomain}.${cleanDomain}` : cleanDomain;

    // Check if we have a cached version
    const cachedData = await AdsTxtCacheModel.getByDomain(lookupKey);

    // If we have cached data and it's not expired, return it
    if (cachedData && !AdsTxtCacheModel.isCacheExpired(cachedData.updated_at)) {
      logger.info(`Serving cached ads.txt for domain: ${lookupKey}`);

      return res.status(200).json({
        success: true,
        data: {
          domain: lookupKey,
          content: cachedData.content,
          url: cachedData.url,
          status: cachedData.status,
          status_code: cachedData.status_code,
          error_message: cachedData.error_message,
          cached: true,
          updated_at: cachedData.updated_at,
        },
      });
    }

    // Either no cache or cache expired, fetch fresh data
    logger.info(`Fetching fresh ads.txt for domain: ${lookupKey}`);

    try {
      const result = await tryFetchAdsTxt(cleanDomain, subdomain);

      // Save to cache
      const cacheRecord = await AdsTxtCacheModel.saveCache({
        domain: lookupKey,
        content: result.content,
        url: result.url,
        status: 'success',
        status_code: result.statusCode,
        error_message: null,
      });

      // Return response
      return res.status(200).json({
        success: true,
        data: {
          domain: lookupKey,
          content: cacheRecord.content,
          url: cacheRecord.url,
          status: cacheRecord.status,
          status_code: cacheRecord.status_code,
          error_message: cacheRecord.error_message,
          cached: false,
          updated_at: cacheRecord.updated_at,
        },
      });
    } catch (error) {
      // Handle fetch errors
      logger.error(`Error fetching ads.txt for domain ${lookupKey}:`, error);

      // Determine error type
      let status: AdsTxtCacheStatus = 'error';
      let statusCode = 500;
      let errorMessage = 'Unknown error';

      // Safely handle the error object
      if (error && typeof error === 'object') {
        statusCode = (error as any).status || 500;
        errorMessage = (error as any).message || 'Unknown error';

        if (statusCode === 404) {
          status = 'not_found';
          errorMessage = 'ads.txt file not found';
        } else if ((error as any).message && (error as any).message.includes('Invalid content')) {
          status = 'invalid_format';
        }
      }

      // Save error to cache
      const cacheRecord = await AdsTxtCacheModel.saveCache({
        domain: lookupKey,
        content: null,
        url: null,
        status,
        status_code: statusCode,
        error_message: errorMessage,
      });

      // Return error response but with 200 status (client will handle the error based on status field)
      return res.status(200).json({
        success: true,
        data: {
          domain: lookupKey,
          content: null,
          url: null,
          status: cacheRecord.status,
          status_code: cacheRecord.status_code,
          error_message: cacheRecord.error_message,
          cached: false,
          updated_at: cacheRecord.updated_at,
        },
      });
    }
  } catch (error: any) {
    logger.error(`Error in getAdsTxt for domain ${domain}:`, error);

    const errorMessage = error.message || 'Unknown error';
    throw new ApiError(500, `Error fetching ads.txt: ${errorMessage}`, 'errors:adsTxtFetchError', {
      message: errorMessage,
    });
  }
});
