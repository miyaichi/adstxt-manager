import request from 'supertest';
import express from 'express';
import adsTxtCacheRoutes from '../../routes/adsTxtCache';
import { getAdsTxt } from '../../controllers/adsTxtCacheController';
import { errorHandler } from '../../middleware/errorHandler';

// Mock the controller
jest.mock('../../controllers/adsTxtCacheController');
const mockGetAdsTxt = getAdsTxt as jest.Mock;

// Create a test express app
const app = express();
app.use(express.json());
app.use('/api/adsTxtCache', adsTxtCacheRoutes);
app.use(errorHandler);

describe('Ads.txt Cache Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/adsTxtCache/domain/:domain', () => {
    it('should call the getAdsTxt controller and return its response', async () => {
      const mockResponse = {
        success: true,
        data: {
          domain: 'example.com',
          content: 'example.com, 12345, DIRECT',
          url: 'https://example.com/ads.txt',
          status: 'success',
          status_code: 200,
          error_message: null,
          cached: true,
          updated_at: '2023-01-01T00:00:00.000Z'
        }
      };

      // Mock controller implementation
      mockGetAdsTxt.mockImplementation((req, res) => {
        res.status(200).json(mockResponse);
      });

      const response = await request(app)
        .get('/api/adsTxtCache/domain/example.com')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual(mockResponse);
      expect(mockGetAdsTxt).toHaveBeenCalled();
    });

    it('should support subdomain query parameter', async () => {
      const mockResponse = {
        success: true,
        data: {
          domain: 'blog.example.com',
          content: 'blog.example.com, 12345, DIRECT',
          url: 'https://blog.example.com/ads.txt',
          status: 'success',
          status_code: 200,
          error_message: null,
          cached: true,
          updated_at: '2023-01-01T00:00:00.000Z'
        }
      };

      // Mock controller implementation
      mockGetAdsTxt.mockImplementation((req, res) => {
        res.status(200).json(mockResponse);
      });

      const response = await request(app)
        .get('/api/adsTxtCache/domain/example.com')
        .query({ subdomain: 'blog' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual(mockResponse);
      expect(mockGetAdsTxt).toHaveBeenCalled();
      
      // Verify the subdomain parameter was passed to the controller
      const controllerReq = mockGetAdsTxt.mock.calls[0][0];
      expect(controllerReq.query.subdomain).toBe('blog');
    });

    it('should handle errors from the controller', async () => {
      // Mock controller to throw an error
      mockGetAdsTxt.mockImplementation((req, res, next) => {
        const error = new Error('Test error');
        error.name = 'ApiError';
        (error as any).statusCode = 400;
        next(error);
      });

      const response = await request(app)
        .get('/api/adsTxtCache/domain/example.com')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(mockGetAdsTxt).toHaveBeenCalled();
    });
  });
});