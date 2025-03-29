import { DataStore } from '@aws-amplify/datastore';
import { Amplify } from '@aws-amplify/core';
import { DatabaseRecord, DatabaseQuery, WhereCondition } from './index';
import { createLogger } from '../../utils/logger';
import { AmplifyDatabase } from './amplify';

// Import the Amplify models
import {
  Request,
  Message,
  AdsTxtRecord,
  AdsTxtCache,
  SellersJsonCache,
} from '../../models/amplify-models/index';

const logger = createLogger('AmplifyDatabaseTester');

/**
 * AmplifyDatabaseTester
 * A utility for testing the AmplifyDatabase implementation locally
 */
export class AmplifyDatabaseTester {
  private db: AmplifyDatabase;

  constructor() {
    // Configure Amplify for local testing
    this.configureLocalAmplify();
    this.db = AmplifyDatabase.getInstance();
  }

  /**
   * Configure Amplify for local testing
   */
  private configureLocalAmplify(): void {
    try {
      // For Amplify V6+, we need to import the DataStore configuration separately
      const { initializeDataStore } = require('@aws-amplify/datastore');

      // Initialize DataStore with local options
      initializeDataStore({
        // Use a short sync interval for testing
        syncInterval: 1000, // 1 second
        // Disable cloud sync
        sync: false,
      });

      logger.info('Amplify DataStore configured for local testing');
    } catch (error) {
      logger.error('Failed to configure Amplify for testing', error);

      // Fallback to default configuration
      logger.info('Using default Amplify configuration for testing');
    }
  }

  /**
   * Initialize the database for testing
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('Initializing Amplify DataStore for testing');
      await this.db.initialize();
      logger.info('Amplify DataStore initialized for testing');
    } catch (error) {
      logger.error('Failed to initialize Amplify DataStore for testing', error);
      throw error;
    }
  }

  /**
   * Clear the database for a clean test state
   */
  public async clearDatabase(): Promise<void> {
    try {
      logger.info('Clearing Amplify DataStore for testing');
      await this.db.clear();
      logger.info('Amplify DataStore cleared for testing');
    } catch (error) {
      logger.error('Failed to clear Amplify DataStore for testing', error);
      throw error;
    }
  }

  /**
   * Run the test suite
   */
  public async runTests(): Promise<void> {
    try {
      logger.info('Starting AmplifyDatabase test suite');

      // Clear the database for a clean test state
      await this.clearDatabase();

      // Test record creation
      logger.info('Testing record creation');
      const testRequest = await this.testCreateRecord();

      // Test record retrieval
      logger.info('Testing record retrieval');
      await this.testGetRecord(testRequest.id);

      // Test record update
      logger.info('Testing record update');
      await this.testUpdateRecord(testRequest.id);

      // Test query
      logger.info('Testing query');
      await this.testQuery(testRequest.publisher_email);

      // Test deletion
      logger.info('Testing deletion');
      await this.testDeleteRecord(testRequest.id);

      logger.info('All tests completed successfully');
    } catch (error) {
      logger.error('Test failed', error);
      throw error;
    }
  }

  /**
   * Test creating a record
   */
  private async testCreateRecord(): Promise<Request> {
    try {
      const data = {
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

      const result = await this.db.insert('requests', data);
      logger.info('Create record result:', result);

      if (!result || result.id !== data.id) {
        throw new Error('Create record test failed - returned ID does not match');
      }

      return result;
    } catch (error) {
      logger.error('Create record test failed', error);
      throw error;
    }
  }

  /**
   * Test retrieving a record by ID
   */
  private async testGetRecord(id: string): Promise<void> {
    try {
      const result = await this.db.getById('requests', id);
      logger.info('Get record result:', result);

      if (!result || result.id !== id) {
        throw new Error('Get record test failed - record not found or ID mismatch');
      }
    } catch (error) {
      logger.error('Get record test failed', error);
      throw error;
    }
  }

  /**
   * Test updating a record
   */
  private async testUpdateRecord(id: string): Promise<void> {
    try {
      const update = {
        status: 'approved',
        updated_at: new Date().toISOString(),
      };

      const result = await this.db.update('requests', id, update);
      logger.info('Update record result:', result);

      if (!result || result.id !== id || result.status !== 'approved') {
        throw new Error('Update record test failed - update not applied correctly');
      }

      // Verify the update with a separate get call
      const verification = await this.db.getById('requests', id);
      if (!verification || verification.status !== 'approved') {
        throw new Error('Update record test failed - verification failed');
      }
    } catch (error) {
      logger.error('Update record test failed', error);
      throw error;
    }
  }

  /**
   * Test querying records
   */
  private async testQuery(email: string): Promise<void> {
    try {
      // Test a simple query
      const simpleQuery: DatabaseQuery = {
        where: {
          publisher_email: email,
        },
      };

      const simpleResults = await this.db.query('requests', simpleQuery);
      logger.info('Simple query results:', simpleResults);

      if (!Array.isArray(simpleResults) || simpleResults.length === 0) {
        throw new Error('Query test failed - no results for simple query');
      }

      // Test a more complex query with sorting
      const complexQuery: DatabaseQuery = {
        where: {
          publisher_email: email,
          status: 'approved',
        },
        order: {
          field: 'created_at',
          direction: 'DESC',
        },
        limit: 10,
      };

      const complexResults = await this.db.query('requests', complexQuery);
      logger.info('Complex query results:', complexResults);

      if (!Array.isArray(complexResults)) {
        throw new Error('Query test failed - complex query did not return an array');
      }

      // The result should be filtered by status 'approved'
      for (const record of complexResults) {
        if (record.status !== 'approved') {
          throw new Error('Query test failed - query filter not applied correctly');
        }
      }
    } catch (error) {
      logger.error('Query test failed', error);
      throw error;
    }
  }

  /**
   * Test deleting a record
   */
  private async testDeleteRecord(id: string): Promise<void> {
    try {
      // First check the record exists
      const beforeDelete = await this.db.getById('requests', id);
      if (!beforeDelete) {
        throw new Error('Delete record test failed - record does not exist before deletion');
      }

      // Delete the record
      const result = await this.db.delete('requests', id);
      logger.info('Delete record result:', result);

      if (!result) {
        throw new Error('Delete record test failed - deletion did not return success');
      }

      // Verify the record was deleted
      const afterDelete = await this.db.getById('requests', id);
      if (afterDelete) {
        throw new Error('Delete record test failed - record still exists after deletion');
      }
    } catch (error) {
      logger.error('Delete record test failed', error);
      throw error;
    }
  }
}

/**
 * Run the test suite from the command line
 * Example usage: node amplify-test.js
 */
if (require.main === module) {
  (async () => {
    try {
      const tester = new AmplifyDatabaseTester();
      await tester.initialize();
      await tester.runTests();
      logger.info('Test suite completed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Test suite failed', error);
      process.exit(1);
    }
  })();
}
