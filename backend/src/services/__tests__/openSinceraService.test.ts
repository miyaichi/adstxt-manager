import axios from 'axios';
import { OpenSinceraService } from '../openSinceraService';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OpenSinceraService', () => {
  let service: OpenSinceraService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock axios.create to return a properly mocked instance
    const mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      request: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

    // Create service instance with test API key
    service = new OpenSinceraService({
      baseUrl: 'https://api.test.com/v1',
      apiKey: 'test-api-key',
      timeout: 5000,
    });
  });

  describe('getPublisherMetadata', () => {
    it('should successfully fetch publisher metadata', async () => {
      const mockResponse = {
        status: 200,
        data: {
          publishers: [
            {
              publisherId: 'test-publisher-1',
              publisherName: 'Test Publisher',
              publisherDomain: 'example.com',
              status: 'active',
              lastUpdated: '2023-01-01T00:00:00Z',
              verificationStatus: 'verified',
            },
          ],
          totalCount: 1,
          hasMore: false,
        },
      };

      // Mock the axios instance's get method
      (service as any).client.get = jest.fn().mockResolvedValue(mockResponse);

      const result = await service.getPublisherMetadata({
        publisherDomain: 'example.com',
      });

      expect(result).toEqual(mockResponse.data);
      expect((service as any).client.get).toHaveBeenCalledWith('/publishers/metadata', {
        params: { publisherDomain: 'example.com' },
      });
    });

    it('should handle API errors gracefully', async () => {
      const mockError = {
        isAxiosError: true,
        response: {
          status: 401,
          data: { error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } },
        },
      };

      // Mock axios.isAxiosError to return true for our mock error
      jest.spyOn(require('axios'), 'isAxiosError').mockReturnValue(true);

      (service as any).client.get = jest.fn().mockRejectedValue(mockError);

      await expect(
        service.getPublisherMetadata({ publisherDomain: 'example.com' })
      ).rejects.toThrow('OpenSincera API Error: Invalid API key (UNAUTHORIZED)');
    });

    it('should handle network errors', async () => {
      const mockError = new Error('Network error');
      (service as any).client.get = jest.fn().mockRejectedValue(mockError);

      await expect(
        service.getPublisherMetadata({ publisherDomain: 'example.com' })
      ).rejects.toThrow('Network error');
    });
  });

  describe('getPublisherByDomain', () => {
    it('should return publisher when found', async () => {
      const mockPublisher = {
        publisherId: 'test-publisher-1',
        publisherName: 'Test Publisher',
        publisherDomain: 'example.com',
        status: 'active',
        lastUpdated: '2023-01-01T00:00:00Z',
        verificationStatus: 'verified',
      };

      const mockResponse = {
        status: 200,
        data: {
          publishers: [mockPublisher],
          totalCount: 1,
          hasMore: false,
        },
      };

      (service as any).client.get = jest.fn().mockResolvedValue(mockResponse);

      const result = await service.getPublisherByDomain('example.com');
      expect(result).toEqual(mockPublisher);
    });

    it('should return null when publisher not found', async () => {
      const mockResponse = {
        status: 200,
        data: {
          publishers: [],
          totalCount: 0,
          hasMore: false,
        },
      };

      (service as any).client.get = jest.fn().mockResolvedValue(mockResponse);

      const result = await service.getPublisherByDomain('nonexistent.com');
      expect(result).toBeNull();
    });
  });

  describe('healthCheck', () => {
    it('should return true when API is healthy', async () => {
      const mockResponse = { status: 200 };
      (service as any).client.get = jest.fn().mockResolvedValue(mockResponse);

      const result = await service.healthCheck();
      expect(result).toBe(true);
    });

    it('should return false when API is unhealthy', async () => {
      const mockError = new Error('Service unavailable');
      (service as any).client.get = jest.fn().mockRejectedValue(mockError);

      const result = await service.healthCheck();
      expect(result).toBe(false);
    });
  });
});