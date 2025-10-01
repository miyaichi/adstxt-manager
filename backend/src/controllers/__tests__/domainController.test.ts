import request from 'supertest';
import express from 'express';
import domainRoutes from '../../api/v1/routes/domains';
import AdsTxtCache from '../../models/AdsTxtCache';
import SellersJsonCache from '../../models/SellersJsonCache';

// Mock the models
jest.mock('../../models/AdsTxtCache');
jest.mock('../../models/SellersJsonCache');

const app = express();
app.use(express.json());
app.use('/api/v1/domains', domainRoutes);

describe('Domain Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/domains/:domain/info', () => {
    it('should return domain info when both ads.txt and sellers.json exist', async () => {
      const mockAdsTxtCache = {
        domain: 'example.com',
        content:
          'google.com, pub-123, DIRECT, f08c47fec0942fa0\nfacebook.com, 456, RESELLER\n# Comment',
        status: 'success',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockSellersJsonCache = {
        domain: 'google.com',
        seller_count: 100,
        status: 'success',
        updated_at: '2024-01-01T00:00:00Z',
      };

      (AdsTxtCache.getByDomain as jest.Mock).mockResolvedValue(mockAdsTxtCache);
      (SellersJsonCache.getByDomain as jest.Mock).mockResolvedValue(mockSellersJsonCache);

      const response = await request(app).get('/api/v1/domains/example.com/info').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.domain).toBe('example.com');
      expect(response.body.data.ads_txt.exists).toBe(true);
      expect(response.body.data.ads_txt.status).toBe('success');
      expect(response.body.data.ads_txt.record_count).toBe(2);
      expect(response.body.data.sellers_json.exists).toBe(true);
      expect(response.body.data.sellers_json.status).toBe('success');
      expect(response.body.data.sellers_json.seller_count).toBe(100);
    });

    it('should return domain info when neither exists', async () => {
      (AdsTxtCache.getByDomain as jest.Mock).mockResolvedValue(null);
      (SellersJsonCache.getByDomain as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/api/v1/domains/notfound.com/info').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.domain).toBe('notfound.com');
      expect(response.body.data.ads_txt.exists).toBe(false);
      expect(response.body.data.ads_txt.status).toBe('not_found');
      expect(response.body.data.sellers_json.exists).toBe(false);
      expect(response.body.data.sellers_json.status).toBe('not_found');
    });

    it('should normalize domain to lowercase', async () => {
      (AdsTxtCache.getByDomain as jest.Mock).mockResolvedValue(null);
      (SellersJsonCache.getByDomain as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/api/v1/domains/EXAMPLE.COM/info').expect(200);

      expect(response.body.data.domain).toBe('example.com');
      expect(AdsTxtCache.getByDomain).toHaveBeenCalledWith('example.com');
    });
  });

  describe('POST /api/v1/domains/batch/info', () => {
    it('should return batch domain info', async () => {
      const domains = ['example.com', 'google.com', 'facebook.com'];

      (AdsTxtCache.getByDomain as jest.Mock).mockImplementation((domain: string) => {
        if (domain === 'example.com') {
          return Promise.resolve({
            domain,
            content: 'google.com, pub-123, DIRECT',
            status: 'success',
          });
        }
        return Promise.resolve(null);
      });

      (SellersJsonCache.getByDomain as jest.Mock).mockImplementation((domain: string) => {
        if (domain === 'google.com') {
          return Promise.resolve({
            domain,
            seller_count: 100,
            status: 'success',
          });
        }
        return Promise.resolve(null);
      });

      const response = await request(app)
        .post('/api/v1/domains/batch/info')
        .send({ domains })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.domains).toHaveLength(3);
      expect(response.body.data.summary.total_domains).toBe(3);
      expect(response.body.data.summary.with_ads_txt).toBe(1);
      expect(response.body.data.summary.with_sellers_json).toBe(1);
      expect(response.body.data.summary.with_both).toBe(0);
    });

    it('should reject empty domains array', async () => {
      await request(app).post('/api/v1/domains/batch/info').send({ domains: [] }).expect(400);
    });

    it('should reject more than 50 domains', async () => {
      const domains = Array(51)
        .fill(0)
        .map((_, i) => `domain${i}.com`);

      await request(app).post('/api/v1/domains/batch/info').send({ domains }).expect(400);
    });

    it('should remove duplicate domains', async () => {
      const domains = ['example.com', 'example.com', 'google.com'];

      (AdsTxtCache.getByDomain as jest.Mock).mockResolvedValue(null);
      (SellersJsonCache.getByDomain as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/domains/batch/info')
        .send({ domains })
        .expect(200);

      expect(response.body.data.domains).toHaveLength(2);
      expect(AdsTxtCache.getByDomain).toHaveBeenCalledTimes(2);
    });

    it('should normalize all domains to lowercase', async () => {
      const domains = ['EXAMPLE.COM', 'Google.Com'];

      (AdsTxtCache.getByDomain as jest.Mock).mockResolvedValue(null);
      (SellersJsonCache.getByDomain as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/domains/batch/info')
        .send({ domains })
        .expect(200);

      expect(response.body.data.domains[0].domain).toBe('example.com');
      expect(response.body.data.domains[1].domain).toBe('google.com');
    });
  });
});
