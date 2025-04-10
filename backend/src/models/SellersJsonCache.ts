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
    try {
      // Ensure domain is properly lowercase for consistent storage
      const normalizedDomain = data.domain.toLowerCase();

      // Check if cache entry already exists
      const existingCache = await this.getByDomain(normalizedDomain);

      const now = new Date().toISOString();

      if (existingCache) {
        logger.info(`[SellersJsonCache] Updating existing cache for domain: ${normalizedDomain}, id: ${existingCache.id}`);

        // Update existing entry
        const updatedCache = await db.update(this.getTableName(), existingCache.id, {
          content: data.content,
          status: data.status,
          status_code: data.status_code,
          error_message: data.error_message,
          updated_at: now,
        });

        return updatedCache as SellersJsonCache;
      } else {
        logger.info(`[SellersJsonCache] Creating new cache for domain: ${normalizedDomain}`);

        // Create new entry
        const newCache = await db.insert(this.getTableName(), {
          id: uuidv4(),
          domain: normalizedDomain,
          content: data.content,
          status: data.status,
          status_code: data.status_code,
          error_message: data.error_message,
          created_at: now,
          updated_at: now,
        });

        return newCache as SellersJsonCache;
      }
    } catch (error) {
      logger.error(`Error saving sellers.json cache for ${data.domain}:`, error);
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
        seller:
          result.matching_sellers && result.matching_sellers.length > 0
            ? result.matching_sellers[0]
            : null,
        found: result.matching_sellers && result.matching_sellers.length > 0,
      };
    } catch (error) {
      logger.error(`[SellersJsonCache] Error in getSellerByIdOptimized: ${error}`);
      // On error, return null to fall back to the standard method
      return null;
    }
  }

  /**
   * Get only metadata and seller type summary for a domain
   * This is more memory-efficient than getting the full sellers.json data
   * 
   * @param domain The domain to retrieve metadata for
   * @returns Object with metadata and sellers summary or null if not found
   */
  async getMetadataAndSummarizedSellers(
    domain: string
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
      seller_count: number;
    };
    sellersSummary: {
      publisherCount: number;
      intermediaryCount: number;
      bothCount: number;
      otherCount: number;
      confidentialCount: number;
    };
  } | null> {
    try {
      // Get cache record first
      const cacheRecord = await this.getByDomain(domain);
      if (!cacheRecord || cacheRecord.status !== 'success' || !cacheRecord.content) {
        return null;
      }

      // Check if we're using PostgreSQL for JSONB optimized queries
      const dbProvider = process.env.DB_PROVIDER || 'sqlite';
      
      if (dbProvider === 'postgres') {
        try {
          // Use optimized PostgreSQL query for metadata and summary
          const postgres = (db as any).implementation as any;
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
          if (seller.is_confidential === true || (typeof seller.is_confidential === 'number' && seller.is_confidential === 1)) {
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
      };
    } catch (error) {
      logger.error(`[SellersJsonCache] Error getting metadata summary: ${error}`);
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
      // Ensure domain is properly lowercase for consistent lookup
      const normalizedDomain = domain.toLowerCase();
      
      // Get cache record first
      const cacheRecord = await this.getByDomain(normalizedDomain);
      if (!cacheRecord || cacheRecord.status !== 'success' || !cacheRecord.content) {
        return null;
      }

      // Check if we're using PostgreSQL for JSONB optimized queries
      const dbProvider = process.env.DB_PROVIDER || 'sqlite';
      
      if (dbProvider === 'postgres' && accountIds.length > 0) {
        try {
          // Use optimized PostgreSQL query for specific sellers
          const postgres = (db as any).implementation as any;
          if (postgres.queryJsonBSpecificSellers) {
            const result = await postgres.queryJsonBSpecificSellers(normalizedDomain, accountIds);
            if (result) {
              return result;
            }
          }
        } catch (error) {
          logger.error(`[SellersJsonCache] Error in PostgreSQL specific sellers query: ${error}`);
          // Fall back to normal processing on error
        }
      }

      // Parse the data manually but extract only what's needed
      const parsedContent = this.parseContent(cacheRecord.content);
      if (!parsedContent || !parsedContent.sellers || !Array.isArray(parsedContent.sellers)) {
        return null;
      }

      // Filter to only include matching seller IDs
      const accountIdSet = new Set(accountIds.map(id => id.toString().toLowerCase()));
      const matchingSellers = parsedContent.sellers.filter(seller => 
        seller.seller_id && accountIdSet.has(seller.seller_id.toString().toLowerCase())
      );

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
        },
        matchingSellers,
      };
    } catch (error) {
      logger.error(`[SellersJsonCache] Error getting specific sellers: ${error}`);
      return null;
    }
  }
}

export default new SellersJsonCacheModel();