import db from '../config/database';
import AdsTxtCacheModel from './AdsTxtCache';

// Mock the database
jest.mock('../config/database', () => ({
  get: jest.fn(),
  run: jest.fn()
}));

describe('AdsTxtCache Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getByDomain', () => {
    it('should retrieve a cache entry by domain', async () => {
      const mockCacheEntry = {
        id: '1',
        domain: 'example.com',
        content: 'example.com, 12345, DIRECT',
        url: 'https://example.com/ads.txt',
        status: 'success',
        status_code: 200,
        error_message: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z'
      };

      // Mock db.get to return a cache entry
      (db.get as jest.Mock).mockImplementation((query, params, callback) => {
        callback(null, mockCacheEntry);
      });

      const result = await AdsTxtCacheModel.getByDomain('example.com');

      expect(result).toEqual(mockCacheEntry);
      expect(db.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM ads_txt_cache WHERE domain = ?'),
        ['example.com'],
        expect.any(Function)
      );
    });

    it('should return null if no cache entry exists', async () => {
      // Mock db.get to return undefined (no entry found)
      (db.get as jest.Mock).mockImplementation((query, params, callback) => {
        callback(null, undefined);
      });

      const result = await AdsTxtCacheModel.getByDomain('nonexistent.com');

      expect(result).toBeNull();
    });

    it('should reject if database error occurs', async () => {
      const dbError = new Error('Database error');

      // Mock db.get to throw an error
      (db.get as jest.Mock).mockImplementation((query, params, callback) => {
        callback(dbError, undefined);
      });

      await expect(AdsTxtCacheModel.getByDomain('example.com')).rejects.toThrow(dbError);
    });
  });

  describe('isCacheExpired', () => {
    it('should return false for recent timestamps', () => {
      // Current timestamp
      const recentTimestamp = new Date().toISOString();
      expect(AdsTxtCacheModel.isCacheExpired(recentTimestamp)).toBe(false);
    });

    it('should return true for old timestamps', () => {
      // Timestamp from 25 hours ago (default expiration is 24 hours)
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000);
      const oldTimestamp = oldDate.toISOString();
      expect(AdsTxtCacheModel.isCacheExpired(oldTimestamp)).toBe(true);
    });

    it('should respect custom expiration hours', () => {
      // Timestamp from 5 hours ago
      const date = new Date(Date.now() - 5 * 60 * 60 * 1000);
      const timestamp = date.toISOString();

      // Should not be expired with 6 hour expiration
      expect(AdsTxtCacheModel.isCacheExpired(timestamp, 6)).toBe(false);

      // Should be expired with 4 hour expiration
      expect(AdsTxtCacheModel.isCacheExpired(timestamp, 4)).toBe(true);
    });
  });

  describe('saveCache', () => {
    it('should update an existing cache entry', async () => {
      // Mock existing cache entry
      const existingEntry = {
        id: '1',
        domain: 'example.com',
        content: 'old content',
        url: 'https://example.com/ads.txt',
        status: 'success',
        status_code: 200,
        error_message: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z'
      };

      // New data to save
      const updateData = {
        domain: 'example.com',
        content: 'new content',
        url: 'https://example.com/ads.txt',
        status: 'success',
        status_code: 200,
        error_message: null
      };

      // Mock getByDomain to return existing entry
      jest.spyOn(AdsTxtCacheModel, 'getByDomain').mockResolvedValue(existingEntry);

      // Mock db.run for UPDATE
      (db.run as jest.Mock).mockImplementation((query, params, callback) => {
        callback(null);
      });

      const result = await AdsTxtCacheModel.saveCache(updateData);

      // Should update existing entry
      expect(result.id).toBe(existingEntry.id);
      expect(result.content).toBe(updateData.content);
      expect(result.updated_at).not.toBe(existingEntry.updated_at);

      // Verify UPDATE query was used
      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE ads_txt_cache'),
        expect.arrayContaining([updateData.content]),
        expect.any(Function)
      );
    });

    it('should create a new cache entry if one doesn\'t exist', async () => {
      // New data to save
      const newData = {
        domain: 'newdomain.com',
        content: 'new content',
        url: 'https://newdomain.com/ads.txt',
        status: 'success',
        status_code: 200,
        error_message: null
      };

      // Mock getByDomain to return null (no existing entry)
      jest.spyOn(AdsTxtCacheModel, 'getByDomain').mockResolvedValue(null);

      // Mock db.run for INSERT
      (db.run as jest.Mock).mockImplementation((query, params, callback) => {
        callback(null);
      });

      const result = await AdsTxtCacheModel.saveCache(newData);

      // Should create new entry
      expect(result.id).toBeDefined();
      expect(result.domain).toBe(newData.domain);
      expect(result.content).toBe(newData.content);
      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();

      // Verify INSERT query was used
      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ads_txt_cache'),
        expect.arrayContaining([result.id, newData.domain, newData.content]),
        expect.any(Function)
      );
    });

    it('should handle database errors during save', async () => {
      const dbError = new Error('Database error');
      
      // Mock getByDomain to return null
      jest.spyOn(AdsTxtCacheModel, 'getByDomain').mockResolvedValue(null);

      // Mock db.run to throw an error
      (db.run as jest.Mock).mockImplementation((query, params, callback) => {
        callback(dbError);
      });

      const saveData = {
        domain: 'example.com',
        content: 'content',
        url: 'https://example.com/ads.txt',
        status: 'success' as const,
        status_code: 200,
        error_message: null
      };

      await expect(AdsTxtCacheModel.saveCache(saveData)).rejects.toThrow(dbError);
    });
  });
});