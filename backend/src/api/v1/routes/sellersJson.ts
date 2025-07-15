import express from 'express';
import { getSellerById, batchGetSellers } from '../../../controllers/sellersJsonController';
import { validateApiKeyOrExtension } from '../middleware/auth';

const router = express.Router();

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
 *         description: Domain's sellers.json not found
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
