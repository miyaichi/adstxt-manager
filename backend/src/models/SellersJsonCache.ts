import { v4 as uuidv4 } from 'uuid';
import db from '../config/database/index';
import { logger } from '../utils/logger';
import { DatabaseRecord, IDatabaseAdapter } from '../config/database/index';

export interface SellersJsonCache extends DatabaseRecord {
  id: string;
  domain: string;
  content: string | null;
  status: 'success' | 'not_found' | 'invalid_format' | 'error';
  status_code: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export type SellersJsonCacheStatus = 'success' | 'not_found' | 'invalid_format' | 'error';

export interface SellersJsonContent {
  sellers?: Array<{
    seller_id?: string;
    name?: string;
    domain?: string;
    seller_type?: string;
    [key: string]: any;
  }>;
  [key: string]: any;
}

// Use the exported database instance, which implements IDatabaseAdapter
// No need for type assertion since it's already typed correctly

class SellersJsonCacheModel {
  private readonly tableName = 'sellers_json_cache';

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
      
      const results = await db.query(this.tableName, {
        where: { domain: normalizedDomain },
        order: { field: 'updated_at', direction: 'DESC' },
      });

      logger.info(`[SellersJsonCache] Query results for ${normalizedDomain}: ${results.length} records found`);
      
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

    try {
      if (existingCache) {
        // Update existing entry
        logger.info(`[SellersJsonCache] Updating existing cache for domain: ${normalizedDomain}, id: ${existingCache.id}`);
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
   * Parse a sellers.json string into a structured object
   * @param jsonString The sellers.json content as a string
   * @returns The parsed content or null if parsing fails
   */
  parseContent(jsonString: string | null): SellersJsonContent | null {
    if (!jsonString) {
      return null;
    }

    try {
      return JSON.parse(jsonString);
    } catch (error) {
      logger.error('Error parsing sellers.json content:', error);
      return null;
    }
  }
}

export default new SellersJsonCacheModel();
