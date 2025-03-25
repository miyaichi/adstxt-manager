const psl = require('psl');
const axios = require('axios');

// Special domains with non-standard sellers.json URLs
const SPECIAL_DOMAINS = {
  'google.com': 'https://storage.googleapis.com/adx-rtb-dictionaries/sellers.json',
  'advertising.com': 'https://dragon-advertising.com/sellers.json',
};

function extractRootDomain(domain) {
  domain = domain.replace(/^(https?:\/\/)?(www\.)?/i, '');
  domain = domain.split('/')[0].split('?')[0].split('#')[0];
  const parsed = psl.parse(domain);
  if (parsed && 'domain' in parsed && parsed.domain) {
    return parsed.domain;
  }
  return domain;
}

async function fetchAdsTxt(domain) {
  console.log(`Testing fetch ads.txt for domain: ${domain}`);
  
  // Extract root domain
  const rootDomain = extractRootDomain(domain);
  console.log(`Root domain: ${rootDomain}`);
  
  // Try common URLs for ads.txt
  const urls = [`https://${rootDomain}/ads.txt`, `https://www.${rootDomain}/ads.txt`];
  
  for (const url of urls) {
    try {
      console.log(`Trying URL: ${url}`);
      const response = await axios.get(url, {
        timeout: 5000,
        maxContentLength: 1024 * 1024,
        headers: {
          'User-Agent': 'AdsTxtManager/1.0',
        },
      });
      
      console.log(`Success! Status code: ${response.status}`);
      const contentPreview = response.data.toString().substring(0, 500);
      console.log(`Content preview: ${contentPreview}...`);
      return;
    } catch (error) {
      console.error(`Error fetching ${url}: ${error.message}`);
    }
  }
  
  console.log('Failed to fetch ads.txt from all URLs');
}

async function fetchSellersJson(domain) {
  console.log(`Testing fetch sellers.json for domain: ${domain}`);
  
  // Extract root domain
  const rootDomain = extractRootDomain(domain);
  console.log(`Root domain: ${rootDomain}`);
  
  // Determine URL to fetch
  let url;
  
  // Check if this is a special domain with a custom URL
  if (rootDomain in SPECIAL_DOMAINS) {
    url = SPECIAL_DOMAINS[rootDomain];
    console.log(`Using special URL for ${rootDomain}: ${url}`);
  } else {
    // Use standard location
    url = `https://${rootDomain}/sellers.json`;
  }
  
  try {
    console.log(`Fetching from URL: ${url}`);
    const response = await axios.get(url, {
      timeout: 30000, // Increase timeout for large files
      maxContentLength: 200 * 1024 * 1024, // 200MB to handle Google's ~114MB file
      decompress: true, // Handle gzipped responses
      headers: {
        'User-Agent': 'AdsTxtManager/1.0',
      },
    });
    
    console.log(`Success! Status code: ${response.status}`);
    const contentPreview = JSON.stringify(response.data).substring(0, 500);
    console.log(`Content preview: ${contentPreview}...`);
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error(`Timeout error fetching ${url}: Request took too long`);
    } else if (error.response) {
      console.error(`Error fetching ${url}: Status ${error.response.status}`);
    } else if (error.request) {
      console.error(`Error fetching ${url}: No response received`);
    } else {
      console.error(`Error fetching ${url}: ${error.message}`);
    }
    console.log('Failed to fetch sellers.json');
  }
}

// Run tests for different domains
async function runTests() {
  // Test standard domain
  await fetchSellersJson('openx.com');
  
  // Test special domain
  await fetchSellersJson('google.com');
}

runTests();

