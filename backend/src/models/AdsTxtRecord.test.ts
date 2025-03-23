import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import AdsTxtRecordModel, { CreateAdsTxtRecordDTO, AdsTxtRecord } from './AdsTxtRecord';

// Standalone test file for AdsTxtRecord model
describe('AdsTxtRecord Model Tests', () => {
  // Sample data
  const requestId = uuidv4();
  const token = 'test-token-for-adstxt-test';
  let recordId: string;

  // Set up test data before this test suite
  beforeAll(async () => {
    // Insert a test request to use for ads.txt records
    const now = new Date().toISOString();
    await new Promise<void>((resolve, reject) => {
      db.run(
        `INSERT INTO requests 
         (id, publisher_email, requester_email, requester_name, status, token, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          requestId,
          'publisher@test.com',
          'requester@test.com',
          'Test Requester',
          'pending',
          token,
          now,
          now,
        ],
        (err) => {
          if (err) {
            console.error('Error creating test request:', err);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  });

  // Test creating a record
  it('should create a new Ads.txt record', async () => {
    // Arrange
    const recordData: CreateAdsTxtRecordDTO = {
      request_id: requestId,
      domain: 'example.com',
      account_id: 'pub-1234567890',
      account_type: 'DIRECT',
      relationship: 'DIRECT',
    };

    // Act
    const record = await AdsTxtRecordModel.create(recordData);
    recordId = record.id; // Save for other tests

    // Assert
    expect(record).toBeDefined();
    expect(record.id).toBeDefined();
    expect(record.domain).toBe(recordData.domain);
    expect(record.account_id).toBe(recordData.account_id);
    expect(record.account_type).toBe(recordData.account_type);
    expect(record.relationship).toBe(recordData.relationship);
    expect(record.status).toBe('pending');
    expect(record.created_at).toBeDefined();
    expect(record.updated_at).toBeDefined();

    // Verify record was actually saved in the database
    const savedRecord = await new Promise<AdsTxtRecord | undefined>((resolve, reject) => {
      db.get(
        'SELECT * FROM ads_txt_records WHERE id = ?',
        [record.id],
        (err, row: AdsTxtRecord) => {
          if (err) reject(err);
          resolve(row);
        }
      );
    });

    expect(savedRecord).toBeDefined();
    expect(savedRecord?.domain).toBe('example.com');
  });

  // Test retrieving a record by ID
  it('should get a record by ID', async () => {
    // Make sure we have a record ID from the previous test
    expect(recordId).toBeDefined();

    // Act
    const record = await AdsTxtRecordModel.getById(recordId);

    // Assert
    expect(record).toBeDefined();
    expect(record?.id).toBe(recordId);
    expect(record?.domain).toBe('example.com');
  });

  // Test getting records by request ID
  it('should get records by request ID', async () => {
    // Act
    const records = await AdsTxtRecordModel.getByRequestId(requestId);

    // Assert
    expect(Array.isArray(records)).toBe(true);
    expect(records.length).toBeGreaterThanOrEqual(1);

    // Make sure at least one record has the correct request_id
    const hasMatchingRecord = records.some((r) => r.request_id === requestId);
    expect(hasMatchingRecord).toBe(true);
  });

  // Test updating status
  it('should update record status', async () => {
    // Act
    const updatedRecord = await AdsTxtRecordModel.updateStatus(recordId, 'approved');

    // Assert
    expect(updatedRecord).toBeDefined();
    expect(updatedRecord?.id).toBe(recordId);
    expect(updatedRecord?.status).toBe('approved');

    // Check that updated_at was changed
    if (updatedRecord) {
      const createdDate = new Date(updatedRecord.created_at).getTime();
      const updatedDate = new Date(updatedRecord.updated_at).getTime();
      expect(updatedDate).toBeGreaterThanOrEqual(createdDate);
    }
  });

  // Test checking if a record exists
  it('should check if a record exists', async () => {
    // Act
    const exists = await AdsTxtRecordModel.recordExists('example.com', 'pub-1234567890', 'DIRECT');
    const notExists = await AdsTxtRecordModel.recordExists(
      'nonexistent.com',
      'pub-0000000',
      'DIRECT'
    );

    // Assert
    expect(exists).toBe(true);
    expect(notExists).toBe(false);
  });

  // Test bulk creating records
  it('should bulk create multiple records', async () => {
    // Arrange
    const records: CreateAdsTxtRecordDTO[] = [
      {
        request_id: requestId,
        domain: 'bulktest1.com',
        account_id: 'pub-111',
        account_type: 'adsense',
        relationship: 'DIRECT',
      },
      {
        request_id: requestId,
        domain: 'bulktest2.com',
        account_id: 'pub-222',
        account_type: 'adexchange',
        relationship: 'RESELLER',
        certification_authority_id: 'abc123',
      },
    ];

    // Act
    const createdRecords = await AdsTxtRecordModel.bulkCreate(records);

    // Assert
    expect(createdRecords).toBeDefined();
    expect(createdRecords.length).toBe(2);
    expect(createdRecords[0].domain).toBe('bulktest1.com');
    expect(createdRecords[1].domain).toBe('bulktest2.com');
    expect(createdRecords[1].certification_authority_id).toBe('abc123');

    // Verify the records were saved in the database
    const savedRecords = await new Promise<AdsTxtRecord[]>((resolve, reject) => {
      db.all(
        'SELECT * FROM ads_txt_records WHERE domain LIKE "bulktest%"',
        (err, rows: AdsTxtRecord[]) => {
          if (err) reject(err);
          resolve(rows || []);
        }
      );
    });

    expect(savedRecords.length).toBe(2);
  });
});
