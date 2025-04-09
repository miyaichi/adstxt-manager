const axios = require('axios');
const db = require('../utils/database');
const logger = require('../utils/logger');
const psl = require('psl');

/**
 * Special domains with non-standard sellers.json URLs
 */
const SPECIAL_DOMAINS = {
  // Google
  'google.com': 'https://storage.googleapis.com/adx-rtb-dictionaries/sellers.json',
  'doubleclick.net': 'https://storage.googleapis.com/adx-rtb-dictionaries/sellers.json',
  'googlesyndication.com': 'https://storage.googleapis.com/adx-rtb-dictionaries/sellers.json',

  // AOL / Verizon Group
  'advertising.com': 'https://dragon-advertising.com/sellers.json'
};

/**
 * Get sellers.json URL for a domain
 * @param {string} domain - Domain to get sellers.json URL for
 * @returns {string} - The sellers.json URL
 */
function getSellersJsonUrl(domain) {
  // Use special URLs for known domains
  if (domain in SPECIAL_DOMAINS) {
    const url = SPECIAL_DOMAINS[domain];
    logger.info(`Using special URL for ${domain}: ${url}`);
    return url;
  }

  // Use standard URL format (default)
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

    // Find expired sellers.json cache entries, but skip those with known errors
    const query = `SELECT * FROM sellers_json_cache 
                  WHERE updated_at < $1 
                  AND (error_message IS NULL OR error_message NOT LIKE '%unique constraint%')
                  ORDER BY updated_at ASC 
                  LIMIT $2`;

    const params = [cutoffTimestamp, limit];
    const expiredRecords = await db.executeQuery(query, params);

    logger.info(`Found ${expiredRecords.length} expired sellers.json cache entries`);

    // Process each expired record
    for (const record of expiredRecords) {
      processed++;
      // Ensure domain is normalized to lowercase
      const domain = record.domain.toLowerCase();

      try {
        logger.info(`Refreshing sellers.json for domain: ${domain}`);

        // Fetch the sellers.json content
        const url = getSellersJsonUrl(domain);
        
        // HTTP request configuration matching the one in sellersJsonController.ts
        const requestConfig = {
          timeout: 30000, // 30 seconds timeout for slower sites
          maxContentLength: 200 * 1024 * 1024, // 200MB for large files
          decompress: true, // Handle gzipped responses
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'keep-alive',
            'Cache-Control': 'max-age=0',
          },
          // Allow significantly more redirects (some sites have many redirects)
          maxRedirects: 10,
          // Ensure redirects are followed
          followRedirect: true,
          followAllRedirects: true,
          // Don't throw on 4xx or 5xx responses
          validateStatus: function (status) {
            return status >= 200 && status < 600; // Accept all responses between 200-599
          },
        };
        
        // Create HTTPS and HTTP agents if needed
        try {
          const https = require('https');
          const http = require('http');
          
          // Configure a custom HTTPS agent for more control over the connection
          requestConfig.httpsAgent = new https.Agent({
            rejectUnauthorized: false, // Allow SSL certificates that don't match hostname
            keepAlive: true, // Keep connections alive for better performance
            timeout: 30000, // Match the request timeout
            maxVersion: 'TLSv1.3', // Support up to TLS 1.3
            minVersion: 'TLSv1', // Support from TLS 1.0 (for older servers)
          });
          
          // Custom HTTP agent for HTTP connections
          requestConfig.httpAgent = new http.Agent({
            keepAlive: true,
            timeout: 30000,
          });
        } catch (error) {
          logger.warn('Failed to create custom HTTP/HTTPS agents, using defaults', { error: error.message });
        }
        
        const response = await axios.get(url, requestConfig);

        // Validate and process the response based on status code
        if (response.status === 200) {
          // Extract content type and handle the data
          const contentType = response.headers['content-type'] || 'application/json';
          let responseData = response.data;
          
          // Parse string response as JSON if needed
          if (typeof responseData === 'string') {
            try {
              responseData = JSON.parse(responseData);
              logger.info(`Successfully parsed string response as JSON for ${domain}`);
            } catch (parseError) {
              logger.error(`Failed to parse string response as JSON for ${domain}`, { 
                error: parseError.message 
              });
              throw new Error('Invalid JSON format in response');
            }
          }
          
          // Validate sellers.json format with more detailed checks
          if (
            responseData &&
            ((Array.isArray(responseData.sellers) && responseData.sellers.length > 0) ||
             responseData.contact_email ||
             (Array.isArray(responseData.identifiers) && responseData.identifiers.length > 0))
          ) {
            // Update the cache entry with new content
            const content = JSON.stringify(responseData);
            const updateQuery = `UPDATE sellers_json_cache 
                                SET content = $1, status = 'success', 
                                    updated_at = CURRENT_TIMESTAMP 
                                WHERE domain = $2`;

            await db.executeQuery(updateQuery, [content, domain]);

            succeeded++;
            logger.info(`Successfully refreshed sellers.json for domain: ${domain} with ${
              Array.isArray(responseData.sellers) ? responseData.sellers.length : 0
            } sellers`);
          } else if (responseData && Array.isArray(responseData.sellers) && responseData.sellers.length === 0) {
            // Empty sellers array is technically valid
            const content = JSON.stringify(responseData);
            const updateQuery = `UPDATE sellers_json_cache 
                                SET content = $1, status = 'success', 
                                    updated_at = CURRENT_TIMESTAMP 
                                WHERE domain = $2`;

            await db.executeQuery(updateQuery, [content, domain]);

            succeeded++;
            logger.warn(`Successfully refreshed sellers.json for domain: ${domain} but with empty sellers array`);
          } else {
            // Invalid format, but we have some data
            const errorMessage = 'Invalid sellers.json format - missing required fields';
            logger.warn(`${errorMessage} for domain: ${domain}`);
            
            const updateQuery = `UPDATE sellers_json_cache 
                                SET status = 'invalid_format', content = '', 
                                    error_message = $1, updated_at = CURRENT_TIMESTAMP 
                                WHERE domain = $2`;

            await db.executeQuery(updateQuery, [errorMessage, domain]);
            throw new Error(errorMessage);
          }
        } else if (response.status === 404) {
          // 404 status - file not found
          const errorMessage = 'sellers.json file not found';
          logger.warn(`${errorMessage} for domain: ${domain} (404)`);
          
          const updateQuery = `UPDATE sellers_json_cache 
                              SET status = 'not_found', content = '', 
                                  error_message = $1, updated_at = CURRENT_TIMESTAMP 
                              WHERE domain = $2`;

          await db.executeQuery(updateQuery, [errorMessage, domain]);
          throw new Error(errorMessage);
        } else {
          // Other HTTP errors
          const errorMessage = `HTTP error ${response.status}`;
          logger.warn(`${errorMessage} for domain: ${domain}`);
          
          const updateQuery = `UPDATE sellers_json_cache 
                              SET status = $1, content = '', 
                                  error_message = $2, updated_at = CURRENT_TIMESTAMP 
                              WHERE domain = $3`;

          await db.executeQuery(updateQuery, [String(response.status), errorMessage, domain]);
          throw new Error(errorMessage);
        }
      } catch (error) {
        failed++;
        
        // Determine status and error message based on the type of error
        let status = 'error';
        let errorMessage = error.message || 'Unknown error';
        const statusCode = error.response?.status || null;
        
        // Handle specific error types
        if (statusCode === 404) {
          status = 'not_found';
          errorMessage = 'sellers.json file not found';
        } else if (errorMessage.includes('ENOTFOUND')) {
          // DNS lookup errors
          errorMessage = `DNS lookup failed for ${domain}`;
        } else if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('timeout')) {
          // Timeout errors
          errorMessage = `Connection timeout for ${domain}`;
        } else if (errorMessage.includes('certificate')) {
          // SSL/TLS certificate errors
          errorMessage = `SSL certificate issue for ${domain}: ${errorMessage}`;
        }
        
        // Update the cache entry with error information
        const updateQuery = `UPDATE sellers_json_cache 
                            SET status = $1, content = '', 
                                error_message = $2, status_code = $3,
                                updated_at = CURRENT_TIMESTAMP 
                            WHERE domain = $4`;

        await db.executeQuery(updateQuery, [status, errorMessage, statusCode, domain]);

        logger.error(`Failed to refresh sellers.json for domain: ${domain}`, {
          error: errorMessage,
          status: status,
          statusCode: statusCode
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
