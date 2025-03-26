#!/usr/bin/env node
/**
 * Enhanced curl alternative for adstxt-manager
 * Usage: node curl.js <url> [-X METHOD] [-d DATA] [-v] [--save]
 * Example: node curl.js http://localhost:4001/api/adsTxtCache/domain/asahi.com --save
 */

const http = require('http');
const https = require('https');
const url = require('url');
const { v4: uuidv4 } = require('uuid');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Make sure NODE_ENV is set for correct database path
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Allowed hosts - security restriction
const ALLOWED_HOSTS = [
  'localhost:4001',  // backend API
  'localhost:3000',  // frontend dev server
  '127.0.0.1:4001',  // backend API alternative
  '127.0.0.1:3000'   // frontend dev server alternative
];

// Parse arguments
const args = process.argv.slice(2);
let urlArg = null;
let method = 'GET';
let data = null;
let verbose = false;
let saveToDb = false;
let headers = {
  'User-Agent': 'AdsTxtManager/1.0',
  'Accept': 'application/json'
};

// Simple arg parsing
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('http')) {
    urlArg = args[i];
  } else if (args[i] === '-X') {
    method = args[++i];
  } else if (args[i] === '-d') {
    data = args[++i];
    headers['Content-Type'] = 'application/json';
  } else if (args[i] === '-H') {
    const header = args[++i];
    const parts = header.split(':');
    if (parts.length >= 2) {
      headers[parts[0].trim()] = parts.slice(1).join(':').trim();
    }
  } else if (args[i] === '-v') {
    verbose = true;
  } else if (args[i] === '--save') {
    saveToDb = true;
  }
}

if (!urlArg) {
  console.log('Usage: node curl.js <url> [-X METHOD] [-d DATA] [-v] [--save]');
  console.log('Example: node curl.js http://localhost:4001/api/adsTxtCache/domain/asahi.com --save');
  process.exit(1);
}

// Security check
const parsedUrl = url.parse(urlArg);
if (!ALLOWED_HOSTS.includes(parsedUrl.host)) {
  console.error(`Error: Host not allowed. Must be one of: ${ALLOWED_HOSTS.join(', ')}`);
  process.exit(1);
}

let db = null;
let domainFromUrl = null;

// Extract domain from URL path for API requests
if (saveToDb && parsedUrl.path.includes('/adsTxtCache/domain/')) {
  const pathParts = parsedUrl.path.split('/');
  const domainIndex = pathParts.indexOf('domain') + 1;
  if (domainIndex < pathParts.length) {
    domainFromUrl = pathParts[domainIndex].split('?')[0]; // Remove query params if present
    console.log(`Extracted domain from URL: ${domainFromUrl}`);
  }

  // Setup database if we're saving
  const dbPath = process.env.DB_PATH || path.join(__dirname, 'db/database.sqlite');
  console.log(`Using database: ${dbPath}`);

  // Ensure db directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error(`Error opening database: ${err.message}`);
      process.exit(1);
    }
    console.log(`Connected to the SQLite database at ${dbPath}`);
  });

  // Create the ads_txt_cache table if it doesn't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS ads_txt_cache (
      id TEXT PRIMARY KEY,
      domain TEXT NOT NULL,
      content TEXT,
      url TEXT,
      status TEXT NOT NULL CHECK (status IN ('success', 'error', 'not_found', 'invalid_format')),
      status_code INTEGER,
      error_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ads_txt_cache_domain ON ads_txt_cache (domain);
  `, (err) => {
    if (err) {
      console.error(`Error creating table: ${err.message}`);
      if (db) db.close();
      process.exit(1);
    }
  });
}

// Function to save data to database
function saveToDatabase(domain, content, url, status, statusCode, errorMessage) {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    const id = uuidv4();
    const normalizedDomain = domain.toLowerCase();
    
    // Check if domain exists
    db.get('SELECT id FROM ads_txt_cache WHERE domain = ?', [normalizedDomain], (err, row) => {
      if (err) {
        return reject(err);
      }
      
      if (row) {
        // Update existing entry
        db.run(
          `UPDATE ads_txt_cache SET 
           content = ?, url = ?, status = ?, status_code = ?, error_message = ?, updated_at = ?
           WHERE id = ?`,
          [content, url, status, statusCode, errorMessage, now, row.id],
          function(err) {
            if (err) {
              reject(err);
            } else {
              console.log(`Updated database entry for ${normalizedDomain}`);
              resolve();
            }
          }
        );
      } else {
        // Insert new entry
        db.run(
          `INSERT INTO ads_txt_cache 
           (id, domain, content, url, status, status_code, error_message, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, normalizedDomain, content, url, status, statusCode, errorMessage, now, now],
          function(err) {
            if (err) {
              reject(err);
            } else {
              console.log(`Inserted new database entry for ${normalizedDomain}`);
              resolve();
            }
          }
        );
      }
    });
  });
}

// Setup request
const httpModule = parsedUrl.protocol === 'https:' ? https : http;
const options = {
  method: method,
  hostname: parsedUrl.hostname,
  port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
  path: parsedUrl.path,
  headers: headers
};

if (verbose) {
  console.log(`> ${method} ${urlArg}`);
  console.log('> Headers:', headers);
  if (data) console.log(`> Data: ${data}`);
  console.log('---');
}

// Make request
const req = httpModule.request(options, (res) => {
  let body = '';
  
  if (verbose) {
    console.log(`< Status: ${res.statusCode} ${res.statusMessage}`);
    console.log('< Headers:', res.headers);
    console.log('---');
  }
  
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', async () => {
    // Try to parse as JSON
    let jsonData = null;
    try {
      jsonData = JSON.parse(body);
      console.log(JSON.stringify(jsonData, null, 2));
    } catch (e) {
      // Not JSON or invalid JSON
      console.log(body);
    }
    
    // For ads.txt cache API, try to save to database
    if (saveToDb && domainFromUrl && jsonData) {
      if (jsonData.success && jsonData.data) {
        const { content, url, status, status_code, error_message } = jsonData.data;
        
        try {
          await saveToDatabase(domainFromUrl, content, url, status, status_code, error_message);
          console.log(`✅ Successfully saved ads.txt data for ${domainFromUrl} to database`);
        } catch (dbError) {
          console.error(`❌ Error saving to database: ${dbError.message}`);
        }
      }
      
      // Close the database connection
      if (db) {
        db.close((err) => {
          if (err) {
            console.error(`Error closing database: ${err.message}`);
          } else {
            console.log('Database connection closed');
          }
        });
      }
    }
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
  if (db) db.close();
  process.exit(1);
});

// Send request data if any
if (data) {
  req.write(data);
}

req.end();