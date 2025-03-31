#!/usr/bin/env node

// Script to fix the ads_txt_cache table in PostgreSQL
console.log('Starting to fix ads_txt_cache table...');

// Get the migration script
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

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
const sqlFilePath = path.join(__dirname, 'src/db/migrations/alter_ads_txt_cache.sql');
const sql = fs.readFileSync(sqlFilePath, 'utf8');

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Applying migration...');
    await client.query(sql);
    console.log('Migration completed successfully!');
    
    // Verify table structure
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ads_txt_cache'
      ORDER BY ordinal_position
    `);
    
    console.log('Current ads_txt_cache table structure:');
    result.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type}`);
    });
    
  } catch (error) {
    console.error('Error applying migration:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();