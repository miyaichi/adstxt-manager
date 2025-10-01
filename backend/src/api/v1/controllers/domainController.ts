import { Request, Response } from 'express';
import { asyncHandler } from '../../../middleware/errorHandler';
import { ApiError } from '../../../middleware/errorHandler';
import AdsTxtCache from '../../../models/AdsTxtCache';
import SellersJsonCache from '../../../models/SellersJsonCache';
import logger from '../../../utils/logger';

/**
 * Domain Info API - Get comprehensive domain information in a single call
 * Endpoint: GET /api/v1/domains/:domain/info
 *
 * This endpoint provides a quick overview of a domain's ads.txt and sellers.json status
 * without fetching the full content, making it ideal for:
 * - Quick domain checks
 * - Batch domain analysis
 * - Smart decision-making in MCP tools
 */
export const getDomainInfo = asyncHandler(async (req: Request, res: Response) => {
  const { domain } = req.params;

  if (!domain) {
    throw new ApiError(400, 'Domain is required', 'errors:missingFields.domain');
  }

  try {
    // Normalize domain to lowercase
    const normalizedDomain = domain.toLowerCase().trim();

    // Check ads.txt cache
    const adsTxtCache = await AdsTxtCache.getByDomain(normalizedDomain);
    const adsTxtInfo = adsTxtCache
      ? {
          exists: true,
          last_fetched: adsTxtCache.updated_at,
          status: adsTxtCache.status,
          record_count: adsTxtCache.content
            ? adsTxtCache.content.split('\n').filter((line) => {
                const trimmed = line.trim();
                return (
                  trimmed.length > 0 &&
                  !trimmed.startsWith('#') &&
                  !trimmed.includes('=')
                );
              }).length
            : 0,
        }
      : {
          exists: false,
          status: 'not_found' as const,
        };

    // Check sellers.json cache
    const sellersJsonCache = await SellersJsonCache.getByDomain(normalizedDomain);
    const sellersJsonInfo = sellersJsonCache
      ? {
          exists: true,
          last_fetched: sellersJsonCache.updated_at,
          status: sellersJsonCache.status,
          seller_count: sellersJsonCache.seller_count || 0,
        }
      : {
          exists: false,
          status: 'not_found' as const,
        };

    logger.debug(
      `Domain info retrieved for ${normalizedDomain}: ads.txt=${adsTxtInfo.exists}, sellers.json=${sellersJsonInfo.exists}`
    );

    res.status(200).json({
      success: true,
      data: {
        domain: normalizedDomain,
        ads_txt: adsTxtInfo,
        sellers_json: sellersJsonInfo,
      },
    });
  } catch (error: unknown) {
    logger.error(`Error getting domain info for ${domain}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new ApiError(500, `Error getting domain info: ${errorMessage}`, 'errors:serverError', {
      domain,
    });
  }
});

/**
 * Batch Domain Info API - Get information for multiple domains at once
 * Endpoint: POST /api/v1/domains/batch/info
 *
 * This endpoint allows efficient batch queries for multiple domains,
 * reducing the number of API calls by up to 90%.
 *
 * Maximum 50 domains per request.
 */
export const getBatchDomainInfo = asyncHandler(async (req: Request, res: Response) => {
  const { domains } = req.body;

  if (!domains || !Array.isArray(domains) || domains.length === 0) {
    throw new ApiError(400, 'Domains array is required', 'errors:missingFields.domains');
  }

  if (domains.length > 50) {
    throw new ApiError(
      400,
      'Maximum 50 domains per request',
      'errors:validation.tooManyDomains',
      { max: 50, provided: domains.length }
    );
  }

  try {
    // Normalize all domains
    const normalizedDomains = domains.map((d) => String(d).toLowerCase().trim());

    // Remove duplicates
    const uniqueDomains = [...new Set(normalizedDomains)];

    logger.info(`Batch domain info requested for ${uniqueDomains.length} domains`);

    // Fetch all ads.txt cache entries in parallel
    const adsTxtPromises = uniqueDomains.map((domain) => AdsTxtCache.getByDomain(domain));
    const adsTxtResults = await Promise.all(adsTxtPromises);

    // Fetch all sellers.json cache entries in parallel
    const sellersJsonPromises = uniqueDomains.map((domain) =>
      SellersJsonCache.getByDomain(domain)
    );
    const sellersJsonResults = await Promise.all(sellersJsonPromises);

    // Combine results
    const domainInfos = uniqueDomains.map((domain, index) => {
      const adsTxtCache = adsTxtResults[index];
      const sellersJsonCache = sellersJsonResults[index];

      return {
        domain,
        ads_txt: adsTxtCache
          ? {
              exists: true,
              status: adsTxtCache.status,
              record_count: adsTxtCache.content
                ? adsTxtCache.content.split('\n').filter((line) => {
                    const trimmed = line.trim();
                    return (
                      trimmed.length > 0 &&
                      !trimmed.startsWith('#') &&
                      !trimmed.includes('=')
                    );
                  }).length
                : 0,
            }
          : {
              exists: false,
              status: 'not_found' as const,
            },
        sellers_json: sellersJsonCache
          ? {
              exists: true,
              status: sellersJsonCache.status,
              seller_count: sellersJsonCache.seller_count || 0,
            }
          : {
              exists: false,
              status: 'not_found' as const,
            },
      };
    });

    // Calculate summary statistics
    const summary = {
      total_domains: uniqueDomains.length,
      with_ads_txt: domainInfos.filter((d) => d.ads_txt.exists).length,
      with_sellers_json: domainInfos.filter((d) => d.sellers_json.exists).length,
      with_both: domainInfos.filter((d) => d.ads_txt.exists && d.sellers_json.exists).length,
    };

    logger.info(
      `Batch domain info completed: ${summary.with_ads_txt}/${summary.total_domains} with ads.txt, ${summary.with_sellers_json}/${summary.total_domains} with sellers.json`
    );

    res.status(200).json({
      success: true,
      data: {
        domains: domainInfos,
        summary,
      },
    });
  } catch (error: unknown) {
    logger.error('Error getting batch domain info:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new ApiError(
      500,
      `Error getting batch domain info: ${errorMessage}`,
      'errors:serverError'
    );
  }
});
