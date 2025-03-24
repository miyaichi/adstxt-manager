import SellersJsonCacheModel from './SellersJsonCache';
import db from '../config/database';

// Mock the database
jest.mock('../config/database', () => ({
  get: jest.fn(),
  run: jest.fn(),
}));

describe('SellersJsonCache Model', () => {
  // Mock data
  const mockCache = {
    id: 'cache-123',
    domain: 'example.com',
    content: JSON.stringify({ sellers: [{ seller_id: 'abc123', name: 'Example Seller' }] }),
    status: 'success',
    status_code: 200,
    error_message: null,
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('getByDomain', () => {
    it('should return cache data when found', async () => {
      // Mock the database response
      (db.get as jest.Mock).mockImplementation((query, params, callback) => {
        callback(null, mockCache);
      });

      // Call the method
      const result = await SellersJsonCacheModel.getByDomain('example.com');

      // Assert
      expect(db.get).toHaveBeenCalledWith(
        'SELECT * FROM sellers_json_cache WHERE domain = ?',
        ['example.com'],
        expect.any(Function)
      );
      expect(result).toEqual(mockCache);
    });

    it('should return null when cache not found', async () => {
      // Mock the database response
      (db.get as jest.Mock).mockImplementation((query, params, callback) => {
        callback(null, null);
      });

      // Call the method
      const result = await SellersJsonCacheModel.getByDomain('nonexistent.com');

      // Assert
      expect(result).toBeNull();
    });

    it('should reject with error on database error', async () => {
      // Mock the database error
      const dbError = new Error('Database error');
      (db.get as jest.Mock).mockImplementation((query, params, callback) => {
        callback(dbError, null);
      });

      // Call the method and expect it to reject
      await expect(SellersJsonCacheModel.getByDomain('example.com')).rejects.toEqual(dbError);
    });
  });

  describe('isCacheExpired', () => {
    it('should return true for data older than 1 day', () => {
      // Create a date more than 1 day in the past
      const oneDayAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      
      // Call the method
      const result = SellersJsonCacheModel.isCacheExpired(oneDayAgo);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for data less than 1 day old', () => {
      // Create a date less than 1 day in the past
      const lessThanOneDayAgo = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString();
      
      // Call the method
      const result = SellersJsonCacheModel.isCacheExpired(lessThanOneDayAgo);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('saveCache', () => {
    const newCacheData = {
      domain: 'example.com',
      content: JSON.stringify({ sellers: [{ seller_id: 'abc123', name: 'Example Seller' }] }),
      status: 'success' as const,
      status_code: 200,
      error_message: null,
    };

    it('should update existing cache record', async () => {
      // Mock existing record check
      (db.get as jest.Mock).mockImplementationOnce((query, params, callback) => {
        callback(null, mockCache);
      });

      // Mock the update query
      (db.run as jest.Mock).mockImplementationOnce((query, params, callback) => {
        callback(null, { changes: 1 });
      });

      // Mock the get updated record query
      (db.get as jest.Mock).mockImplementationOnce((query, params, callback) => {
        callback(null, {
          ...mockCache,
          content: newCacheData.content,
          updated_at: expect.any(String),
        });
      });

      // Call the method
      const result = await SellersJsonCacheModel.saveCache(newCacheData);

      // Assert
      expect(db.get).toHaveBeenCalledTimes(2);
      expect(db.run).toHaveBeenCalledTimes(1);
      expect(result.domain).toEqual(newCacheData.domain);
      expect(result.content).toEqual(newCacheData.content);
    });

    it('should insert new cache record when not exists', async () => {
      // Mock existing record check (not found)
      (db.get as jest.Mock).mockImplementationOnce((query, params, callback) => {
        callback(null, null);
      });

      // Mock the insert query
      (db.run as jest.Mock).mockImplementationOnce((query, params, callback) => {
        callback(null, { lastID: 1 });
      });

      // Call the method
      const result = await SellersJsonCacheModel.saveCache(newCacheData);

      // Assert
      expect(db.get).toHaveBeenCalledTimes(1);
      expect(db.run).toHaveBeenCalledTimes(1);
      expect(result.domain).toEqual(newCacheData.domain);
      expect(result.content).toEqual(newCacheData.content);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();
    });

    it('should reject on database error during check', async () => {
      // Mock database error
      const dbError = new Error('Database error');
      (db.get as jest.Mock).mockImplementationOnce((query, params, callback) => {
        callback(dbError, null);
      });

      // Call the method and expect it to reject
      await expect(SellersJsonCacheModel.saveCache(newCacheData)).rejects.toEqual(dbError);
    });

    it('should reject on database error during update', async () => {
      // Mock existing record check
      (db.get as jest.Mock).mockImplementationOnce((query, params, callback) => {
        callback(null, mockCache);
      });

      // Mock database error during update
      const dbError = new Error('Database error');
      (db.run as jest.Mock).mockImplementationOnce((query, params, callback) => {
        callback(dbError);
      });

      // Call the method and expect it to reject
      await expect(SellersJsonCacheModel.saveCache(newCacheData)).rejects.toEqual(dbError);
    });
  });
});