/**
 * Test script for the external API v1
 */
const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api/v1';
const API_KEY = 'test-api-key-1';

// Headers with API key
const headers = {
  'X-API-Key': API_KEY
};

// Helper function to make requests
async function makeRequest(method, endpoint, data = null) {
  try {
    const url = `${BASE_URL}${endpoint}`;
    const options = {
      method,
      url,
      headers,
      ...(data && { data })
    };
    
    console.log(`Making ${method} request to ${url}`);
    const response = await axios(options);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.status, error.response?.data || error.message);
    return null;
  }
}

// Test functions
async function testStatus() {
  console.log('\n--- Testing API Status ---');
  await makeRequest('get', '/status');
}

async function testCreateRequest() {
  console.log('\n--- Testing Create Request ---');
  const requestData = {
    domain: 'example.com',
    email: 'test@example.com',
    changes: 'Adding new entry: google.com, pub-1234567890, DIRECT, f08c47fec0942fa0'
  };
  
  return await makeRequest('post', '/requests', requestData);
}

async function testGetRequest(id) {
  console.log(`\n--- Testing Get Request (ID: ${id}) ---`);
  await makeRequest('get', `/requests/${id}`);
}

async function testListRequests() {
  console.log('\n--- Testing List Requests ---');
  await makeRequest('get', '/requests?limit=5&offset=0');
  
  console.log('\n--- Testing List Requests with Filters ---');
  await makeRequest('get', '/requests?domain=example.com&status=pending');
}

// Run tests
async function runTests() {
  try {
    // Test status endpoint
    await testStatus();
    
    // Test request endpoints
    const createResponse = await testCreateRequest();
    
    if (createResponse && createResponse.success) {
      const requestId = createResponse.data.id;
      await testGetRequest(requestId);
    } else {
      // Use a dummy ID for testing if creation failed
      await testGetRequest('123e4567-e89b-12d3-a456-426614174000');
    }
    
    await testListRequests();
    
    console.log('\n--- All tests completed ---');
  } catch (error) {
    console.error('Test execution error:', error);
  }
}

// Execute the tests
runTests();