import express from 'express';
import { validateQuick } from '../controllers/adsTxtController';

const router = express.Router();

/**
 * @swagger
 * /adstxt/validate/quick:
 *   post:
 *     summary: Quick ads.txt validation (10-20x faster)
 *     description: Fast syntax-only validation without database queries or sellers.json cross-checking. Ideal for real-time validation UX.
 *     tags:
 *       - Ads.txt Validation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QuickValidationRequest'
 *           examples:
 *             basic:
 *               summary: Basic validation
 *               value:
 *                 content: "google.com, pub-1234567890, DIRECT, f08c47fec0942fa0\nfacebook.com, 123456789, DIRECT"
 *                 checkDuplicates: true
 *     responses:
 *       200:
 *         description: Validation completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuickValidationResponse'
 *       400:
 *         description: Bad request - missing or invalid content
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
router.post('/validate/quick', validateQuick);

export default router;
