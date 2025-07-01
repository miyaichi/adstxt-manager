import express from 'express';
import requestsRoutes from './requests';
import sellersJsonRoutes from './sellersJson';
import { validateApiKey } from '../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * /status:
 *   get:
 *     summary: Get API status
 *     tags: [Status]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: API status information
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
 *                     status:
 *                       type: string
 *                       enum: [online]
 *                       example: online
 *                     version:
 *                       type: string
 *                       example: 1.0.0
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: 2023-01-01T00:00:00Z
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
 */
router.get('/status', validateApiKey, (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'online',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    },
  });
});

// Mount sub-routers
router.use('/requests', requestsRoutes);
router.use('/sellersjson', sellersJsonRoutes);

export default router;
