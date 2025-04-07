const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { Pool } = require('pg');
const logger = require('./logger');

// Load environment variables if not already loaded
if (!process.env.DATABASE_TYPE) {
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

// Determine database type from environment
const dbType = process.env.DATABASE_TYPE || 'sqlite';
let db = null;
let pgPool = null;

/**
 * Initialize the database connection
 */
async function initDatabase() {
  try {
    if (dbType === 'postgres') {
      logger.info('Initializing PostgreSQL connection');
      pgPool = new Pool({
        host: process.env.POSTGRES_HOST,
        port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

      // Test the connection
      const client = await pgPool.connect();
      try {
        await client.query('SELECT NOW()');
        logger.info('PostgreSQL database connection established');
      } finally {
        client.release();
      }

      return pgPool;
    } else {
      logger.info('Initializing SQLite connection');
      // Create the database directory if it doesn't exist
      const dbDir = path.join(__dirname, '../../db');
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      const dbPath = path.resolve(__dirname, '../../db/database.sqlite');
      db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
      });

      // Enable foreign keys
      await db.exec('PRAGMA foreign_keys = ON;');
      logger.info('SQLite database connection established');

      return db;
    }
  } catch (error) {
    logger.error('Failed to initialize database connection', { error: error.message });
    throw error;
  }
}

/**
 * Get the database instance
 */
async function getDatabase() {
  if (dbType === 'postgres') {
    if (!pgPool) {
      await initDatabase();
    }
    return pgPool;
  } else {
    if (!db) {
      await initDatabase();
    }
    return db;
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

    if (dbType === 'postgres') {
      const result = await database.query(query, params);
      return result.rows;
    } else {
      // For SQLite, use different methods based on the expected result
      if (query.trim().toUpperCase().startsWith('SELECT')) {
        return await database.all(query, params);
      } else {
        return await database.run(query, params);
      }
    }
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
    if (dbType === 'postgres' && pgPool) {
      await pgPool.end();
      pgPool = null;
      logger.info('PostgreSQL connection closed');
    } else if (db) {
      await db.close();
      db = null;
      logger.info('SQLite connection closed');
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
    const database = await getDatabase();

    if (dbType === 'postgres') {
      const client = await pgPool.connect();
      await client.query('BEGIN');
      return client;
    } else {
      await database.exec('BEGIN TRANSACTION');
      return database;
    }
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
    if (dbType === 'postgres') {
      await transaction.query('COMMIT');
      transaction.release();
    } else {
      await transaction.exec('COMMIT');
    }
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
    if (dbType === 'postgres') {
      await transaction.query('ROLLBACK');
      transaction.release();
    } else {
      await transaction.exec('ROLLBACK');
    }
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
};
