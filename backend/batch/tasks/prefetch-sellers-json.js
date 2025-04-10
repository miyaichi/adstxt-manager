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
      ),
      
      extracted_domains AS (
        SELECT 
          -- Extract first field from each line (the domain)
          -- Strip any whitespace, and convert to lowercase for consistency
          CASE
            -- Filter out invalid entries or malformed domains
            WHEN SPLIT_PART(TRIM(line), ',', 1) ~ '^[a-zA-Z0-9][a-zA-Z0-9-\\.]+\\.[a-zA-Z]{2,}$' THEN
              LOWER(SPLIT_PART(TRIM(line), ',', 1))
            ELSE NULL
          END as domain
        FROM domains_with_content,
             LATERAL (
               -- Split content by newlines and extract each line
               SELECT unnest(string_to_array(content, E'\\n')) AS line
             ) AS lines
        WHERE 
          -- Must be a valid ad system entry (contains DIRECT or RESELLER)
          line ~ 'DIRECT|RESELLER'
          -- Skip empty lines
          AND length(trim(line)) > 0 
          -- Skip comments
          AND NOT line ~ '^\\s*#'
          -- Skip variable declarations
          AND NOT line ~ '^\\s*[a-zA-Z0-9_-]+=.*$'
      )
      
      -- Count domains, filtering nulls, and return only frequently used ones
      SELECT domain, COUNT(*) as usage_count
      FROM extracted_domains
      WHERE domain IS NOT NULL
      GROUP BY domain
      HAVING COUNT(*) >= $1
      ORDER BY COUNT(*) DESC
      LIMIT $2$' THEN
              LOWER(SPLIT_PART(TRIM(line), ',', 1))
            ELSE NULL
          END as domain
        FROM domains_with_content,
             LATERAL (
               -- Split content by newlines and extract each line
               SELECT unnest(string_to_array(content, E'\\n')) AS line
             ) AS lines
        WHERE 
          -- Must be a valid ad system entry (contains DIRECT or RESELLER)
          line ~ 'DIRECT|RESELLER'
          -- Skip empty lines
          AND length(trim(line)) > 0 
          -- Skip comments
          AND NOT line ~ '^\\s*#'
          -- Skip variable declarations
          AND NOT line ~ '^\\s*[a-zA-Z0-9_-]+=.*$'
      )
      
      -- Count domains, filtering nulls, and return only frequently used ones
      SELECT domain, COUNT(*) as usage_count
      FROM extracted_domains
      WHERE domain IS NOT NULL
      GROUP BY domain
      HAVING COUNT(*) >= $1
      ORDER BY COUNT(*) DESC
      LIMIT $2
    `;

    // This query uses Common Table Expressions (CTEs) to:
    // 1. First get all ads.txt cache entries with valid content
    // 2. Extract domain names from each line of each ads.txt file
    // 3. Validate domains using regex pattern matching
    // 4. Filter out comments, empty lines, and variable declarations
    // 5. Count domain frequency and return the most commonly used ones
    // 6. Only include domains that appear at least 'minUsage' times

    const sspDomains = await db.executeQuery(extractQuery, [minUsage, limit * 2]);
    extracted = sspDomains.length;

    logger.info(`Extracted ${extracted} unique domains from ads_txt_cache`);

    // Step 2: Filter domains that need updating
    // Check which domains are already in the sellers_json_cache and when they were last updated
    for (const domain of sspDomains) {
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
