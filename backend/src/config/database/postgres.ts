import { Pool } from 'pg';
import dotenv from 'dotenv';
import { DatabaseRecord, DatabaseQuery, IDatabaseAdapter } from './index';

// Import migration scripts
import { runAdsTxtCacheMigration } from '../../db/migrations/run_ads_txt_cache';
import { runSellersJsonMigration } from '../../db/migrations/run_sellers_json';

dotenv.config();

export class PostgresDatabase implements IDatabaseAdapter {
  private static instance: PostgresDatabase;
  private pool: Pool;

  private constructor() {
    this.pool = new Pool({
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432'),
      database: process.env.PGDATABASE || 'adstxt_manager',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || '',
      max: parseInt(process.env.PG_MAX_POOL_SIZE || '10'),
      idleTimeoutMillis: 30000,
    });

    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
      process.exit(1);
    });

    console.log('Connected to the PostgreSQL database');
  }

  /**
   * Get the singleton instance of the database
   */
  public static getInstance(): PostgresDatabase {
    if (!PostgresDatabase.instance) {
      PostgresDatabase.instance = new PostgresDatabase();
    }
    return PostgresDatabase.instance;
  }

  /**
   * Initialize the database with required tables
   */
  public async initialize(): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Create requests table
      await client.query(`
        CREATE TABLE IF NOT EXISTS requests (
          id TEXT PRIMARY KEY,
          publisher_email TEXT NOT NULL,
          requester_email TEXT NOT NULL,
          requester_name TEXT NOT NULL,
          publisher_name TEXT,
          publisher_domain TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          token TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      // Create messages table
      await client.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          request_id TEXT NOT NULL,
          sender_email TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (request_id) REFERENCES requests (id)
        )
      `);

      // Create ads_txt_records table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ads_txt_records (
          id TEXT PRIMARY KEY,
          request_id TEXT NOT NULL,
          domain TEXT NOT NULL,
          account_id TEXT NOT NULL,
          account_type TEXT NOT NULL,
          certification_authority_id TEXT,
          relationship TEXT DEFAULT 'DIRECT',
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (request_id) REFERENCES requests (id)
        )
      `);

      await client.query('COMMIT');

      // Run additional migrations
      try {
        // Run the sellers.json migration
        await runSellersJsonMigration();

        // Run the ads.txt cache migration
        await runAdsTxtCacheMigration();
      } catch (error) {
        console.error('Error running migrations:', error);
        throw error;
      }
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error initializing database:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Insert a record into the specified table
   */
  public async insert<T extends DatabaseRecord>(table: string, data: T): Promise<T> {
    const keys = Object.keys(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const values = keys.map((key) => data[key]);

    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;

    const result = await this.pool.query(sql, values);
    return result.rows[0];
  }

  /**
   * Update a record in the specified table
   */
  public async update<T extends DatabaseRecord>(
    table: string,
    id: string,
    data: Partial<T>
  ): Promise<T | null> {
    const keys = Object.keys(data);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    const values = [...keys.map((key) => data[key]), id];

    const sql = `UPDATE ${table} SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`;

    const result = await this.pool.query(sql, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Get a record by ID from the specified table
   */
  public async getById<T extends DatabaseRecord>(table: string, id: string): Promise<T | null> {
    const result = await this.pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Query records from the specified table
   */
  public async query<T extends DatabaseRecord>(table: string, query?: DatabaseQuery): Promise<T[]> {
    let sql = `SELECT * FROM ${table}`;
    const params: any[] = [];
    let paramIndex = 1;

    // Add WHERE clauses if present
    if (query?.where) {
      const whereClauses = Object.entries(query.where).map(([key, value]) => {
        params.push(value);
        return `${key} = $${paramIndex++}`;
      });

      if (whereClauses.length > 0) {
        sql += ` WHERE ${whereClauses.join(' AND ')}`;
      }
    }

    // Add ORDER BY clause if present
    if (query?.order) {
      sql += ` ORDER BY ${query.order.field} ${query.order.direction}`;
    }

    // Add LIMIT clause if present
    if (query?.limit) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(query.limit);
    }

    // Add OFFSET clause if present
    if (query?.offset) {
      sql += ` OFFSET $${paramIndex++}`;
      params.push(query.offset);
    }

    const result = await this.pool.query(sql, params);
    return result.rows;
  }

  /**
   * Execute a custom SQL query
   */
  public async execute<T>(sql: string, params?: any[]): Promise<T | T[] | null> {
    const result = await this.pool.query(sql, params || []);

    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      return result.rows;
    } else {
      // For non-SELECT queries, return affected row count
      return result.rowCount as any;
    }
  }

  /**
   * Get the raw database pool for direct access
   * This should be used sparingly and only when the abstract methods aren't sufficient
   */
  public getRawPool(): Pool {
    return this.pool;
  }
}
