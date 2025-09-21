import { v4 as uuidv4 } from 'uuid';
import db from '../config/database/index';
import { logger } from '../utils/logger';
import { DatabaseRecord, IDatabaseAdapter } from '../config/database/index';

export interface SellersJsonCache extends DatabaseRecord {
  id: string;
  domain: string;
  content: string | object | null;
  status: 'success' | 'not_found' | 'invalid_format' | 'error';
  status_code: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export type SellersJsonCacheStatus = 'success' | 'not_found' | 'invalid_format' | 'error';

/**
 * Interface representing the IAB sellers.json content structure
 * Based on IAB Tech Lab sellers.json specification v1.0
 */
export interface SellersJsonContent {
  // Required fields
  sellers?: Array<{
    seller_id: string;
    name?: string;
    domain?: string;
    seller_type: 'PUBLISHER' | 'INTERMEDIARY' | 'BOTH' | string;
    is_confidential?: boolean;
    comment?: string;
    ext?: any;
    [key: string]: any;
  }>;
  version?: string;

  // Optional fields
  identifiers?: Array<{
    name: string;
    value: string;
    [key: string]: any;
  }>;
  contact_email?: string;
  contact_address?: string;
  ext?: any;

  // Allow for any additional fields
  [key: string]: any;
}

// Use the exported database instance, which implements IDatabaseAdapter
// No need for type assertion since it's already typed correctly

class SellersJsonCacheModel {
  private readonly tableName = 'sellers_json_cache';
  // メモリ内キャッシュをクラスレベルで保持する
  private memoryCache: Map<
    string,
    {
      cache: SellersJsonCache;
      timestamp: number;
    }
  > = new Map();

  // メモリキャッシュの有効期限（ミリ秒）
  private readonly memoryCacheTTL = 60 * 1000; // 60秒

  // メモリキャッシュのサイズ上限
  private readonly memoryCacheMaxSize = 1000;

  // Get the appropriate table name
  private getTableName(): string {
    return this.tableName;
  }

  /**
   * メモリキャッシュからドメインのデータを取得
   * @param domain ドメイン名
   * @returns キャッシュされたデータ、または null
   */
  private getFromMemoryCache(domain: string): SellersJsonCache | null {
    const normalizedDomain = domain.toLowerCase().trim();
    const cached = this.memoryCache.get(normalizedDomain);

    if (!cached) {
      return null;
    }

    // キャッシュの有効期限をチェック
    const now = Date.now();
    if (now - cached.timestamp > this.memoryCacheTTL) {
      // 有効期限切れの場合、キャッシュから削除
      this.memoryCache.delete(normalizedDomain);
      return null;
    }

    return cached.cache;
  }

