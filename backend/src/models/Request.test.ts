import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import runMigrations from '../db/migrations/run';
import RequestModel, { CreateRequestDTO, Request } from './Request';
import tokenService from '../services/tokenService';

// Standalone test file for Request model
describe('Request Model Tests', () => {
  // Sample data
  let requestId: string;
  let token: string;

  // Set up database before all tests
  beforeAll(async () => {
    // Run migrations to set up database schema
    await runMigrations();
  });

  // Clean up after tests
  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      db.run('DELETE FROM requests', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  // Test creating a request
  it('should create a new request', async () => {
    // Arrange
    const requestData: CreateRequestDTO = {
      publisher_email: 'publisher@test.com',
      requester_email: 'requester@test.com',
      requester_name: 'Test Requester',
      publisher_name: 'Test Publisher',
      publisher_domain: 'example.com',
    };

    // Act
    const request = await RequestModel.create(requestData);
    requestId = request.id; // Save for other tests
    token = request.token;

    // Assert
    expect(request).toBeDefined();
    expect(request.id).toBeDefined();
    expect(request.publisher_email).toBe(requestData.publisher_email);
    expect(request.requester_email).toBe(requestData.requester_email);
    expect(request.requester_name).toBe(requestData.requester_name);
    expect(request.publisher_name).toBe(requestData.publisher_name);
    expect(request.publisher_domain).toBe(requestData.publisher_domain);
    expect(request.status).toBe('pending');
    expect(request.token).toBeDefined();
    expect(request.created_at).toBeDefined();
    expect(request.updated_at).toBeDefined();
  });

  // Test retrieving a request by ID
  it('should get a request by ID', async () => {
    // Act
    const request = await RequestModel.getById(requestId);

    // Assert
    expect(request).toBeDefined();
    expect(request?.id).toBe(requestId);
    expect(request?.publisher_email).toBe('publisher@test.com');
  });

  // Test retrieving a request by ID with token
  it('should get a request by ID with token', async () => {
    // Act
    const request = await RequestModel.getByIdWithToken(requestId, token);

    // Assert
    expect(request).toBeDefined();
    expect(request?.id).toBe(requestId);

    // Invalid token should return null
    const nullRequest = await RequestModel.getByIdWithToken(requestId, 'invalid-token');
    expect(nullRequest).toBeNull();
  });

  // Test updating status
  it('should update request status', async () => {
    // Act
    const updatedRequest = await RequestModel.updateStatus(requestId, 'approved');

    // Assert
    expect(updatedRequest).toBeDefined();
    expect(updatedRequest?.id).toBe(requestId);
    expect(updatedRequest?.status).toBe('approved');
    expect(updatedRequest?.updated_at).not.toBe(updatedRequest?.created_at);
  });

  // Test updating publisher info
  it('should update publisher info', async () => {
    // Act
    const updatedRequest = await RequestModel.updatePublisherInfo(
      requestId,
      'Updated Publisher',
      'updated-example.com'
    );

    // Assert
    expect(updatedRequest).toBeDefined();
    expect(updatedRequest?.id).toBe(requestId);
    expect(updatedRequest?.publisher_name).toBe('Updated Publisher');
    expect(updatedRequest?.publisher_domain).toBe('updated-example.com');
  });

  // Test getting requests by publisher email
  it('should get requests by publisher email', async () => {
    // Act
    const requests = await RequestModel.getByPublisherEmail('publisher@test.com');

    // Assert
    expect(Array.isArray(requests)).toBe(true);
    expect(requests.length).toBeGreaterThanOrEqual(1);
    expect(requests[0].publisher_email).toBe('publisher@test.com');
  });

  // Test getting requests by requester email
  it('should get requests by requester email', async () => {
    // Act
    const requests = await RequestModel.getByRequesterEmail('requester@test.com');

    // Assert
    expect(Array.isArray(requests)).toBe(true);
    expect(requests.length).toBeGreaterThanOrEqual(1);
    expect(requests[0].requester_email).toBe('requester@test.com');
  });
});
