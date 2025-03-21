import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';

export interface AdsTxtRecord {
  id: string;
  request_id: string;
  domain: string;
  account_id: string;
  account_type: string;
  certification_authority_id?: string;
  relationship: 'DIRECT' | 'RESELLER';
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface CreateAdsTxtRecordDTO {
  request_id: string;
  domain: string;
  account_id: string;
  account_type: string;
  certification_authority_id?: string;
  relationship?: 'DIRECT' | 'RESELLER';
}

class AdsTxtRecordModel {
  /**
   * Create a new Ads.txt record
   * @param recordData - The data for the new record
   * @returns Promise with the created record
   */
  create(recordData: CreateAdsTxtRecordDTO): Promise<AdsTxtRecord> {
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      const now = new Date().toISOString();
      
      const record: AdsTxtRecord = {
        id,
        request_id: recordData.request_id,
        domain: recordData.domain,
        account_id: recordData.account_id,
        account_type: recordData.account_type,
        certification_authority_id: recordData.certification_authority_id,
        relationship: recordData.relationship || 'DIRECT',
        status: 'pending',
        created_at: now,
        updated_at: now
      };

      db.run(
        `INSERT INTO ads_txt_records 
         (id, request_id, domain, account_id, account_type, certification_authority_id, 
          relationship, status, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.id,
          record.request_id,
          record.domain,
          record.account_id,
          record.account_type,
          record.certification_authority_id || null,
          record.relationship,
          record.status,
          record.created_at,
          record.updated_at
        ],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(record);
        }
      );
    });
  }

  /**
   * Bulk create multiple Ads.txt records
   * @param records - Array of record data to create
   * @returns Promise with the created records
   */
  bulkCreate(records: CreateAdsTxtRecordDTO[]): Promise<AdsTxtRecord[]> {
    return new Promise((resolve, reject) => {
      const createdRecords: AdsTxtRecord[] = [];
      
      // Use a transaction for bulk insert
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        const stmt = db.prepare(
          `INSERT INTO ads_txt_records 
           (id, request_id, domain, account_id, account_type, certification_authority_id, 
            relationship, status, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        
        try {
          records.forEach(recordData => {
            const id = uuidv4();
            const now = new Date().toISOString();
            
            const record: AdsTxtRecord = {
              id,
              request_id: recordData.request_id,
              domain: recordData.domain,
              account_id: recordData.account_id,
              account_type: recordData.account_type,
              certification_authority_id: recordData.certification_authority_id,
              relationship: recordData.relationship || 'DIRECT',
              status: 'pending',
              created_at: now,
              updated_at: now
            };
            
            stmt.run(
              record.id,
              record.request_id,
              record.domain,
              record.account_id,
              record.account_type,
              record.certification_authority_id || null,
              record.relationship,
              record.status,
              record.created_at,
              record.updated_at
            );
            
            createdRecords.push(record);
          });
          
          stmt.finalize();
          db.run('COMMIT', (err) => {
            if (err) {
              reject(err);
              return;
            }
            resolve(createdRecords);
          });
        } catch (err) {
          db.run('ROLLBACK');
          stmt.finalize();
          reject(err);
        }
      });
    });
  }

  /**
   * Get all records for a request
   * @param requestId - The request ID
   * @returns Promise with an array of records
   */
  getByRequestId(requestId: string): Promise<AdsTxtRecord[]> {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM ads_txt_records WHERE request_id = ?',
        [requestId],
        (err, rows: AdsTxtRecord[]) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(rows || []);
        }
      );
    });
  }

  /**
   * Update the status of a record
   * @param id - The record ID
   * @param status - The new status
   * @returns Promise with the updated record
   */
  updateStatus(id: string, status: 'pending' | 'approved' | 'rejected'): Promise<AdsTxtRecord | null> {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      
      db.run(
        'UPDATE ads_txt_records SET status = ?, updated_at = ? WHERE id = ?',
        [status, now, id],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          
          if (this.changes === 0) {
            resolve(null);
            return;
          }
          
          db.get(
            'SELECT * FROM ads_txt_records WHERE id = ?',
            [id],
            (err, row: AdsTxtRecord) => {
              if (err) {
                reject(err);
                return;
              }
              if (!row) {
                resolve(null);
                return;
              }
              resolve(row);
            }
          );
        }
      );
    });
  }

  /**
   * Check if a record already exists (to prevent duplicates)
   * @param domain - The domain
   * @param accountId - The account ID
   * @param accountType - The account type
   * @returns Promise with boolean indicating if record exists
   */
  recordExists(domain: string, accountId: string, accountType: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT 1 FROM ads_txt_records WHERE domain = ? AND account_id = ? AND account_type = ?',
        [domain, accountId, accountType],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(!!row);
        }
      );
    });
  }
  /**
   * Get a record by ID
   * @param id - The record ID
   * @returns Promise with the record or null if not found
   */
  getById(id: string): Promise<AdsTxtRecord | null> {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM ads_txt_records WHERE id = ?',
        [id],
        (err, row: AdsTxtRecord) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(row || null);
        }
      );
    });
  }
}

export default new AdsTxtRecordModel();