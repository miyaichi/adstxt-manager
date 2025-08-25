/**
 * Refresh expired ads.txt/app-ads.txt cache entries
 * This task finds expired cache entries in the database and attempts to refresh them.
 * It supports both ads.txt and app-ads.txt files based on the file_type column.
 */

const axios = require('axios');
const db = require('../utils/database');
const logger = require('../utils/logger');

/**
 * Find and refresh expired ads.txt/app-ads.txt cache entries
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
    logger.info('Starting ads.txt/app-ads.txt cache refresh task', { limit, age });
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

    logger.info(`Found ${expiredRecords.length} expired cache entries`);

    // Process each expired record
    for (const record of expiredRecords) {
      processed++;
      const domain = record.domain;
      const fileType = record.file_type || 'ads.txt';

      try {
        logger.info(`Refreshing ${fileType} for domain: ${domain}`);

        // Fetch the file content based on file_type
        const fileName = fileType === 'app-ads.txt' ? 'app-ads.txt' : 'ads.txt';
        const url = `http://${domain}/${fileName}`;
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
                             SET content = $1, status = 'success', status_code = $3,
                                 updated_at = CURRENT_TIMESTAMP 
                             WHERE domain = $2`;

        await db.executeQuery(updateQuery, [content, domain, 200]);

        succeeded++;
        logger.info(`Successfully refreshed ${fileType} for domain: ${domain}`);
      } catch (error) {
        failed++;

        // Map HTTP status code or error type to valid status values
        let status = 'error'; // Default status
        let errorMessage = error.message || 'Unknown error';
        let statusCode = error.response?.status || null;

        // Determine the appropriate status based on the error
        if (statusCode === 404) {
          status = 'not_found';
          errorMessage = `${fileType} file not found`;
        } else if (error.code === 'ENOTFOUND') {
          status = 'not_found';
          errorMessage = `Domain not found: ${domain}`;
          statusCode = null;
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
          status = 'error';
          errorMessage = `Connection timeout for ${domain}`;
          statusCode = null;
        } else if (error.code === 'ECONNREFUSED') {
          status = 'error';
          errorMessage = `Connection refused for ${domain}`;
          statusCode = null;
        } else if (
          error.response?.data &&
          typeof error.response.data === 'string' &&
          (error.response.data.includes('<!DOCTYPE html>') || error.response.data.includes('<html'))
        ) {
          status = 'invalid_format';
          errorMessage = `Response is HTML, not a valid ${fileType} file`;
          statusCode = error.response.status;
        }

        const updateQuery = `UPDATE ads_txt_cache 
                            SET status = $1, content = '', status_code = $3,
                                error_message = $4, updated_at = CURRENT_TIMESTAMP 
                            WHERE domain = $2`;

        await db.executeQuery(updateQuery, [status, domain, statusCode, errorMessage]);

        logger.error(`Failed to refresh ${fileType} for domain: ${domain}`, {
          error: errorMessage,
          status: status,
          statusCode: statusCode,
        });
      }
    }
  } catch (error) {
    logger.error('Error during ads.txt cache refresh task', { error: error.message });
    throw error;
  } finally {
    // Log summary statistics
    logger.info('ads.txt/app-ads.txt cache refresh task summary', {
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
