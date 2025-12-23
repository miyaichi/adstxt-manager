import { Request, Response, NextFunction } from 'express';
import * as adsTxtController from '../adsTxtController';
import AdsTxtRecordModel from '../../models/AdsTxtRecord';
import RequestModel from '../../models/Request';
import { parseAdsTxtContent } from 'adstxt-validator';
import { ApiError } from '../../middleware/errorHandler';

// Mock the models and utils
jest.mock('../../models/AdsTxtRecord');
jest.mock('../../models/Request');
jest.mock('adstxt-validator');

// Mock the asyncHandler middleware
jest.mock('../../middleware/errorHandler', () => {
  const originalModule = jest.requireActual('../../middleware/errorHandler');
  return {
    ...originalModule,
    // Adding types to fix TypeScript errors
    asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
      Promise.resolve(fn(req, res, next)).catch(next),
  };
});

describe('AdsTxt Controller Tests', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let mockRecord: any;
  let mockRequest: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mocks
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
      setHeader: jest.fn(),
    };
    next = jest.fn();

    // Setup test data
    mockRecord = {
      id: 'record-123',
      request_id: 'request-123',
      domain: 'example.com',
      account_id: 'pub-1234',
      account_type: 'DIRECT',
      relationship: 'DIRECT',
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockRequest = {
      id: 'request-123',
      publisher_email: 'publisher@example.com',
      requester_email: 'requester@example.com',
      status: 'pending',
      token: 'valid-token-123',
    };
  });

  describe('updateRecordStatus', () => {
    it('should update record status when valid data is provided', async () => {
      // Arrange
      req.params = { id: 'record-123' };
      req.body = { status: 'approved', token: 'valid-token-123' };

      (AdsTxtRecordModel.getById as jest.Mock).mockResolvedValue(mockRecord);
      (RequestModel.getByIdWithToken as jest.Mock).mockResolvedValue(mockRequest);
      (AdsTxtRecordModel.updateStatus as jest.Mock).mockResolvedValue({
        ...mockRecord,
        status: 'approved',
        updated_at: new Date().toISOString(),
      });

      // Act
      const handler = adsTxtController.updateRecordStatus;
      await handler(req as Request, res as Response, next);

      // Assert
      expect(AdsTxtRecordModel.getById).toHaveBeenCalledWith('record-123');
      expect(RequestModel.getByIdWithToken).toHaveBeenCalledWith('request-123', 'valid-token-123');
      expect(AdsTxtRecordModel.updateStatus).toHaveBeenCalledWith('record-123', 'approved');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          status: 'approved',
        }),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 400 when invalid status is provided', async () => {
      // Arrange
      req.params = { id: 'record-123' };
      req.body = { status: 'invalid-status', token: 'valid-token-123' };

      // Act
      const handler = adsTxtController.updateRecordStatus;
      await handler(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('Valid status is required'),
        })
      );
    });

    it('should return 401 when token is missing', async () => {
      // Arrange
      req.params = { id: 'record-123' };
      req.body = { status: 'approved' };

      // Act
      const handler = adsTxtController.updateRecordStatus;
      await handler(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: expect.stringContaining('Access token is required'),
        })
      );
    });

    it('should return 404 when record is not found', async () => {
      // Arrange
      req.params = { id: 'record-123' };
      req.body = { status: 'approved', token: 'valid-token-123' };

      (AdsTxtRecordModel.getById as jest.Mock).mockResolvedValue(null);

      // Act
      const handler = adsTxtController.updateRecordStatus;
      await handler(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: expect.stringContaining('Ads.txt record not found'),
        })
      );
    });
  });

  describe('processAdsTxtFile', () => {
    it('should process and parse a valid Ads.txt file', async () => {
      // Arrange
      const parsedRecords = [
        {
          domain: 'example.com',
          account_id: 'pub-1',
          account_type: 'DIRECT',
          relationship: 'DIRECT',
          is_valid: true,
        },
        {
          domain: 'example2.com',
          account_id: 'pub-2',
          account_type: 'RESELLER',
          relationship: 'RESELLER',
          is_valid: true,
        },
      ];

      req.file = {
        buffer: Buffer.from(
          'example.com, pub-1, DIRECT, DIRECT\nexample2.com, pub-2, RESELLER, RESELLER'
        ),
      } as Express.Multer.File;

      (parseAdsTxtContent as jest.Mock).mockReturnValue(parsedRecords);

      // Act
      const handler = adsTxtController.processAdsTxtFile;
      await handler(req as Request, res as Response, next);

      // Assert
      expect(parseAdsTxtContent).toHaveBeenCalledWith(expect.any(String));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          records: parsedRecords,
          totalRecords: 2,
          validRecords: 2,
          invalidRecords: 0,
        },
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 400 when no file is uploaded', async () => {
      // Arrange - no req.file

      // Act
      const handler = adsTxtController.processAdsTxtFile;
      await handler(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('No file uploaded'),
        })
      );
    });

    it('should handle parsing errors', async () => {
      // Arrange
      req.file = {
        buffer: Buffer.from('Invalid content'),
      } as Express.Multer.File;

      (parseAdsTxtContent as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid format');
      });

      // Act
      const handler = adsTxtController.processAdsTxtFile;
      await handler(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('Error parsing Ads.txt file'),
        })
      );
    });
  });

  describe('getRecordsByRequestId', () => {
    it('should return all records for a valid request ID and token', async () => {
      // Arrange
      req.params = { requestId: 'request-123' };
      req.query = { token: 'valid-token-123' };

      const mockRecords = [mockRecord, { ...mockRecord, id: 'record-456' }];

      (RequestModel.getByIdWithToken as jest.Mock).mockResolvedValue(mockRequest);
      (AdsTxtRecordModel.getByRequestId as jest.Mock).mockResolvedValue(mockRecords);

      // Act
      const handler = adsTxtController.getRecordsByRequestId;
      await handler(req as Request, res as Response, next);

      // Assert
      expect(RequestModel.getByIdWithToken).toHaveBeenCalledWith('request-123', 'valid-token-123');
      expect(AdsTxtRecordModel.getByRequestId).toHaveBeenCalledWith('request-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockRecords,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is missing', async () => {
      // Arrange
      req.params = { requestId: 'request-123' };
      req.query = {}; // No token

      // Act
      const handler = adsTxtController.getRecordsByRequestId;
      await handler(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: expect.stringContaining('Access token is required'),
        })
      );
    });

    it('should return 404 when request is not found or token is invalid', async () => {
      // Arrange
      req.params = { requestId: 'request-123' };
      req.query = { token: 'invalid-token' };

      (RequestModel.getByIdWithToken as jest.Mock).mockResolvedValue(null);

      // Act
      const handler = adsTxtController.getRecordsByRequestId;
      await handler(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: expect.stringContaining('Request not found or invalid token'),
        })
      );
    });
  });

  describe('generateAdsTxtContent', () => {
    it('should generate content for approved records', async () => {
      // Arrange
      req.params = { requestId: 'request-123' };
      req.query = { token: 'valid-token-123' };

      const mockRecords = [
        { ...mockRecord, status: 'approved' },
        {
          ...mockRecord,
          id: 'record-456',
          status: 'approved',
          certification_authority_id: 'abc123',
        },
        { ...mockRecord, id: 'record-789', status: 'rejected' },
      ];

      (RequestModel.getByIdWithToken as jest.Mock).mockResolvedValue(mockRequest);
      (AdsTxtRecordModel.getByRequestId as jest.Mock).mockResolvedValue(mockRecords);

      // Act
      const handler = adsTxtController.generateAdsTxtContent;
      await handler(req as Request, res as Response, next);

      // Assert
      expect(RequestModel.getByIdWithToken).toHaveBeenCalledWith('request-123', 'valid-token-123');
      expect(AdsTxtRecordModel.getByRequestId).toHaveBeenCalledWith('request-123');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="ads.txt"'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.stringContaining('example.com, pub-1234, DIRECT, DIRECT')
      );
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining(', abc123'));
      // Ensure the rejected record is not included
      expect((res.send as jest.Mock).mock.calls[0][0].split('\n').length).toBeGreaterThanOrEqual(5); // Header lines + approved records
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is missing', async () => {
      // Arrange
      req.params = { requestId: 'request-123' };
      req.query = {}; // No token

      // Act
      const handler = adsTxtController.generateAdsTxtContent;
      await handler(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: expect.stringContaining('Access token is required'),
        })
      );
    });

    it('should return 404 when request is not found or token is invalid', async () => {
      // Arrange
      req.params = { requestId: 'request-123' };
      req.query = { token: 'invalid-token' };

      (RequestModel.getByIdWithToken as jest.Mock).mockResolvedValue(null);

      // Act
      const handler = adsTxtController.generateAdsTxtContent;
      await handler(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: expect.stringContaining('Request not found or invalid token'),
        })
      );
    });
  });

  describe('validateQuick', () => {
    it('should validate ads.txt content quickly without database queries', async () => {
      const adsTxtContent = `google.com, pub-1234567890, DIRECT, f08c47fec0942fa0
facebook.com, 123456789, DIRECT
# Comment line
contact=admin@example.com`;

      const parsedRecords = [
        {
          domain: 'google.com',
          account_id: 'pub-1234567890',
          relationship: 'DIRECT',
          certification_authority_id: 'f08c47fec0942fa0',
          is_valid: true,
          line_number: 1,
        },
        {
          domain: 'facebook.com',
          account_id: '123456789',
          relationship: 'DIRECT',
          is_valid: true,
          line_number: 2,
        },
        {
          variable_type: 'contact',
          value: 'admin@example.com',
          is_valid: true,
          line_number: 4,
        },
      ];

      (parseAdsTxtContent as jest.Mock).mockReturnValue(parsedRecords);

      req.body = {
        content: adsTxtContent,
        checkDuplicates: true,
      };

      await adsTxtController.validateQuick(req as Request, res as Response, next);

      expect(parseAdsTxtContent).toHaveBeenCalledWith(adsTxtContent);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          isValid: true,
          records: expect.arrayContaining([
            expect.objectContaining({ domain: 'google.com' }),
            expect.objectContaining({ domain: 'facebook.com' }),
          ]),
          errors: [],
          warnings: [],
          statistics: expect.objectContaining({
            validRecords: 2,
            invalidRecords: 0,
            variables: 1,
          }),
        }),
      });
    });

    it('should detect duplicate entries when checkDuplicates is true', async () => {
      const adsTxtContent = `google.com, pub-123, DIRECT
google.com, pub-123, DIRECT
facebook.com, 456, RESELLER`;

      const parsedRecords = [
        {
          domain: 'google.com',
          account_id: 'pub-123',
          relationship: 'DIRECT',
          is_valid: true,
          line_number: 1,
        },
        {
          domain: 'google.com',
          account_id: 'pub-123',
          relationship: 'DIRECT',
          is_valid: true,
          line_number: 2,
        },
        {
          domain: 'facebook.com',
          account_id: '456',
          relationship: 'RESELLER',
          is_valid: true,
          line_number: 3,
        },
      ];

      (parseAdsTxtContent as jest.Mock).mockReturnValue(parsedRecords);

      req.body = {
        content: adsTxtContent,
        checkDuplicates: true,
      };

      await adsTxtController.validateQuick(req as Request, res as Response, next);

      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.success).toBe(true);
      expect(jsonCall.data.warnings).toHaveLength(1);
      expect(jsonCall.data.warnings[0].message).toContain('Duplicate entry');
      expect(jsonCall.data.statistics.duplicates).toBe(1);
    });

    it('should handle invalid entries', async () => {
      const adsTxtContent = `google.com, pub-123, DIRECT
invalid line
facebook.com, 456, RESELLER`;

      const parsedRecords = [
        {
          domain: 'google.com',
          account_id: 'pub-123',
          relationship: 'DIRECT',
          is_valid: true,
          line_number: 1,
        },
        {
          is_valid: false,
          validation_key: 'invalidFormat',
          severity: 'error',
          line_number: 2,
        },
        {
          domain: 'facebook.com',
          account_id: '456',
          relationship: 'RESELLER',
          is_valid: true,
          line_number: 3,
        },
      ];

      (parseAdsTxtContent as jest.Mock).mockReturnValue(parsedRecords);

      req.body = {
        content: adsTxtContent,
      };

      await adsTxtController.validateQuick(req as Request, res as Response, next);

      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.success).toBe(true);
      expect(jsonCall.data.isValid).toBe(false);
      expect(jsonCall.data.errors).toHaveLength(1);
      expect(jsonCall.data.errors[0].message).toBe('invalidFormat');
    });

    it('should return error when content is missing', async () => {
      req.body = {};

      await adsTxtController.validateQuick(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    });
  });
});
