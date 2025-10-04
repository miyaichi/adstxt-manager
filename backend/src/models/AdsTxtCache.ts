import db from '../config/database/index';
import { logger } from '../utils/logger';
import { DatabaseRecord, IDatabaseAdapter } from '../config/database/index';

export type AdsTxtCacheStatus = 'success' | 'error' | 'not_found' | 'invalid_format';

export interface AdsTxtCache extends DatabaseRecord {
  id: string;
  domain: string;
  content: string | null;
  url: string | null;
  status: AdsTxtCacheStatus;
  status_code: number | null;
  error_message: string | null;
  validated_records: any[] | null; // ParsedAdsTxtEntry[] with validation results
  validation_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdsTxtCacheDTO {
  domain: string;
  content: string | null;
  url: string | null;
  status: AdsTxtCacheStatus;
  status_code: number | null;
  error_message: string | null;
  validated_records?: any[] | null; // Optional: ParsedAdsTxtEntry[] with validation results
  validation_completed_at?: string | null; // Optional: ISO timestamp
}

// Use the exported database instance, which implements IDatabaseAdapter
// No need for type assertion since it's already typed correctly

class AdsTxtCacheModel {
  private readonly tableName = 'ads_txt_cache';

  /**
   * Get an ads.txt cache entry by domain
   * @param domain The domain to retrieve
   * @returns The cache entry or null if not found
   */
  async getByDomain(domain: string): Promise<AdsTxtCache | null> {
    try {
      // Ensure domain is properly lowercase for consistent lookup
      const normalizedDomain = domain.toLowerCase();

      logger.info(`[AdsTxtCache] Looking up domain: ${normalizedDomain}`);

      // Using custom SQL with the database adapter
      const results = await db.query(this.tableName, {
        where: { domain: normalizedDomain },
        order: { field: 'updated_at', direction: 'DESC' },
      });

      logger.info(
        `[AdsTxtCache] Query results for ${normalizedDomain}: ${results.length} records found`
      );

      return results.length > 0 ? (results[0] as AdsTxtCache) : null;
    } catch (error) {
      logger.error('Error fetching ads.txt cache:', error);
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
   * Save or update an ads.txt cache entry
   * @param data The data to save
   * @returns The saved cache entry
   */
  async saveCache(data: AdsTxtCacheDTO): Promise<AdsTxtCache> {
    try {
      const now = new Date().toISOString();

      // Ensure domain is properly lowercase for consistent storage
      const normalizedDomain = data.domain.toLowerCase();
      logger.info(`[AdsTxtCache] Saving cache for domain: ${normalizedDomain}`);

      const existingCache = await this.getByDomain(normalizedDomain);

      if (existingCache) {
        // Update existing entry
        logger.info(
          `[AdsTxtCache] Updating existing cache for domain: ${normalizedDomain}, id: ${existingCache.id}`
        );
        const updatedCache = await db.update(this.tableName, existingCache.id, {
          content: data.content,
          url: data.url,
          status: data.status,
          status_code: data.status_code,
          error_message: data.error_message,
          validated_records: data.validated_records,
          validation_completed_at: data.validation_completed_at,
          updated_at: now,
        });

        if (!updatedCache) {
          throw new Error(`Failed to update ads.txt cache for domain: ${normalizedDomain}`);
        }

        return updatedCache as AdsTxtCache;
      } else {
        // Create a new entry with UUID
        const { v4: uuidv4 } = require('uuid');
        logger.info(`[AdsTxtCache] Creating new cache entry for domain: ${normalizedDomain}`);

        const newEntry: AdsTxtCache = {
          id: uuidv4(),
          domain: normalizedDomain, // Use normalized domain
          content: data.content,
          url: data.url,
          status: data.status,
          status_code: data.status_code,
          error_message: data.error_message,
          validated_records: data.validated_records || null,
          validation_completed_at: data.validation_completed_at || null,
          created_at: now,
          updated_at: now,
        };

        return (await db.insert(this.tableName, newEntry)) as AdsTxtCache;
      }
    } catch (error) {
      logger.error('Error saving ads.txt cache:', error);
      throw error;
    }
  }
}

export default new AdsTxtCacheModel();
