import { getEnvironment } from '../environment';
import { SqliteDatabase } from './sqlite';
import { PostgresDatabase } from './postgres';
import { MockDatabase } from './mock-database';

// Database provider names
export enum DatabaseProvider {
  SQLITE = 'sqlite',
  POSTGRES = 'postgres',
  MOCK = 'mock',
}

export interface DatabaseRecord {
  id: string;
  created_at: string;
  updated_at?: string;
  [key: string]: any; // Allow indexing with string
}

export interface WhereCondition {
  [key: string]: any;
}

export interface DatabaseQuery {
  where?: WhereCondition | WhereCondition[];
  order?: {
    field: string;
    direction: 'ASC' | 'DESC';
  };
  limit?: number;
  offset?: number;
}

// Define interface for database operations
export interface IDatabaseAdapter {
  initialize(): Promise<void>;
  insert<T extends DatabaseRecord>(table: string, data: T): Promise<T>;
  update<T extends DatabaseRecord>(table: string, id: string, data: Partial<T>): Promise<T | null>;
  getById<T extends DatabaseRecord>(table: string, id: string): Promise<T | null>;
  query<T extends DatabaseRecord>(table: string, query?: DatabaseQuery): Promise<T[]>;
  execute<T>(sql: string, params?: any[]): Promise<T | T[] | null>;
  // Optional method for clearing data (useful for testing)
  clear?(): Promise<void>;
}

/**
 * A lightweight adapter for database operations
 */
class DatabaseAdapter implements IDatabaseAdapter {
  private implementation: IDatabaseAdapter;

  constructor() {
    // Determine which database implementation to use
    const env = getEnvironment();
    const dbProvider = process.env.DB_PROVIDER || DatabaseProvider.SQLITE;

    // Use mock database for testing
    if (env.NODE_ENV === 'test') {
      this.implementation = MockDatabase.getInstance();
    } else if (dbProvider === DatabaseProvider.POSTGRES) {
      // Use PostgreSQL if specified
      this.implementation = PostgresDatabase.getInstance();
    } else {
      // Default to SQLite
      this.implementation = SqliteDatabase.getInstance();
    }

    console.log(`Using database provider: ${this.implementation.constructor.name}`);
  }

  /**
   * Initialize the database
   */
  async initialize(): Promise<void> {
    return await this.implementation.initialize();
  }

  /**
   * Insert a record into the specified table
   */
  async insert<T extends DatabaseRecord>(table: string, data: T): Promise<T> {
    return await this.implementation.insert(table, data);
  }

  /**
   * Update a record in the specified table
   */
  async update<T extends DatabaseRecord>(
    table: string,
    id: string,
    data: Partial<T>
  ): Promise<T | null> {
    return await this.implementation.update(table, id, data);
  }

  /**
   * Get a record by ID from the specified table
   */
  async getById<T extends DatabaseRecord>(table: string, id: string): Promise<T | null> {
    return await this.implementation.getById<T>(table, id);
  }

  /**
   * Query records from the specified table
   */
  async query<T extends DatabaseRecord>(table: string, query?: DatabaseQuery): Promise<T[]> {
    return await this.implementation.query<T>(table, query);
  }

  /**
   * Execute a custom query
   */
  async execute<T>(sql: string, params?: any[]): Promise<T | T[] | null> {
    return await this.implementation.execute(sql, params);
  }

  /**
   * Clear the database (if supported by the implementation)
   */
  async clear(): Promise<void> {
    if (this.implementation.clear) {
      return await this.implementation.clear();
    }
    console.warn('Clear operation not supported by current database implementation');
  }
}

// Create and export the database instance
const db = new DatabaseAdapter();
export default db;

/**
 * Initialize database - this must be called before using the database
 */
export const initializeDatabase = async (): Promise<void> => {
  return await db.initialize();
};
