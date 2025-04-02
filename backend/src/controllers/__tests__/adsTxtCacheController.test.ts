import { Request, Response } from 'express';
import axios from 'axios';
import { getAdsTxt } from '../adsTxtCacheController';
import AdsTxtCacheModel, { AdsTxtCache, AdsTxtCacheStatus } from '../../models/AdsTxtCache';

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
    it('should return cached ads.txt if available and not expired', async () => {
      // Setup request
      mockRequest.params = { domain: 'example.com' };

      // Mock cache data
      const cachedData: AdsTxtCache = {
        id: '1',
        domain: 'example.com',
        content: 'example.com, 12345, DIRECT',
        url: 'https://example.com/ads.txt',
        status: 'success' as AdsTxtCacheStatus,
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
          created_at: cachedData.created_at,
          updated_at: cachedData.updated_at,
        },
      });

      // Verify model calls
      expect(mockAdsTxtCacheModel.getByDomain).toHaveBeenCalledWith('example.com');
      expect(mockAdsTxtCacheModel.isCacheExpired).toHaveBeenCalledWith(cachedData.updated_at);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should fetch and update the cache if expired', async () => {
      // Setup request
      mockRequest.params = { domain: 'example.com' };

      // Mock cache data
      const cachedData: AdsTxtCache = {
        id: '1',
        domain: 'example.com',
        content: 'example.com, 12345, DIRECT',
        url: 'https://example.com/ads.txt',
        status: 'success' as AdsTxtCacheStatus,
        status_code: 200,
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updatedData: AdsTxtCache = {
        ...cachedData,
        content: 'example.com, 12345, DIRECT, updated',
        error_message: null,
        updated_at: new Date().toISOString(),
      };

      // Mock model functions
      mockAdsTxtCacheModel.getByDomain.mockResolvedValue(cachedData);
      mockAdsTxtCacheModel.isCacheExpired.mockReturnValue(true);
      mockAdsTxtCacheModel.saveCache.mockResolvedValue(updatedData);

      // Mock axios response
      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: 'example.com, 12345, DIRECT, updated',
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
          created_at: updatedData.created_at,
          updated_at: updatedData.updated_at,
        },
      });

      // Verify model calls
      expect(mockAdsTxtCacheModel.getByDomain).toHaveBeenCalledWith('example.com');
      expect(mockAdsTxtCacheModel.isCacheExpired).toHaveBeenCalledWith(cachedData.updated_at);
      expect(mockedAxios.get).toHaveBeenCalledWith(expect.any(String), expect.any(Object));
    });

    it('should fetch and create a new cache entry if none exists', async () => {
      // Setup request
      mockRequest.params = { domain: 'example.com' };

      // Mock model functions
      mockAdsTxtCacheModel.getByDomain.mockResolvedValue(null);
      mockAdsTxtCacheModel.saveCache.mockImplementation(
        async (data) =>
          ({
            id: '1',
            ...data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }) as AdsTxtCache
      );

      // Mock axios response
      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: 'example.com, 12345, DIRECT',
      });

      // Call the controller
      await getAdsTxt(mockRequest as Request, mockResponse as Response, jest.fn());

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          domain: 'example.com',
          content: 'example.com, 12345, DIRECT',
          status: 'success',
          status_code: 200,
        }),
      });

      // Verify model calls
      expect(mockAdsTxtCacheModel.getByDomain).toHaveBeenCalledWith('example.com');
      expect(mockedAxios.get).toHaveBeenCalledWith(expect.any(String), expect.any(Object));
      expect(mockAdsTxtCacheModel.saveCache).toHaveBeenCalled();
    });

    it('should handle 404 not found from the API', async () => {
      // Setup request
      mockRequest.params = { domain: 'example.com' };

      // Mock model functions
      mockAdsTxtCacheModel.getByDomain.mockResolvedValue(null);

      // Mock axios response - 404 not found
      const axiosError = new Error('Request failed with status code 404');
      (axiosError as any).response = { status: 404 };
      mockedAxios.get.mockRejectedValue(axiosError);

      // Mock saveCache to return consistent results matching controller's expectations
      mockAdsTxtCacheModel.saveCache.mockImplementation(async (data) => {
        return {
          id: '1',
          domain: data.domain,
          content: data.content,
          url: data.url,
          status: 'not_found',
          status_code: 404,
          error_message: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });

      // Call the controller
      await getAdsTxt(mockRequest as Request, mockResponse as Response, jest.fn());

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          domain: 'example.com',
          content: null,
          status: 'not_found',
          status_code: 404,
        }),
      });

      // Verify model calls
      expect(mockAdsTxtCacheModel.getByDomain).toHaveBeenCalledWith('example.com');
      expect(mockedAxios.get).toHaveBeenCalledWith(expect.any(String), expect.any(Object));
      expect(mockAdsTxtCacheModel.saveCache).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      // Setup request
      mockRequest.params = { domain: 'example.com' };

      // Mock model functions
      mockAdsTxtCacheModel.getByDomain.mockResolvedValue(null);

      // Mock axios response - network error
      mockedAxios.get.mockRejectedValue(new Error('Network Error'));

      // Call the controller
      await getAdsTxt(mockRequest as Request, mockResponse as Response, jest.fn());

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          domain: 'example.com',
          content: null,
          status: 'error',
          error_message: expect.stringContaining('Error'),
        }),
      });

      // Verify model calls
      expect(mockAdsTxtCacheModel.getByDomain).toHaveBeenCalledWith('example.com');
      expect(mockedAxios.get).toHaveBeenCalledWith(expect.any(String), expect.any(Object));
      expect(mockAdsTxtCacheModel.saveCache).toHaveBeenCalled();
    });

    it('should return error when domain is missing', async () => {
      // Setup request - missing domain
      mockRequest.params = {};

      // Mock the next function to capture the error
      const mockNext = jest.fn();

      // Call the controller
      await getAdsTxt(mockRequest as Request, mockResponse as Response, mockNext);

      // Verify next was called with an error
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 400,
        message: 'Domain is required'
      }));

      // Verify no model calls
      expect(mockAdsTxtCacheModel.getByDomain).not.toHaveBeenCalled();
      expect(mockedAxios.get).not.toHaveBeenCalled();
      expect(mockAdsTxtCacheModel.saveCache).not.toHaveBeenCalled();
    });
  });
});