  /**
   * ドメインのデータをメモリキャッシュに保存
   * @param domain ドメイン名
   * @param cache キャッシュデータ
   */
  private saveToMemoryCache(domain: string, cache: SellersJsonCache): void {
    const normalizedDomain = domain.toLowerCase().trim();

    // キャッシュサイズがリミットに達した場合、古いエントリを削除
    if (this.memoryCache.size >= this.memoryCacheMaxSize) {
      // キャッシュの整理 - 最も古いエントリを削除
      let oldestTimestamp = Date.now();
      let oldestKey = '';

      for (const [key, value] of this.memoryCache.entries()) {
        if (value.timestamp < oldestTimestamp) {
          oldestTimestamp = value.timestamp;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }

    // 新しいデータをキャッシュに保存
    this.memoryCache.set(normalizedDomain, {
      cache,
      timestamp: Date.now(),
    });
  }

  /**
   * Get a sellers.json cache entry by domain
   * @param domain The domain to retrieve
   * @param skipCache 強制的にキャッシュをスキップする場合はtrue
   * @returns The cache entry or null if not found
   */
  async getByDomain(domain: string, skipCache: boolean = false): Promise<SellersJsonCache | null> {
    try {
      // Ensure domain is properly lowercase and trimmed for consistent lookup
      const normalizedDomain = domain.toLowerCase().trim();

      // キャッシュをスキップしない場合はメモリキャッシュを確認
      if (!skipCache) {
        const cachedResult = this.getFromMemoryCache(normalizedDomain);
        if (cachedResult) {
          logger.debug(`[SellersJsonCache] Memory cache hit for domain: ${normalizedDomain}`);
          return cachedResult;
        }
      }

      logger.debug(`[SellersJsonCache] Looking up domain in database: ${normalizedDomain}`);

      const results = await db.query(this.getTableName(), {
        where: { domain: normalizedDomain },
        order: { field: 'updated_at', direction: 'DESC' },
      });

      // INFO → DEBUG に変更してログ出力を減らす
      logger.debug(
        `[SellersJsonCache] Query results for ${normalizedDomain}: ${results.length} records found`
      );

      const result = results.length > 0 ? (results[0] as SellersJsonCache) : null;

      // 結果がある場合はメモリキャッシュに保存
      if (result) {
        this.saveToMemoryCache(normalizedDomain, result);
      }

      return result;
    } catch (error) {
      logger.error('Error fetching sellers.json cache:', error);
      throw error;
    }
  }

  /**
   * Save a sellers.json cache entry
   * @param data The cache data to save
   * @returns The saved cache entry
   */
  async saveCache(data: {
    domain: string;
    content: string | null;
    status: SellersJsonCacheStatus;
    status_code: number | null;
    error_message: string | null;
  }): Promise<SellersJsonCache> {
    try {
      // Ensure domain is properly lowercase and trimmed for consistent storage
      const normalizedDomain = data.domain.toLowerCase().trim();

      // Check if cache entry already exists
      const existingCache = await this.getByDomain(normalizedDomain);

      const now = new Date().toISOString();
      let savedCache: SellersJsonCache;

      if (existingCache) {
        logger.debug(
          `[SellersJsonCache] Updating existing cache for domain: ${normalizedDomain}, id: ${existingCache.id}`
        );

        // Update existing entry
        savedCache = (await db.update(this.getTableName(), existingCache.id, {
          content: data.content,
          status: data.status,
          status_code: data.status_code,
          error_message: data.error_message,
          updated_at: now,
        })) as SellersJsonCache;

      } else {
        logger.debug(`[SellersJsonCache] Creating new cache for domain: ${normalizedDomain}`);

        // Create new entry
        savedCache = (await db.insert(this.getTableName(), {
          id: uuidv4(),
          domain: normalizedDomain,
          content: data.content,
          status: data.status,
          status_code: data.status_code,
          error_message: data.error_message,
          created_at: now,
          updated_at: now,
        })) as SellersJsonCache;
      }

      // Update memory cache
      this.saveToMemoryCache(normalizedDomain, savedCache);

      // Sync with normalized table (async, doesn't block cache save)
      if (savedCache.status === 'success' && savedCache.content) {
        setImmediate(() => {
          this.syncNormalizedTable(savedCache).catch(syncError => {
            logger.warn(`[SellersJsonCache] Async sync failed for ${normalizedDomain}: ${syncError}`);
          });
        });
      }

      return savedCache;

    } catch (error) {
      logger.error(`Error saving sellers.json cache for ${data.domain}:`, error);
      throw error;
    }
  }

  /**
   * Check if a cache entry is expired based on its status
   * @param cache The cache entry to check
   * @param expirationConfig Object containing expirationHours for different statuses
   * @returns True if the cache is expired, false otherwise
   */
  isCacheExpiredByStatus(
    cache: SellersJsonCache,
    expirationConfig: {
      success?: number;
      not_found?: number;
      error?: number;
      invalid_format?: number;
      default: number;
    }
  ): boolean {
    const updatedDate = new Date(cache.updated_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - updatedDate.getTime());
    const diffHours = diffTime / (1000 * 60 * 60);

    // ステータスに応じた有効期限を取得
    let expirationHours: number;

    switch (cache.status) {
      case 'success':
        expirationHours = expirationConfig.success || expirationConfig.default;
        break;
      case 'not_found':
        expirationHours = expirationConfig.not_found || expirationConfig.default;
        break;
      case 'error':
        expirationHours = expirationConfig.error || expirationConfig.default;
        break;
      case 'invalid_format':
        expirationHours = expirationConfig.invalid_format || expirationConfig.default;
        break;
      default:
        expirationHours = expirationConfig.default;
    }

    return diffHours > expirationHours;
  }

  /**
   * Check if a cache entry is expired (legacy method for backward compatibility)
   * @param updatedAt The timestamp when the cache was last updated
   * @param expirationHours The number of hours after which the cache is considered expired (default 24)
   * @returns True if the cache is expired, false otherwise
   */
  isCacheExpired(updatedAt: string, expirationHours = 24): boolean {
    const updatedDate = new Date(updatedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - updatedDate.getTime());
    const diffHours = diffTime / (1000 * 60 * 60);

    return diffHours > expirationHours;
  }

  /**
   * Parse a sellers.json string or object into a structured object
   * @param jsonData The sellers.json content as a string or object
   * @returns The parsed content or null if parsing fails
   */
  parseContent(jsonData: string | object | null): SellersJsonContent | null {
    if (!jsonData) {
      return null;
    }

    try {
      // If jsonData is already an object, return it directly
      if (typeof jsonData === 'object') {
        return jsonData as SellersJsonContent;
      }

      // If jsonData is a string, try to parse it
      return JSON.parse(jsonData as string);
    } catch (error) {
      logger.error('Error parsing sellers.json content:', error);
      return null;
    }
  }

  /**
   * Gets the content in a parsed form regardless of database type
   * @param cache The cache entry from the database
   * @returns The parsed content or null
   */
  getParsedContent(cache: SellersJsonCache | null): SellersJsonContent | null {
    if (!cache || !cache.content) {
      return null;
    }

    return this.parseContent(cache.content);
  }

  /**
   * Get a specific seller from the cache by seller_id using optimized PostgreSQL JSONB queries
   * @param domain The domain to search in
   * @param sellerId The seller ID to search for
   * @returns The cache record, seller, metadata and found status if available
   */
  /**
   * Get a specific seller from the cache by seller_id using optimized search with fallback strategy
   * @param domain The domain to search in
   * @param sellerId The seller ID to search for
   * @returns The cache record, seller, metadata and found status if available
   */
  async getSellerByIdOptimized(
    domain: string,
    sellerId: string
  ): Promise<{
    cacheRecord: SellersJsonCache;
    metadata: any;
    seller: any;
    found: boolean;
  } | null> {
    try {
      // Ensure domain is properly lowercase and trimmed for consistent lookup
      const normalizedDomain = domain.toLowerCase().trim();
      const normalizedSellerId = sellerId.toString().trim();

      logger.info(
        `[SellersJsonCache] Looking up seller ${normalizedSellerId} in ${normalizedDomain} with optimization`
      );

      // Strategy 1: Try normalized table search first (highest performance)
      try {
        const normalizedResult = await this.getSellerByIdNormalized(normalizedDomain, normalizedSellerId);
        if (normalizedResult) {
          logger.debug(`[SellersJsonCache] Normalized table hit for ${normalizedSellerId} in ${normalizedDomain}`);
          return normalizedResult;
        }
      } catch (normalizedError) {
        logger.warn(`[SellersJsonCache] Normalized table search failed: ${normalizedError}`);
        // Continue to fallback strategy
      }

      // Strategy 2: Fallback to JSONB optimization
      logger.debug(`[SellersJsonCache] Falling back to JSONB search for ${normalizedSellerId} in ${normalizedDomain}`);

      // Check if we're using PostgreSQL
      const dbProvider = process.env.DB_PROVIDER || 'sqlite';

      if (dbProvider !== 'postgres') {
        logger.info('[SellersJsonCache] Not using PostgreSQL, skipping JSONB optimization');
        return null;
      }

      // Get the PostgreSQL database instance
      let postgres;
      try {
        postgres = (db as any).implementation as any;
        if (!postgres) {
          logger.warn('[SellersJsonCache] Database implementation not available for seller lookup');
          return null;
        }
      } catch (implError) {
        logger.error(
          `[SellersJsonCache] Error accessing database implementation for seller lookup: ${implError}`
        );
        return null;
      }

      // Check if it has our custom JSONB query method
      if (!postgres.queryJsonBSellerById) {
        logger.warn(
          '[SellersJsonCache] PostgreSQL instance does not have queryJsonBSellerById method'
        );
        return null;
      }

      // Call the optimized JSONB method
      const result = await postgres.queryJsonBSellerById(normalizedDomain, normalizedSellerId);

      if (!result) {
        logger.info(
          `[SellersJsonCache] No optimized result found for ${normalizedSellerId} in ${normalizedDomain}`
        );
        return null;
      }

      logger.info(
        `[SellersJsonCache] Found optimized JSONB result for ${normalizedSellerId} in ${normalizedDomain}`
      );

      // PostgreSQLアダプタからの結果を直接利用
      return {
        cacheRecord: result.cacheRecord,
        metadata: result.metadata,
        seller: result.seller,
        found: result.found,
      };
    } catch (error) {
      logger.error(`[SellersJsonCache] Error in getSellerByIdOptimized: ${error}`);
      // On error, return null to fall back to the standard method
      return null;
    }
  }

  /**
   * Get a specific seller from the normalized lookup table for high-performance search
   * @param domain The domain to search in
   * @param sellerId The seller ID to search for
   * @returns The cache record, seller, metadata and found status if available
   */
  /**
   * Get a specific seller from the normalized lookup table for high-performance search
   * @param domain The domain to search in
   * @param sellerId The seller ID to search for
   * @returns The cache record, seller, metadata and found status if available
   */
  async getSellerByIdNormalized(
    domain: string,
    sellerId: string
  ): Promise<{
    cacheRecord: SellersJsonCache;
    metadata: any;
    seller: any;
    found: boolean;
  } | null> {
    try {
      const normalizedDomain = domain.toLowerCase().trim();
      const normalizedSellerId = sellerId.toString().trim();

      logger.debug(
        `[SellersJsonCache] Looking up seller ${normalizedSellerId} in ${normalizedDomain} using normalized table`
      );

      // Check if we're using PostgreSQL
      const dbProvider = process.env.DB_PROVIDER || 'sqlite';
      if (dbProvider !== 'postgres') {
        logger.debug('[SellersJsonCache] Not using PostgreSQL, normalized table not available');
        return null;
      }

      // Get the PostgreSQL database instance
      let postgres;
      try {
        postgres = (db as any).implementation as any;
        if (!postgres) {
          logger.warn('[SellersJsonCache] Database implementation not available for normalized lookup');
          return null;
        }
      } catch (implError) {
        logger.error(
          `[SellersJsonCache] Error accessing database implementation for normalized lookup: ${implError}`
        );
        return null;
      }

      // Direct SQL query to the normalized table
      const query = `
        SELECT
          c.id, c.domain, c.status, c.status_code, c.error_message,
          c.created_at, c.updated_at, c.content,
          c.content->>'version' as version,
          c.content->>'contact_email' as contact_email,
          c.content->>'contact_address' as contact_address,
          c.content->'identifiers' as identifiers,
          jsonb_array_length(c.content->'sellers') as seller_count,
          sl.seller_data
        FROM sellers_json_cache c
        JOIN sellers_json_seller_lookup sl ON c.id = sl.cache_id
        WHERE sl.domain = $1
          AND sl.seller_id = $2
          AND c.status = 'success'
        LIMIT 1
      `;

      const result = await postgres.query(query, [normalizedDomain, normalizedSellerId]);

      if (!result || !result.rows || result.rows.length === 0) {
        logger.debug(
          `[SellersJsonCache] No normalized result found for ${normalizedSellerId} in ${normalizedDomain}`
        );
        return null;
      }

      const row = result.rows[0];

      logger.debug(
        `[SellersJsonCache] Found normalized result for ${normalizedSellerId} in ${normalizedDomain}`
      );

      return {
        cacheRecord: {
          id: row.id,
          domain: row.domain,
          content: row.content,
          status: row.status,
          status_code: row.status_code,
          error_message: row.error_message,
          created_at: row.created_at,
          updated_at: row.updated_at,
        },
        metadata: {
          version: row.version,
          contact_email: row.contact_email,
          contact_address: row.contact_address,
          identifiers: row.identifiers,
          seller_count: parseInt(row.seller_count, 10) || 0,
        },
        seller: row.seller_data,
        found: true,
      };
    } catch (error) {
      logger.error(`[SellersJsonCache] Error in getSellerByIdNormalized: ${error}`);
      return null;
    }
  }

  /**
   * Sync sellers.json cache data with the normalized lookup table
   * @param cache The cache record to sync
   * @returns Promise that resolves when sync is complete
   */
  private async syncNormalizedTable(cache: SellersJsonCache): Promise<void> {
    try {
      // Only sync if using PostgreSQL and status is success
      const dbProvider = process.env.DB_PROVIDER || 'sqlite';
      if (dbProvider !== 'postgres' || cache.status !== 'success' || !cache.content) {
        logger.debug(`[SellersJsonCache] Skipping normalized table sync for ${cache.domain}: not applicable`);
        return;
      }

      // Get the PostgreSQL database instance
      let postgres;
      try {
        postgres = (db as any).implementation as any;
        if (!postgres) {
          logger.warn('[SellersJsonCache] Database implementation not available for sync');
          return;
        }
      } catch (implError) {
        logger.warn(`[SellersJsonCache] Error accessing database implementation for sync: ${implError}`);
        return;
      }

      logger.debug(`[SellersJsonCache] Syncing normalized table for ${cache.domain}`);

      // Parse the content
      const parsedContent = this.parseContent(cache.content);
      if (!parsedContent?.sellers || !Array.isArray(parsedContent.sellers)) {
        logger.debug(`[SellersJsonCache] No sellers data to sync for ${cache.domain}`);
        return;
      }

      // Start transaction for atomic updates
      await postgres.query('BEGIN');

      try {
        // Delete existing entries for this cache_id
        await postgres.query(
          'DELETE FROM sellers_json_seller_lookup WHERE cache_id = $1',
          [cache.id]
        );

        // Filter valid sellers
        const validSellers = parsedContent.sellers.filter(seller => seller.seller_id);

        if (validSellers.length > 0) {
          // Remove duplicates within the same cache record
          const sellerMap = new Map();
          validSellers.forEach(seller => {
            const key = `${cache.id}:${seller.seller_id}`;
            sellerMap.set(key, seller);
          });

          const uniqueSellers = Array.from(sellerMap.values());

          // Insert new sellers one by one to handle any individual errors
          let insertedCount = 0;
          for (const seller of uniqueSellers) {
            try {
              await postgres.query(
                `INSERT INTO sellers_json_seller_lookup (cache_id, domain, seller_id, seller_data, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, NOW(), NOW())`,
                [
                  cache.id,
                  cache.domain.toLowerCase(),
                  seller.seller_id,
                  JSON.stringify(seller)
                ]
              );
              insertedCount++;
            } catch (sellerError) {
              logger.warn(`[SellersJsonCache] Failed to insert seller ${seller.seller_id} for ${cache.domain}: ${sellerError}`);
              // Continue with other sellers
            }
          }

          logger.debug(`[SellersJsonCache] Synced ${insertedCount}/${uniqueSellers.length} sellers for ${cache.domain}`);
        }

        // Commit the transaction
        await postgres.query('COMMIT');

        logger.debug(`[SellersJsonCache] Successfully synced normalized table for ${cache.domain}`);

      } catch (syncError) {
        // Rollback on error
        await postgres.query('ROLLBACK');
        throw syncError;
      }

    } catch (error) {
      logger.error(`[SellersJsonCache] Error syncing normalized table for ${cache.domain}:`, error);
      // Don't throw error - sync failure shouldn't break cache save
    }
  }

  /**
   * Get only metadata and seller type summary for a domain
   * This is more memory-efficient than getting the full sellers.json data
   *
   * @param domain The domain to retrieve metadata for
   * @returns Object with metadata and sellers summary or null if not found
   */
  async getMetadataAndSummarizedSellers(domain: string): Promise<{
    domainInfo: {
      id: string;
      domain: string;
      status: SellersJsonCacheStatus;
      updated_at: string;
    };
    metadata: {
      version?: string;
      contact_email?: string;
      seller_count: number;
    };
    sellersSummary: {
      publisherCount: number;
      intermediaryCount: number;
      bothCount: number;
      otherCount: number;
      confidentialCount: number;
    };
    isCacheMiss: boolean;
  } | null> {
    try {
      // Get cache record first - メモリキャッシュも利用
      const cacheRecord = await this.getByDomain(domain, false);

      // キャッシュが存在しない場合 (キャッシュミス)
      if (!cacheRecord) {
        logger.info(`[SellersJsonCache] No cache entry found for ${domain}`);
        return {
          domainInfo: {
            id: '',
            domain: domain.toLowerCase().trim(),
            status: 'not_found',
            updated_at: new Date().toISOString(),
          },
          metadata: {
            version: '',
            contact_email: '',
            seller_count: 0,
          },
          sellersSummary: {
            publisherCount: 0,
            intermediaryCount: 0,
            bothCount: 0,
            otherCount: 0,
            confidentialCount: 0,
          },
          isCacheMiss: true,
        };
      }

      // キャッシュがあるが成功でない場合は、そのステータス情報を返す
      if (cacheRecord.status !== 'success' || !cacheRecord.content) {
        logger.info(
          `[SellersJsonCache] Cache exists for ${domain} but status is ${cacheRecord.status}`
        );
        return {
          domainInfo: {
            id: cacheRecord.id,
            domain: cacheRecord.domain,
            status: cacheRecord.status,
            updated_at: cacheRecord.updated_at,
          },
          metadata: {
            version: '',
            contact_email: '',
            seller_count: 0,
          },
          sellersSummary: {
            publisherCount: 0,
            intermediaryCount: 0,
            bothCount: 0,
            otherCount: 0,
            confidentialCount: 0,
          },
          isCacheMiss: false,
        };
      }

      // Check if we're using PostgreSQL for JSONB optimized queries
      const dbProvider = process.env.DB_PROVIDER || 'sqlite';

      if (dbProvider === 'postgres') {
        try {
          // Use optimized PostgreSQL query for metadata and summary
          let postgres;
          try {
            postgres = (db as any).implementation as any;
            if (!postgres) {
              logger.warn('[SellersJsonCache] Database implementation not available for summary');
              throw new Error('Database implementation not available');
            }
          } catch (implError) {
            logger.error(
              `[SellersJsonCache] Error accessing database implementation for summary: ${implError}`
            );
            throw implError;
          }

          if (postgres.queryJsonBSummary) {
            const result = await postgres.queryJsonBSummary(domain);
            if (result) {
              return result;
            }
          }
        } catch (error) {
          logger.error(`[SellersJsonCache] Error in PostgreSQL optimization: ${error}`);
          // Fall back to normal processing on error
        }
      }

      // If not using PostgreSQL or optimization failed, parse the data manually
      // but still extract only what's needed to save memory
      const parsedContent = this.parseContent(cacheRecord.content);
      if (!parsedContent) {
        return null;
      }

      // Extract only required metadata
      const sellersSummary = {
        publisherCount: 0,
        intermediaryCount: 0,
        bothCount: 0,
        otherCount: 0,
        confidentialCount: 0,
      };

      // Count seller types without storing full sellers array
      if (parsedContent.sellers && Array.isArray(parsedContent.sellers)) {
        for (const seller of parsedContent.sellers) {
          // Count by seller type
          if (seller.seller_type === 'PUBLISHER') {
            sellersSummary.publisherCount++;
          } else if (seller.seller_type === 'INTERMEDIARY') {
            sellersSummary.intermediaryCount++;
          } else if (seller.seller_type === 'BOTH') {
            sellersSummary.bothCount++;
          } else {
            sellersSummary.otherCount++;
          }

          // Count confidential sellers (handle both boolean and numeric 1)
          if (
            seller.is_confidential === true ||
            (typeof seller.is_confidential === 'number' && seller.is_confidential === 1)
          ) {
            sellersSummary.confidentialCount++;
          }
        }
      }

      return {
        domainInfo: {
          id: cacheRecord.id,
          domain: cacheRecord.domain,
          status: cacheRecord.status,
          updated_at: cacheRecord.updated_at,
        },
        metadata: {
          version: parsedContent.version,
          contact_email: parsedContent.contact_email,
          seller_count: parsedContent.sellers?.length || 0,
        },
        sellersSummary,
        isCacheMiss: false,
      };
    } catch (error) {
      logger.error(`[SellersJsonCache] Error getting metadata summary: ${error}`);
      return null;
    }
  }

  // 特定のドメインとアカウントIDのペアの結果をメモリキャッシュするためのマップ
  private specificSellersCache: Map<
    string,
    {
      result: {
        domainInfo: {
          id: string;
          domain: string;
          status: SellersJsonCacheStatus;
          updated_at: string;
        };
        metadata: {
          version?: string;
          contact_email?: string;
        };
        matchingSellers: Array<any>;
      } | null;
      timestamp: number;
    }
  > = new Map();

  /**
   * Get multiple sellers from the cache by seller_ids using optimized PostgreSQL JSONB queries
   * @param domain The domain to search in
   * @param sellerIds Array of seller IDs to search for
   * @returns The cache record, metadata and batch results if available
   */
  async batchGetSellersOptimized(
    domain: string,
    sellerIds: string[]
  ): Promise<{
    cacheRecord: SellersJsonCache;
    metadata: any;
    results: Array<{
      sellerId: string;
      seller: any;
      found: boolean;
    }>;
    foundCount: number;
  } | null> {
    try {
      // Ensure domain is properly lowercase and trimmed for consistent lookup
      const normalizedDomain = domain.toLowerCase().trim();
      const normalizedSellerIds = sellerIds.map((id) => id.toString().trim());

      logger.info(
        `[SellersJsonCache] Batch lookup for ${normalizedSellerIds.length} sellers in ${normalizedDomain} with optimization`
      );

      // Check if we're using PostgreSQL
      const dbProvider = process.env.DB_PROVIDER || 'sqlite';

      if (dbProvider !== 'postgres') {
        logger.debug('[SellersJsonCache] Not using PostgreSQL, skipping JSONB batch optimization');
        return null;
      }

      // Additional check for cloud environment
      const isCloudEnv =
        process.env.NODE_ENV === 'production' ||
        process.env.IS_CLOUD === 'true' ||
        !!process.env.DATABASE_URL;
      logger.debug(
        `[SellersJsonCache] Cloud environment: ${isCloudEnv}, DB_PROVIDER: ${dbProvider}`
      );

      // Get the PostgreSQL database instance
      let postgres;
      try {
        postgres = (db as any).implementation as any;
        if (!postgres) {
          logger.warn('[SellersJsonCache] Database implementation not available');
          return null;
        }
      } catch (implError) {
        logger.error(`[SellersJsonCache] Error accessing database implementation: ${implError}`);
        return null;
      }

      // Check if it has our custom JSONB batch query method
      if (!postgres.queryJsonBBatchSellers) {
        logger.warn(
          '[SellersJsonCache] PostgreSQL instance does not have queryJsonBBatchSellers method'
        );
        return null;
      }

      // Call the optimized batch method
      const result = await postgres.queryJsonBBatchSellers(normalizedDomain, normalizedSellerIds);

      if (!result) {
        logger.info(
          `[SellersJsonCache] No optimized batch result found for ${normalizedSellerIds.length} sellers in ${normalizedDomain}`
        );
        return null;
      }

      logger.info(
        `[SellersJsonCache] Found optimized batch result for ${result.foundCount}/${normalizedSellerIds.length} sellers in ${normalizedDomain}`
      );

      return result;
    } catch (error) {
      logger.error(`[SellersJsonCache] Error in batchGetSellersOptimized: ${error}`);
      // On error, return null to fall back to the standard method
      return null;
    }
  }

  /**
   * Get specific seller entries matching the provided account IDs
   * This is more memory-efficient than getting all sellers when only a few are needed
   *
   * @param domain The domain to retrieve sellers from
   * @param accountIds Array of account IDs to find
   * @returns Object with matching sellers and basic metadata or null if not found
   */
  async getSpecificSellers(
    domain: string,
    accountIds: string[]
  ): Promise<{
    domainInfo: {
      id: string;
      domain: string;
      status: SellersJsonCacheStatus;
      updated_at: string;
    };
    metadata: {
      version?: string;
      contact_email?: string;
    };
    matchingSellers: Array<any>;
  } | null> {
    try {
      // Ensure domain is properly lowercase and trimmed for consistent lookup
      const normalizedDomain = domain.toLowerCase().trim();

      // アカウントIDも正規化
      const normalizedIds = accountIds.map((id) => id.toString().toLowerCase());

      // キャッシュキーの作成（ドメイン:アカウントIDのリスト）
      const cacheKey = `${normalizedDomain}:${normalizedIds.join(',')}`;

      // 結果がすでにメモリキャッシュにあるか確認
      const cachedResult = this.specificSellersCache.get(cacheKey);
      if (cachedResult && Date.now() - cachedResult.timestamp < this.memoryCacheTTL) {
        logger.debug(`[SellersJsonCache] Using specific sellers memory cache for ${cacheKey}`);
        return cachedResult.result;
      }

      // Get cache record first - メモリキャッシュも利用
      const cacheRecord = await this.getByDomain(normalizedDomain, false);
      if (!cacheRecord || cacheRecord.status !== 'success' || !cacheRecord.content) {
        // キャッシュに結果を保存（null結果も保存して同じクエリの繰り返しを防ぐ）
        this.specificSellersCache.set(cacheKey, {
          result: null,
          timestamp: Date.now(),
        });
        return null;
      }

      // Check if we're using PostgreSQL for JSONB optimized queries
      const dbProvider = process.env.DB_PROVIDER || 'sqlite';

      if (dbProvider === 'postgres' && normalizedIds.length > 0) {
        try {
          // Use optimized PostgreSQL query for specific sellers
          let postgres;
          try {
            postgres = (db as any).implementation as any;
            if (!postgres) {
              logger.warn(
                '[SellersJsonCache] Database implementation not available for specific sellers'
              );
              throw new Error('Database implementation not available');
            }
          } catch (implError) {
            logger.error(
              `[SellersJsonCache] Error accessing database implementation for specific sellers: ${implError}`
            );
            throw implError;
          }

          if (postgres.queryJsonBSpecificSellers) {
            const result = await postgres.queryJsonBSpecificSellers(
              normalizedDomain,
              normalizedIds
            );
            if (result) {
              // 結果をキャッシュに保存
              this.specificSellersCache.set(cacheKey, {
                result,
                timestamp: Date.now(),
              });
              return result;
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error(
            `[SellersJsonCache] Error in PostgreSQL specific sellers query: ${errorMessage}`
          );
          // Fall back to normal processing on error
        }
      }

      // Parse the data manually but extract only what's needed
      const parsedContent = this.parseContent(cacheRecord.content);
      if (!parsedContent || !parsedContent.sellers || !Array.isArray(parsedContent.sellers)) {
        // キャッシュに結果を保存（null結果も保存して同じクエリの繰り返しを防ぐ）
        this.specificSellersCache.set(cacheKey, {
          result: null,
          timestamp: Date.now(),
        });
        return null;
      }

      // アカウントIDをセットに変換して高速検索
      const accountIdSet = new Set(normalizedIds);

      // Filter to only include matching seller IDs
      const matchingSellers = parsedContent.sellers.filter(
        (seller) => seller.seller_id && accountIdSet.has(seller.seller_id.toString().toLowerCase())
      );

      // 結果を作成
      const result = {
        domainInfo: {
          id: cacheRecord.id,
          domain: cacheRecord.domain,
          status: cacheRecord.status,
          updated_at: cacheRecord.updated_at,
        },
        metadata: {
          version: parsedContent.version,
          contact_email: parsedContent.contact_email,
        },
        matchingSellers,
      };

      // 結果をキャッシュに保存
      this.specificSellersCache.set(cacheKey, {
        result,
        timestamp: Date.now(),
      });

      // キャッシュサイズを確認し、大きすぎる場合はクリーンアップ
      if (this.specificSellersCache.size > this.memoryCacheMaxSize) {
        this.cleanupSpecificSellersCache();
      }

      return result;
    } catch (error) {
      logger.error(`[SellersJsonCache] Error getting specific sellers: ${error}`);
      return null;
    }
  }

  /**
   * 古い特定セラーのキャッシュをクリーンアップするメソッド
   */
  private cleanupSpecificSellersCache(): void {
    try {
      const now = Date.now();
      const expiredKeys: string[] = [];

      // まず期限切れのエントリを特定
      for (const [key, entry] of this.specificSellersCache.entries()) {
        if (now - entry.timestamp > this.memoryCacheTTL) {
          expiredKeys.push(key);
        }
      }

      // 期限切れのエントリを削除
      for (const key of expiredKeys) {
        this.specificSellersCache.delete(key);
      }

      // それでもまだ多すぎる場合は、古いものから削除
      if (this.specificSellersCache.size > this.memoryCacheMaxSize) {
        const entries = Array.from(this.specificSellersCache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

        // 削除する数を計算（キャッシュの約20%を削除）
        const toRemoveCount = Math.ceil(this.memoryCacheMaxSize * 0.2);
        const keysToRemove = entries.slice(0, toRemoveCount).map((entry) => entry[0]);

        for (const key of keysToRemove) {
          this.specificSellersCache.delete(key);
        }

        logger.debug(
          `[SellersJsonCache] Cleaned up ${keysToRemove.length} old entries from specific sellers cache`
        );
      }
    } catch (error) {
      logger.error(`[SellersJsonCache] Error cleaning up specific sellers cache: ${error}`);
    }
  }

  /**
   * Test database connection
   */
  static async testConnection(): Promise<boolean> {
    try {
      // Simple query to test database connection
      await db.execute('SELECT 1 as test', []);
      return true;
    } catch (error) {
      logger.error('Database connection test failed:', error);
      return false;
    }
  }

  /**
   * Get performance metrics for the cache
   */
  static async getPerformanceMetrics(): Promise<{
    avgResponseTime: number;
    requestCount: number;
    errorRate: number;
  }> {
    try {
      // Get recent performance data from the last hour
      const results = await db.execute(`
        SELECT 
          COUNT(*) as request_count,
          AVG(CASE 
            WHEN updated_at > datetime('now', '-1 hour') 
            THEN (julianday('now') - julianday(updated_at)) * 24 * 60 * 60 * 1000 
            ELSE NULL 
          END) as avg_response_time_ms,
          (COUNT(CASE WHEN status = 'error' THEN 1 END) * 1.0 / COUNT(*)) as error_rate
        FROM sellers_json_cache
        WHERE updated_at > datetime('now', '-1 hour')
      `, []);

      const result = Array.isArray(results) ? results[0] : results;
      
      return {
        avgResponseTime: result?.avg_response_time_ms || 1000,
        requestCount: result?.request_count || 0,
        errorRate: result?.error_rate || 0,
      };
    } catch (error) {
      logger.warn('Failed to get performance metrics:', error);
      return {
        avgResponseTime: 1000,
        requestCount: 0,
        errorRate: 0,
      };
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStatistics(): Promise<{
    totalDomains: number;
    successfulCaches: number;
    errorCaches: number;
    notFoundCaches: number;
    lastUpdated: string | null;
  }> {
    try {
      const results = await db.execute(`
        SELECT 
          COUNT(DISTINCT domain) as total_domains,
          COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_caches,
          COUNT(CASE WHEN status = 'error' THEN 1 END) as error_caches,
          COUNT(CASE WHEN status = 'not_found' THEN 1 END) as not_found_caches,
          MAX(updated_at) as last_updated
        FROM sellers_json_cache
      `, []);

      const result = Array.isArray(results) ? results[0] : results;
      
      return {
        totalDomains: result?.total_domains || 0,
        successfulCaches: result?.successful_caches || 0,
        errorCaches: result?.error_caches || 0,
        notFoundCaches: result?.not_found_caches || 0,
        lastUpdated: result?.last_updated || null,
      };
    } catch (error) {
      logger.warn('Failed to get cache statistics:', error);
      return {
        totalDomains: 0,
        successfulCaches: 0,
        errorCaches: 0,
        notFoundCaches: 0,
        lastUpdated: null,
      };
    }
  }
}

export { SellersJsonCacheModel };
export default new SellersJsonCacheModel();
