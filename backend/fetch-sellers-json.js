#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const { v4: uuidv4 } = require('uuid');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const dotenv = require('dotenv');
const { execSync } = require('child_process');

// Load environment variables
dotenv.config();

// Determine which database to use
const DB_PROVIDER = process.env.DB_PROVIDER || 'sqlite';

// Preferred list of domains to fetch sellers.json from
const domains = [
  'ad-generation.jp',
  'appnexus.com',
  'google.com',
  'indexexchange.com',
  'impact-ad.jp',
  'openx.com',
  'pubmatic.com',
  'rubiconproject.com',
  'smartadserver.com',
];

// Domain with special URLs
const SPECIAL_DOMAINS = {
  'google.com': 'https://storage.googleapis.com/adx-rtb-dictionaries/sellers.json',
  'advertising.com': 'https://dragon-advertising.com/sellers.json',
};

// Sellers.json data will be stored in the database only

// Initialize database connection
let db;
let pgPool;

if (DB_PROVIDER === 'postgres') {
  // PostgreSQL connection
  pgPool = new Pool({
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432'),
    database: process.env.PGDATABASE || 'adstxt_manager',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
  });
  
  console.log(`📊 Connected to PostgreSQL database at ${process.env.PGHOST || 'localhost'}`);
} else {
  // SQLite connection (default)
  const dbPath = process.env.DB_PATH || path.join(__dirname, 'db/database.sqlite');
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error(`❌ Error connecting to database: ${err.message}`);
      process.exit(1);
    }
    console.log(`📊 Connected to SQLite database at ${dbPath}`);
  });
}

