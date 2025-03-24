import { Request, Response, NextFunction } from 'express';
import * as sellersJsonController from '../sellersJsonController';
import SellersJsonCacheModel from '../../models/SellersJsonCache';
import axios from 'axios';
import { ApiError } from '../../middleware/errorHandler';

// Mock the model and axios
jest.mock('../../models/SellersJsonCache');
jest.mock('axios');

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

describe('SellersJson Controller Tests', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let mockCache: any;
  
  // Sample sellers.json response for OpenX
  const mockOpenXSellersJson = {
    sellers: [
      {
        seller_id: "123456789",
        name: "OpenX",
        domain: "openx.com",
        seller_type: "INTERMEDIARY"
      },
      {
        seller_id: "987654321",
        name: "OpenX Europe",
        domain: "uk.openx.com", 
        seller_type: "INTERMEDIARY"
      }
    ],
    contact_email: "support@openx.com",
    version: "1.0"
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mocks
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();

    // Setup test data
    mockCache = {
      id: 'cache-123',
      domain: 'openx.com',
      content: JSON.stringify(mockOpenXSellersJson),
      status: 'success',
      status_code: 200,
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  describe('getSellersJson', () => {
    it('should return cached data if it exists and is not expired', async () => {
      // Arrange
      req.params = { domain: 'openx.com' };
      
      // Mock cache response (not expired)
      (SellersJsonCacheModel.getByDomain as jest.Mock).mockResolvedValue(mockCache);
      (SellersJsonCacheModel.isCacheExpired as jest.Mock).mockReturnValue(false);

      // Act
      const handler = sellersJsonController.getSellersJson;
      await handler(req as Request, res as Response, next);

      // Assert
      expect(SellersJsonCacheModel.getByDomain).toHaveBeenCalledWith('openx.com');
      expect(SellersJsonCacheModel.isCacheExpired).toHaveBeenCalledWith(mockCache.updated_at);
      expect(axios.get).not.toHaveBeenCalled(); // Should not make HTTP request
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          domain: 'openx.com',
          content: JSON.parse(mockCache.content),
          cached: true,
        }),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should fetch new data if cache is expired', async () => {
      // Arrange
      req.params = { domain: 'openx.com' };
      
      // Mock expired cache
      (SellersJsonCacheModel.getByDomain as jest.Mock).mockResolvedValue(mockCache);
      (SellersJsonCacheModel.isCacheExpired as jest.Mock).mockReturnValue(true);
      
      // Mock axios response
      (axios.get as jest.Mock).mockResolvedValue({
        status: 200,
        headers: { 'content-type': 'application/json' },
        data: mockOpenXSellersJson,
      });
      
      // Mock saveCache
      const updatedCache = { ...mockCache, updated_at: new Date().toISOString() };
      (SellersJsonCacheModel.saveCache as jest.Mock).mockResolvedValue(updatedCache);

      // Act
      const handler = sellersJsonController.getSellersJson;
      await handler(req as Request, res as Response, next);

      // Assert
      expect(SellersJsonCacheModel.getByDomain).toHaveBeenCalledWith('openx.com');
      expect(SellersJsonCacheModel.isCacheExpired).toHaveBeenCalledWith(mockCache.updated_at);
      expect(axios.get).toHaveBeenCalledWith('https://openx.com/sellers.json', expect.any(Object));
      expect(SellersJsonCacheModel.saveCache).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          domain: 'openx.com',
          content: expect.any(Object),
          cached: false,
        }),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should fetch new data if no cache exists', async () => {
      // Arrange
      req.params = { domain: 'openx.com' };
      
      // Mock no cache
      (SellersJsonCacheModel.getByDomain as jest.Mock).mockResolvedValue(null);
      
      // Mock axios response
      (axios.get as jest.Mock).mockResolvedValue({
        status: 200,
        headers: { 'content-type': 'application/json' },
        data: mockOpenXSellersJson,
      });
      
      // Mock saveCache
      (SellersJsonCacheModel.saveCache as jest.Mock).mockResolvedValue(mockCache);

      // Act
      const handler = sellersJsonController.getSellersJson;
      await handler(req as Request, res as Response, next);

      // Assert
      expect(SellersJsonCacheModel.getByDomain).toHaveBeenCalledWith('openx.com');
      expect(axios.get).toHaveBeenCalledWith('https://openx.com/sellers.json', expect.any(Object));
      expect(SellersJsonCacheModel.saveCache).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          domain: 'openx.com',
          content: expect.any(Object),
          cached: false,
        }),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle 404 not found responses', async () => {
      // Arrange
      req.params = { domain: 'openx.com' };
      
      // Mock no cache
      (SellersJsonCacheModel.getByDomain as jest.Mock).mockResolvedValue(null);
      
      // Mock 404 response
      (axios.get as jest.Mock).mockResolvedValue({
        status: 404,
        headers: { 'content-type': 'text/html' },
        data: '<html><body>Not Found</body></html>',
      });
      
      // Mock saveCache
      const notFoundCache = {
        ...mockCache,
        content: null,
        status: 'not_found',
        status_code: 404,
        error_message: 'sellers.json file not found',
      };
      (SellersJsonCacheModel.saveCache as jest.Mock).mockResolvedValue(notFoundCache);

      // Act
      const handler = sellersJsonController.getSellersJson;
      await handler(req as Request, res as Response, next);

      // Assert
      expect(axios.get).toHaveBeenCalledWith('https://openx.com/sellers.json', expect.any(Object));
      expect(SellersJsonCacheModel.saveCache).toHaveBeenCalledWith(expect.objectContaining({
        domain: 'openx.com',
        status: 'not_found',
        status_code: 404,
      }));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          domain: 'openx.com',
          content: null,
          status: 'not_found',
          status_code: 404,
        }),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle invalid JSON format responses', async () => {
      // Arrange
      req.params = { domain: 'openx.com' };
      
      // Mock no cache
      (SellersJsonCacheModel.getByDomain as jest.Mock).mockResolvedValue(null);
      
      // Mock response with invalid content type
      (axios.get as jest.Mock).mockResolvedValue({
        status: 200,
        headers: { 'content-type': 'text/html' },
        data: '<html><body>Some HTML content</body></html>',
      });
      
      // Mock saveCache
      const invalidFormatCache = {
        ...mockCache,
        content: null,
        status: 'invalid_format',
        status_code: 200,
        error_message: 'Invalid content type: text/html',
      };
      (SellersJsonCacheModel.saveCache as jest.Mock).mockResolvedValue(invalidFormatCache);

      // Act
      const handler = sellersJsonController.getSellersJson;
      await handler(req as Request, res as Response, next);

      // Assert
      expect(axios.get).toHaveBeenCalledWith('https://openx.com/sellers.json', expect.any(Object));
      expect(SellersJsonCacheModel.saveCache).toHaveBeenCalledWith(expect.objectContaining({
        domain: 'openx.com',
        status: 'invalid_format',
      }));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          domain: 'openx.com',
          status: 'invalid_format',
        }),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      // Arrange
      req.params = { domain: 'openx.com' };
      
      // Mock no cache
      (SellersJsonCacheModel.getByDomain as jest.Mock).mockResolvedValue(null);
      
      // Mock network error
      const networkError = new Error('Network Error');
      (axios.get as jest.Mock).mockRejectedValue(networkError);
      
      // Mock saveCache
      (SellersJsonCacheModel.saveCache as jest.Mock).mockResolvedValue({
        domain: 'openx.com',
        content: null,
        status: 'error',
        status_code: null,
        error_message: 'Network Error',
      });

      // Act
      const handler = sellersJsonController.getSellersJson;
      await handler(req as Request, res as Response, next);

      // Assert
      expect(axios.get).toHaveBeenCalledWith('https://openx.com/sellers.json', expect.any(Object));
      expect(SellersJsonCacheModel.saveCache).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: expect.stringContaining('Error fetching sellers.json'),
        })
      );
    });

    it('should return 400 if no domain is provided', async () => {
      // Arrange
      req.params = {}; // No domain
      
      // Act
      const handler = sellersJsonController.getSellersJson;
      await handler(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('Domain parameter is required'),
        })
      );
    });
  });
});