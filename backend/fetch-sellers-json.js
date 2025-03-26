#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

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
          resolve(data);
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
  const successCount = 0;
  const failCount = 0;

  console.log('🚀 Starting sellers.json fetch process');

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
      const data = await fetchUrl(url);
      const filePath = path.join(dataDir, `${domain}.json`);

      // Validating JSON data
      if (isValidJson(data)) {
        fs.writeFileSync(filePath, data, 'utf8');
        console.log(`✅ Successfully downloaded sellers.json for ${domain}`);

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

  console.log('🏁 fetch-sellers-json process completed');
}

// Execute the main function
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});