const axios = require('axios');
const db = require('../utils/database');
const logger = require('../utils/logger');

/**
 * Find and refresh expired ads.txt cache entries
 * @param {Object} options - Task options
 * @param {number} options.limit - Maximum number of records to process
 * @param {number} options.age - Process records older than specified days
 */
async function run(options = {}) {
  const { limit = 100, age = 7 } = options;
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  try {
    logger.info('Starting ads.txt cache refresh task', { limit, age });
    await db.initDatabase();

    // Calculate the cutoff date based on age
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - age);
    const cutoffTimestamp = cutoffDate.toISOString();

    // Find expired ads.txt cache entries
    const query = `SELECT * FROM ads_txt_cache 
                  WHERE updated_at < $1 
                  ORDER BY updated_at ASC 
                  LIMIT $2`;

    const params = [cutoffTimestamp, limit];
    const expiredRecords = await db.executeQuery(query, params);

    logger.info(`Found ${expiredRecords.length} expired ads.txt cache entries`);

    // Process each expired record
    for (const record of expiredRecords) {
      processed++;
      const domain = record.domain;

      try {
        logger.info(`Refreshing ads.txt for domain: ${domain}`);

        // Fetch the ads.txt content
        const url = `http://${domain}/ads.txt`;
        const response = await axios.get(url, {
          timeout: 10000,
          maxRedirects: 5,
          headers: {
            'User-Agent': 'AdsTxtManager/1.0',
          },
        });

        // Update the cache entry with new content
        const content = response.data;
        const updateQuery = `UPDATE ads_txt_cache 
                             SET content = $1, status = 'success', 
                                 updated_at = CURRENT_TIMESTAMP 
                             WHERE domain = $2`;

        await db.executeQuery(updateQuery, [content, domain]);

        succeeded++;
        logger.info(`Successfully refreshed ads.txt for domain: ${domain}`);
      } catch (error) {
        failed++;
        // Update the cache entry with error status
        const errorStatus = error.response?.status ? error.response.status : 'network-error';

        const updateQuery = `UPDATE ads_txt_cache 
                            SET status = $1, content = '', 
                                updated_at = CURRENT_TIMESTAMP 
                            WHERE domain = $2`;

        await db.executeQuery(updateQuery, [errorStatus.toString(), domain]);

        logger.error(`Failed to refresh ads.txt for domain: ${domain}`, {
          error: error.message,
          status: errorStatus,
        });
      }
    }
  } catch (error) {
    logger.error('Error during ads.txt cache refresh task', { error: error.message });
    throw error;
  } finally {
    // Log summary statistics
    logger.info('ads.txt cache refresh task summary', {
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
