import fs from 'fs';
import path from 'path';
import sqlite3, { Database as SQLiteDB } from 'sqlite3';
import dotenv from 'dotenv';
import { Database, DatabaseRecord, DatabaseQuery } from './index';

// Import migration scripts
import { runAdsTxtCacheMigration } from '../../db/migrations/run_ads_txt_cache';
import { runSellersJsonMigration } from '../../db/migrations/run_sellers_json';

dotenv.config();

export class SqliteDatabase implements Database {
  private static instance: SqliteDatabase;
  private db: SQLiteDB;

  private constructor() {
    // Enable verbose mode for debugging if in development
    if (process.env.NODE_ENV === 'development') {
      sqlite3.verbose();
    }

    const dbPath = process.env.DB_PATH || path.join(__dirname, '../../../db/database.sqlite');
    
    // Ensure the directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error connecting to database:', err.message);
        process.exit(1);
      }
      console.log('Connected to the SQLite database');
    });
  }

  /**
   * Get the singleton instance of the database
   */
  public static getInstance(): SqliteDatabase {
    if (!SqliteDatabase.instance) {
      SqliteDatabase.instance = new SqliteDatabase();
    }
    return SqliteDatabase.instance;
  }

  /**
   * Initialize the database with required tables
   */
  public async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Create requests table
        this.db.run(
          `
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
        `,
          (err) => {
            if (err) {
              reject(err);
              return;
            }
          }
        );

        // Create messages table
        this.db.run(
          `
          CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            request_id TEXT NOT NULL,
            sender_email TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (request_id) REFERENCES requests (id)
          )
        `,
          (err) => {
            if (err) {
              reject(err);
              return;
            }
          }
        );

        // Create ads_txt_records table
        this.db.run(
          `
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
        `,
          (err) => {
            if (err) {
              reject(err);
              return;
            }
          }
        );

        // Run additional migrations
        this.db.run(`SELECT 1`, async (err) => {
          if (err) {
            reject(err);
            return;
          }

          try {
            // Run the sellers.json migration
            await runSellersJsonMigration();

            // Run the ads.txt cache migration
            await runAdsTxtCacheMigration();

            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  }

  /**
   * Insert a record into the specified table
   */
  public async insert<T extends DatabaseRecord>(table: string, data: T): Promise<T> {
    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?').join(', ');
    const values = keys.map(key => data[key]);
    
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    
    return new Promise((resolve, reject) => {
      this.db.run(sql, values, function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(data);
      });
    });
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
    const setClause = keys.map(key => `${key} = ?`).join(', ');
    const values = [...keys.map(key => data[key]), id];
    
    const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
    
    return new Promise((resolve, reject) => {
      const self = this;
      this.db.run(sql, values, function(this: { changes: number }, err) {
        if (err) {
          reject(err);
          return;
        }
        
        if (this.changes === 0) {
          resolve(null);
          return;
        }
        
        // Get the updated record
        const getSql = `SELECT * FROM ${table} WHERE id = ?`;
        self.db.get(getSql, [id], (getErr: Error | null, row: T) => {
          if (getErr) {
            reject(getErr);
            return;
          }
          resolve(row || null);
        });
      });
    });
  }

  /**
   * Get a record by ID from the specified table
   */
  public async getById<T>(table: string, id: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      this.db.get(`SELECT * FROM ${table} WHERE id = ?`, [id], (err, row: T) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row || null);
      });
    });
  }

  /**
   * Query records from the specified table
   */
  public async query<T>(table: string, query?: DatabaseQuery): Promise<T[]> {
    let sql = `SELECT * FROM ${table}`;
    const params: any[] = [];
    
    // Add WHERE clauses if present
    if (query?.where) {
      const whereClauses = Object.entries(query.where).map(([key, value]) => {
        params.push(value);
        return `${key} = ?`;
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
      sql += ` LIMIT ?`;
      params.push(query.limit);
    }
    
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows: T[]) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows || []);
      });
    });
  }

  /**
   * Execute a custom SQL query
   */
  public async execute<T>(sql: string, params?: any[]): Promise<T | T[] | null> {
    return new Promise((resolve, reject) => {
      const method = sql.trim().toUpperCase().startsWith('SELECT') ? 'all' : 'run';
      
      this.db[method](sql, params || [], function(this: { changes?: number }, err: Error | null, rows?: T[]) {
        if (err) {
          reject(err);
          return;
        }
        
        if (method === 'all') {
          resolve(rows || []);
        } else {
          // For non-SELECT queries, return changes count
          resolve(this.changes as any);
        }
      });
    });
  }

  /**
   * Get the raw SQLite database instance for direct access
   * This should be used sparingly and only when the abstract methods aren't sufficient
   */
  public getRawDatabase(): SQLiteDB {
    return this.db;
  }
}