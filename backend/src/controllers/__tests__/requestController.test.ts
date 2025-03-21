import { Request, Response, NextFunction } from 'express';
import * as requestController from '../requestController';
import RequestModel from '../../models/Request';
import AdsTxtRecordModel from '../../models/AdsTxtRecord';
import tokenService from '../../services/tokenService';
import emailService from '../../services/emailService';
import { parseAdsTxtContent } from '../../utils/validation';
import { ApiError } from '../../middleware/errorHandler';

// Mock the models and services
jest.mock('../../models/Request');
jest.mock('../../models/AdsTxtRecord');
jest.mock('../../services/tokenService');
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

describe('Request Controller Tests', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let mockRequest: any;
  let mockToken: string;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mocks
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
      setHeader: jest.fn()
    };
    next = jest.fn();
    
    // Setup test data
    mockToken = 'test-token-123';
    mockRequest = {
      id: 'request-123',
      publisher_email: 'publisher@example.com',
      requester_email: 'requester@example.com',
      requester_name: 'Test Requester',
      status: 'pending',
      token: mockToken,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Setup token service mock
    (tokenService.generateToken as jest.Mock).mockReturnValue(mockToken);
    (tokenService.generateRequestId as jest.Mock).mockReturnValue('request-123');
    (tokenService.verifyToken as jest.Mock).mockReturnValue(true);
  });
  
  describe('createRequest', () => {
    it('should create a new request with valid data', async () => {
      // Arrange
      req.body = {
        publisher_email: 'publisher@example.com',
        requester_email: 'requester@example.com',
        requester_name: 'Test Requester',
        ads_txt_content: 'example.com, pub-1234, DIRECT, DIRECT'
      };
      
      const parsedRecords = [
        { 
          domain: 'example.com',
          account_id: 'pub-1234',
          account_type: 'DIRECT',
          relationship: 'DIRECT',
          is_valid: true
        }
      ];
      
      (parseAdsTxtContent as jest.Mock).mockReturnValue(parsedRecords);
      (RequestModel.create as jest.Mock).mockResolvedValue(mockRequest);
      (AdsTxtRecordModel.bulkCreate as jest.Mock).mockResolvedValue([
        {
          id: 'record-123',
          request_id: 'request-123',
          domain: 'example.com',
          account_id: 'pub-1234',
          account_type: 'DIRECT',
          relationship: 'DIRECT',
          status: 'pending'
        }
      ]);
      
      // Act
      const handler = requestController.createRequest;
      await handler(req as Request, res as Response, next);
      
      // Assert
      expect(tokenService.generateRequestId).toHaveBeenCalled();
      expect(tokenService.generateToken).toHaveBeenCalled();
      expect(parseAdsTxtContent).toHaveBeenCalledWith(req.body.ads_txt_content);
      expect(RequestModel.create).toHaveBeenCalledWith(expect.objectContaining({
        id: 'request-123',
        publisher_email: 'publisher@example.com',
        requester_email: 'requester@example.com',
        requester_name: 'Test Requester'
      }));
      expect(AdsTxtRecordModel.bulkCreate).toHaveBeenCalled();
      expect(emailService.sendPublisherRequestNotification).toHaveBeenCalled();
      expect(emailService.sendRequesterConfirmation).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'request-123'
        })
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should return 400 when required fields are missing', async () => {
      // Arrange
      req.body = {
        // Missing publisher_email
        requester_email: 'requester@example.com',
        requester_name: 'Test Requester',
        ads_txt_content: 'example.com, pub-1234, DIRECT, DIRECT'
      };
      
      // Act
      const handler = requestController.createRequest;
      await handler(req as Request, res as Response, next);
      
      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('Required fields missing')
        })
      );
    });
    
    it('should return 400 when Ads.txt content is invalid', async () => {
      // Arrange
      req.body = {
        publisher_email: 'publisher@example.com',
        requester_email: 'requester@example.com',
        requester_name: 'Test Requester',
        ads_txt_content: 'Invalid content'
      };
      
      (parseAdsTxtContent as jest.Mock).mockReturnValue([]);
      
      // Act
      const handler = requestController.createRequest;
      await handler(req as Request, res as Response, next);
      
      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('No valid Ads.txt records found')
        })
      );
    });
  });
  
  describe('getRequest', () => {
    it('should return a request when valid ID and token are provided', async () => {
      // Arrange
      req.params = { id: 'request-123' };
      req.query = { token: mockToken };
      
      (RequestModel.getByIdWithToken as jest.Mock).mockResolvedValue(mockRequest);
      
      // Act
      const handler = requestController.getRequest;
      await handler(req as Request, res as Response, next);
      
      // Assert
      expect(RequestModel.getByIdWithToken).toHaveBeenCalledWith('request-123', mockToken);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockRequest
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should return 401 when token is missing', async () => {
      // Arrange
      req.params = { id: 'request-123' };
      // No token
      
      // Act
      const handler = requestController.getRequest;
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
      req.params = { id: 'request-123' };
      req.query = { token: 'invalid-token' };
      
      (RequestModel.getByIdWithToken as jest.Mock).mockResolvedValue(null);
      
      // Act
      const handler = requestController.getRequest;
      await handler(req as Request, res as Response, next);
      
      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: expect.stringContaining('Request not found or invalid token')
        })
      );
    });
  });
  
  describe('updateRequestStatus', () => {
    it('should update request status with valid data', async () => {
      // Arrange
      req.params = { id: 'request-123' };
      req.body = { status: 'approved', token: mockToken };
      
      (RequestModel.getByIdWithToken as jest.Mock).mockResolvedValue(mockRequest);
      (RequestModel.updateStatus as jest.Mock).mockResolvedValue({
        ...mockRequest,
        status: 'approved',
        updated_at: new Date().toISOString()
      });
      
      // Act
      const handler = requestController.updateRequestStatus;
      await handler(req as Request, res as Response, next);
      
      // Assert
      expect(RequestModel.getByIdWithToken).toHaveBeenCalledWith('request-123', mockToken);
      expect(RequestModel.updateStatus).toHaveBeenCalledWith('request-123', 'approved');
      expect(emailService.sendStatusUpdateNotification).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          status: 'approved'
        })
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should return 400 when invalid status is provided', async () => {
      // Arrange
      req.params = { id: 'request-123' };
      req.body = { status: 'invalid-status', token: mockToken };
      
      // Act
      const handler = requestController.updateRequestStatus;
      await handler(req as Request, res as Response, next);
      
      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('Valid status is required')
        })
      );
    });
  });
  
  describe('getRequestsByEmail', () => {
    it('should return requests for a publisher with valid email and role', async () => {
      // Arrange
      req.params = { email: 'publisher@example.com' };
      req.query = { role: 'publisher' };
      
      const mockRequests = [mockRequest, {...mockRequest, id: 'request-456'}];
      (RequestModel.getByPublisherEmail as jest.Mock).mockResolvedValue(mockRequests);
      
      // Act
      const handler = requestController.getRequestsByEmail;
      await handler(req as Request, res as Response, next);
      
      // Assert
      expect(RequestModel.getByPublisherEmail).toHaveBeenCalledWith('publisher@example.com');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockRequests
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should return requests for a requester with valid email and role', async () => {
      // Arrange
      req.params = { email: 'requester@example.com' };
      req.query = { role: 'requester' };
      
      const mockRequests = [mockRequest, {...mockRequest, id: 'request-456'}];
      (RequestModel.getByRequesterEmail as jest.Mock).mockResolvedValue(mockRequests);
      
      // Act
      const handler = requestController.getRequestsByEmail;
      await handler(req as Request, res as Response, next);
      
      // Assert
      expect(RequestModel.getByRequesterEmail).toHaveBeenCalledWith('requester@example.com');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockRequests
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should return both publisher and requester requests when no role specified', async () => {
      // Arrange
      req.params = { email: 'user@example.com' };
      // No role specified
      
      const publisherRequests = [mockRequest];
      const requesterRequests = [{...mockRequest, id: 'request-456'}];
      
      (RequestModel.getByPublisherEmail as jest.Mock).mockResolvedValue(publisherRequests);
      (RequestModel.getByRequesterEmail as jest.Mock).mockResolvedValue(requesterRequests);
      
      // Act
      const handler = requestController.getRequestsByEmail;
      await handler(req as Request, res as Response, next);
      
      // Assert
      expect(RequestModel.getByPublisherEmail).toHaveBeenCalledWith('user@example.com');
      expect(RequestModel.getByRequesterEmail).toHaveBeenCalledWith('user@example.com');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [...publisherRequests, ...requesterRequests]
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should return 400 when invalid email is provided', async () => {
      // Arrange
      req.params = { email: 'invalid-email' };
      
      // Act
      const handler = requestController.getRequestsByEmail;
      await handler(req as Request, res as Response, next);
      
      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('Invalid email address')
        })
      );
    });
  });
});