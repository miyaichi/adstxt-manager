#!/usr/bin/env node

/**
 * PostgreSQL Database Reset and Test Script
 * 
 * This script resets the PostgreSQL database in a development environment
 * and tests the new JSONB format tables with google.com sellers.json data.
 */

const { exec } = require('child_process');
const { Pool } = require('pg');
require('dotenv').config();

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

// Promisified exec function
function execPromise(command) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command}`);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return reject(error);
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
      }
      console.log(`stdout: ${stdout}`);
      resolve(stdout);
    });
  });
}

async function resetAndTest() {
  try {
    console.log('PostgreSQL Database Reset and Test');
    const client = await pool.connect();
    
    try {
      // Drop sellers_json_cache table
      console.log('Dropping sellers_json_cache table...');
      await client.query('DROP TABLE IF EXISTS sellers_json_cache CASCADE');
      
      // Create new JSONB format table
      console.log('Creating JSONB format table...');
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
        );
        
        -- Domain index
        CREATE INDEX IF NOT EXISTS idx_sellers_json_cache_domain ON sellers_json_cache (domain);
        
        -- JSONB GIN index
        CREATE INDEX IF NOT EXISTS idx_sellers_json_cache_content ON sellers_json_cache USING gin (content jsonb_path_ops);
      `);
      
      console.log('Table created successfully');
      
      // Fetch google.com data
      console.log('Fetching sellers.json for google.com...');
      await execPromise('node fetch-sellers-json.js google.com');
      
      // Check table structure
      console.log('Checking table structure...');
      const tableStructure = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'sellers_json_cache'
        ORDER BY ordinal_position
      `);
      
      console.log('Table structure:');
      tableStructure.rows.forEach(row => {
        console.log(`${row.column_name}: ${row.data_type}`);
      });
      
      console.log('\nNumber of records in sellers_json_cache:');
      const countResult = await client.query('SELECT COUNT(*) FROM sellers_json_cache');
      console.log(`Total records: ${countResult.rows[0].count}`);
      
      if (parseInt(countResult.rows[0].count) > 0) {
        console.log('\nSample records:');
        const sampleResult = await client.query(`
          SELECT domain, status, status_code, 
                 jsonb_array_length(content->'sellers') as seller_count
          FROM sellers_json_cache
          LIMIT 5
        `);
        
        sampleResult.rows.forEach(row => {
          console.log(`Domain: ${row.domain}, Status: ${row.status}, Status Code: ${row.status_code}, Sellers: ${row.seller_count}`);
        });
        
        if (sampleResult.rows.length > 0 && sampleResult.rows[0].seller_count > 0) {
          console.log('\nFirst 3 sellers:');
          const sampleSellers = await client.query(`
            SELECT jsonb_path_query(content, '$.sellers[0 to 2]')
            FROM sellers_json_cache
            WHERE domain = 'google.com'
          `);
          
          sampleSellers.rows.forEach(row => {
            console.log(JSON.stringify(row.jsonb_path_query, null, 2));
          });
        }
      }
      
      console.log('\nSeller ID search test:');
      const searchResult = await client.query(`
        SELECT jsonb_path_query(content, '$.sellers[*] ? (@.seller_id == "pub-0000082074453992")')
        FROM sellers_json_cache
        WHERE domain = 'google.com'
      `);
      
      if (searchResult.rows.length > 0) {
        console.log('Search result for pub-0000082074453992:');
        searchResult.rows.forEach(row => {
          console.log(JSON.stringify(row.jsonb_path_query, null, 2));
        });
      } else {
        console.log('No sellers found with the specified seller_id');
      }
      
      console.log('\nTest completed successfully!');
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

resetAndTest();