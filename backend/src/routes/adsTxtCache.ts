import express from 'express';
import { getAdsTxt } from '../controllers/adsTxtCacheController';

const router = express.Router();

/**
 * @route GET /api/adsTxtCache/domain/:domain
 * @desc Get ads.txt for a domain with optional subdomain support
 * @access Public
 */
router.get('/domain/:domain', getAdsTxt);

export default router;