// Ensure the sellers_json_cache table exists
async function ensureTableExists() {
  // SQLite
  if (DB_PROVIDER !== 'postgres') {
    return new Promise((resolve, reject) => {
      db.run(
        `
        CREATE TABLE IF NOT EXISTS sellers_json_cache (
          id TEXT PRIMARY KEY,
          domain TEXT NOT NULL UNIQUE,
          content TEXT,
          status TEXT NOT NULL,
          status_code INTEGER,
          error_message TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `,
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }
  
  // For PostgreSQL, we skip this step as the table is already created with the proper migration
  return Promise.resolve();
}

// Save data to database
async function saveToDatabase(domain, data, url, statusCode = 200) {
  const now = new Date().toISOString();
  const id = uuidv4();
  const lowercaseDomain = domain.toLowerCase();

  if (DB_PROVIDER === 'postgres') {
    // PostgreSQL implementation with JSONB - Store the entire JSON object
    try {
      // Parse the sellers.json data
      const sellersJsonData = JSON.parse(data);
      
      if (!sellersJsonData || typeof sellersJsonData !== 'object') {
        console.error(`⚠️ Invalid JSON data for ${domain}`);
        return Promise.resolve();
      }
      
      // Make sure we have a sellers array (even if empty)
      if (!sellersJsonData.sellers) {
        sellersJsonData.sellers = [];
      } else if (!Array.isArray(sellersJsonData.sellers)) {
        console.error(`⚠️ 'sellers' property is not an array in ${domain} sellers.json`);
        sellersJsonData.sellers = [];
      }
      
      const client = await pgPool.connect();
      try {
        // Check if record already exists
        const checkResult = await client.query(
          'SELECT id FROM sellers_json_cache WHERE domain = $1',
          [lowercaseDomain]
        );
        
        if (checkResult.rows.length > 0) {
          // Update existing record
          // PostgreSQLのデータ型はシステムバージョンによって異なる場合があるため、
          // まずデータ型をチェックしてから適切な方法で更新
          const columnCheck = await client.query(`
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'sellers_json_cache' AND column_name = 'content';
          `);
          
          // データ型に応じてクエリを調整
          if (columnCheck.rows.length > 0 && columnCheck.rows[0].data_type === 'jsonb') {
            // JSONBタイプの場合は直接オブジェクトを渡す
            await client.query(
              `UPDATE sellers_json_cache 
              SET content = $1::jsonb, 
                  status = $2, 
                  status_code = $3, 
                  updated_at = $4 
              WHERE id = $5`,
              [
                sellersJsonData, // 直接JSONBデータとして渡す
                'success',
                statusCode,
                now,
                checkResult.rows[0].id
              ]
            );
          } else {
            // TEXTタイプの場合は文字列に変換して渡す
            await client.query(
              `UPDATE sellers_json_cache 
              SET content = $1, 
                  status = $2, 
                  status_code = $3, 
                  updated_at = $4 
              WHERE id = $5`,
              [
                JSON.stringify(sellersJsonData),
                'success',
                statusCode,
                now,
                checkResult.rows[0].id
              ]
            );
          }
          
          console.log(`📝 Updated sellers.json for ${domain} with ${sellersJsonData.sellers.length} sellers in PostgreSQL`);
        } else {
          // Insert new record
          const newId = uuidv4();
          
          // データ型をチェックして適切な方法でデータを挿入
          const columnCheck = await client.query(`
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'sellers_json_cache' AND column_name = 'content';
          `);
          
          if (columnCheck.rows.length > 0 && columnCheck.rows[0].data_type === 'jsonb') {
            // JSONBタイプの場合
            await client.query(
              `INSERT INTO sellers_json_cache 
              (id, domain, content, status, status_code, error_message, created_at, updated_at)
              VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8)`,
              [
                newId,
                lowercaseDomain,
                sellersJsonData, // 直接JSONBデータとして渡す
                'success',
                statusCode,
                null,
                now,
                now
              ]
            );
          } else {
            // TEXTタイプの場合
            await client.query(
              `INSERT INTO sellers_json_cache 
              (id, domain, content, status, status_code, error_message, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                newId,
                lowercaseDomain,
                JSON.stringify(sellersJsonData),
                'success',
                statusCode,
                null,
                now,
                now
              ]
            );
          }
          
          console.log(`📝 Stored new sellers.json for ${domain} with ${sellersJsonData.sellers.length} sellers in PostgreSQL`);
        }
        
        // Show sample seller IDs for verification
        if (sellersJsonData.sellers.length > 0) {
          const sampleCount = Math.min(3, sellersJsonData.sellers.length);
          const sampleIds = sellersJsonData.sellers.slice(0, sampleCount).map(s => s.seller_id);
          console.log(`📊 Sample seller IDs: ${sampleIds.join(', ')}...`);
        }
        
        return Promise.resolve();
      } catch (err) {
        console.error(`❌ Database error for ${domain}: ${err.message}`);
        return Promise.reject(err);
      } finally {
        client.release();
      }
    } catch (parseErr) {
      console.error(`❌ Error parsing JSON data for ${domain}: ${parseErr.message}`);
      return Promise.reject(parseErr);
    }
  } else {
    // SQLite implementation
    return new Promise((resolve, reject) => {
      // Check if the domain already exists in the database
      db.get(
        'SELECT id FROM sellers_json_cache WHERE domain = ?',
        [lowercaseDomain],
        (err, row) => {
          if (err) {
            return reject(err);
          }

          // If domain exists, update the record
          if (row) {
            db.run(
              `UPDATE sellers_json_cache 
             SET content = ?, status = ?, status_code = ?, updated_at = ?
             WHERE id = ?`,
              [data, 'success', statusCode, now, row.id],
              (err) => {
                if (err) {
                  reject(err);
                } else {
                  console.log(`📝 Updated SQLite entry for ${domain}`);
                  resolve();
                }
              }
            );
          } else {
            // If domain doesn't exist, insert a new record
            db.run(
              `INSERT INTO sellers_json_cache 
             (id, domain, content, status, status_code, error_message, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [id, lowercaseDomain, data, 'success', statusCode, null, now, now],
              (err) => {
                if (err) {
                  reject(err);
                } else {
                  console.log(`📝 Inserted new SQLite entry for ${domain}`);
                  resolve();
                }
              }
            );
          }
        }
      );
    });
  }
}

// Validating JSON data
function isValidJson(data) {
  try {
    JSON.parse(data);
    return true;
  } catch (e) {
    return false;
  }
}

// Function to fetch data from a URL
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 AdsTxtManager/1.0',
          Accept: 'application/json',
        },
      },
      (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          // If the response is a redirect, follow the redirect
          console.log(`↪️ Following redirect to: ${response.headers.location}`);
          return fetchUrl(response.headers.location).then(resolve).catch(reject);
        }

        // Get the response data
        let data = '';
        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          if (response.statusCode === 200) {
            resolve({ data, statusCode: response.statusCode });
          } else {
            reject(new Error(`HTTP Error: ${response.statusCode}`));
          }
        });
      }
    );

    request.on('error', (error) => {
      reject(error);
    });

    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Get the list of cached domains from the database
async function getCachedDomains() {
  if (DB_PROVIDER === 'postgres') {
    // PostgreSQL implementation - use JSONB table
    try {
      const result = await pgPool.query('SELECT domain FROM sellers_json_cache');
      return result.rows.map((row) => row.domain);
    } catch (err) {
      return Promise.reject(err);
    }
  } else {
    // SQLite implementation
    return new Promise((resolve, reject) => {
      db.all('SELECT DISTINCT domain FROM sellers_json_cache', [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map((row) => row.domain));
        }
      });
    });
  }
}

