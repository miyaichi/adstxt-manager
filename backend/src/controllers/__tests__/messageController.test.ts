import { Request, Response, NextFunction } from 'express';
import * as messageController from '../messageController';
import MessageModel from '../../models/Message';
import RequestModel from '../../models/Request';
import emailService from '../../services/emailService';
import { isValidEmail } from '../../utils/validation';
import { ApiError } from '../../middleware/errorHandler';

// Mock the models and services
jest.mock('../../models/Message');
jest.mock('../../models/Request');
jest.mock('../../services/emailService');
jest.mock('../../utils/validation');

// Mock the asyncHandler middleware
jest.mock('../../middleware/errorHandler', () => {
  const originalModule = jest.requireActual('../../middleware/errorHandler');
  return {
    ...originalModule,
    // Adding types to fix TypeScript errors
    asyncHandler: (fn: Function) => 
      (req: Request, res: Response, next: NextFunction) => 
        Promise.resolve(fn(req, res, next)).catch(next)
  };
});

describe('Message Controller Tests', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let mockRequest: any;
  let mockMessage: any;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mocks
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn()
    };
    next = jest.fn();
    
    // Mock the isValidEmail function to return true by default
    (isValidEmail as jest.Mock).mockReturnValue(true);
    
    // Setup test data
    mockRequest = {
      id: 'request-123',
      publisher_email: 'publisher@example.com',
      publisher_name: 'Test Publisher',
      requester_email: 'requester@example.com',
      requester_name: 'Test Requester',
      status: 'pending',
      token: 'valid-token-123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    mockMessage = {
      id: 'message-123',
      request_id: 'request-123',
      sender_email: 'requester@example.com',
      content: 'This is a test message',
      created_at: new Date().toISOString()
    };
  });
  
  describe('createMessage', () => {
    it('should create a new message when valid data is provided', async () => {
      // Arrange
      req.body = {
        request_id: 'request-123',
        sender_email: 'requester@example.com',
        content: 'This is a test message',
        token: 'valid-token-123'
      };
      
      (RequestModel.getByIdWithToken as jest.Mock).mockResolvedValue(mockRequest);
      (MessageModel.create as jest.Mock).mockResolvedValue(mockMessage);
      (emailService.sendMessageNotification as jest.Mock).mockResolvedValue(true);
      
      // Act
      const handler = messageController.createMessage;
      await handler(req as Request, res as Response, next);
      
      // Assert
      expect(RequestModel.getByIdWithToken).toHaveBeenCalledWith('request-123', 'valid-token-123');
      expect(MessageModel.create).toHaveBeenCalledWith({
        request_id: 'request-123',
        sender_email: 'requester@example.com',
        content: 'This is a test message'
      });
      expect(emailService.sendMessageNotification).toHaveBeenCalledWith(
        'publisher@example.com', // The recipient should be the publisher
        'request-123',
        'Test Requester', // The sender name
        'valid-token-123'
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockMessage
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should send notification to requester when publisher is the sender', async () => {
      // Arrange
      req.body = {
        request_id: 'request-123',
        sender_email: 'publisher@example.com', // Publisher is the sender
        content: 'Reply from publisher',
        token: 'valid-token-123'
      };
      
      (RequestModel.getByIdWithToken as jest.Mock).mockResolvedValue(mockRequest);
      (MessageModel.create as jest.Mock).mockResolvedValue({
        ...mockMessage,
        sender_email: 'publisher@example.com',
        content: 'Reply from publisher'
      });
      
      // Act
      const handler = messageController.createMessage;
      await handler(req as Request, res as Response, next);
      
      // Assert
      expect(emailService.sendMessageNotification).toHaveBeenCalledWith(
        'requester@example.com', // The recipient should be the requester
        'request-123',
        'Test Publisher', // The sender name
        'valid-token-123'
      );
    });
    
    it('should return 400 when required fields are missing', async () => {
      // Arrange - missing content
      req.body = {
        request_id: 'request-123',
        sender_email: 'requester@example.com',
        token: 'valid-token-123'
        // content is missing
      };
      
      // Act
      const handler = messageController.createMessage;
      await handler(req as Request, res as Response, next);
      
      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('Request ID, sender email, content, and token are required')
        })
      );
    });
    
    it('should return 400 when sender email is invalid', async () => {
      // Arrange
      req.body = {
        request_id: 'request-123',
        sender_email: 'invalid-email',
        content: 'This is a test message',
        token: 'valid-token-123'
      };
      
      (isValidEmail as jest.Mock).mockReturnValue(false);
      
      // Act
      const handler = messageController.createMessage;
      await handler(req as Request, res as Response, next);
      
      // Assert
      expect(isValidEmail).toHaveBeenCalledWith('invalid-email');
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('Invalid sender email address')
        })
      );
    });
    
    it('should return 404 when request is not found or token is invalid', async () => {
      // Arrange
      req.body = {
        request_id: 'request-123',
        sender_email: 'requester@example.com',
        content: 'This is a test message',
        token: 'invalid-token'
      };
      
      (RequestModel.getByIdWithToken as jest.Mock).mockResolvedValue(null);
      
      // Act
      const handler = messageController.createMessage;
      await handler(req as Request, res as Response, next);
      
      // Assert
      expect(RequestModel.getByIdWithToken).toHaveBeenCalledWith('request-123', 'invalid-token');
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: expect.stringContaining('Request not found or invalid token')
        })
      );
    });
    
    it('should still create message even if email notification fails', async () => {
      // Arrange
      req.body = {
        request_id: 'request-123',
        sender_email: 'requester@example.com',
        content: 'This is a test message',
        token: 'valid-token-123'
      };
      
      (RequestModel.getByIdWithToken as jest.Mock).mockResolvedValue(mockRequest);
      (MessageModel.create as jest.Mock).mockResolvedValue(mockMessage);
      (emailService.sendMessageNotification as jest.Mock).mockRejectedValue(new Error('SMTP error'));
      
      // Spy on console.error
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Act
      const handler = messageController.createMessage;
      await handler(req as Request, res as Response, next);
      
      // Assert
      expect(MessageModel.create).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockMessage
      });
    });
  });
  
  describe('getMessagesByRequestId', () => {
    it('should return all messages for a valid request ID and token', async () => {
      // Arrange
      req.params = { requestId: 'request-123' };
      req.query = { token: 'valid-token-123' };
      
      const mockMessages = [mockMessage, { ...mockMessage, id: 'message-456' }];
      
      (RequestModel.getByIdWithToken as jest.Mock).mockResolvedValue(mockRequest);
      (MessageModel.getByRequestId as jest.Mock).mockResolvedValue(mockMessages);
      
      // Act
      const handler = messageController.getMessagesByRequestId;
      await handler(req as Request, res as Response, next);
      
      // Assert
      expect(RequestModel.getByIdWithToken).toHaveBeenCalledWith('request-123', 'valid-token-123');
      expect(MessageModel.getByRequestId).toHaveBeenCalledWith('request-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockMessages
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should return 401 when token is missing', async () => {
      // Arrange
      req.params = { requestId: 'request-123' };
      // No token
      
      // Act
      const handler = messageController.getMessagesByRequestId;
      await handler(req as Request, res as Response, next);
      
      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: expect.stringContaining('Access token is required')
        })
      );
    });
    
    it('should return 404 when request is not found or token is invalid', async () => {
      // Arrange
      req.params = { requestId: 'request-123' };
      req.query = { token: 'invalid-token' };
      
      (RequestModel.getByIdWithToken as jest.Mock).mockResolvedValue(null);
      
      // Act
      const handler = messageController.getMessagesByRequestId;
      await handler(req as Request, res as Response, next);
      
      // Assert
      expect(RequestModel.getByIdWithToken).toHaveBeenCalledWith('request-123', 'invalid-token');
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: expect.stringContaining('Request not found or invalid token')
        })
      );
    });
  });
});