const psl = require('psl');
const axios = require('axios');

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
  
  // Try common URLs for sellers.json
  const urls = [`https://${rootDomain}/sellers.json`, `https://www.${rootDomain}/sellers.json`];
  
  for (const url of urls) {
    try {
      console.log(`Trying URL: ${url}`);
      const response = await axios.get(url, {
        timeout: 5000,
        maxContentLength: 10 * 1024 * 1024, // 10MB
        headers: {
          'User-Agent': 'AdsTxtManager/1.0',
        },
      });
      
      console.log(`Success! Status code: ${response.status}`);
      const contentPreview = JSON.stringify(response.data).substring(0, 500);
      console.log(`Content preview: ${contentPreview}...`);
      return;
    } catch (error) {
      console.error(`Error fetching ${url}: ${error.message}`);
    }
  }
  
  console.log('Failed to fetch sellers.json from all URLs');
}

// Run the test for openx.com's sellers.json
fetchSellersJson('openx.com');

