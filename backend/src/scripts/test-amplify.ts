/**
 * Amplify Database Test Script
 *
 * This script demonstrates how to use the AmplifyDatabase implementation
 * for local testing without connecting to the cloud.
 */

import { AmplifyDatabaseTester } from '../config/database/amplify-test';
import { createLogger } from '../utils/logger';

const logger = createLogger('test-amplify');

async function main() {
  try {
    logger.info('Starting Amplify Database test');

    // Create a new tester instance
    const tester = new AmplifyDatabaseTester();

    // Initialize the database
    await tester.initialize();
    logger.info('Database initialized');

    // Run the test suite
    await tester.runTests();

    logger.info('Amplify Database test completed successfully');
    return 0;
  } catch (error) {
    logger.error('Amplify Database test failed:', error);
    return 1;
  }
}

// Run the script
main()
  .then((exitCode) => process.exit(exitCode))
  .catch((error) => {
    logger.error('Uncaught error:', error);
    process.exit(1);
  });
