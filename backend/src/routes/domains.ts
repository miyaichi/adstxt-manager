import express from 'express';
import { getDomainInfo, getBatchDomainInfo } from '../controllers/domainController';

const router = express.Router();

/**
 * @route GET /api/domains/:domain/info
 * @desc Get comprehensive domain information (ads.txt + sellers.json status)
 * @access Public
 */
router.get('/:domain/info', getDomainInfo);

/**
 * @route POST /api/domains/batch/info
 * @desc Get information for multiple domains at once (max 50)
 * @access Public
 */
router.post('/batch/info', getBatchDomainInfo);

export default router;
