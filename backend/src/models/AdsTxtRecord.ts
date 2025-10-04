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

  /**
   * Delete all records for a request
   * @param requestId - The request ID
   * @returns Promise with boolean indicating success
   */
  async deleteByRequestId(requestId: string): Promise<boolean> {
    try {
      const records = await this.getByRequestId(requestId);

      // Delete each record individually
      for (const record of records) {
        await db.delete(this.tableName, record.id);
      }

      return true;
    } catch (error) {
      console.error('Error deleting records by requestId:', error);
      return false;
    }
  }

  /**
   * Get validation statistics for a request
   * @param requestId - The request ID
   * @returns Promise with validation statistics
   */
  async getValidationStats(requestId: string): Promise<{
    total: number;
    valid: number;
    invalid: number;
    warnings: number;
  }> {
    try {
      const records = await this.getByRequestId(requestId);

      const stats = {
        total: records.length,
        valid: records.filter((record) => record.status === 'approved').length,
        invalid: records.filter((record) => record.status === 'rejected').length,
        warnings: 0,
      };

      // Pending records are counted as valid for UI purposes unless specifically rejected
      stats.valid += records.filter((record) => record.status === 'pending').length;

      // We need to dynamically compute warnings by validating records
      const {
        parseAdsTxtContent,
        crossCheckAdsTxtRecords,
      } = require('@adstxt-manager/ads-txt-validator');

      // Generate ads.txt content from records for validation
      const adsTxtContent = records
        .map((record) => {
          let line = `${record.domain}, ${record.account_id}, ${record.relationship}`;
          if (record.certification_authority_id) {
            line += `, ${record.certification_authority_id}`;
          }
          return line;
        })
        .join('\n');

      try {
        // Re-parse and validate the content to find warnings
        const parsedRecords = parseAdsTxtContent(adsTxtContent);

        // Use a dummy domain for cross-checking (we're mostly interested in warnings)
        const warningCheckRecords = await crossCheckAdsTxtRecords('example.com', parsedRecords);

        // Count records with warnings
        stats.warnings = warningCheckRecords.filter((record) => record.has_warning).length;
      } catch (validationError) {
        console.error('Error during validation:', validationError);
        // If validation fails, we'll just return 0 warnings
      }

      return stats;
    } catch (error) {
      console.error('Error getting validation stats:', error);
      return {
        total: 0,
        valid: 0,
        invalid: 0,
        warnings: 0,
      };
    }
  }

  /**
   * Get enhanced records with validation warnings for a request
   * @param requestId - The request ID
   * @returns Promise with records including warning information
   */
  async getEnhancedRecords(requestId: string): Promise<
    Array<
      AdsTxtRecord & {
        has_warning?: boolean;
        warning?: string;
        validation_key?: string;
        severity?: string;
        warning_params?: Record<string, any>;
      }
    >
  > {
    try {
      const records = await this.getByRequestId(requestId);

      if (records.length === 0) {
        return [];
      }

      // Import AdsTxtCache and Request models to get cached validation
      const AdsTxtCacheModel = require('./AdsTxtCache').default;
      const RequestModel = require('./Request').default;

      // Get the request to find the associated domain
      const request = await RequestModel.getById(requestId);
      if (!request || !request.domain) {
        // If no request or domain found, perform validation without cache
        return await this.performValidation(records, 'unknown');
      }

      // Try to get cached validation results
      const cachedAdsTxt = await AdsTxtCacheModel.getByDomain(request.domain);

      // Check if we have valid cached validation results
      if (
        cachedAdsTxt &&
        cachedAdsTxt.validated_records &&
        Array.isArray(cachedAdsTxt.validated_records) &&
        cachedAdsTxt.validated_records.length > 0 &&
        !AdsTxtCacheModel.isCacheExpired(cachedAdsTxt.updated_at)
      ) {
        console.log(`Using cached validation results for domain: ${request.domain}`);

        // Map cached validation results to our records
        const resultRecords = records.map((record) => {
          // Find matching validated record by domain, account_id, and relationship
          const validatedRecord = cachedAdsTxt.validated_records!.find(
            (vr: any) =>
              vr.domain === record.domain &&
              vr.account_id === record.account_id &&
              vr.relationship === record.relationship &&
              !vr.is_variable // Exclude variable entries
          );

          if (validatedRecord) {
            return {
              ...record,
              has_warning: validatedRecord.has_warning || false,
              warning: validatedRecord.warning || undefined,
              validation_key: validatedRecord.validation_key || undefined,
              severity: validatedRecord.severity || undefined,
              warning_params: validatedRecord.warning_params || undefined,
            };
          }

          return record;
        });

        return resultRecords;
      }

      // No cached validation or cache expired, perform validation
      console.log(`No cached validation found for domain: ${request.domain}, performing validation`);
      return await this.performValidation(records, request.domain);
    } catch (error) {
      console.error('Error getting enhanced records:', error);
      return [];
    }
  }

  private async performValidation(
    records: AdsTxtRecord[],
    domain: string
  ): Promise<
    Array<
      AdsTxtRecord & {
        has_warning?: boolean;
        warning?: string;
        validation_key?: string;
        severity?: string;
        warning_params?: Record<string, any>;
      }
    >
  > {
    // Import validation functions
    const {
      parseAdsTxtContent,
      crossCheckAdsTxtRecords,
    } = require('@adstxt-manager/ads-txt-validator');

    // Generate ads.txt content from records for validation
    const adsTxtContent = records
      .map((record) => {
        let line = `${record.domain}, ${record.account_id}, ${record.relationship}`;
        if (record.certification_authority_id) {
          line += `, ${record.certification_authority_id}`;
        }
        return line;
      })
      .join('\n');

    try {
      // Re-parse and validate the content to find warnings
      const parsedRecords = parseAdsTxtContent(adsTxtContent);
      // Use the domain for cross-checking to trigger validation warnings
      const validatedRecords = await crossCheckAdsTxtRecords(domain, parsedRecords);

      // Map warning information back to the original records
      const resultRecords = records.map((record, index) => {
        if (index < validatedRecords.length) {
          const validatedRecord = validatedRecords[index];

          // Create an enhanced record with warnings
          return {
            ...record,
            has_warning: validatedRecord.has_warning || false,
            warning: validatedRecord.warning || undefined,
            validation_key: validatedRecord.validation_key || undefined,
            severity: validatedRecord.severity || undefined,
            warning_params: validatedRecord.warning_params || undefined,
          };
        }
        return record;
      });
      return resultRecords;
    } catch (validationError) {
      console.error('Error during validation:', validationError);
      // If validation fails, just return the original records
      return records;
    }
  }
}

export default new AdsTxtRecordModel();
