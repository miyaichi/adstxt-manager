#!/usr/bin/env node
/**
 * Simple API test tool for adstxt-manager
 * Usage: node test-api.js <method> <url> [data]
 * Example: node test-api.js GET http://localhost:4001/api/sellersjson/google.com/seller/123
 * Example: node test-api.js POST http://localhost:4001/api/messages -d '{"content":"test"}'
 */

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');

// Allowed hosts - only allow connections to frontend/backend
const ALLOWED_HOSTS = [
  'localhost:4001',  // backend API
  'localhost:3000',  // frontend dev server
  '127.0.0.1:4001',  // backend API alternative
  '127.0.0.1:3000'   // frontend dev server alternative
];

// Define usage information
function showUsage() {
  console.log('API Test Tool for adstxt-manager');
  console.log('Usage: node test-api.js <method> <url> [options]');
  console.log('');
  console.log('Methods: GET, POST, PUT, DELETE');
  console.log('Options:');
  console.log('  -d, --data <data>  HTTP POST/PUT data in JSON format');
  console.log('  -H, --header <header>  Pass custom header(s) to server');
  console.log('  -o, --output <file>  Write to file instead of stdout');
  console.log('  -v, --verbose  Make the operation more talkative');
  console.log('');
  console.log('Examples:');
  console.log('  node test-api.js GET http://localhost:4001/api/sellersjson/openx.com/seller/537121234');
  console.log('  node test-api.js POST http://localhost:4001/api/messages -d \'{"content":"test", "request_id":"123"}\'');
  process.exit(1);
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    method: '',
    url: '',
    data: null,
    headers: {},
    outputFile: null,
    verbose: false
  };

  if (args.length < 2) {
    showUsage();
  }

  options.method = args[0].toUpperCase();
  options.url = args[1];

  for (let i = 2; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '-d' || arg === '--data') {
      options.data = args[++i];
      if (!options.headers['Content-Type']) {
        options.headers['Content-Type'] = 'application/json';
      }
    } else if (arg === '-H' || arg === '--header') {
      const header = args[++i];
      const parts = header.split(':');
      if (parts.length >= 2) {
        options.headers[parts[0].trim()] = parts.slice(1).join(':').trim();
      }
    } else if (arg === '-o' || arg === '--output') {
      options.outputFile = args[++i];
    } else if (arg === '-v' || arg === '--verbose') {
      options.verbose = true;
    } else {
      console.error(`Unknown option: ${arg}`);
      showUsage();
    }
  }

  return options;
}

// Check if the URL is allowed
function isAllowedUrl(urlString) {
  const parsedUrl = url.parse(urlString);
  return ALLOWED_HOSTS.includes(parsedUrl.host);
}

// Make the HTTP request
async function makeRequest(options) {
  const parsedUrl = url.parse(options.url);
  
  // Security check - only allow specified hosts
  if (!isAllowedUrl(options.url)) {
    console.error(`Error: URL host not allowed. Must be one of: ${ALLOWED_HOSTS.join(', ')}`);
    process.exit(1);
  }

  // Choose http or https module
  const httpModule = parsedUrl.protocol === 'https:' ? https : http;
  
  // Setup request options
  const requestOptions = {
    method: options.method,
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
    path: parsedUrl.path,
    headers: options.headers
  };

  if (options.verbose) {
    console.log(`> ${options.method} ${options.url}`);
    console.log('> Headers:', options.headers);
    if (options.data) {
      console.log(`> Data: ${options.data}`);
    }
    console.log('---');
  }

  return new Promise((resolve, reject) => {
    const req = httpModule.request(requestOptions, (res) => {
      let responseBody = '';
      
      if (options.verbose) {
        console.log(`< Status: ${res.statusCode} ${res.statusMessage}`);
        console.log('< Headers:', res.headers);
      }
      
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      
      res.on('end', () => {
        // Try to parse JSON response
        let parsedResponse;
        try {
          parsedResponse = JSON.parse(responseBody);
          resolve({ 
            statusCode: res.statusCode, 
            headers: res.headers, 
            body: parsedResponse 
          });
        } catch (e) {
          // Not JSON or invalid JSON
          resolve({ 
            statusCode: res.statusCode, 
            headers: res.headers, 
            body: responseBody 
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    // Send data if provided
    if (options.data) {
      req.write(options.data);
    }
    
    req.end();
  });
}

// Output the response
function outputResponse(response, options) {
  let output = '';
  
  if (typeof response.body === 'object') {
    output = JSON.stringify(response.body, null, 2);
  } else {
    output = response.body;
  }
  
  if (options.outputFile) {
    fs.writeFileSync(options.outputFile, output);
    console.log(`Response saved to ${options.outputFile}`);
  } else {
    console.log(output);
  }
}

// Main function
async function main() {
  try {
    const options = parseArgs();
    const response = await makeRequest(options);
    outputResponse(response, options);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();