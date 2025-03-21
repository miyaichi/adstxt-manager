import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import runMigrations from '../db/migrations/run';
import MessageModel, { CreateMessageDTO } from './Message';

// Standalone test file for Message model
describe('Message Model Tests', () => {
  // Sample request data for testing
  const requestId = uuidv4();
  const token = 'test-token-for-standalone-test';
  
  // Set up database before all tests
  beforeAll(async () => {
    // Run migrations to set up database schema
    await runMigrations();
    
    // Create a test request to use for message tests
    await new Promise<void>((resolve, reject) => {
      const now = new Date().toISOString();
      db.run(
        `INSERT INTO requests 
         (id, publisher_email, requester_email, requester_name, status, token, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [requestId, 'publisher@test.com', 'requester@test.com', 'Test Requester', 'pending', token, now, now],
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
  
  // Test message creation
  it('should create a new message', async () => {
    // Arrange
    const messageData: CreateMessageDTO = {
      request_id: requestId,
      sender_email: 'requester@test.com',
      content: 'This is a standalone test message'
    };
    
    // Act
    const message = await MessageModel.create(messageData);
    
    // Assert
    expect(message).toBeDefined();
    expect(message.id).toBeDefined();
    expect(message.request_id).toBe(requestId);
    expect(message.sender_email).toBe(messageData.sender_email);
    expect(message.content).toBe(messageData.content);
    expect(message.created_at).toBeDefined();
  });
  
  // Test retrieving messages
  it('should get messages by request ID', async () => {
    // Act
    const messages = await MessageModel.getByRequestId(requestId);
    
    // Assert
    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThanOrEqual(1);
    expect(messages[0].request_id).toBe(requestId);
  });
});