#!/usr/bin/env node

// Script to create the sellers_json_view that helps the api work with both SQLite and PostgreSQL

console.log('Creating sellers_json_view to make the API compatible with PostgreSQL...');

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
const sqlFilePath = path.join(__dirname, 'src/db/migrations/sellers_json_view.sql');
const sql = fs.readFileSync(sqlFilePath, 'utf8');

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Applying sellers_json_view migration...');
    await client.query(sql);
    console.log('Migration completed successfully!');
    
    // Check if the view was created
    const result = await client.query(`
      SELECT * FROM information_schema.views 
      WHERE table_name = 'sellers_json_view'
    `);
    
    if (result.rows.length > 0) {
      console.log('The sellers_json_view was created successfully.');
      
      // Test the view with a sample query
      const testResult = await client.query(`
        SELECT domain, id FROM sellers_json_view LIMIT 1
      `);
      
      if (testResult.rows.length > 0) {
        console.log('View is working correctly. Sample domain:', testResult.rows[0].domain);
      } else {
        console.log('View is empty. This may be normal if no sellers data is loaded yet.');
      }
    } else {
      console.error('Failed to create the view!');
    }
    
  } catch (error) {
    console.error('Error applying migration:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();