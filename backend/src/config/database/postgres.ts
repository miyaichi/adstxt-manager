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
        connectionTimeoutMillis: parseInt(process.env.PG_CONNECTION_TIMEOUT || '30000'), // タイムアウト値を延長
        statement_timeout: parseInt(process.env.PG_STATEMENT_TIMEOUT || '60000'), // クエリ実行タイムアウトを追加
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
        connectionTimeoutMillis: parseInt(process.env.PG_CONNECTION_TIMEOUT || '30000'), // タイムアウト値を延長
        statement_timeout: parseInt(process.env.PG_STATEMENT_TIMEOUT || '60000'), // クエリ実行タイムアウトを追加
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
    const isCloudEnv =
      process.env.NODE_ENV === 'production' ||
      process.env.IS_CLOUD === 'true' ||
      !!process.env.DATABASE_URL;

    if (isCloudEnv) {
      return {
        rejectUnauthorized: false,
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
    try {
      // 正規化されたドメインとセラーIDを使用
      const normalizedDomain = domain.toLowerCase().trim();
      const normalizedSellerId = sellerId.toString().trim();
      
      // 最適化されたLATERAL JOINを使用したクエリ(相関サブクエリよりも効率的)
      // 1. 早期フィルタリングを最大化
      // 2. コンテント全体の走査を最小限に
      // 3. 関数ベースのインデックスサポート
      const optimizedSql = `
        WITH RECURSIVE 
        base_data AS (
          -- 基本情報の高速取得（インデックスを活用）
          SELECT 
            id,
            domain,
            status,
            status_code,
            error_message,
            created_at,
            updated_at,
            content
          FROM sellers_json_cache
          WHERE domain = $1 AND status = 'success'
          LIMIT 1
        ),
        metadata AS (
          -- メタデータの抽出（インデックス済みパスアクセス）
          SELECT 
            b.id,
            b.domain,
            b.status,
            b.status_code,
            b.error_message,
            b.created_at,
            b.updated_at,
            jsonb_extract_path_text(b.content, 'version') as version,
            jsonb_extract_path_text(b.content, 'contact_email') as contact_email,
            jsonb_extract_path_text(b.content, 'contact_address') as contact_address,
            b.content->'identifiers' as identifiers,
            COALESCE(
              (SELECT jsonb_array_length(b.content->'sellers')),
              0
            ) as seller_count
          FROM base_data b
        )
        SELECT 
          m.id,
          m.domain,
          m.status,
          m.status_code,
          m.error_message,
          m.created_at,
          m.updated_at,
          m.version,
          m.contact_email,
          m.contact_address,
          m.identifiers,
          m.seller_count,
          -- 効率的なLATERAL JOINを使用 (相関サブクエリよりもパフォーマンスが良い)
          s.matching_seller
        FROM 
          metadata m
        LEFT JOIN LATERAL (
          -- 唯一のセラーを効率的に抽出 (LIMIT 1によるパフォーマンス向上)
          SELECT 
            s as matching_seller
          FROM 
            jsonb_array_elements((
              SELECT content->'sellers' FROM base_data LIMIT 1
            )) s
          WHERE 
            LOWER(s->>'seller_id') = LOWER($2) OR 
            LOWER(TRIM(BOTH FROM s->>'seller_id')) = LOWER($2)
          LIMIT 1
        ) s ON true
        /* EXPLAIN ANALYZE出力を解析して最適化するヒント */
      `;
      
      // 設定されたステートメントタイムアウトを確認し、必要に応じて一時的に拡張
      let originalTimeout;
      const extendedTimeout = parseInt(process.env.PG_EXTENDED_TIMEOUT || '120000');
      
      // クライアントを取得して時間のかかるクエリに最適化
      const client = await this.pool.connect();
      
      try {
        // 大きなSellers.jsonファイルのためにステートメントタイムアウトを一時的に延長
        originalTimeout = await client.query('SHOW statement_timeout');
        await client.query(`SET statement_timeout = '${extendedTimeout}'`);
        
        // クエリの実行（準備されたステートメントを使用）
        const result = await client.query({
          text: optimizedSql,
          values: [normalizedDomain, normalizedSellerId],
          rowMode: 'array'
        });
        
        // 結果がない場合
        if (result.rows.length === 0) {
          return null;
        }
        
        const rowData = result.rows[0];
        const columnNames = [
          'id', 'domain', 'status', 'status_code', 'error_message', 'created_at', 'updated_at',
          'version', 'contact_email', 'contact_address', 'identifiers', 'seller_count', 'matching_seller'
        ];
        
        // 列名と値をマッピングして結果オブジェクトを構築
        const row: Record<string, any> = {};
        columnNames.forEach((name, i) => {
          row[name] = rowData[i];
        });
        
        // cacheRecordオブジェクトを構築
        const cacheRecord = {
          id: row.id,
          domain: row.domain,
          status: row.status,
          status_code: row.status_code,
          error_message: row.error_message,
          created_at: row.created_at,
          updated_at: row.updated_at
        };
        
        // セラー情報を安全に処理
        const matchingSeller = row.matching_seller;
        const hasValidSeller = !!matchingSeller;
        
        // 結果を統一された形式で返す
        return {
          cacheRecord,
          metadata: {
            version: row.version,
            contact_email: row.contact_email,
            contact_address: row.contact_address,
            identifiers: row.identifiers,
            seller_count: typeof row.seller_count === 'string' ? 
              parseInt(row.seller_count, 10) : row.seller_count || 0,
          },
          seller: hasValidSeller ? matchingSeller : null,
          found: hasValidSeller,
        };
      } finally {
        // タイムアウト設定を元に戻す
        if (originalTimeout?.rows?.[0]?.statement_timeout) {
          await client.query(`SET statement_timeout = '${originalTimeout.rows[0].statement_timeout}'`);
        }
        // クライアントを解放
        client.release();
      }
    } catch (error) {
      console.error(`Error in queryJsonBSellerById for domain ${domain}, sellerId ${sellerId}:`, error);
      // エラー発生時はnullを返して呼び出し元で処理
      return null;
    }
  }

  /**
   * Query sellers.json metadata and summary info using JSONB operators
   * This is a PostgreSQL-specific optimization for memory efficiency
   *
   * @param domain The domain to get summary for
   * @returns Summary object with metadata and seller type counts
   */
  public async queryJsonBSummary(domain: string): Promise<any> {
    try {
      // 正規化されたドメインを使用
      const normalizedDomain = domain.toLowerCase().trim();
      
      // 新しい最適化クエリ: パーティション化スキャン & メモリ効率の向上
      const optimizedSql = `
        -- 指定されたドメインデータを高速に取得
        WITH base_query AS (
          SELECT 
            id,
            domain,
            status,
            updated_at,
            content
          FROM sellers_json_cache 
          WHERE domain = $1 AND status = 'success'
          LIMIT 1
        ),
        -- 基本メタデータの効率的な抽出
        metadata_extract AS (
          SELECT 
            bq.id,
            bq.domain,
            bq.status,
            bq.updated_at,
            jsonb_extract_path_text(bq.content, 'version') as version,
            jsonb_extract_path_text(bq.content, 'contact_email') as contact_email
          FROM base_query bq
        ),
        -- 大規模データセット用に最適化された集計クエリ
        sellers_stats AS (
          SELECT
            -- JSONB配列をストリーミング処理して、インデックスで実行可能なSUM集計を使用
            COUNT(*) as seller_count,
            SUM(CASE WHEN UPPER(s->>'seller_type') = 'PUBLISHER' THEN 1 ELSE 0 END) as publisher_count,
            SUM(CASE WHEN UPPER(s->>'seller_type') = 'INTERMEDIARY' THEN 1 ELSE 0 END) as intermediary_count,
            SUM(CASE WHEN UPPER(s->>'seller_type') = 'BOTH' THEN 1 ELSE 0 END) as both_count,
            SUM(CASE WHEN UPPER(s->>'seller_type') NOT IN ('PUBLISHER', 'INTERMEDIARY', 'BOTH') THEN 1 ELSE 0 END) as other_count,
            SUM(CASE 
              WHEN (s->>'is_confidential')::boolean = true THEN 1
              WHEN s->>'is_confidential' = '1' THEN 1
              WHEN s->>'is_confidential' = 'true' THEN 1
              WHEN (s->>'is_confidential')::numeric = 1 THEN 1
              ELSE 0 END) as confidential_count
          FROM base_query bq,
          LATERAL jsonb_array_elements(bq.content->'sellers') s
          WHERE bq.id IS NOT NULL
        )
        -- メタデータと統計情報の結合
        SELECT
          m.id,
          m.domain,
          m.status,
          m.updated_at,
          m.version,
          m.contact_email,
          s.seller_count,
          s.publisher_count,
          s.intermediary_count,
          s.both_count,
          s.other_count,
          s.confidential_count
        FROM metadata_extract m
        LEFT JOIN sellers_stats s ON true
        /* StatementTimeout拡張適用 */
      `;

      // 設定されたステートメントタイムアウトを確認し、必要に応じて一時的に拡張
      let originalTimeout;
      const extendedTimeout = parseInt(process.env.PG_EXTENDED_TIMEOUT || '120000');
      
      // クライアントを取得して時間のかかるクエリに最適化
      const client = await this.pool.connect();
      
      try {
        // 大きなSellers.jsonファイルのためにステートメントタイムアウトを一時的に延長
        originalTimeout = await client.query('SHOW statement_timeout');
        await client.query(`SET statement_timeout = '${extendedTimeout}'`);
        
        // クエリの実行（キャッシュを活用するためにプリペアドステートメントを使用）
        const result = await client.query({
          text: optimizedSql,
          values: [normalizedDomain],
          name: 'get_sellers_json_summary' // ステートメントキャッシュのための名前
        });

        if (result.rows.length === 0) {
          return null;
        }

        const row = result.rows[0];
        
        // 結果を統一された形式で返す
        return {
          domainInfo: {
            id: row.id,
            domain: row.domain,
            status: row.status,
            updated_at: row.updated_at,
          },
          metadata: {
            version: row.version,
            contact_email: row.contact_email,
            seller_count: this.parseIntSafe(row.seller_count, 0),
          },
          sellersSummary: {
            publisherCount: this.parseIntSafe(row.publisher_count, 0),
            intermediaryCount: this.parseIntSafe(row.intermediary_count, 0),
            bothCount: this.parseIntSafe(row.both_count, 0),
            otherCount: this.parseIntSafe(row.other_count, 0),
            confidentialCount: this.parseIntSafe(row.confidential_count, 0),
          },
          isCacheMiss: false
        };
      } finally {
        // タイムアウト設定を元に戻す
        if (originalTimeout?.rows?.[0]?.statement_timeout) {
          await client.query(`SET statement_timeout = '${originalTimeout.rows[0].statement_timeout}'`);
        }
        // クライアントを解放
        client.release();
      }
    } catch (error) {
      console.error(`Error in queryJsonBSummary for domain ${domain}:`, error);
      return null;
    }
  }
  
  /**
   * 整数値の安全なパース
   * @param value パースする値
   * @param defaultValue デフォルト値
   * @returns パースした整数値
   */
  private parseIntSafe(value: any, defaultValue: number = 0): number {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? defaultValue : parsed;
    }
    return defaultValue;
  }

  /**
   * Query for specific sellers by account IDs using JSONB operators
   * Memory-efficient way to get only the needed sellers
   *
   * @param domain The domain to search in
   * @param accountIds Array of account IDs to find
   * @returns Object with matching sellers and basic metadata
   */
  public async queryJsonBSpecificSellers(domain: string, accountIds: string[]): Promise<any> {
    if (!accountIds || accountIds.length === 0) {
      return null;
    }

    try {
      // 正規化されたドメインを使用
      const normalizedDomain = domain.toLowerCase().trim();
      
      // アカウントIDを正規化
      const normalizedAccountIds = accountIds.map(id => id.toString().toLowerCase().trim());
      
      // 非常に大きなsellers.jsonファイル(例: Google)用に完全に最適化されたクエリ
      // LATERAL JOINとハッシュマッチング技術を使用
      const optimizedSql = `
        WITH 
        -- 高速ドメインルックアップ（インデックス使用）
        base_data AS (
          SELECT 
            id,
            domain,
            status,
            updated_at,
            content
          FROM sellers_json_cache
          WHERE domain = $1 AND status = 'success'
          LIMIT 1
        ),
        -- メタデータの効率的な抽出（インデックス使用）
        metadata AS (
          SELECT
            id,
            domain,
            status,
            updated_at,
            jsonb_extract_path_text(content, 'version') as version,
            jsonb_extract_path_text(content, 'contact_email') as contact_email
          FROM base_data
        ),
        -- アカウントIDをテーブルとして作成（効率的なハッシュ結合を可能に）
        account_ids AS (
          SELECT unnest($2::text[]) as account_id
        ),
        -- 効率的なLATERAL JOINを使用したセラーマッチング
        -- (大きな配列を一度だけ走査し、複数の高速ハッシュマッチングをPG内で実行)
        matched_sellers AS (
          SELECT 
            jsonb_agg(s) as sellers
          FROM 
            base_data b,
            LATERAL jsonb_array_elements(b.content->'sellers') s
          WHERE 
            EXISTS (
              SELECT 1 FROM account_ids a 
              WHERE 
                LOWER(s->>'seller_id') = a.account_id OR
                LOWER(TRIM(BOTH FROM s->>'seller_id')) = a.account_id
            )
        )
        -- 結果の結合
        SELECT
          m.id,
          m.domain,
          m.status,
          m.updated_at,
          m.version,
          m.contact_email,
          s.sellers as matching_sellers
        FROM metadata m
        LEFT JOIN matched_sellers s ON true
      `;
      
      // 設定されたステートメントタイムアウトを確認し、必要に応じて一時的に拡張
      let originalTimeout;
      const extendedTimeout = parseInt(process.env.PG_EXTENDED_TIMEOUT || '120000');
      
      // クライアントを取得して時間のかかるクエリに最適化
      const client = await this.pool.connect();
      
      try {
        // 大きなSellers.jsonファイルのためにステートメントタイムアウトを一時的に延長
        originalTimeout = await client.query('SHOW statement_timeout');
        await client.query(`SET statement_timeout = '${extendedTimeout}'`);
        
        // 配列パラメータを使用して準備済みステートメントでクエリを実行
        const result = await client.query({
          text: optimizedSql,
          values: [normalizedDomain, normalizedAccountIds],
          name: 'get_specific_sellers' // クエリキャッシュのための名前
        });
        
        if (result.rows.length === 0) {
          return null;
        }
        
        const row = result.rows[0];
        
        // 安全に結果を処理
        let matchingSellers: any[] = [];
        if (row.matching_sellers) {
          try {
            if (typeof row.matching_sellers === 'string') {
              const parsed = JSON.parse(row.matching_sellers);
              if (Array.isArray(parsed)) {
                matchingSellers = parsed.filter(s => s !== null);
              }
            } else if (Array.isArray(row.matching_sellers)) {
              matchingSellers = row.matching_sellers.filter(s => s !== null);
            }
          } catch (e) {
            console.error('Error processing matching_sellers:', e);
          }
        }

        return {
          domainInfo: {
            id: row.id,
            domain: row.domain,
            status: row.status,
            updated_at: row.updated_at,
          },
          metadata: {
            version: row.version,
            contact_email: row.contact_email,
          },
          matchingSellers: matchingSellers,
        };
      } finally {
        // タイムアウト設定を元に戻す
        if (originalTimeout?.rows?.[0]?.statement_timeout) {
          await client.query(`SET statement_timeout = '${originalTimeout.rows[0].statement_timeout}'`);
        }
        // クライアントを解放
        client.release();
      }
    } catch (error) {
      console.error(`Error in queryJsonBSpecificSellers for domain ${domain}:`, error);
      return null;
    }
  }
}
