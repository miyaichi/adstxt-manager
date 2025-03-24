import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import { logger } from '../utils/logger';

export interface SellersJsonCache {
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
    is_confidential?: number;
    comment?: string;
    [key: string]: any; // Allow other attributes according to spec
  }>;
  contact_email?: string;
  contact_address?: string;
  version?: string;
  identifiers?: Array<{
    name: string;
    value: string;
  }>;
  [key: string]: any; // Allow other top-level attributes according to spec
}

class SellersJsonCacheModel {
  /**
   * Get cached sellers.json by domain
   * @param domain - Domain to lookup
   * @returns Promise with the cached data or null if not found
   */
  getByDomain(domain: string): Promise<SellersJsonCache | null> {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM sellers_json_cache WHERE domain = ?',
        [domain],
        (err, row: SellersJsonCache) => {
          if (err) {
            logger.error(`Error fetching sellers.json cache for domain ${domain}:`, err);
            reject(err);
            return;
          }
          resolve(row || null);
        }
      );
    });
  }

  /**
   * Check if cache is expired (older than 1 day)
   * @param updatedAt - ISO timestamp of last update
   * @returns boolean indicating if cache is expired
   */
  isCacheExpired(updatedAt: string): boolean {
    const lastUpdate = new Date(updatedAt).getTime();
    const now = new Date().getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    return now - lastUpdate > oneDayMs;
  }

  /**
   * Save or update sellers.json cache
   * @param data - The sellers.json cache data
   * @returns Promise with the created/updated record
   */
  saveCache(
    data: Omit<SellersJsonCache, 'id' | 'created_at' | 'updated_at'>
  ): Promise<SellersJsonCache> {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();

      // Check if entry already exists for this domain
      db.get(
        'SELECT * FROM sellers_json_cache WHERE domain = ?',
        [data.domain],
        (err, existingRow: SellersJsonCache | undefined) => {
          if (err) {
            logger.error(
              `Error checking existing sellers.json cache for domain ${data.domain}:`,
              err
            );
            reject(err);
            return;
          }

          if (existingRow) {
            // Update existing record
            db.run(
              `UPDATE sellers_json_cache 
               SET content = ?, status = ?, status_code = ?, error_message = ?, updated_at = ? 
               WHERE domain = ?`,
              [data.content, data.status, data.status_code, data.error_message, now, data.domain],
              function (err) {
                if (err) {
                  logger.error(`Error updating sellers.json cache for domain ${data.domain}:`, err);
                  reject(err);
                  return;
                }

                // Get updated record
                db.get(
                  'SELECT * FROM sellers_json_cache WHERE domain = ?',
                  [data.domain],
                  (err, row: SellersJsonCache) => {
                    if (err) {
                      logger.error(
                        `Error fetching updated sellers.json cache for domain ${data.domain}:`,
                        err
                      );
                      reject(err);
                      return;
                    }
                    resolve(row);
                  }
                );
              }
            );
          } else {
            // Insert new record
            const id = uuidv4();

            db.run(
              `INSERT INTO sellers_json_cache 
               (id, domain, content, status, status_code, error_message, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                id,
                data.domain,
                data.content,
                data.status,
                data.status_code,
                data.error_message,
                now,
                now,
              ],
              function (err) {
                if (err) {
                  logger.error(
                    `Error inserting sellers.json cache for domain ${data.domain}:`,
                    err
                  );
                  reject(err);
                  return;
                }

                const newRecord: SellersJsonCache = {
                  id,
                  domain: data.domain,
                  content: data.content,
                  status: data.status,
                  status_code: data.status_code,
                  error_message: data.error_message,
                  created_at: now,
                  updated_at: now,
                };

                resolve(newRecord);
              }
            );
          }
        }
      );
    });
  }
}

export default new SellersJsonCacheModel();
