// Jest setup file
import dotenv from 'dotenv';

// Configure environment for tests
dotenv.config({ path: '.env.test' });

// Global beforeAll hook
beforeAll(() => {
  // Any global setup operations can go here
  console.log('Running tests in test environment');
});

// Global afterAll hook
afterAll(() => {
  // Any global cleanup operations can go here
});

// Setup global mocks if needed
jest.setTimeout(10000); // Set a default timeout for all tests