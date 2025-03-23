/**
 * Setup for running tests
 */
import path from 'path';
import fs from 'fs';
import sqlite3 from 'sqlite3';
import { Database } from 'sqlite3';
import { initTestDatabase, clearTestDatabase } from './testDatabase';

// This export makes Jest not treat this as a test file
export const __IGNORED__ = true;

// Mock the database in config
jest.mock('../config/database', () => {
  // Import the test database
  const testDb = require('./testDatabase').default;
  return testDb;
});

// Initialize test database with schema before each test suite
beforeAll(async () => {
  await initTestDatabase();
  console.log('Test database initialized');
});

// Clean up test database after all tests
afterAll(async () => {
  await clearTestDatabase();
  console.log('Test database cleaned up');
});

// Reset data between tests to ensure test isolation
beforeEach(async () => {
  await clearTestDatabase();
});