// Main function to fetch sellers.json data
async function main() {
  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  console.log('🚀 Starting sellers.json fetch process');

  // Ensure the database table exists
  try {
    await ensureTableExists();
  } catch (err) {
    console.error(`❌ Error ensuring table exists: ${err.message}`);
    process.exit(1);
  }

  // Process command line arguments
  const args = process.argv.slice(2);
  const options = {
    updateCached: false,
    forceUpdate: false,
    domains: [],
  };

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--update-cached') {
      options.updateCached = true;
    } else if (args[i] === '--force') {
      options.forceUpdate = true;
    } else {
      options.domains.push(args[i]);
    }
  }

  // Set target domains
  let targetDomains = options.domains.length > 0 ? options.domains : domains;

  // If --update-cached flag is specified, also include domains from DB
  if (options.updateCached) {
    try {
      const cachedDomains = await getCachedDomains();
      console.log(`📋 Found ${cachedDomains.length} domains in database cache`);

      // Merge with target domains (removing duplicates)
      targetDomains = [...new Set([...targetDomains, ...cachedDomains])];
    } catch (err) {
      console.error(`⚠️ Error retrieving cached domains: ${err.message}`);
    }
  }

  console.log(`🔍 Processing ${targetDomains.length} domains: ${targetDomains.join(', ')}`);

  // Get the current timestamp (for cache expiry check)
  const now = new Date();

  for (const domain of targetDomains) {
    // Check cache expiry (if --force flag is not set)
    if (!options.forceUpdate) {
      try {
        let cachedEntry;
        
        if (DB_PROVIDER === 'postgres') {
          // PostgreSQL implementation using JSONB table
          const result = await pgPool.query(
            'SELECT updated_at FROM sellers_json_cache WHERE domain = $1',
            [domain.toLowerCase()]
          );
          
          // If we have any entry for this domain, consider it cached
          if (result.rows.length > 0) {
            // We need to create a compatible object with updated_at property
            cachedEntry = { updated_at: result.rows[0].updated_at };
          } else {
            cachedEntry = null;
          }
        } else {
          // SQLite implementation
          cachedEntry = await new Promise((resolve, reject) => {
            db.get(
              'SELECT updated_at FROM sellers_json_cache WHERE domain = ? ORDER BY updated_at DESC LIMIT 1',
              [domain.toLowerCase()],
              (err, row) => {
                if (err) reject(err);
                else resolve(row);
              }
            );
          });
        }

        if (cachedEntry) {
          const updatedAt = new Date(cachedEntry.updated_at);
          const diffHours = Math.abs(now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);

          // If cache is less than 24 hours old, skip the update
          if (diffHours < 24) {
            console.log(
              `⏭️ Skipping ${domain}: cache is still fresh (updated ${Math.round(diffHours)} hours ago)`
            );
            skipCount++;
            continue;
          }
        }
      } catch (err) {
        console.error(`⚠️ Error checking cache expiry for ${domain}: ${err.message}`);
      }
    }

    console.log(`📥 Fetching sellers.json from ${domain}...`);

    // Fix for special domains
    const url = SPECIAL_DOMAINS[domain] || `https://${domain}/sellers.json`;

    try {
      const { data, statusCode } = await fetchUrl(url);

      // Validating JSON data
      if (isValidJson(data)) {
        console.log(`✅ Successfully downloaded sellers.json for ${domain}`);

        // Save to database
        try {
          await saveToDatabase(domain, data, url, statusCode);
          console.log(`💾 Saved to database: ${domain}`);
          successCount++;
        } catch (dbError) {
          console.error(`❌ Error saving to database for ${domain}: ${dbError.message}`);
        }

        // Display the number of sellers in the data
        const jsonData = JSON.parse(data);
        if (jsonData.sellers && Array.isArray(jsonData.sellers)) {
          console.log(`   📊 Found ${jsonData.sellers.length} sellers in the data`);

          // Display the first 3 seller IDs as samples
          const sampleIds = jsonData.sellers.slice(0, 3).map((s) => s.seller_id);
          console.log(`   🔍 Sample seller IDs: ${sampleIds.join(', ')}...`);
        }
      } else {
        console.log(`⚠️ Downloaded file for ${domain} is not valid JSON`);
        failCount++;
      }
    } catch (error) {
      console.error(`❌ Error fetching sellers.json for ${domain}: ${error.message}`);
      failCount++;
    }
  }

  console.log(
    `🏁 Fetch process completed: ${successCount} successful, ${failCount} failed, ${skipCount} skipped`
  );

  // Close the database connection
  if (DB_PROVIDER === 'postgres') {
    // Close PostgreSQL connection
    await pgPool.end();
    console.log('📊 PostgreSQL connection closed');
  } else {
    // Close SQLite connection
    db.close((err) => {
      if (err) {
        console.error(`❌ Error closing database: ${err.message}`);
      } else {
        console.log('📊 SQLite connection closed');
      }
    });
  }
}

// Execute the main function
main().catch((error) => {
  console.error(`❌ Fatal error: ${error.message}`);
  // Close the database connection if there is an error
  if (DB_PROVIDER === 'postgres') {
    pgPool.end().catch(console.error);
  } else {
    db.close();
  }
  process.exit(1);
});
