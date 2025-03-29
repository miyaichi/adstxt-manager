import { DatabaseRecord, DatabaseQuery, WhereCondition, IDatabaseAdapter } from './index';
import { createLogger } from '../../utils/logger';

const logger = createLogger('MockDatabase');

/**
 * Mock implementation of database for testing
 * This implementation uses in-memory storage to simulate a database
 */
export class MockDatabase implements IDatabaseAdapter {
  private static instance: MockDatabase;

  // In-memory storage by table
  private storage: Record<string, Record<string, any>> = {
    requests: {},
    messages: {},
    ads_txt_records: {},
    ads_txt_cache: {},
    sellers_json_cache: {},
  };

  private constructor() {
    logger.info('MockDatabase instance created');
  }

  /**
   * Get the singleton instance of the database
   */
  public static getInstance(): MockDatabase {
    if (!MockDatabase.instance) {
      MockDatabase.instance = new MockDatabase();
    }
    return MockDatabase.instance;
  }

  /**
   * Initialize the database
   */
  public async initialize(): Promise<void> {
    logger.info('Initializing MockDatabase');
    // Nothing to do for in-memory mock
    return Promise.resolve();
  }

  /**
   * Insert a record
   */
  public async insert<T extends DatabaseRecord>(table: string, data: T): Promise<T> {
    try {
      logger.debug(`Inserting into ${table}:`, data);

      // Ensure the table exists
      if (!this.storage[table]) {
        this.storage[table] = {};
      }

      // Store the record by ID
      this.storage[table][data.id] = { ...data };

      logger.debug(`Insert successful, ID: ${data.id}`);
      return { ...data };
    } catch (error) {
      logger.error(`Error inserting into ${table}:`, error);
      throw error;
    }
  }

