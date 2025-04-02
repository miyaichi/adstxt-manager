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

  // Get the appropriate table name
  private getTableName(): string {
    return this.tableName;
  }

  /**
   * Get a sellers.json cache entry by domain
   * @param domain The domain to retrieve
   * @returns The cache entry or null if not found
   */
  async getByDomain(domain: string): Promise<SellersJsonCache | null> {
    try {
      // Ensure domain is properly lowercase for consistent lookup
      const normalizedDomain = domain.toLowerCase();

      logger.info(`[SellersJsonCache] Looking up domain: ${normalizedDomain}`);

      const results = await db.query(this.getTableName(), {
        where: { domain: normalizedDomain },
        order: { field: 'updated_at', direction: 'DESC' },
      });

      logger.info(
        `[SellersJsonCache] Query results for ${normalizedDomain}: ${results.length} records found`
      );

      return results.length > 0 ? (results[0] as SellersJsonCache) : null;
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
    // Ensure domain is properly lowercase for consistent storage
    const normalizedDomain = data.domain.toLowerCase();
    const { content, status, status_code: statusCode, error_message: errorMessage } = data;

    logger.info(`[SellersJsonCache] Saving cache for domain: ${normalizedDomain}`);

    const now = new Date().toISOString();
    const existingCache = await this.getByDomain(normalizedDomain);

    // Check if we're using PostgreSQL
    const dbProvider = process.env.DB_PROVIDER || 'sqlite';

    // Both PostgreSQL and SQLite implementations now use the same approach
    // with the only difference being that PostgreSQL stores JSON as JSONB
    try {
      if (existingCache) {
        // Update existing entry
        logger.info(
          `[SellersJsonCache] Updating existing cache for domain: ${normalizedDomain}, id: ${existingCache.id}`
        );
        const updatedCache = await db.update(this.tableName, existingCache.id, {
          content,
          status,
          status_code: statusCode,
          error_message: errorMessage,
          updated_at: now,
        });

        if (!updatedCache) {
          throw new Error(`Failed to update sellers.json cache for domain: ${normalizedDomain}`);
        }

        return updatedCache as SellersJsonCache;
      } else {
        // Create new entry
        logger.info(`[SellersJsonCache] Creating new cache entry for domain: ${normalizedDomain}`);
        const newCache: SellersJsonCache = {
          id: uuidv4(),
          domain: normalizedDomain, // Use the normalized domain
          content,
          status,
          status_code: statusCode,
          error_message: errorMessage,
          created_at: now,
          updated_at: now,
        };

        return (await db.insert(this.tableName, newCache)) as SellersJsonCache;
      }
    } catch (error) {
      logger.error(`Error saving sellers.json cache for ${normalizedDomain}:`, error);
      throw error;
    }
  }

  /**
   * Check if a cache entry is expired
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
      // Ensure domain is properly lowercase for consistent lookup
      const normalizedDomain = domain.toLowerCase();
      const normalizedSellerId = sellerId.toString().trim();

      logger.info(
        `[SellersJsonCache] Looking up seller ${normalizedSellerId} in ${normalizedDomain} with optimization`
      );

      // Check if we're using PostgreSQL
      const dbProvider = process.env.DB_PROVIDER || 'sqlite';

      if (dbProvider !== 'postgres') {
        logger.info('[SellersJsonCache] Not using PostgreSQL, skipping JSONB optimization');
        return null;
      }

      // Get the PostgreSQL database instance
      const postgres = (db as any).implementation as any;

      // Check if it has our custom JSONB query method
      if (!postgres.queryJsonBSellerById) {
        logger.warn(
          '[SellersJsonCache] PostgreSQL instance does not have queryJsonBSellerById method'
        );
        return null;
      }

      // Call the optimized method
      const result = await postgres.queryJsonBSellerById(normalizedDomain, normalizedSellerId);

      if (!result) {
        logger.info(
          `[SellersJsonCache] No optimized result found for ${normalizedSellerId} in ${normalizedDomain}`
        );
        return null;
      }

      logger.info(
        `[SellersJsonCache] Found optimized result for ${normalizedSellerId} in ${normalizedDomain}`
      );

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
}

export default new SellersJsonCacheModel();
