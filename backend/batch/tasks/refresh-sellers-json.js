const axios = require('axios');
const db = require('../utils/database');
const logger = require('../utils/logger');
const psl = require('psl');

/**
 * Get sellers.json URL for a domain
 * @param {string} domain - Domain to get sellers.json URL for
 * @returns {string} - The sellers.json URL
 */
function getSellersJsonUrl(domain) {
  return `https://${domain}/sellers.json`;
}

/**
 * Find and refresh expired sellers.json cache entries
 * @param {Object} options - Task options
 * @param {number} options.limit - Maximum number of records to process
 * @param {number} options.age - Process records older than specified days
 */
async function run(options = {}) {
  const { limit = 100, age = 1 } = options;
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  try {
    logger.info('Starting sellers.json cache refresh task', { limit, age });
    await db.initDatabase();

    // Calculate the cutoff date based on age
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - age);
    const cutoffTimestamp = cutoffDate.toISOString();

    // Find expired sellers.json cache entries
    const query = `SELECT * FROM sellers_json_cache 
                  WHERE updated_at < $1 
                  ORDER BY updated_at ASC 
                  LIMIT $2`;

    const params = [cutoffTimestamp, limit];
    const expiredRecords = await db.executeQuery(query, params);

    logger.info(`Found ${expiredRecords.length} expired sellers.json cache entries`);

    // Process each expired record
    for (const record of expiredRecords) {
      processed++;
      const domain = record.domain;

      try {
        logger.info(`Refreshing sellers.json for domain: ${domain}`);

        // Fetch the sellers.json content
        const url = getSellersJsonUrl(domain);
        const response = await axios.get(url, {
          timeout: 10000,
          maxRedirects: 5,
          headers: {
            'User-Agent': 'AdsTxtManager/1.0',
          },
        });

        // Validate and process the response
        if (
          response.data &&
          (response.data.sellers || (Array.isArray(response.data) && response.data.length > 0))
        ) {
          // Update the cache entry with new content
          const content = JSON.stringify(response.data);
          const updateQuery = `UPDATE sellers_json_cache 
                              SET content = $1, status = 'success', 
                                  updated_at = CURRENT_TIMESTAMP 
                              WHERE domain = $2`;

          await db.executeQuery(updateQuery, [content, domain]);

          succeeded++;
          logger.info(`Successfully refreshed sellers.json for domain: ${domain}`);
        } else {
          throw new Error('Invalid sellers.json format');
        }
      } catch (error) {
        failed++;
        // Update the cache entry with error status
        const errorStatus = error.response?.status ? error.response.status : 'network-error';

        const updateQuery = `UPDATE sellers_json_cache 
                            SET status = $1, content = '', 
                                updated_at = CURRENT_TIMESTAMP 
                            WHERE domain = $2`;

        await db.executeQuery(updateQuery, [errorStatus.toString(), domain]);

        logger.error(`Failed to refresh sellers.json for domain: ${domain}`, {
          error: error.message,
          status: errorStatus,
        });
      }
    }
  } catch (error) {
    logger.error('Error during sellers.json cache refresh task', { error: error.message });
    throw error;
  } finally {
    // Log summary statistics
    logger.info('sellers.json cache refresh task summary', {
      processed,
      succeeded,
      failed,
    });

    // Close database connection
    await db.closeDatabase();
  }

  return { processed, succeeded, failed };
}

module.exports = { run };
