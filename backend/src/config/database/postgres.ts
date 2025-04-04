import { Pool } from 'pg';
import dotenv from 'dotenv';
import { DatabaseRecord, DatabaseQuery, IDatabaseAdapter } from './index';

// Import migration scripts
import { runAdsTxtCacheMigration } from '../../db/migrations/run_ads_txt_cache';
import { runSellersJsonMigration } from '../../db/migrations/run_sellers_json';
import { runAlterAdsTxtCacheMigration } from '../../db/migrations/run_alter_ads_txt_cache';

dotenv.config();

export class PostgresDatabase implements IDatabaseAdapter {
  private static instance: PostgresDatabase;
  private pool: Pool;

  private constructor() {
    // Check if DATABASE_URL is provided (common in cloud environments)
    if (process.env.DATABASE_URL) {
      // If connection string is provided, use it directly
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: this.getSslConfig(),
        max: parseInt(process.env.PG_MAX_POOL_SIZE || '10'),
        idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT || '30000'),
        connectionTimeoutMillis: parseInt(process.env.PG_CONNECTION_TIMEOUT || '10000'),
      });
      console.log('Connected to PostgreSQL database using connection string');
    } else {
      // Use individual connection parameters
      this.pool = new Pool({
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT || '5432'),
        database: process.env.PGDATABASE || 'adstxt_manager',
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || '',
        ssl: this.getSslConfig(),
        max: parseInt(process.env.PG_MAX_POOL_SIZE || '10'),
        idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT || '30000'),
        connectionTimeoutMillis: parseInt(process.env.PG_CONNECTION_TIMEOUT || '10000'),
      });
      console.log(`Connected to PostgreSQL database at ${process.env.PGHOST || 'localhost'}`);
    }

    // Register error handler for connection pool
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
      // Don't crash the server on connection errors, just log them
      // process.exit(1); - removed to improve resilience
    });

    // Setup connection validation
    this.setupConnectionValidation();
  }
  
  /**
   * Configure SSL settings based on environment
   */
  private getSslConfig(): boolean | { [key: string]: any } {
    // Check if SSL is explicitly disabled
    if (process.env.PG_SSL_DISABLED === 'true') {
      return false;
    }

    // For AWS RDS, Heroku, and many other cloud providers
    if (process.env.PG_SSL_REQUIRED === 'true') {
      return {
        rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTHORIZED !== 'false',
        ca: process.env.PG_SSL_CA ? process.env.PG_SSL_CA : undefined,
        cert: process.env.PG_SSL_CERT ? process.env.PG_SSL_CERT : undefined,
        key: process.env.PG_SSL_KEY ? process.env.PG_SSL_KEY : undefined,
      };
    }

    // If running in a cloud environment, default to requiring SSL with self-signed certs
    const isCloudEnv = process.env.NODE_ENV === 'production' || 
                       process.env.IS_CLOUD === 'true' || 
                       !!process.env.DATABASE_URL;
    
    if (isCloudEnv) {
      return {
        rejectUnauthorized: false
      };
    }

    // Local development default
    return false;
  }
  
  /**
   * Set up periodic validation of connections
   */
  private setupConnectionValidation() {
    // Only set up validation in production
    if (process.env.NODE_ENV !== 'production') return;
    
    const checkInterval = parseInt(process.env.PG_HEALTH_CHECK_INTERVAL || '30000');
    
    setInterval(async () => {
      try {
        const client = await this.pool.connect();
        const result = await client.query('SELECT 1');
        client.release();
        
        if (result.rowCount !== 1) {
          console.warn('PostgreSQL health check returned unexpected result');
        }
      } catch (err) {
        console.error('PostgreSQL health check failed:', err);
        // Here you could implement more sophisticated recovery logic
      }
    }, checkInterval);
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

        // Run the ads.txt cache alteration migration
        await runAlterAdsTxtCacheMigration();
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
   * Delete a record by ID
   */
  public async delete(table: string, id: string): Promise<boolean> {
    const sql = `DELETE FROM ${table} WHERE id = $1`;

    try {
      const result = await this.pool.query(sql, [id]);
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error(`Error deleting from ${table}`, error);
      throw error;
    }
  }

  /**
   * Get the raw database pool for direct access
   * This should be used sparingly and only when the abstract methods aren't sufficient
   */
  public getRawPool(): Pool {
    return this.pool;
  }

  /**
   * Query for a specific seller in the sellers_json_cache table using JSONB operators
   * This is a PostgreSQL-specific optimization that leverages the JSONB type
   * @param domain The domain to search in
   * @param sellerId The seller ID to search for
   * @returns The matching seller data if found
   */
  public async queryJsonBSellerById(domain: string, sellerId: string): Promise<any> {
    // First check if the domain exists and has valid data
    const domainCheckSql = `
      SELECT id, domain, status, status_code, error_message, content, created_at, updated_at 
      FROM sellers_json_cache 
      WHERE domain = $1 AND status = 'success'
    `;

    const domainResult = await this.pool.query(domainCheckSql, [domain.toLowerCase()]);

    if (domainResult.rows.length === 0) {
      return null; // Domain not found or not successful status
    }

    const cacheRecord = domainResult.rows[0];

    // Now use JSONB operators to extract only the matching seller directly from the database
    // This is much more efficient than loading all sellers and filtering in code
    const sellerSql = `
      SELECT 
        sj.id,
        sj.domain,
        sj.status, 
        sj.status_code,
        sj.error_message,
        sj.created_at,
        sj.updated_at,
        jsonb_extract_path(sj.content, 'version') as version,
        jsonb_extract_path(sj.content, 'contact_email') as contact_email,
        jsonb_extract_path(sj.content, 'contact_address') as contact_address,
        jsonb_extract_path(sj.content, 'identifiers') as identifiers,
        (
          SELECT jsonb_agg(s) 
          FROM jsonb_array_elements(sj.content->'sellers') s 
          WHERE s->>'seller_id' = $2
        ) as matching_sellers,
        (
          SELECT COUNT(*) 
          FROM jsonb_array_elements(sj.content->'sellers')
        ) as seller_count
      FROM sellers_json_cache sj
      WHERE sj.id = $1
    `;

    const sellerResult = await this.pool.query(sellerSql, [cacheRecord.id, sellerId]);

    if (sellerResult.rows.length === 0) {
      return null;
    }

    const result = sellerResult.rows[0];

    // Return formatted result with metadata and seller information
    return {
      cacheRecord,
      metadata: {
        version: result.version,
        contact_email: result.contact_email,
        contact_address: result.contact_address,
        identifiers: result.identifiers,
        seller_count: parseInt(result.seller_count || '0', 10),
      },
      // Extract the first (and should be only) matching seller if any
      seller:
        result.matching_sellers && result.matching_sellers.length > 0
          ? result.matching_sellers[0]
          : null,
      found: result.matching_sellers && result.matching_sellers.length > 0,
    };
  }
}
