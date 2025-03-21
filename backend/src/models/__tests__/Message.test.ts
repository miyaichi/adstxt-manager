import { v4 as uuidv4 } from 'uuid';
import db from '../../config/database';
import MessageModel, { CreateMessageDTO } from '../../models/Message';

describe('Message Model', () => {
  // Sample request data for testing
  const requestId = uuidv4();
  const token = 'test-token';
  
  // Set up test data before tests
  beforeAll(async () => {
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
  
  // Test creating a message
  it('should create a new message', async () => {
    // Arrange
    const messageData: CreateMessageDTO = {
      request_id: requestId,
      sender_email: 'requester@test.com',
      content: 'This is a test message'
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
  
  // Test retrieving messages by request ID
  it('should get messages by request ID', async () => {
    // Arrange - create additional test message
    const messageData: CreateMessageDTO = {
      request_id: requestId,
      sender_email: 'publisher@test.com',
      content: 'This is a reply message'
    };
    await MessageModel.create(messageData);
    
    // Act
    const messages = await MessageModel.getByRequestId(requestId);
    
    // Assert
    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThanOrEqual(2);
    expect(messages[0].request_id).toBe(requestId);
    expect(messages[1].request_id).toBe(requestId);
  });
  
  // Test retrieving a message by ID
  it('should get a message by ID', async () => {
    // Arrange - create a message and get its ID
    const messageData: CreateMessageDTO = {
      request_id: requestId,
      sender_email: 'requester@test.com',
      content: 'Message to retrieve by ID'
    };
    const createdMessage = await MessageModel.create(messageData);
    
    // Act
    const message = await MessageModel.getById(createdMessage.id);
    
    // Assert
    expect(message).toBeDefined();
    expect(message?.id).toBe(createdMessage.id);
    expect(message?.content).toBe(messageData.content);
  });
  
  // Test retrieving a non-existent message
  it('should return null for non-existent message ID', async () => {
    // Act
    const message = await MessageModel.getById('non-existent-id');
    
    // Assert
    expect(message).toBeNull();
  });
});