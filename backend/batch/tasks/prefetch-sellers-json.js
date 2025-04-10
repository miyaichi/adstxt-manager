/**
 * Prefetch sellers.json based on domains found in ads_txt_cache
 * This task helps prepare sellers.json data ahead of time to improve ads.txt optimization performance
 */

const db = require('../utils/database');
const logger = require('../utils/logger');
const { refreshSellersJson } = require('./refresh-sellers-json');

/**
 * Extract domains from ads.txt records and prefetch their sellers.json
 * @param {Object} options - Task options
 * @param {number} options.limit - Maximum number of domains to prefetch
 * @param {number} options.minUsage - Minimum number of times a domain appears in ads.txt records
 * @param {number} options.priorityAge - Prioritize domains with no sellers.json cache or older than this many days
 */
async function run(options = {}) {
  const { limit = 100, minUsage = 3, priorityAge = 3 } = options;

  let extracted = 0;
  let processed = 0;
  let skipped = 0;

  try {
    logger.info('Starting sellers.json prefetch task', { limit, minUsage, priorityAge });
    await db.initDatabase();

    // Calculate the cutoff date for determining "old" cache entries
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - priorityAge);
    const cutoffTimestamp = cutoffDate.toISOString();

    // Step 1: Extract unique domains from ads_txt_cache with usage count
    // Finds domains that appear in ads.txt records frequently
    logger.info('Extracting SSP domains from ads_txt_cache...');

    const extractQuery = `
      WITH domains_with_content AS (
        SELECT domain, content 
        FROM ads_txt_cache 
        WHERE status = 'success' AND content IS NOT NULL AND content != ''
      )
      
      SELECT LOWER(domain_field) as domain, COUNT(*) as usage_count
      FROM domains_with_content,
           LATERAL (
             -- Split content by newlines and extract each line
             SELECT unnest(string_to_array(content, E'\\n')) AS line
           ) AS lines
      WHERE line ~ 'DIRECT|RESELLER'
        AND length(trim(line)) > 0 
        AND NOT line ~ '^\\s*#'
      GROUP BY LOWER(domain_field)
      HAVING COUNT(*) >= $1
      ORDER BY COUNT(*) DESC
      LIMIT $2
    `;

    // Using a Common Table Expression to first get all ads.txt content
    // then extract domain fields from valid advertising system records

    // In the actual implementation, you'd need to extract the first field from each line (the domain)
    // This is simplified and would need proper regex/extraction logic for production

    const sspDomains = await db.executeQuery(extractQuery, [minUsage, limit * 2]);
    extracted = sspDomains.length;

    logger.info(`Extracted ${extracted} unique domains from ads_txt_cache`);

    // Step 2: Filter domains that need updating
    // Check which domains are already in the sellers_json_cache and when they were last updated
    for (const domain of sspDomains) {
      // Normalize domain to lowercase
      const normalizedDomain = domain.domain.toLowerCase();

      // Check if this domain already exists in sellers_json_cache
      const checkQuery = `
        SELECT id, status, updated_at 
        FROM sellers_json_cache 
        WHERE domain = $1
      `;

      const existing = await db.executeQuery(checkQuery, [normalizedDomain]);

      // Skip domains that:
      // 1. Have a recent cache entry (updated within the cutoff period)
      // 2. Have 'not_found' status that's still fairly recent (within twice the cutoff period)
      if (existing.length > 0) {
        const record = existing[0];
        const updatedAt = new Date(record.updated_at);

        // For 'not_found' status, we use a longer expiration time
        // to avoid repeatedly checking domains that are known not to have sellers.json
        const isNotFound = record.status === 'not_found';
        const relevantCutoff = isNotFound
          ? new Date(cutoffDate.getTime() - priorityAge * 24 * 60 * 60 * 1000) // Twice the age for not_found
          : cutoffDate;

        if (updatedAt > relevantCutoff) {
          logger.debug(
            `Skipping ${normalizedDomain} - cache is still fresh (${record.status}, updated ${updatedAt.toISOString()})`
          );
          skipped++;
          continue;
        }
      }

      // Process this domain by refreshing its sellers.json
      logger.info(
        `Prefetching sellers.json for ${normalizedDomain} (usage count: ${domain.usage_count})`
      );

      try {
        await refreshSellersJson(normalizedDomain);
        processed++;

        // Optional: Add a small delay between requests to prevent overloading servers
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        logger.error(`Failed to prefetch sellers.json for ${normalizedDomain}`, {
          error: error.message,
        });
      }

      // Respect the limit parameter
      if (processed >= limit) {
        logger.info(`Reached limit of ${limit} domains, stopping`);
        break;
      }
    }
  } catch (error) {
    logger.error('Error during sellers.json prefetch task', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  } finally {
    // Log summary statistics
    logger.info('Sellers.json prefetch task summary', {
      extracted,
      processed,
      skipped,
    });

    // Close database connection
    await db.closeDatabase();
  }

  return { extracted, processed, skipped };
}

module.exports = { run };
