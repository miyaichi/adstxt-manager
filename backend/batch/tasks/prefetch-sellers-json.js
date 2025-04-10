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

    // Simple and robust query to extract domains from ads.txt lines
    const extractQuery = `
      WITH ads_txt_lines AS (
        -- First get all ads.txt files with valid content
        SELECT 
          domain as publisher_domain,
          unnest(string_to_array(content, E'\\n')) AS line
        FROM ads_txt_cache 
        WHERE status = 'success' AND content IS NOT NULL AND content != ''
      ),
      
      domain_counts AS (
        -- Extract domain from each line and count occurrences
        SELECT 
          LOWER(SPLIT_PART(TRIM(line), ',', 1)) as domain,
          COUNT(*) as usage_count
        FROM ads_txt_lines
        WHERE 
          -- Only include non-empty lines
          TRIM(line) != ''
          -- Only include lines that look like ad system entries 
          AND line ~ 'DIRECT|RESELLER'
          -- Skip comments
          AND NOT line ~ '^\\s*#'
        GROUP BY LOWER(SPLIT_PART(TRIM(line), ',', 1))
      )
      
      -- Get most frequently used domains
      SELECT domain, usage_count
      FROM domain_counts
      WHERE 
        -- Ensure domain is something that looks valid
        domain != '' 
        -- Filter by minimum usage threshold
        AND usage_count >= $1
      ORDER BY usage_count DESC
      LIMIT $2
    `;

    // This query uses Common Table Expressions (CTEs) to:
    // 1. First get all ads.txt cache entries with valid content
    // 2. Extract domain names from each line of each ads.txt file
    // 3. Count frequency of domains and filter by minimum usage
    // 4. Return the most commonly used domains in descending order

    let domains;
    try {
      // Execute the domain extraction query
      const sspDomains = await db.executeQuery(extractQuery, [minUsage, limit * 2]);
      extracted = sspDomains.length;
      logger.info(`Extracted ${extracted} unique domains from ads_txt_cache`);
      domains = sspDomains;
    } catch (error) {
      logger.error(`Error extracting domains from ads_txt_cache: ${error.message}`, {
        error: error.message,
        stack: error.stack
      });
      
      // Use a simpler fallback query if the advanced one fails
      logger.info('Using fallback domain extraction query');
      const fallbackQuery = `
        SELECT LOWER(domain) as domain, COUNT(*) as usage_count
        FROM ads_txt_cache 
        WHERE status = 'success'
        GROUP BY LOWER(domain)
        HAVING COUNT(*) >= $1
        ORDER BY COUNT(*) DESC
        LIMIT $2
      `;
      
      const fallbackDomains = await db.executeQuery(fallbackQuery, [1, limit]);
      extracted = fallbackDomains.length;
      logger.info(`Extracted ${extracted} domains using fallback query`);
      domains = fallbackDomains;
    }

    // Step 2: Filter domains that need updating
    // Check which domains are already in the sellers_json_cache and when they were last updated
    for (const domain of domains) {
      // Skip invalid domains and normalize to lowercase for consistent cache handling
      if (!domain.domain || typeof domain.domain !== 'string') {
        logger.warn(`Skipping invalid domain entry: ${JSON.stringify(domain)}`);
        skipped++;
        continue;
      }
      
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
    // Calculate additional statistics
    const processingRate = extracted > 0 ? (processed / extracted) * 100 : 0;
    const skipRate = extracted > 0 ? (skipped / extracted) * 100 : 0;
    
    // Log comprehensive summary statistics
    logger.info('Sellers.json prefetch task summary', {
      extracted,
      processed,
      skipped,
      processingRate: `${processingRate.toFixed(2)}%`,
      skipRate: `${skipRate.toFixed(2)}%`,
      minUsage,
      priorityAge,
    });

    // Close database connection
    await db.closeDatabase();
  }

  return { extracted, processed, skipped };
}

module.exports = { run };