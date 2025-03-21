import { v4 as uuidv4 } from 'uuid';
import db from '../../config/database';
import MessageModel, { CreateMessageDTO, Message } from '../Message';

// Mock the database
jest.mock('../../config/database', () => ({
  run: jest.fn(),
  all: jest.fn(),
  get: jest.fn()
}));

describe('Message Model', () => {
  let mockMessage: Message;
  let mockCreateMessageDTO: CreateMessageDTO;
  const requestId = 'request-123';
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup test data
    mockCreateMessageDTO = {
      request_id: requestId,
      sender_email: 'sender@example.com',
      content: 'Test message content'
    };
    
    mockMessage = {
      id: 'message-123',
      request_id: requestId,
      sender_email: 'sender@example.com',
      content: 'Test message content',
      created_at: new Date().toISOString()
    };
    
    // Mock the db.run to call the callback with no error
    (db.run as jest.Mock).mockImplementation((query, params, callback) => {
      callback(null);
      return db;
    });
    
    // Mock the db.all to return an array of messages
    (db.all as jest.Mock).mockImplementation((query, params, callback) => {
      callback(null, [
        mockMessage,
        { ...mockMessage, id: 'message-456', content: 'Second test message' }
      ]);
      return db;
    });
    
    // Mock the db.get to return a single message or null
    (db.get as jest.Mock).mockImplementation((query, params, callback) => {
      if (params[0] === 'message-123') {
        callback(null, mockMessage);
      } else {
        callback(null, null);
      }
      return db;
    });
  });
  
  it('should create a new message', async () => {
    // Arrange
    jest.spyOn(global, 'Date').mockImplementation(() => {
      return {
        toISOString: () => '2023-01-01T00:00:00.000Z'
      } as unknown as Date;
    });
    
    // Act
    const result = await MessageModel.create(mockCreateMessageDTO);
    
    // Assert
    expect(db.run).toHaveBeenCalled();
    expect(result).toHaveProperty('id');
    expect(result.request_id).toBe(requestId);
    expect(result.sender_email).toBe(mockCreateMessageDTO.sender_email);
    expect(result.content).toBe(mockCreateMessageDTO.content);
    expect(result.created_at).toBe('2023-01-01T00:00:00.000Z');
  });
  
  it('should get messages by request ID', async () => {
    // Act
    const result = await MessageModel.getByRequestId(requestId);
    
    // Assert
    expect(db.all).toHaveBeenCalledWith(
      expect.stringContaining('WHERE request_id = ?'),
      [requestId],
      expect.any(Function)
    );
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result[0].request_id).toBe(requestId);
    expect(result[1].request_id).toBe(requestId);
  });
  
  it('should get a message by ID', async () => {
    // Act
    const result = await MessageModel.getById('message-123');
    
    // Assert
    expect(db.get).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = ?'),
      ['message-123'],
      expect.any(Function)
    );
    expect(result).not.toBeNull();
    expect(result?.id).toBe('message-123');
    expect(result?.content).toBe(mockMessage.content);
  });
  
  it('should return null for non-existent message ID', async () => {
    // Act
    const result = await MessageModel.getById('non-existent-id');
    
    // Assert
    expect(db.get).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = ?'),
      ['non-existent-id'],
      expect.any(Function)
    );
    expect(result).toBeNull();
  });
  
  it('should handle database errors when creating a message', async () => {
    // Arrange
    (db.run as jest.Mock).mockImplementationOnce((query, params, callback) => {
      callback(new Error('Database error'));
      return db;
    });
    
    // Act & Assert
    await expect(MessageModel.create(mockCreateMessageDTO)).rejects.toThrow('Database error');
  });
  
  it('should handle database errors when getting messages by request ID', async () => {
    // Arrange
    (db.all as jest.Mock).mockImplementationOnce((query, params, callback) => {
      callback(new Error('Database error'));
      return db;
    });
    
    // Act & Assert
    await expect(MessageModel.getByRequestId(requestId)).rejects.toThrow('Database error');
  });
  
  it('should handle database errors when getting a message by ID', async () => {
    // Arrange
    (db.get as jest.Mock).mockImplementationOnce((query, params, callback) => {
      callback(new Error('Database error'));
      return db;
    });
    
    // Act & Assert
    await expect(MessageModel.getById('message-123')).rejects.toThrow('Database error');
  });
});