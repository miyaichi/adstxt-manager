import { getEnvironment } from '../environment';
import { SqliteDatabase } from './sqlite';
import { AmplifyDatabase } from './amplify';

export interface DatabaseRecord {
  id: string;
  created_at: string;
  updated_at?: string;
  [key: string]: any; // Allow indexing with string
}

export interface DatabaseQuery {
  where?: Record<string, any>;
  order?: {
    field: string;
    direction: 'ASC' | 'DESC';
  };
  limit?: number;
}

export interface Database {
  /**
   * Insert a record into the specified table
   * @param table The table name
   * @param data The data to insert
   */
  insert<T extends DatabaseRecord>(table: string, data: T): Promise<T>;

  /**
   * Update a record in the specified table
   * @param table The table name
   * @param id The record ID
   * @param data The data to update
   */
  update<T extends DatabaseRecord>(table: string, id: string, data: Partial<T>): Promise<T | null>;

  /**
   * Get a record by ID from the specified table
   * @param table The table name
   * @param id The record ID
   */
  getById<T>(table: string, id: string): Promise<T | null>;

  /**
   * Query records from the specified table
   * @param table The table name
   * @param query The query parameters
   */
  query<T>(table: string, query?: DatabaseQuery): Promise<T[]>;

  /**
   * Execute a custom query (for advanced use cases)
   * @param sql The SQL query string (for SQLite) or custom query structure (for Amplify)
   * @param params The query parameters
   */
  execute<T>(sql: string, params?: any[]): Promise<T | T[] | null>;
}

/**
 * Get the appropriate database implementation based on the current environment
 */
export const getDatabaseInstance = (): Database => {
  const environment = getEnvironment();

  if (environment === 'local') {
    return SqliteDatabase.getInstance();
  } else {
    return AmplifyDatabase.getInstance();
  }
};

/**
 * Database instance - will be either SQLite or Amplify based on environment
 */
const db = getDatabaseInstance();

// Database initialization function
export const initializeDatabase = async (): Promise<void> => {
  if (db instanceof SqliteDatabase) {
    return await db.initialize();
  } else if (db instanceof AmplifyDatabase) {
    return await db.initialize();
  }
  
  throw new Error('Unknown database implementation');
};

export default db;