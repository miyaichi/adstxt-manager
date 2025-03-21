/**
 * Setup for running tests
 */
import path from 'path';
import fs from 'fs';
import sqlite3 from 'sqlite3';
import { execSync } from 'child_process';

// Close the test database after all tests
afterAll(async () => {
  // Clean up any resources if needed
});

// Initialize test database with schema
beforeAll(async () => {
  // Use in-memory database for tests
  global.__TEST_DB__ = new sqlite3.Database(':memory:');
  
  // Execute the schema script
  const schemaPath = path.join(__dirname, '../db/migrations/setup.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  // Create all tables
  await new Promise<void>((resolve, reject) => {
    global.__TEST_DB__.exec(schema, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  
  // Set up any mock data needed for all tests
  console.log('Test database initialized');
});