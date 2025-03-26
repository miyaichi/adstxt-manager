/**
 * Amplify Database Mock Test Script
 *
 * This script demonstrates how to use the AmplifyDatabaseMock implementation
 * for testing without requiring the actual AWS Amplify DataStore.
 */

import { AmplifyDatabaseMock } from '../config/database/amplify-mock';
import { createLogger } from '../utils/logger';

const logger = createLogger('test-amplify-mock');

async function main() {
  try {
    logger.info('Starting Amplify Database Mock test');

    // Get the mock database instance
    const db = AmplifyDatabaseMock.getInstance();

    // Initialize the database
    await db.initialize();
    logger.info('Database initialized');

    // Clear any existing data
    await db.clear();
    logger.info('Database cleared');

    // Test record creation
    const testRequest = {
      id: 'test-request-1',
      publisher_email: 'test@example.com',
      requester_email: 'requester@example.com',
      requester_name: 'Test Requester',
      publisher_name: 'Test Publisher',
      publisher_domain: 'example.com',
      status: 'pending',
      token: 'test-token-123',
      created_at: new Date().toISOString(),
    };

    const createdRecord = await db.insert('requests', testRequest);
    logger.info('Record created:', createdRecord);

    // Test record retrieval
    const retrievedRecord = await db.getById('requests', testRequest.id);
    logger.info('Record retrieved:', retrievedRecord);

    if (!retrievedRecord || retrievedRecord.id !== testRequest.id) {
      throw new Error('Get record test failed - record not found or ID mismatch');
    }

    // Test record update
    const update = {
      status: 'approved',
      updated_at: new Date().toISOString(),
    };

    const updatedRecord = await db.update('requests', testRequest.id, update);
    logger.info('Record updated:', updatedRecord);

    if (!updatedRecord || updatedRecord.status !== 'approved') {
      throw new Error('Update record test failed - update not applied correctly');
    }

    // Test query by field
    const queryResults = await db.query('requests', {
      where: { publisher_email: testRequest.publisher_email },
    });
    logger.info('Query results:', queryResults);

    if (!queryResults || queryResults.length === 0) {
      throw new Error('Query test failed - no results found');
    }

    // Test complex query with condition
    const complexQueryResults = await db.query('requests', {
      where: {
        status: 'approved',
        publisher_domain: testRequest.publisher_domain,
      },
      order: {
        field: 'created_at',
        direction: 'DESC',
      },
    });
    logger.info('Complex query results:', complexQueryResults);

    if (!complexQueryResults || complexQueryResults.length === 0) {
      throw new Error('Complex query test failed - no results found');
    }

    // Test deletion
    const deleteResult = await db.delete('requests', testRequest.id);
    logger.info('Delete result:', deleteResult);

    if (!deleteResult) {
      throw new Error('Delete test failed - record not deleted');
    }

    // Verify deletion
    const afterDeleteResult = await db.getById('requests', testRequest.id);
    if (afterDeleteResult) {
      throw new Error('Delete verification failed - record still exists');
    }

    logger.info('Amplify Database Mock test completed successfully');
    return 0;
  } catch (error) {
    logger.error('Amplify Database Mock test failed:', error);
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
