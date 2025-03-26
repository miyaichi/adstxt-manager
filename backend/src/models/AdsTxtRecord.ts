import { v4 as uuidv4 } from 'uuid';
import db from '../config/database/index';
import { DatabaseRecord, IDatabaseAdapter } from '../config/database/index';

export interface AdsTxtRecord extends DatabaseRecord {
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

// Use the exported database instance, which implements IDatabaseAdapter
// No need for type assertion since it's already typed correctly

class AdsTxtRecordModel {
  private readonly tableName = 'ads_txt_records';

  /**
   * Create a new Ads.txt record
   * @param recordData - The data for the new record
   * @returns Promise with the created record
   */
  async create(recordData: CreateAdsTxtRecordDTO): Promise<AdsTxtRecord> {
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
      updated_at: now,
    };

    return await db.insert(this.tableName, record);
  }

  /**
   * Get an Ads.txt record by ID
   * @param id - The record ID
   * @returns Promise with the record or null if not found
   */
  async getById(id: string): Promise<AdsTxtRecord | null> {
    return await db.getById(this.tableName, id);
  }

  /**
   * Check if a record with the same attributes already exists
   * @param requestId - The request ID
   * @param domain - The domain
   * @param accountId - The account ID
   * @param accountType - The account type
   * @returns Promise with true if the record exists, false otherwise
   */
  async recordExists(
    requestId: string,
    domain: string,
    accountId: string,
    accountType: string
  ): Promise<boolean> {
    const records = await db.query(this.tableName, {
      where: {
        request_id: requestId,
        domain,
        account_id: accountId,
        account_type: accountType,
      },
    });

    return records.length > 0;
  }

  /**
   * Get all records for a request
   * @param requestId - The request ID
   * @returns Promise with an array of records
   */
  async getByRequestId(requestId: string): Promise<AdsTxtRecord[]> {
    return await db.query(this.tableName, {
      where: { request_id: requestId },
    });
  }

  /**
   * Create multiple Ads.txt records in bulk
   * @param recordsData - Array of record data to create
   * @returns Promise with the created records
   */
  async bulkCreate(recordsData: CreateAdsTxtRecordDTO[]): Promise<AdsTxtRecord[]> {
    const createdRecords: AdsTxtRecord[] = [];

    for (const recordData of recordsData) {
      // Skip existing records
      const exists = await this.recordExists(
        recordData.request_id,
        recordData.domain,
        recordData.account_id,
        recordData.account_type
      );

      if (!exists) {
        const record = await this.create(recordData);
        createdRecords.push(record);
      }
    }

    return createdRecords;
  }

  /**
   * Update the status of an Ads.txt record
   * @param id - The record ID
   * @param status - The new status
   * @returns Promise with the updated record
   */
  async updateStatus(
    id: string,
    status: 'pending' | 'approved' | 'rejected'
  ): Promise<AdsTxtRecord | null> {
    const now = new Date().toISOString();

    return (await db.update(this.tableName, id, {
      status,
      updated_at: now,
    })) as AdsTxtRecord | null;
  }

  /**
   * Get all records with a specific domain
   * @param domain - The domain to search for
   * @returns Promise with an array of records
   */
  async getByDomain(domain: string): Promise<AdsTxtRecord[]> {
    return await db.query(this.tableName, {
      where: { domain },
    });
  }

  /**
   * Change the domain for a record
   * @param id - The record ID
   * @param domain - The new domain
   * @returns Promise with the updated record
   */
  async updateDomain(id: string, domain: string): Promise<AdsTxtRecord | null> {
    const now = new Date().toISOString();

    return (await db.update(this.tableName, id, {
      domain,
      updated_at: now,
    })) as AdsTxtRecord | null;
  }
}

export default new AdsTxtRecordModel();
