#!/usr/bin/env node

// Script to update PostgreSQL schema to use JSONB for sellers.json cache
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
  password: dbPassword,
});

async function updateSchema() {
  const client = await pool.connect();
  try {
    console.log('Checking current PostgreSQL schema...');

    // Check if table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'sellers_json_cache'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.log('sellers_json_cache table does not exist, will create it from scratch');
      await createTableFromScratch(client);
      return;
    }

    // Check if content column is already JSONB
    const columnCheck = await client.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sellers_json_cache' AND column_name = 'content';
    `);

    if (!columnCheck.rows.length) {
      console.error('ERROR: content column not found in sellers_json_cache table');
      return;
    }

    if (columnCheck.rows[0].data_type === 'jsonb') {
      console.log('Content column is already JSONB type, no action needed');
      return;
    }

    console.log(
      `Current content column type is ${columnCheck.rows[0].data_type}, updating to JSONB...`
    );

    // Begin transaction
    await client.query('BEGIN');

    // Backup existing data
    console.log('Backing up existing data...');
    const existingData = await client.query('SELECT * FROM sellers_json_cache');
    console.log(`Backup complete, got ${existingData.rows.length} records`);

    // Convert text content to JSONB
    console.log('Converting TEXT content to JSONB...');
    await client.query(`
      ALTER TABLE sellers_json_cache 
      ALTER COLUMN content TYPE JSONB USING 
        CASE 
          WHEN content IS NULL THEN NULL
          WHEN content ~ '^\\s*\\{.*\\}\\s*$' THEN content::jsonb 
          ELSE NULL 
        END
    `);

    // Add GIN indexes for JSONB content
    console.log('Adding GIN indexes for JSONB content...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sellers_json_cache_content 
      ON sellers_json_cache USING gin (content jsonb_path_ops)
    `);

    // Commit transaction
    await client.query('COMMIT');
    console.log('Schema update completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating schema:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

async function createTableFromScratch(client) {
  try {
    console.log('Creating sellers_json_cache table with JSONB support...');

    await client.query(`
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
      
      -- Create an index on domain for faster lookups
      CREATE INDEX idx_sellers_json_cache_domain ON sellers_json_cache (domain);
      
      -- Create a gin index on the JSONB content for faster JSON searches
      CREATE INDEX idx_sellers_json_cache_content ON sellers_json_cache USING gin (content jsonb_path_ops);
    `);

    console.log('sellers_json_cache table created successfully with JSONB support');
  } catch (error) {
    console.error('Error creating table:', error);
    throw error;
  }
}

// Run the script
updateSchema();
