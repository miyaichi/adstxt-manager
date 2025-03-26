#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const { v4: uuidv4 } = require('uuid');
const sqlite3 = require('sqlite3').verbose();
const dotenv = require('dotenv');
const { execSync } = require('child_process');

// Load environment variables
dotenv.config();

// サポートするドメインリスト
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
  'advertising.com': 'https://dragon-advertising.com/sellers.json'
};

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, 'data', 'sellers_json');
if (!fs.existsSync(dataDir)) {
  console.log(`📁 Creating directory: ${dataDir}`);
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database connection
const dbPath = process.env.DB_PATH || path.join(__dirname, 'db/database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error(`❌ Error connecting to database: ${err.message}`);
    process.exit(1);
  }
  console.log(`📊 Connected to SQLite database at ${dbPath}`);
});

// Ensure the sellers_json_cache table exists
function ensureTableExists() {
  return new Promise((resolve, reject) => {
    db.run(`
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
    `, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

// Save data to database
function saveToDatabase(domain, data, url, statusCode = 200) {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    const id = uuidv4();
    
    // Check if the domain already exists in the database
    db.get('SELECT id FROM sellers_json_cache WHERE domain = ?', [domain.toLowerCase()], (err, row) => {
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
              console.log(`📝 Updated database entry for ${domain}`);
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
          [id, domain.toLowerCase(), data, 'success', statusCode, null, now, now],
          (err) => {
            if (err) {
              reject(err);
            } else {
              console.log(`📝 Inserted new database entry for ${domain}`);
              resolve();
            }
          }
        );
      }
    });
  });
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
    const request = https.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 AdsTxtManager/1.0',
        'Accept': 'application/json'
      }
    }, (response) => {
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
    });

    request.on('error', (error) => {
      reject(error);
    });

    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Main function to fetch sellers.json data
async function main() {
  let successCount = 0;
  let failCount = 0;

  console.log('🚀 Starting sellers.json fetch process');

  // Ensure the database table exists
  try {
    await ensureTableExists();
  } catch (err) {
    console.error(`❌ Error ensuring table exists: ${err.message}`);
    process.exit(1);
  }

  // If domains are specified, process only those domains
  const targetDomains = process.argv.length > 2
    ? process.argv.slice(2)
    : domains;

  console.log(`🔍 Processing ${targetDomains.length} domains: ${targetDomains.join(', ')}`);

  for (const domain of targetDomains) {
    console.log(`📥 Fetching sellers.json from ${domain}...`);

    // Fix for special domains
    const url = SPECIAL_DOMAINS[domain] || `https://${domain}/sellers.json`;

    try {
      const { data, statusCode } = await fetchUrl(url);
      const filePath = path.join(dataDir, `${domain}.json`);

      // Validating JSON data
      if (isValidJson(data)) {
        // Write to file
        fs.writeFileSync(filePath, data, 'utf8');
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
          const sampleIds = jsonData.sellers.slice(0, 3).map(s => s.seller_id);
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

  console.log(`🏁 Fetch process completed: ${successCount} successful, ${failCount} failed`);
  
  // Close the database connection
  db.close((err) => {
    if (err) {
      console.error(`❌ Error closing database: ${err.message}`);
    } else {
      console.log('📊 Database connection closed');
    }
  });
}

// Execute the main function
main().catch(error => {
  console.error(`❌ Fatal error: ${error.message}`);
  // Close the database connection if there is an error
  db.close();
  process.exit(1);
});