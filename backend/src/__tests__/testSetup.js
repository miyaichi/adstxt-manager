/**
 * Setup for running tests (JavaScript version to avoid TypeScript compilation issues)
 */
const { initTestDatabase, clearTestDatabase, closeTestDatabase } = require('./testDatabasePostgres');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_PROVIDER = 'postgres';
process.env.PGHOST = process.env.TEST_PGHOST || 'localhost';
process.env.PGPORT = process.env.TEST_PGPORT || '5433';
process.env.PGDATABASE = process.env.TEST_PGDATABASE || 'adstxt_test';
process.env.PGUSER = process.env.TEST_PGUSER || 'testuser';
process.env.PGPASSWORD = process.env.TEST_PGPASSWORD || 'testpass';

// Disable SSL for local test database
process.env.PG_SSL_REQUIRED = 'false';

// Reduce connection pool size for tests
process.env.PG_MAX_POOL_SIZE = '3';
process.env.PG_CONNECTION_TIMEOUT = '5000';
process.env.PG_STATEMENT_TIMEOUT = '10000';

// Test-specific configuration
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.TOKEN_SECRET = 'test-token-secret';

// Mock the database in config to use PostgreSQL in test mode
jest.mock('../config/database', () => {
  // Import the actual database adapter, which will use PostgreSQL due to environment variables
  const db = jest.requireActual('../config/database');
  return db;
});

// Initialize test database with schema before each test suite
beforeAll(async () => {
  await initTestDatabase();
  console.log('Test PostgreSQL database initialized');
}, 30000); // Increase timeout for database initialization

// Clean up test database after all tests
afterAll(async () => {
  await clearTestDatabase();
  await closeTestDatabase();
  console.log('Test database cleaned up');
}, 10000);

// Reset data between tests to ensure test isolation
beforeEach(async () => {
  await clearTestDatabase();
}, 10000);