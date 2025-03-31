#!/usr/bin/env node

// Test script to check if the sellers.json API is working correctly
const axios = require('axios');

// Test parameters
const domain = process.argv[2] || 'google.com';
const sellerId = process.argv[3] || 'pub-1234567891234567';
const baseUrl = 'http://localhost:3001/api';

async function testSellersJsonAPI() {
  try {
    console.log(`Testing sellers.json API for domain: ${domain}`);
    
    // Test the domain endpoint
    console.log(`\n1. Testing GET /api/sellersjson/${domain}...`);
    try {
      const domainResponse = await axios.get(`${baseUrl}/sellersjson/${domain}`);
      console.log('✅ Response status:', domainResponse.status);
      console.log('✅ Success property:', domainResponse.data.success);
      
      if (domainResponse.data.data) {
        console.log('✅ Data content type:', typeof domainResponse.data.data.content);
        console.log('✅ Status:', domainResponse.data.data.status);
        console.log('✅ From cache:', domainResponse.data.data.cached || false);
        
        // If we have a content object, check the sellers array
        if (domainResponse.data.data.content && Array.isArray(domainResponse.data.data.content.sellers)) {
          console.log(`✅ Found ${domainResponse.data.data.content.sellers.length} sellers`);
          
          // Show the first seller as a sample
          if (domainResponse.data.data.content.sellers.length > 0) {
            console.log('✅ Sample seller:', JSON.stringify(domainResponse.data.data.content.sellers[0], null, 2));
          }
        } else {
          console.log('❌ No sellers array found in the content');
        }
      } else {
        console.log('❌ No data in the response');
      }
    } catch (error) {
      console.error('❌ Error testing domain endpoint:', error.message);
      if (error.response) {
        console.error('❌ Response status:', error.response.status);
        console.error('❌ Response data:', error.response.data);
      }
    }
    
    // Test the seller ID endpoint
    console.log(`\n2. Testing GET /api/sellersjson/${domain}/seller/${sellerId}...`);
    try {
      const sellerResponse = await axios.get(`${baseUrl}/sellersjson/${domain}/seller/${sellerId}`);
      console.log('✅ Response status:', sellerResponse.status);
      console.log('✅ Success property:', sellerResponse.data.success);
      
      if (sellerResponse.data.data) {
        console.log('✅ Found:', sellerResponse.data.data.found !== false);
        
        if (sellerResponse.data.data.seller) {
          console.log('✅ Seller info:', JSON.stringify(sellerResponse.data.data.seller, null, 2));
        } else if (sellerResponse.data.data.message) {
          console.log('❌ Message:', sellerResponse.data.data.message);
        }
      } else {
        console.log('❌ No data in the response');
      }
    } catch (error) {
      console.error('❌ Error testing seller ID endpoint:', error.message);
      if (error.response) {
        console.error('❌ Response status:', error.response.status);
        console.error('❌ Response data:', error.response.data);
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the test
testSellersJsonAPI();