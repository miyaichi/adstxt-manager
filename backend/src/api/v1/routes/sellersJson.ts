import express from 'express';
import { getSellerById } from '../../../controllers/sellersJsonController';
import { validateApiKey } from '../middleware/auth';

const router = express.Router();

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
router.get('/:domain/seller/:sellerId', validateApiKey, getSellerById);

export default router;