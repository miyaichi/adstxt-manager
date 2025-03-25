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

// Define interface for database operations
export interface IDatabaseAdapter {
  initialize(): Promise<void>;
  insert<T extends DatabaseRecord>(table: string, data: T): Promise<T>;
  update<T extends DatabaseRecord>(table: string, id: string, data: Partial<T>): Promise<T | null>;
  getById<T extends DatabaseRecord>(table: string, id: string): Promise<T | null>;
  query<T extends DatabaseRecord>(table: string, query?: DatabaseQuery): Promise<T[]>;
  execute<T>(sql: string, params?: any[]): Promise<T | T[] | null>;
}

/**
 * A lightweight adapter for database operations
 */
class DatabaseAdapter implements IDatabaseAdapter {
  private implementation: SqliteDatabase | AmplifyDatabase;

  constructor() {
    const environment = getEnvironment();
    this.implementation =
      environment === 'local' ? SqliteDatabase.getInstance() : AmplifyDatabase.getInstance();
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
