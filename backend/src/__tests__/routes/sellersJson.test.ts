import supertest from 'supertest';
import express from 'express';
import SellersJsonCacheModel from '../../models/SellersJsonCache';
import axios from 'axios';
import sellersJsonRoutes from '../../routes/sellersJson';
import { errorHandler } from '../../middleware/errorHandler';

// Mock the model and axios
jest.mock('../../models/SellersJsonCache');
jest.mock('axios');

// Setup test express app
const app = express();
app.use(express.json());
app.use('/api/sellersJson', sellersJsonRoutes);
app.use(errorHandler);

const request = supertest(app);

describe('Sellers.json API Routes', () => {
  // Sample sellers.json response for OpenX
  const mockOpenXSellersJson = {
    sellers: [
      {
        seller_id: '123456789',
        name: 'OpenX',
        domain: 'openx.com',
        seller_type: 'INTERMEDIARY',
      },
      {
        seller_id: '987654321',
        name: 'OpenX Europe',
        domain: 'uk.openx.com',
        seller_type: 'INTERMEDIARY',
      },
    ],
    contact_email: 'support@openx.com',
    version: '1.0',
  };

  const mockCache = {
    id: 'cache-123',
    domain: 'openx.com',
    content: JSON.stringify(mockOpenXSellersJson),
    status: 'success',
    status_code: 200,
    error_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/sellersJson/:domain', () => {
    it('should return sellers.json data from cache', async () => {
      // Arrange
      (SellersJsonCacheModel.getByDomain as jest.Mock).mockResolvedValue(mockCache);
      (SellersJsonCacheModel.isCacheExpired as jest.Mock).mockReturnValue(false);

      // Act
      const response = await request.get('/api/sellersJson/openx.com');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.domain).toBe('openx.com');
      expect(response.body.data.content).toEqual(mockOpenXSellersJson);
      expect(response.body.data.cached).toBe(true);
      expect(SellersJsonCacheModel.getByDomain).toHaveBeenCalledWith('openx.com');
      expect(SellersJsonCacheModel.isCacheExpired).toHaveBeenCalled();
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should fetch new sellers.json data if cache is expired', async () => {
      // Arrange
      (SellersJsonCacheModel.getByDomain as jest.Mock).mockResolvedValue(mockCache);
      (SellersJsonCacheModel.isCacheExpired as jest.Mock).mockReturnValue(true);

      (axios.get as jest.Mock).mockResolvedValue({
        status: 200,
        headers: { 'content-type': 'application/json' },
        data: mockOpenXSellersJson,
      });

      (SellersJsonCacheModel.saveCache as jest.Mock).mockResolvedValue({
        ...mockCache,
        updated_at: new Date().toISOString(),
      });

      // Act
      const response = await request.get('/api/sellersJson/openx.com');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.domain).toBe('openx.com');
      expect(response.body.data.content).toEqual(mockOpenXSellersJson);
      expect(response.body.data.cached).toBe(false);
      expect(SellersJsonCacheModel.getByDomain).toHaveBeenCalledWith('openx.com');
      expect(SellersJsonCacheModel.isCacheExpired).toHaveBeenCalled();
      expect(axios.get).toHaveBeenCalledWith('https://openx.com/sellers.json', expect.any(Object));
      expect(SellersJsonCacheModel.saveCache).toHaveBeenCalled();
    });

    it('should handle 404 not found responses', async () => {
      // Arrange
      (SellersJsonCacheModel.getByDomain as jest.Mock).mockResolvedValue(null);

      (axios.get as jest.Mock).mockResolvedValue({
        status: 404,
        headers: { 'content-type': 'text/html' },
        data: '<html><body>Not Found</body></html>',
      });

      (SellersJsonCacheModel.saveCache as jest.Mock).mockResolvedValue({
        id: 'cache-123',
        domain: 'openx.com',
        content: null,
        status: 'not_found',
        status_code: 404,
        error_message: 'sellers.json file not found',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Act
      const response = await request.get('/api/sellersJson/openx.com');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.domain).toBe('openx.com');
      expect(response.body.data.content).toBeNull();
      expect(response.body.data.status).toBe('not_found');
      expect(response.body.data.status_code).toBe(404);
      expect(SellersJsonCacheModel.saveCache).toHaveBeenCalledWith(
        expect.objectContaining({
          domain: 'openx.com',
          status: 'not_found',
          status_code: 404,
        })
      );
    });

    it('should handle invalid format responses', async () => {
      // Arrange
      (SellersJsonCacheModel.getByDomain as jest.Mock).mockResolvedValue(null);

      (axios.get as jest.Mock).mockResolvedValue({
        status: 200,
        headers: { 'content-type': 'text/html' },
        data: '<html><body>Some HTML content</body></html>',
      });

      (SellersJsonCacheModel.saveCache as jest.Mock).mockResolvedValue({
        id: 'cache-123',
        domain: 'openx.com',
        content: null,
        status: 'invalid_format',
        status_code: 200,
        error_message: 'Invalid content type: text/html',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Act
      const response = await request.get('/api/sellersJson/openx.com');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.domain).toBe('openx.com');
      expect(response.body.data.content).toBeNull();
      expect(response.body.data.status).toBe('invalid_format');
      expect(SellersJsonCacheModel.saveCache).toHaveBeenCalledWith(
        expect.objectContaining({
          domain: 'openx.com',
          status: 'invalid_format',
        })
      );
    });

    it('should return 400 for request without domain', async () => {
      // Act
      const response = await request.get('/api/sellersJson/');

      // Assert
      expect(response.status).toBe(404); // Express router will return 404 for this path
    });

    it('should handle network errors', async () => {
      // Arrange
      (SellersJsonCacheModel.getByDomain as jest.Mock).mockResolvedValue(null);

      const networkError = new Error('Network Error');
      (axios.get as jest.Mock).mockRejectedValue(networkError);

      (SellersJsonCacheModel.saveCache as jest.Mock).mockResolvedValue({
        id: 'cache-123',
        domain: 'openx.com',
        content: null,
        status: 'error',
        status_code: null,
        error_message: 'Network Error',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Act
      const response = await request.get('/api/sellersJson/openx.com');

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
      expect(response.body.message).toContain('Error fetching sellers.json');
      expect(SellersJsonCacheModel.saveCache).toHaveBeenCalled();
    });
  });
});
