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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     domain:
 *                       type: string
 *                       example: google.com
 *                     seller:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         seller_id:
 *                           type: string
 *                           example: pub-1234567890123456
 *                         name:
 *                           type: string
 *                           example: Google AdSense
 *                         seller_type:
 *                           type: string
 *                           enum: [PUBLISHER, INTERMEDIARY, BOTH]
 *                           example: PUBLISHER
 *                     found:
 *                       type: boolean
 *                       example: true
 *                     key:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     params:
 *                       type: object
 *                       nullable: true
 *                       example: null
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         contact_email:
 *                           type: string
 *                           example: contact@google.com
 *                         contact_address:
 *                           type: string
 *                           example: 1600 Amphitheatre Parkway, Mountain View, CA 94043
 *                         version:
 *                           type: string
 *                           example: "1.0"
 *                         seller_count:
 *                           type: integer
 *                           example: 1
 *                     cache:
 *                       type: object
 *                       properties:
 *                         is_cached:
 *                           type: boolean
 *                           example: true
 *                         last_updated:
 *                           type: string
 *                           format: date-time
 *                           example: "2023-01-01T00:00:00Z"
 *                         status:
 *                           type: string
 *                           enum: [success, not_found, error, invalid_format]
 *                           example: success
 *                         expires_at:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                           example: "2023-01-02T00:00:00Z"
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