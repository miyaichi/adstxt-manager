#!/usr/bin/env node
/**
 * Simple curl alternative for adstxt-manager
 * Usage: node curl.js <url> [-X METHOD] [-d DATA] [-v]
 * Example: node curl.js http://localhost:4001/api/sellersjson/google.com/seller/123 -v
 */

const http = require('http');
const https = require('https');
const url = require('url');

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
let headers = {};

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
  }
}

if (!urlArg) {
  console.log('Usage: node curl.js <url> [-X METHOD] [-d DATA] [-v]');
  console.log('Example: node curl.js http://localhost:4001/api/sellersjson/openx.com/seller/537121234 -v');
  process.exit(1);
}

// Security check
const parsedUrl = url.parse(urlArg);
if (!ALLOWED_HOSTS.includes(parsedUrl.host)) {
  console.error(`Error: Host not allowed. Must be one of: ${ALLOWED_HOSTS.join(', ')}`);
  process.exit(1);
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
  
  res.on('end', () => {
    // Try to parse as JSON
    try {
      const json = JSON.parse(body);
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      // Not JSON or invalid JSON
      console.log(body);
    }
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
  process.exit(1);
});

// Send request data if any
if (data) {
  req.write(data);
}

req.end();