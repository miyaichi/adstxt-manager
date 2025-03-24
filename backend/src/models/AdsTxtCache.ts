import db from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export type AdsTxtCacheStatus = 'success' | 'error' | 'not_found' | 'invalid_format';

export interface AdsTxtCache {
  id: string;
  domain: string;
  content: string | null;
  url: string | null;
  status: AdsTxtCacheStatus;
  status_code: number | null;
  error_message: string | null;
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
}

class AdsTxtCacheModel {
  /**
   * Get an ads.txt cache entry by domain
   * @param domain The domain to retrieve
   * @returns The cache entry or null if not found
   */
  getByDomain(domain: string): Promise<AdsTxtCache | null> {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM ads_txt_cache WHERE domain = ? ORDER BY updated_at DESC LIMIT 1`;
      
      db.get(query, [domain], (err, row: AdsTxtCache | undefined) => {
        if (err) {
          logger.error('Error fetching ads.txt cache:', err);
          reject(err);
          return;
        }
        
        resolve(row || null);
      });
    });
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
  saveCache(data: AdsTxtCacheDTO): Promise<AdsTxtCache> {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      
      // Check if there is an existing entry for this domain
      this.getByDomain(data.domain)
        .then((existingCache) => {
          if (existingCache) {
            // Update existing entry
            const query = `
              UPDATE ads_txt_cache
              SET content = ?, url = ?, status = ?, status_code = ?, error_message = ?, updated_at = ?
              WHERE id = ?
            `;
            
            db.run(
              query,
              [
                data.content,
                data.url,
                data.status,
                data.status_code,
                data.error_message,
                now,
                existingCache.id
              ],
              (err) => {
                if (err) {
                  logger.error('Error updating ads.txt cache:', err);
                  reject(err);
                  return;
                }
                
                // Return the updated entry
                const updatedEntry: AdsTxtCache = {
                  ...existingCache,
                  content: data.content,
                  url: data.url,
                  status: data.status,
                  status_code: data.status_code,
                  error_message: data.error_message,
                  updated_at: now
                };
                
                resolve(updatedEntry);
              }
            );
          } else {
            // Create a new entry
            const id = uuidv4();
            const query = `
              INSERT INTO ads_txt_cache (id, domain, content, url, status, status_code, error_message, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            db.run(
              query,
              [id, data.domain, data.content, data.url, data.status, data.status_code, data.error_message, now, now],
              (err) => {
                if (err) {
                  logger.error('Error creating ads.txt cache:', err);
                  reject(err);
                  return;
                }
                
                // Return the new entry
                const newEntry: AdsTxtCache = {
                  id,
                  domain: data.domain,
                  content: data.content,
                  url: data.url,
                  status: data.status,
                  status_code: data.status_code,
                  error_message: data.error_message,
                  created_at: now,
                  updated_at: now
                };
                
                resolve(newEntry);
              }
            );
          }
        })
        .catch(reject);
    });
  }
}

export default new AdsTxtCacheModel();