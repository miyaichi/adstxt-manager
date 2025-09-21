import express from 'express';
import {
  getSellerById,
  batchGetSellers,
  batchGetSellersStream,
  batchGetSellersParallel,
  getHealthCheck,
  getPerformanceStats
} from '../../../controllers/sellersJsonController';
import { validateApiKeyOrExtension } from '../middleware/auth';

const router = express.Router();
// Health check endpoint - no auth required for monitoring
router.get('/health', getHealthCheck);

// Performance statistics endpoint - no auth required for monitoring  
router.get('/stats', getPerformanceStats);

// Parallel batch processing endpoint for multiple domains
router.post('/batch/parallel', validateApiKeyOrExtension, batchGetSellersParallel);
// Streaming batch endpoint for progressive responses
router.post('/:domain/sellers/batch/stream', validateApiKeyOrExtension, batchGetSellersStream);

/**
 * @swagger
 * /sellersjson/{domain}/sellers/batch:
 *   post:
 *     summary: Get multiple sellers from a domain's sellers.json in a single request
 *     description: |
 *       Fetches multiple seller entries from a domain's sellers.json file in one HTTP request.
 *
 *       **Performance Benefits:**
 *       - Reduces HTTP overhead (multiple requests → single request)
 *       - Minimizes connection establishment overhead
 *       - Reduces total response time by 70-80%
 *       - Optimal for Chrome Extension environment with connection limits
 *
 *       **Rate Limits:**
 *       - Maximum 100 seller IDs per request
 *       - 1000 requests per hour per API key
 *       - 10,000 seller IDs per hour per API key
 *     tags: [SellersJson Batch]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: domain
 *         required: true
 *         schema:
 *           type: string
 *         description: Domain to get sellers.json from
 *         example: impact-ad.jp
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sellerIds
 *             properties:
 *               sellerIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   minLength: 1
 *                   maxLength: 100
 *                 description: Array of seller IDs to fetch
 *                 example: ["3305", "pub-1234567890123456", "9876543210"]
 *                 minItems: 1
 *                 maxItems: 100
 *               force:
 *                 type: boolean
 *                 description: Force refresh cache
 *                 default: false
 *                 example: false
 *     responses:
 *       200:
 *         description: Batch seller information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BatchSellersResponse'
 *             examples:
 *               success_all_found:
 *                 summary: All sellers found
 *                 value:
 *                   success: true
 *                   data:
 *                     domain: "example.com"
 *                     requested_count: 2
 *                     found_count: 2
 *                     results:
 *                       - sellerId: "1001"
 *                         seller:
 *                           seller_id: "1001"
 *                           seller_type: "PUBLISHER"
 *                           name: "Example Publisher 1"
 *                           domain: "example.com"
 *                         found: true
 *                         source: "cache"
 *                       - sellerId: "1002"
 *                         seller:
 *                           seller_id: "1002"
 *                           seller_type: "INTERMEDIARY"
 *                           name: "Example Intermediary"
 *                           domain: "example.com"
 *                         found: true
 *                         source: "cache"
 *                     metadata:
 *                       seller_count: 50
 *                       status: "success"
 *                     cache:
 *                       is_cached: true
 *                       last_updated: "2025-07-15T10:00:00.000Z"
 *                       status: "success"
 *                       expires_at: "2025-07-16T10:00:00.000Z"
 *                     processing_time_ms: 45
 *               partial_found:
 *                 summary: Some sellers found, some not found
 *                 value:
 *                   success: true
 *                   data:
 *                     domain: "example.com"
 *                     requested_count: 3
 *                     found_count: 2
 *                     results:
 *                       - sellerId: "1001"
 *                         seller:
 *                           seller_id: "1001"
 *                           seller_type: "PUBLISHER"
 *                           name: "Example Publisher 1"
 *                           domain: "example.com"
 *                         found: true
 *                         source: "cache"
 *                       - sellerId: "1002"
 *                         seller:
 *                           seller_id: "1002"
 *                           seller_type: "INTERMEDIARY"
 *                           name: "Example Intermediary"
 *                           domain: "example.com"
 *                         found: true
 *                         source: "cache"
 *                       - sellerId: "9999"
 *                         seller: null
 *                         found: false
 *                         error: "Seller not found in sellers.json"
 *                         source: "cache"
 *                     metadata:
 *                       seller_count: 50
 *                       status: "success"
 *                     cache:
 *                       is_cached: true
 *                       last_updated: "2025-07-15T10:00:00.000Z"
 *                       status: "success"
 *                       expires_at: "2025-07-16T10:00:00.000Z"
 *                     processing_time_ms: 67
 *               sellers_json_not_found:
 *                 summary: Domain's sellers.json not found
 *                 value:
 *                   success: true
 *                   data:
 *                     domain: "nonexistent-domain.com"
 *                     requested_count: 2
 *                     found_count: 0
 *                     results:
 *                       - sellerId: "1001"
 *                         seller: null
 *                         found: false
 *                         error: "sellers.json not found for domain"
 *                         source: "cache"
 *                       - sellerId: "1002"
 *                         seller: null
 *                         found: false
 *                         error: "sellers.json not found for domain"
 *                         source: "cache"
 *                     metadata:
 *                       seller_count: 0
 *                       status: "not_found"
 *                       error_message: "sellers.json file not found"
 *                     cache:
 *                       is_cached: true
 *                       last_updated: "2025-07-15T10:00:00.000Z"
 *                       status: "not_found"
 *                       expires_at: "2025-07-18T10:00:00.000Z"
 *                     processing_time_ms: 23
 *       400:
 *         description: Bad request - Invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Missing API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Invalid API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Domain's sellers.json not found (Note: This endpoint returns 200 with error details in response body. 404 is only returned for API-level errors)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many requests - Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:domain/sellers/batch', validateApiKeyOrExtension, batchGetSellers);

/**
 * @swagger
 * /sellersjson/{domain}/seller/{sellerId}:
 *   get:
 *     summary: Get a specific seller from a domain's sellers.json by seller ID
 *     tags: [SellersJson]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: domain
 *         required: true
 *         schema:
 *           type: string
 *         description: Domain to get sellers.json from
 *         example: google.com
 *       - in: path
 *         name: sellerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Seller ID to search for
 *         example: pub-1234567890123456
 *       - in: query
 *         name: force
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Force refresh cache
 *         example: false
 *     responses:
 *       200:
 *         description: Seller information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SellerResponse'
 *       400:
 *         description: Bad request - Invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Missing API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Invalid API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Seller not found or sellers.json not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:domain/seller/:sellerId', validateApiKeyOrExtension, getSellerById);

export default router;
