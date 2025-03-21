import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import app from '../../app';
import db from '../../config/database';
import emailService from '../../services/emailService';
import tokenService from '../../services/tokenService';

// Mock the email service
jest.mock('../../services/emailService', () => ({
  sendPublisherRequestNotification: jest.fn().mockResolvedValue(true),
  sendRequesterConfirmation: jest.fn().mockResolvedValue(true),
  sendStatusUpdateNotification: jest.fn().mockResolvedValue(true),
  sendMessageNotification: jest.fn().mockResolvedValue(true)
}));

describe('Message Controller', () => {
  // Sample request data for testing
  const requestId = uuidv4();
  const publisherEmail = 'publisher@test.com';
  const requesterEmail = 'requester@test.com';
  const requesterName = 'Test Requester';
  let token: string;
  
  // Set up test data before tests
  beforeAll(async () => {
    // Generate token
    token = tokenService.generateToken(requestId, publisherEmail);
    
    // Create a test request to use for message tests
    await new Promise<void>((resolve, reject) => {
      const now = new Date().toISOString();
      db.run(
        `INSERT INTO requests 
         (id, publisher_email, requester_email, requester_name, status, token, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [requestId, publisherEmail, requesterEmail, requesterName, 'pending', token, now, now],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  });
  
  // Clean up after tests
  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      db.run('DELETE FROM messages', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    await new Promise<void>((resolve, reject) => {
      db.run('DELETE FROM requests', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
  
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  // Test creating a message
  it('should create a new message', async () => {
    // Arrange
    const messageData = {
      request_id: requestId,
      sender_email: requesterEmail,
      content: 'This is a test message from API',
      token
    };
    
    // Act
    const response = await request(app)
      .post('/api/messages')
      .send(messageData);
    
    // Assert
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.request_id).toBe(requestId);
    expect(response.body.data.sender_email).toBe(requesterEmail);
    expect(response.body.data.content).toBe(messageData.content);
    
    // Check if email notification was called
    expect(emailService.sendMessageNotification).toHaveBeenCalledWith(
      publisherEmail,
      requestId,
      expect.any(String),
      token
    );
  });
  
  // Test validations for creating a message
  it('should return 400 for missing required fields', async () => {
    // Act
    const response = await request(app)
      .post('/api/messages')
      .send({
        // Missing fields
      });
    
    // Assert
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });
  
  // Test invalid token
  it('should return 404 for invalid token', async () => {
    // Arrange
    const messageData = {
      request_id: requestId,
      sender_email: requesterEmail,
      content: 'This is a test message',
      token: 'invalid-token'
    };
    
    // Act
    const response = await request(app)
      .post('/api/messages')
      .send(messageData);
    
    // Assert
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });
  
  // Test getting messages for a request
  it('should get messages for a request', async () => {
    // Arrange - create a test message
    await request(app)
      .post('/api/messages')
      .send({
        request_id: requestId,
        sender_email: requesterEmail,
        content: 'Message for get test',
        token
      });
    
    // Act
    const response = await request(app)
      .get(`/api/messages/${requestId}`)
      .query({ token });
    
    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    expect(response.body.data[0].request_id).toBe(requestId);
  });
  
  // Test getting messages with invalid token
  it('should return 404 when getting messages with invalid token', async () => {
    // Act
    const response = await request(app)
      .get(`/api/messages/${requestId}`)
      .query({ token: 'invalid-token' });
    
    // Assert
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});