// Script to test the API with the new PostgreSQL JSONB implementation
const axios = require('axios');

// Test the sellers.json API
async function testSellersJsonAPI() {
  try {
    const domain = 'google.com';
    const sellerId = 'pub-0000082074453992'; // Using a known seller ID from our test
    
    console.log(`Testing sellers.json API for domain: ${domain}, seller: ${sellerId}`);
    
    // Make sure server is running locally
    const baseUrl = 'http://localhost:3001/api';
    
    console.log(`\n1. Testing GET ${baseUrl}/sellersjson/${domain}`);
    try {
      const domainResponse = await axios.get(`${baseUrl}/sellersjson/${domain}`);
      console.log('Response status:', domainResponse.status);
      console.log('Success:', domainResponse.data.success);
      
      if (domainResponse.data.data) {
        console.log('Status:', domainResponse.data.data.status);
        console.log('Content type:', typeof domainResponse.data.data.content);
        
        if (domainResponse.data.data.content && 
            domainResponse.data.data.content.sellers) {
          console.log(`Found ${domainResponse.data.data.content.sellers.length} sellers`);
        }
      }
    } catch (error) {
      console.error('Error testing domain endpoint:', error.message);
    }
    
    console.log(`\n2. Testing GET ${baseUrl}/sellersjson/${domain}/seller/${sellerId}`);
    try {
      const sellerResponse = await axios.get(`${baseUrl}/sellersjson/${domain}/seller/${sellerId}`);
      console.log('Response status:', sellerResponse.status);
      console.log('Success:', sellerResponse.data.success);
      
      if (sellerResponse.data.data) {
        console.log('Data:', JSON.stringify(sellerResponse.data.data, null, 2));
      }
    } catch (error) {
      console.error('Error testing seller endpoint:', error.message);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
console.log('IMPORTANT: Make sure your server is running with `npm start` before running this test');
console.log('Will attempt to test in 3 seconds...');
setTimeout(testSellersJsonAPI, 3000);