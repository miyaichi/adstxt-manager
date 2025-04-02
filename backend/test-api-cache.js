// Test script to verify sellers.json API without memory cache
const axios = require('axios');

// Test the sellers.json API with multiple calls to check caching behavior
async function testSellersJsonAPI() {
  try {
    // First test the base API endpoint to see if the server is responding
    console.log('Testing base API endpoint first');
    try {
      const baseResponse = await axios.get('http://localhost:4000/api/status');
      console.log('Base API response:', baseResponse.status, baseResponse.data);
    } catch (error) {
      console.error('Error accessing base API:', error.message);
      console.error('Connection refused. Make sure the server is running on port 4000');
      return; // Stop further tests if we can't even reach the server
    }
    
    const domain = 'google.com';
    const sellerId = 'pub-2698861478625135'; // A real Google seller ID
    
    console.log(`Testing sellers.json API for domain: ${domain}, seller: ${sellerId}`);
    
    // Make sure server is running locally
    const baseUrl = 'http://localhost:4000/api';
    
    // Print request details for debugging
    axios.interceptors.request.use(request => {
      console.log('Request URL:', request.url);
      return request;
    }, error => {
      console.log('Request Error:', error);
      return Promise.reject(error);
    });
    
    // Print response details for debugging
    axios.interceptors.response.use(response => {
      console.log('Response Status:', response.status);
      return response;
    }, error => {
      console.log('Response Error:', error.message);
      return Promise.reject(error);
    });
    
    console.log(`\n1. First call - Testing GET ${baseUrl}/sellersJson/${domain}/seller/${sellerId}`);
    try {
      console.time('First call');
      const firstResponse = await axios.get(`${baseUrl}/sellersJson/${domain}/seller/${sellerId}`);
      console.timeEnd('First call');
      console.log('Response status:', firstResponse.status);
      console.log('Success:', firstResponse.data.success);
      console.log('Data source:', firstResponse.data.data.from_db_cache ? 'DB Cache' : 'Fresh API');
      
      if (firstResponse.data.data) {
        if (firstResponse.data.data.seller) {
          console.log('Seller found:', firstResponse.data.data.seller.name);
        } else if (firstResponse.data.data.found === false) {
          console.log('Seller not found:', firstResponse.data.data.message);
        }
      }
    } catch (error) {
      console.error('Error on first call:', error.message);
    }
    
    // Wait 1 second
    console.log('\nWaiting 1 second before second call...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`\n2. Second call - Testing GET ${baseUrl}/sellersJson/${domain}/seller/${sellerId}`);
    try {
      console.time('Second call');
      const secondResponse = await axios.get(`${baseUrl}/sellersJson/${domain}/seller/${sellerId}`);
      console.timeEnd('Second call');
      console.log('Response status:', secondResponse.status);
      console.log('Success:', secondResponse.data.success);
      console.log('Data source:', secondResponse.data.data.from_db_cache ? 'DB Cache' : 'Fresh API');
      
      if (secondResponse.data.data) {
        if (secondResponse.data.data.seller) {
          console.log('Seller found:', secondResponse.data.data.seller.name);
        } else if (secondResponse.data.data.found === false) {
          console.log('Seller not found:', secondResponse.data.data.message);
        }
      }
    } catch (error) {
      console.error('Error on second call:', error.message);
    }
    
    // Test a non-existent seller ID
    const fakeSellerId = 'pub-nonexistent12345';
    console.log(`\n3. Testing non-existent seller - GET ${baseUrl}/sellersJson/${domain}/seller/${fakeSellerId}`);
    try {
      console.time('Non-existent seller call');
      const fakeResponse = await axios.get(`${baseUrl}/sellersJson/${domain}/seller/${fakeSellerId}`);
      console.timeEnd('Non-existent seller call');
      console.log('Response status:', fakeResponse.status);
      console.log('Success:', fakeResponse.data.success);
      
      if (fakeResponse.data.data) {
        if (fakeResponse.data.data.found === false) {
          console.log('Seller not found message:', fakeResponse.data.data.message);
        } else if (fakeResponse.data.data.seller) {
          console.log('Unexpected: seller was found:', fakeResponse.data.data.seller.name);
        }
      }
    } catch (error) {
      console.error('Error testing non-existent seller:', error.message);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
console.log('IMPORTANT: Make sure your server is running with `npm start` before running this test');
console.log('Will attempt to test in 2 seconds...');
setTimeout(testSellersJsonAPI, 2000);