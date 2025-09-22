/**
 * PostgreSQL Test Database Utility (JavaScript version)
 * Provides a connection to a test PostgreSQL database for use in tests
 */
const { Pool } = require('pg');

// This export makes Jest not treat this as a test file
exports.__IGNORED__ = true;

// Test database configuration
const TEST_DB_CONFIG = {
  host: process.env.TEST_PGHOST || 'localhost',
  port: parseInt(process.env.TEST_PGPORT || '5433'),
  database: process.env.TEST_PGDATABASE || 'adstxt_test',
  user: process.env.TEST_PGUSER || 'testuser',
  password: process.env.TEST_PGPASSWORD || 'testpass',
  max: 5, // Smaller pool for tests
};

let testPool = null;

// Initialize test database with schema
const initTestDatabase = async () => {
  try {
    console.log('Initializing test PostgreSQL database...');

    // Create connection pool
    testPool = new Pool(TEST_DB_CONFIG);

    // Test connection
    const client = await testPool.connect();

    try {
      await client.query('BEGIN');

      // Create requests table
      await client.query(`
        CREATE TABLE IF NOT EXISTS requests (
          id TEXT PRIMARY KEY,
          publisher_email TEXT NOT NULL,
          requester_email TEXT NOT NULL,
          requester_name TEXT NOT NULL,
          publisher_name TEXT,
          publisher_domain TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          token TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      // Create messages table
      await client.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          request_id TEXT NOT NULL,
          sender_email TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (request_id) REFERENCES requests (id)
        )
      `);

      // Create ads_txt_records table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ads_txt_records (
          id TEXT PRIMARY KEY,
          request_id TEXT NOT NULL,
          domain TEXT NOT NULL,
          account_id TEXT NOT NULL,
          account_type TEXT NOT NULL,
          certification_authority_id TEXT,
          relationship TEXT DEFAULT 'DIRECT',
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (request_id) REFERENCES requests (id)
        )
      `);

      // Create ads_txt_cache table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ads_txt_cache (
          id TEXT PRIMARY KEY,
          domain TEXT NOT NULL UNIQUE,
          content TEXT,
          status INTEGER DEFAULT 0,
          last_fetched TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      // Create sellers_json_cache table with JSONB
      await client.query(`
        CREATE TABLE IF NOT EXISTS sellers_json_cache (
          id TEXT PRIMARY KEY,
          domain TEXT NOT NULL UNIQUE,
          content JSONB,
          status TEXT NOT NULL CHECK (status IN ('success', 'error', 'not_found', 'invalid_format')),
          status_code INTEGER,
          error_message TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      // Add indexes for better performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_sellers_json_cache_domain ON sellers_json_cache (domain);
        CREATE INDEX IF NOT EXISTS idx_sellers_json_cache_content ON sellers_json_cache USING gin (content jsonb_path_ops);
      `);

      await client.query('COMMIT');
      console.log('Test database schema created successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error initializing test database:', error);
    throw error;
  }
};

// Clear all data from tables
const clearTestDatabase = async () => {
  if (!testPool) return;

  const client = await testPool.connect();

  try {
    await client.query('BEGIN');

    // Clear all tables in reverse dependency order
    await client.query('DELETE FROM messages');
    await client.query('DELETE FROM ads_txt_records');
    await client.query('DELETE FROM requests');
    await client.query('DELETE FROM ads_txt_cache');
    await client.query('DELETE FROM sellers_json_cache');

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error clearing test database:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Close test database connection
const closeTestDatabase = async () => {
  if (testPool) {
    await testPool.end();
    testPool = null;
  }
};

// Get test database pool for direct access
const getTestPool = () => {
  return testPool;
};

module.exports = {
  initTestDatabase,
  clearTestDatabase,
  closeTestDatabase,
  getTestPool,
  __IGNORED__: true,
};
