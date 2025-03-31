#!/usr/bin/env node

// Script to migrate sellers.json data to JSONB format
console.log('Starting migration to JSONB format...');

// Get the migration script
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

// Check if we're using PostgreSQL
const dbProvider = process.env.DB_PROVIDER || 'sqlite';
if (dbProvider !== 'postgres') {
  console.log('Not using PostgreSQL. No action needed.');
  process.exit(0);
}

// Connect to PostgreSQL
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432'),
  database: process.env.PGDATABASE || 'adstxt_manager',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
  max: parseInt(process.env.PG_MAX_POOL_SIZE || '10'),
  idleTimeoutMillis: 30000,
});

// Load migration SQL
const sqlFilePath = path.join(__dirname, 'src/db/migrations/sellers_json_postgres.sql');
const sql = fs.readFileSync(sqlFilePath, 'utf8');

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Creating JSONB table...');
    await client.query(sql);
    console.log('Table created successfully!');
    
    // Run the data migration function
    console.log('Migrating data to JSONB format...');
    await client.query('SELECT migrate_sellers_json_data()');
    console.log('Data migration completed!');
    
    // Check if the table was created and has data
    const result = await client.query(`
      SELECT count(*) FROM sellers_json_cache_jsonb
    `);
    
    console.log(`Found ${result.rows[0].count} domains in JSONB table`);
    
    if (parseInt(result.rows[0].count) > 0) {
      // Test a sample query
      const sampleResult = await client.query(`
        SELECT domain, id, status, jsonb_array_length(content->'sellers') as seller_count 
        FROM sellers_json_cache_jsonb 
        LIMIT 5
      `);
      
      console.log('Sample domains in JSONB table:');
      sampleResult.rows.forEach(row => {
        console.log(`Domain: ${row.domain}, Status: ${row.status}, Sellers: ${row.seller_count}`);
      });
    }
    
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();