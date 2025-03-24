import { Request, Response } from 'express';
import axios from 'axios';
import { getAdsTxt } from '../adsTxtCacheController';
import AdsTxtCacheModel from '../../models/AdsTxtCache';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock AdsTxtCacheModel
jest.mock('../../models/AdsTxtCache');
const mockAdsTxtCacheModel = AdsTxtCacheModel as jest.Mocked<typeof AdsTxtCacheModel>;

describe('adsTxtCacheController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    mockRequest = {
      params: {},
      query: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jsonMock,
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('getAdsTxt', () => {
    it('should return 400 if domain parameter is missing', async () => {
      // Mock next function to catch errors
      const mockNext = jest.fn();

      // Call the controller
      await getAdsTxt(mockRequest as Request, mockResponse as Response, mockNext);

      // Verify next was called with ApiError
      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error.statusCode).toBe(400);
      expect(error.message).toContain('Domain parameter is required');
    });

    it('should return cached data if available and not expired', async () => {
      // Setup request
      mockRequest.params = { domain: 'example.com' };

      // Mock cache data
      const cachedData = {
        id: '1',
        domain: 'example.com',
        content: 'example.com, 12345, DIRECT',
        url: 'https://example.com/ads.txt',
        status: 'success',
        status_code: 200,
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock model functions
      mockAdsTxtCacheModel.getByDomain.mockResolvedValue(cachedData);
      mockAdsTxtCacheModel.isCacheExpired.mockReturnValue(false);

      // Call the controller
      await getAdsTxt(mockRequest as Request, mockResponse as Response, jest.fn());

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          domain: 'example.com',
          content: cachedData.content,
          url: cachedData.url,
          status: cachedData.status,
          status_code: cachedData.status_code,
          error_message: cachedData.error_message,
          cached: true,
          updated_at: cachedData.updated_at,
        },
      });

      // Verify no fetch was attempted
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should fetch fresh data if cache is expired', async () => {
      // Setup request
      mockRequest.params = { domain: 'example.com' };

      // Mock expired cache data
      const cachedData = {
        id: '1',
        domain: 'example.com',
        content: 'old content',
        url: 'https://example.com/ads.txt',
        status: 'success',
        status_code: 200,
        error_message: null,
        created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 48 hours ago
        updated_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      };

      // Mock new data after saving
      const updatedData = {
        ...cachedData,
        content: 'example.com, 12345, DIRECT, new content',
        updated_at: new Date().toISOString(),
      };

      // Mock model functions
      mockAdsTxtCacheModel.getByDomain.mockResolvedValue(cachedData);
      mockAdsTxtCacheModel.isCacheExpired.mockReturnValue(true);
      mockAdsTxtCacheModel.saveCache.mockResolvedValue(updatedData);

      // Mock axios response
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: 'example.com, 12345, DIRECT, new content',
        request: {
          res: {
            responseUrl: 'https://example.com/ads.txt',
          },
        },
      });

      // Call the controller
      await getAdsTxt(mockRequest as Request, mockResponse as Response, jest.fn());

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          domain: 'example.com',
          content: updatedData.content,
          url: updatedData.url,
          status: updatedData.status,
          status_code: updatedData.status_code,
          error_message: updatedData.error_message,
          cached: false,
          updated_at: updatedData.updated_at,
        },
      });

      // Verify fetch attempt
      expect(mockedAxios.get).toHaveBeenCalled();
    });

    it('should try multiple URLs when fetching ads.txt', async () => {
      // Setup request
      mockRequest.params = { domain: 'example.com' };

      // Mock model functions - no cache
      mockAdsTxtCacheModel.getByDomain.mockResolvedValue(null);
      mockAdsTxtCacheModel.saveCache.mockImplementation(async (data) => ({
        id: '1',
        domain: 'example.com',
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      // Mock axios to fail for first 3 attempts and succeed on 4th
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockRejectedValueOnce(new Error('404 Not Found'))
        .mockResolvedValueOnce({
          status: 200,
          data: 'example.com, 12345, DIRECT, content',
          request: {
            res: {
              responseUrl: 'http://www.example.com/ads.txt',
            },
          },
        });

      // Call the controller
      await getAdsTxt(mockRequest as Request, mockResponse as Response, jest.fn());

      // Verify each URL was attempted
      expect(mockedAxios.get).toHaveBeenCalledTimes(4);
      expect(mockedAxios.get).toHaveBeenNthCalledWith(
        1,
        'https://example.com/ads.txt',
        expect.any(Object)
      );
      expect(mockedAxios.get).toHaveBeenNthCalledWith(
        2,
        'https://www.example.com/ads.txt',
        expect.any(Object)
      );
      expect(mockedAxios.get).toHaveBeenNthCalledWith(
        3,
        'http://example.com/ads.txt',
        expect.any(Object)
      );
      expect(mockedAxios.get).toHaveBeenNthCalledWith(
        4,
        'http://www.example.com/ads.txt',
        expect.any(Object)
      );

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          domain: 'example.com',
          content: 'example.com, 12345, DIRECT, content',
          url: 'http://www.example.com/ads.txt',
          status: 'success',
          cached: false,
        }),
      });
    });

    it('should handle subdomain directive and fetch subdomain ads.txt', async () => {
      // Setup request with subdomain
      mockRequest.params = { domain: 'example.com' };
      mockRequest.query = { subdomain: 'blog' };

      // Mock model functions - no cache
      mockAdsTxtCacheModel.getByDomain.mockResolvedValue(null);
      mockAdsTxtCacheModel.saveCache.mockImplementation(async (data) => ({
        id: '1',
        domain: data.domain,
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      // Mock root domain response with subdomain directive
      const rootResponse = {
        status: 200,
        data: 'example.com, 12345, DIRECT\nSUBDOMAIN=blog\n# Comment',
        request: {
          res: {
            responseUrl: 'https://example.com/ads.txt',
          },
        },
      };

      // Mock subdomain response
      const subdomainResponse = {
        status: 200,
        data: 'blog.example.com, 98765, RESELLER',
        request: {
          res: {
            responseUrl: 'https://blog.example.com/ads.txt',
          },
        },
      };

      // Setup axios mocks
      mockedAxios.get
        .mockResolvedValueOnce(rootResponse) // First call for root domain
        .mockResolvedValueOnce(subdomainResponse); // Second call for subdomain

      // Call the controller
      await getAdsTxt(mockRequest as Request, mockResponse as Response, jest.fn());

      // Verify root domain was first checked
      expect(mockedAxios.get).toHaveBeenNthCalledWith(
        1,
        'https://example.com/ads.txt',
        expect.any(Object)
      );

      // Verify subdomain was then checked (after finding SUBDOMAIN directive)
      expect(mockedAxios.get).toHaveBeenNthCalledWith(
        2,
        'https://blog.example.com/ads.txt',
        expect.any(Object)
      );

      // Verify subdomain data was returned
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          domain: 'blog.example.com',
          content: 'blog.example.com, 98765, RESELLER',
          url: 'https://blog.example.com/ads.txt',
          status: 'success',
        }),
      });
    });

    it('should handle 404 not found errors', async () => {
      // Setup request
      mockRequest.params = { domain: 'nonexistent.com' };

      // Mock model functions - no cache
      mockAdsTxtCacheModel.getByDomain.mockResolvedValue(null);
      mockAdsTxtCacheModel.saveCache.mockImplementation(async (data) => ({
        id: '1',
        domain: 'nonexistent.com',
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      // Mock 404 responses for all URL attempts
      mockedAxios.get.mockResolvedValue({
        status: 404,
        data: 'Not Found',
        request: { res: { responseUrl: 'https://nonexistent.com/ads.txt' } },
      });

      // Call the controller
      await getAdsTxt(mockRequest as Request, mockResponse as Response, jest.fn());

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          domain: 'nonexistent.com',
          content: null,
          status: 'not_found',
          status_code: 404,
          error_message: expect.stringContaining('not found'),
        }),
      });

      // Verify cache saved with error status
      expect(mockAdsTxtCacheModel.saveCache).toHaveBeenCalledWith(
        expect.objectContaining({
          domain: 'nonexistent.com',
          status: 'not_found',
        })
      );
    });

    it('should handle network errors', async () => {
      // Setup request
      mockRequest.params = { domain: 'timeout.com' };

      // Mock model functions - no cache
      mockAdsTxtCacheModel.getByDomain.mockResolvedValue(null);
      mockAdsTxtCacheModel.saveCache.mockImplementation(async (data) => ({
        id: '1',
        domain: 'timeout.com',
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      // Mock network error for all attempts
      const networkError = new Error('Network Error');
      mockedAxios.get.mockRejectedValue(networkError);

      // Call the controller
      await getAdsTxt(mockRequest as Request, mockResponse as Response, jest.fn());

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          domain: 'timeout.com',
          content: null,
          status: 'error',
          error_message: expect.stringContaining('Network Error'),
        }),
      });

      // Verify cache saved with error status
      expect(mockAdsTxtCacheModel.saveCache).toHaveBeenCalledWith(
        expect.objectContaining({
          domain: 'timeout.com',
          status: 'error',
        })
      );
    });

    it('should extract root domain correctly from subdomains', async () => {
      // Setup request with subdomain in domain parameter
      mockRequest.params = { domain: 'sub.example.com' };

      // Mock model functions - no cache
      mockAdsTxtCacheModel.getByDomain.mockResolvedValue(null);
      mockAdsTxtCacheModel.saveCache.mockImplementation(async (data) => ({
        id: '1',
        domain: data.domain,
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      // Mock successful response
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: 'example.com, 12345, DIRECT',
        request: {
          res: {
            responseUrl: 'https://example.com/ads.txt',
          },
        },
      });

      // Call the controller
      await getAdsTxt(mockRequest as Request, mockResponse as Response, jest.fn());

      // Verify root domain was extracted correctly
      expect(mockedAxios.get).toHaveBeenNthCalledWith(
        1,
        'https://example.com/ads.txt',
        expect.any(Object)
      );

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          domain: 'sub.example.com',
          content: 'example.com, 12345, DIRECT',
        }),
      });
    });
  });
});
