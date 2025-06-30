/**
 * Refresh sellers.json cache entries
 * This task finds expired sellers.json cache entries in the database and attempts to refresh them.
 */

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
  'advertising.com': 'https://dragon-advertising.com/sellers.json',
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
 * Get HTTP request configuration for sellers.json fetching
 * Matches the configuration in sellersJsonController.ts for consistency
 * @returns {Object} - Axios request configuration
 */
function getSellersJsonRequestConfig() {
  // HTTP request configuration matching the one in sellersJsonController.ts
  const requestConfig = {
    timeout: 30000, // 30 seconds timeout for slower sites
    maxContentLength: 200 * 1024 * 1024, // 200MB for large files
    decompress: true, // Handle gzipped responses
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      Connection: 'keep-alive',
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
    logger.warn('Failed to create custom HTTP/HTTPS agents, using defaults', {
      error: error.message,
    });
  }

  return requestConfig;
}

/**
 * Create or update a sellers.json cache entry for a domain
 * @param {string} domain - The domain to process
 * @param {Object} response - The HTTP response from fetching sellers.json
 * @returns {Object} - Result with status and message
 */
async function processSellersJsonResponse(domain, response) {
  // Normalize domain to lowercase and trim whitespace
  const normalizedDomain = domain.toLowerCase().trim();

  try {
    // Create a cache record to store
    let cacheRecord = {
      domain: normalizedDomain,
      content: null,
      status: 'error',
      status_code: response.status,
      error_message: null,
    };

    // Process response based on status code
    if (response.status === 200) {
      // Extract content type and handle the data
      const contentType = response.headers['content-type'] || 'application/json';
      let responseData = response.data;

      // Parse string response as JSON if needed
      if (typeof responseData === 'string') {
        try {
          responseData = JSON.parse(responseData);
          logger.info(`Successfully parsed string response as JSON for ${normalizedDomain}`);
        } catch (parseError) {
          logger.error(`Failed to parse string response as JSON for ${normalizedDomain}`, {
            error: parseError.message,
          });
          cacheRecord.status = 'invalid_format';
          cacheRecord.error_message = 'Response is not valid JSON';
          return saveToCache(cacheRecord);
        }
      }

      // Validate sellers.json format with more detailed checks
      if (
        responseData &&
        ((Array.isArray(responseData.sellers) && responseData.sellers.length > 0) ||
          responseData.contact_email ||
          (Array.isArray(responseData.identifiers) && responseData.identifiers.length > 0))
      ) {
        // Success case - valid sellers.json content
        cacheRecord.status = 'success';
        cacheRecord.content = JSON.stringify(responseData);

        logger.info(
          `Valid sellers.json for ${normalizedDomain} with ${
            Array.isArray(responseData.sellers) ? responseData.sellers.length : 0
          } sellers`
        );
      } else if (
        responseData &&
        Array.isArray(responseData.sellers) &&
        responseData.sellers.length === 0
      ) {
        // Empty sellers array is technically valid
        cacheRecord.status = 'success';
        cacheRecord.content = JSON.stringify(responseData);

        logger.warn(`Valid sellers.json for ${normalizedDomain} but with empty sellers array`);
      } else {
        // Invalid format, missing required fields
        cacheRecord.status = 'invalid_format';
        cacheRecord.error_message = 'Response does not contain required sellers.json fields';
      }
    } else if (response.status === 404) {
      // 404 status - file not found
      cacheRecord.status = 'not_found';
      cacheRecord.error_message = 'sellers.json file not found';
    } else {
      // Other HTTP errors
      cacheRecord.error_message = `HTTP error ${response.status}`;
    }

    return saveToCache(cacheRecord);
  } catch (error) {
    logger.error(`Error processing sellers.json response for ${normalizedDomain}`, {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Save a sellers.json cache record to the database
 * @param {Object} cacheRecord - The cache record to save
 */
async function saveToCache(cacheRecord) {
  const domain = cacheRecord.domain;

  try {
    // Check if record already exists
    const existingQuery = `SELECT id FROM sellers_json_cache WHERE domain = $1`;
    const existing = await db.executeQuery(existingQuery, [domain]);

    if (existing.length > 0) {
      // Update existing record
      const updateQuery = `
        UPDATE sellers_json_cache 
        SET content = $1, 
            status = $2, 
            status_code = $3, 
            error_message = $4, 
            updated_at = CURRENT_TIMESTAMP 
        WHERE domain = $5
        RETURNING id
      `;

      const params = [
        cacheRecord.content,
        cacheRecord.status,
        cacheRecord.status_code,
        cacheRecord.error_message,
        domain,
      ];

      const result = await db.executeQuery(updateQuery, params);
      logger.info(`Updated sellers.json cache for ${domain} with status '${cacheRecord.status}'`);
      return { success: true, status: cacheRecord.status, id: result[0].id };
    } else {
      // Create new record
      // Use the global flag set during database initialization
      const uuidAvailable = global.uuidExtensionAvailable === true;
      logger.debug(`Using ${uuidAvailable ? 'uuid_generate_v4()' : 'md5-based UUID generation'}`);

      // Use appropriate query based on UUID extension availability
      const insertQuery = uuidAvailable
        ? `INSERT INTO sellers_json_cache 
           (id, domain, content, status, status_code, error_message, created_at, updated_at) 
           VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING id`
        : `INSERT INTO sellers_json_cache 
           (id, domain, content, status, status_code, error_message, created_at, updated_at) 
           VALUES (md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING id`;

      const params = [
        domain,
        cacheRecord.content,
        cacheRecord.status,
        cacheRecord.status_code,
        cacheRecord.error_message,
      ];

      const result = await db.executeQuery(insertQuery, params);
      logger.info(
        `Created new sellers.json cache for ${domain} with status '${cacheRecord.status}'`
      );
      return { success: true, status: cacheRecord.status, id: result[0].id };
    }
  } catch (error) {
    logger.error(`Failed to save sellers.json cache for ${domain}`, { error: error.message });
    throw error;
  }
}

/**
 * Handle errors from fetching sellers.json
 * @param {string} domain - The domain
 * @param {Error} error - The error
 */
async function handleSellersJsonError(domain, error) {
  // Normalize domain to lowercase and trim whitespace
  const normalizedDomain = domain.toLowerCase().trim();

  logger.error(`Error fetching sellers.json for domain ${normalizedDomain}:`, error);

  // Extract status code and determine status
  const statusCode = error.response?.status || null;
  const is404 = statusCode === 404;
  const errorMessage = error.message || 'Unknown error';

  let status = 'error';
  let detailedErrorMessage = errorMessage;

  // Handle specific error types
  if (is404) {
    status = 'not_found';
    detailedErrorMessage = 'sellers.json file not found';
  } else if (errorMessage.includes('ENOTFOUND')) {
    // DNS lookup errors
    detailedErrorMessage = `DNS lookup failed for ${normalizedDomain}`;
  } else if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('timeout')) {
    // Timeout errors
    detailedErrorMessage = `Connection timeout for ${normalizedDomain}`;
  } else if (errorMessage.includes('certificate')) {
    // SSL/TLS certificate errors
    detailedErrorMessage = `SSL certificate issue for ${normalizedDomain}: ${errorMessage}`;
  }

  // Create and save error cache record
  const errorCacheRecord = {
    domain: normalizedDomain,
    content: null,
    status: status,
    status_code: statusCode,
    error_message: detailedErrorMessage,
  };

  return saveToCache(errorCacheRecord);
}

/**
 * Fetch and update sellers.json cache for a specific domain
 * @param {string} domain - The domain to refresh
 * @returns {Object} - Result with status and message
 */
async function refreshSellersJson(domain) {
  // Normalize domain to lowercase and trim whitespace
  const normalizedDomain = domain.toLowerCase().trim();

  try {
    logger.info(`Refreshing sellers.json for domain: ${normalizedDomain}`);

    // Fetch the sellers.json content
    const url = getSellersJsonUrl(normalizedDomain);
    const requestConfig = getSellersJsonRequestConfig();

    const response = await axios.get(url, requestConfig);

    // Process the response and update cache
    return await processSellersJsonResponse(normalizedDomain, response);
  } catch (error) {
    // Handle the error and update cache accordingly
    return await handleSellersJsonError(normalizedDomain, error);
  }
}

/**
 * Find and refresh expired sellers.json cache entries
 * @param {Object} options - Task options
 * @param {number} options.limit - Maximum number of records to process
 * @param {number} options.age - Process records older than specified days
 */
async function run(options = {}) {
  const { limit = 500, age = 1 } = options;
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  const startTime = Date.now(); // Start timer

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

      try {
        // Refresh the sellers.json cache for this domain
        const result = await refreshSellersJson(record.domain);

        if (result.success) {
          succeeded++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        logger.error(`Failed to process domain ${record.domain}`, { error: error.message });
      }
    }
  } catch (error) {
    logger.error('Error during sellers.json cache refresh task', { error: error.message });
    throw error;
  } finally {
    const durationInSeconds = (Date.now() - startTime) / 1000;
    // Log summary statistics
    logger.info('sellers.json cache refresh task summary', {
      processed,
      succeeded,
      failed,
      duration_seconds: durationInSeconds,
    });

    // Close database connection
    await db.closeDatabase();
  }

  return { processed, succeeded, failed };
}

// Export the public functions
module.exports = {
  run,
  refreshSellersJson, // Export for use by other tasks
  getSellersJsonUrl, // Export for testing/debugging
};
