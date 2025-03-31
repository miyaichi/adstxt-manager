// Manual reset script for PostgreSQL database
const { Pool } = require('pg');
require('dotenv').config();

// Check if we're using PostgreSQL
const dbProvider = process.env.DB_PROVIDER || 'sqlite';
if (dbProvider !== 'postgres') {
  console.log('Not using PostgreSQL. No action needed.');
  process.exit(0);
}

// Database connection info
const dbName = process.env.PGDATABASE || 'adstxt_manager';
const dbUser = process.env.PGUSER || 'postgres';
const dbPassword = process.env.PGPASSWORD || '';
const dbHost = process.env.PGHOST || 'localhost';
const dbPort = process.env.PGPORT || '5432';

// PostgreSQL connection
const pool = new Pool({
  host: dbHost,
  port: parseInt(dbPort),
  database: dbName,
  user: dbUser,
  password: dbPassword
});

async function resetTables() {
  const client = await pool.connect();
  try {
    console.log('Dropping and recreating sellers_json_cache table...');
    
    // Drop and recreate table
    await client.query(`
      DROP TABLE IF EXISTS sellers_json_cache;
      
      CREATE TABLE sellers_json_cache (
        id TEXT PRIMARY KEY,
        domain TEXT NOT NULL UNIQUE,
        content JSONB,
        status TEXT NOT NULL CHECK (status IN ('success', 'error', 'not_found', 'invalid_format')),
        status_code INTEGER,
        error_message TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      
      CREATE INDEX idx_sellers_json_cache_domain ON sellers_json_cache (domain);
      CREATE INDEX idx_sellers_json_cache_content ON sellers_json_cache USING gin (content jsonb_path_ops);
    `);
    
    console.log('Table reset complete.');
  } catch (error) {
    console.error('Error resetting tables:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

resetTables();