  /**
   * Update a record
   */
  public async update<T extends DatabaseRecord>(
    table: string,
    id: string,
    data: Partial<T>
  ): Promise<T | null> {
    try {
      logger.debug(`Updating ${table} with ID ${id}:`, data);

      // Ensure the table exists
      if (!this.storage[table]) {
        this.storage[table] = {};
      }

      // Check if the record exists
      if (!this.storage[table][id]) {
        logger.warn(`Record not found for update: ${table} ID ${id}`);
        return null;
      }

      // Update the record
      this.storage[table][id] = {
        ...this.storage[table][id],
        ...data,
      };

      logger.debug(`Update successful for ${table} ID ${id}`);
      return { ...this.storage[table][id] };
    } catch (error) {
      logger.error(`Error updating ${table} ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get a record by ID
   */
  public async getById<T extends DatabaseRecord>(table: string, id: string): Promise<T | null> {
    try {
      logger.debug(`Getting ${table} with ID ${id}`);

      // Ensure the table exists
      if (!this.storage[table]) {
        this.storage[table] = {};
      }

      // Check if the record exists
      if (!this.storage[table][id]) {
        logger.debug(`No record found for ${table} ID ${id}`);
        return null;
      }

      logger.debug(`Found record for ${table} ID ${id}`);
      return { ...this.storage[table][id] };
    } catch (error) {
      logger.error(`Error getting ${table} ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Evaluate if a record matches given conditions
   */
  private recordMatchesCondition(record: any, condition: WhereCondition): boolean {
    // Check each condition field
    for (const [field, constraint] of Object.entries(condition)) {
      if (typeof constraint === 'object' && constraint !== null) {
        // Handle complex conditions (eq, gt, lt, etc.)
        for (const [operator, rawValue] of Object.entries(constraint)) {
          const value = rawValue as any;

          switch (operator) {
            case 'eq':
              if (record[field] !== value) return false;
              break;
            case 'ne':
              if (record[field] === value) return false;
              break;
            case 'gt':
              if (record[field] <= value) return false;
              break;
            case 'gte':
              if (record[field] < value) return false;
              break;
            case 'lt':
              if (record[field] >= value) return false;
              break;
            case 'lte':
              if (record[field] > value) return false;
              break;
            case 'like':
              if (typeof record[field] !== 'string' || !record[field].includes(String(value)))
                return false;
              break;
            case 'in':
              if (!Array.isArray(value) || !value.includes(record[field])) return false;
              break;
            default:
              logger.warn(`Unsupported operator: ${operator}`);
              return false;
          }
        }
      } else {
        // Simple equality condition
        if (record[field] !== constraint) return false;
      }
    }
    return true;
  }

  /**
   * Query records
   */
  public async query<T extends DatabaseRecord>(table: string, query?: DatabaseQuery): Promise<T[]> {
    try {
      logger.debug(`Querying ${table}:`, query);

      // Ensure the table exists
      if (!this.storage[table]) {
        this.storage[table] = {};
      }

      // Get all records as an array
      let results = Object.values(this.storage[table]);

      // Apply filters if specified
      if (query && query.where) {
        const whereCondition = query.where;

        if (Array.isArray(whereCondition)) {
          // Array of conditions treated as AND
          results = results.filter((record) =>
            whereCondition.every((condition) => this.recordMatchesCondition(record, condition))
          );
        } else {
          // Single condition object
          results = results.filter((record) => this.recordMatchesCondition(record, whereCondition));
        }
      }

      // Handle sorting
      if (query?.order) {
        const { field, direction } = query.order;
        results = results.sort((a, b) => {
          const directionMultiplier = direction === 'ASC' ? 1 : -1;
          return a[field] > b[field]
            ? directionMultiplier
            : a[field] < b[field]
              ? -directionMultiplier
              : 0;
        });
      }

      // Handle pagination
      if (query?.offset !== undefined && query?.limit !== undefined) {
        results = results.slice(query.offset, query.offset + query.limit);
      } else if (query?.limit !== undefined) {
        results = results.slice(0, query.limit);
      }

      logger.debug(`Query returned ${results.length} results for ${table}`);
      // Return deep copies to avoid modifying the stored data
      return results.map((r) => ({ ...r })) as T[];
    } catch (error) {
      logger.error(`Error querying ${table}:`, error);
      throw error;
    }
  }

  /**
   * Execute a custom query (limited support)
   */
  public async execute<T>(sql: string, params?: any[]): Promise<T | T[] | null> {
    try {
      logger.debug(`Executing custom query: ${sql}, params:`, params);

      // Basic SQL parsing for count queries
      if (sql.toLowerCase().includes('select count(')) {
        const tableMatch = sql.match(/from\s+([a-zA-Z_]+)/i);
        if (tableMatch && tableMatch[1]) {
          const table = tableMatch[1];

          // Ensure the table exists
          if (!this.storage[table]) {
            this.storage[table] = {};
          }

          // If there's a WHERE clause, we'd parse it here
          // For simplicity, we're just counting all records
          const count = Object.keys(this.storage[table]).length;

          return { count } as T;
        }
      }

      logger.warn(`Unsupported SQL query: ${sql}`);
      return null;
    } catch (error) {
      logger.error(`Error executing custom query: ${sql}`, error);
      throw error;
    }
  }

  /**
   * Delete a record
   */
  public async delete<T extends DatabaseRecord>(table: string, id: string): Promise<boolean> {
    try {
      logger.debug(`Deleting ${table} with ID ${id}`);

      // Ensure the table exists
      if (!this.storage[table]) {
        this.storage[table] = {};
      }

      // Check if the record exists
      if (!this.storage[table][id]) {
        logger.warn(`Record not found for deletion: ${table} ID ${id}`);
        return false;
      }

      // Delete the record
      delete this.storage[table][id];

      logger.debug(`Successfully deleted ${table} ID ${id}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting ${table} ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Clear all data
   */
  public async clear(): Promise<void> {
    try {
      logger.warn('Clearing MockDatabase');

      // Reset all tables
      for (const table of Object.keys(this.storage)) {
        this.storage[table] = {};
      }

      logger.info('MockDatabase cleared successfully');
    } catch (error) {
      logger.error('Error clearing MockDatabase:', error);
      throw error;
    }
  }
}
