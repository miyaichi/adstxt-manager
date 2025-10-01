import express from 'express';
import { getDomainInfo, getBatchDomainInfo } from '../controllers/domainController';

const router = express.Router();

/**
 * @swagger
 * /domains/{domain}/info:
 *   get:
 *     summary: Get comprehensive domain information
 *     description: Get ads.txt and sellers.json status for a domain in a single API call. Reduces API calls by 60-70%.
 *     tags:
 *       - Domains
 *     parameters:
 *       - in: path
 *         name: domain
 *         required: true
 *         schema:
 *           type: string
 *         description: Domain name to query
 *         example: example.com
 *     responses:
 *       200:
 *         description: Domain information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DomainInfoResponse'
 *       400:
 *         description: Bad request - missing or invalid domain
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
router.get('/:domain/info', getDomainInfo);

/**
 * @swagger
 * /domains/batch/info:
 *   post:
 *     summary: Get information for multiple domains (batch)
 *     description: Get ads.txt and sellers.json status for up to 50 domains in a single request. Reduces API calls by 90%+.
 *     tags:
 *       - Domains
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BatchDomainInfoRequest'
 *           examples:
 *             multiple_domains:
 *               summary: Multiple domains
 *               value:
 *                 domains:
 *                   - example.com
 *                   - google.com
 *                   - facebook.com
 *     responses:
 *       200:
 *         description: Batch domain information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BatchDomainInfoResponse'
 *       400:
 *         description: Bad request - missing domains array or exceeds maximum (50)
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
router.post('/batch/info', getBatchDomainInfo);

export default router;
