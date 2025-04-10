const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const logger = require('./logger');

// Load environment variables if not already loaded
if (!process.env.DATABASE_TYPE && !process.env.DB_PROVIDER) {
  // Try .env in current directory first
  if (fs.existsSync(path.resolve(__dirname, '../.env'))) {
    require('dotenv').config({
      path: path.resolve(__dirname, '../.env'),
    });
  } else {
    // Fall back to parent directory
    require('dotenv').config({
      path: path.resolve(__dirname, '../../.env'),
    });
  }
}

// Only support postgres for batch processing
let pgPool = null;

/**
 * Initialize the database connection
 */
async function initDatabase() {
  try {
    // Support both naming conventions (EC2 deployment and ECS batch)
    const host = process.env.DB_HOST || process.env.POSTGRES_HOST;
    const port = parseInt(process.env.DB_PORT || process.env.POSTGRES_PORT || '5432', 10);
    const user = process.env.DB_USER || process.env.POSTGRES_USER;
    const password = process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD;
    const database = process.env.DB_NAME || process.env.POSTGRES_DB;

    logger.info('Initializing PostgreSQL connection');
    pgPool = new Pool({
      host,
      port,
      user,
      password,
      database,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // Test the connection
    const client = await pgPool.connect();
    try {
      await client.query('SELECT NOW()');
      logger.info('PostgreSQL database connection established');
      
      // Check and setup UUID extension if needed
      global.uuidExtensionAvailable = await ensureUuidExtension();
    } finally {
      client.release();
    }

    return pgPool;
  } catch (error) {
    logger.error('Failed to initialize database connection', { error: error.message });
    throw error;
  }
}

/**
 * Get the database instance
 */
async function getDatabase() {
  if (!pgPool) {
    await initDatabase();
  }
  return pgPool;
}

/**
 * Check if the UUID extension is available and create it if possible
 * This should be called during database initialization
 */
async function ensureUuidExtension() {
  try {
    if (!pgPool) {
      logger.warn('Database not initialized when checking UUID extension');
      return false;
    }

    // First check if the extension is already installed - use direct query to avoid circular reference
    const client = await pgPool.connect();
    try {
      const checkResult = await client.query('SELECT COUNT(*) FROM pg_extension WHERE extname = \'uuid-ossp\'');
      
      if (parseInt(checkResult.rows[0].count) > 0) {
        logger.info('UUID extension is already available');
        return true;
      }
      
      // Try to create the extension
      try {
        logger.info('Attempting to create UUID extension...');
        await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
        logger.info('Successfully created UUID extension');
        return true;
      } catch (createError) {
        logger.warn(`Cannot create UUID extension: ${createError.message}`);
        return false;
      }
    } finally {
      client.release();
    }
  } catch (error) {
    logger.warn(`Error checking UUID extension: ${error.message}`);
    return false;
  }
}

/**
 * Execute a query on the database
 * @param {string} query - SQL query to execute
 * @param {Array|Object} params - Query parameters
 */
async function executeQuery(query, params = []) {
  try {
    const database = await getDatabase();
    const result = await database.query(query, params);
    return result.rows;
  } catch (error) {
    logger.error('Query execution failed', {
      query,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Close the database connection
 */
async function closeDatabase() {
  try {
    if (pgPool) {
      await pgPool.end();
      pgPool = null;
      logger.info('PostgreSQL connection closed');
    }
  } catch (error) {
    logger.error('Error closing database connection', { error: error.message });
    throw error;
  }
}

/**
 * Begin a database transaction
 */
async function beginTransaction() {
  try {
    const client = await pgPool.connect();
    await client.query('BEGIN');
    return client;
  } catch (error) {
    logger.error('Failed to begin transaction', { error: error.message });
    throw error;
  }
}

/**
 * Commit a database transaction
 * @param {Object} transaction - Transaction object
 */
async function commitTransaction(transaction) {
  try {
    await transaction.query('COMMIT');
    transaction.release();
  } catch (error) {
    logger.error('Failed to commit transaction', { error: error.message });
    throw error;
  }
}

/**
 * Rollback a database transaction
 * @param {Object} transaction - Transaction object
 */
async function rollbackTransaction(transaction) {
  try {
    await transaction.query('ROLLBACK');
    transaction.release();
  } catch (error) {
    logger.error('Failed to rollback transaction', { error: error.message });
    // Don't rethrow as this is likely called in an error handler
  }
}

module.exports = {
  initDatabase,
  getDatabase,
  executeQuery,
  closeDatabase,
  beginTransaction,
  commitTransaction,
  rollbackTransaction,
  ensureUuidExtension,
};
