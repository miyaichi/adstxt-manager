import express from 'express';
import { getAdsTxt } from '../controllers/adsTxtCacheController';

const router = express.Router();

/**
 * @route GET /api/adsTxtCache/domain/:domain
 * @desc Get ads.txt or app-ads.txt for a domain with optional subdomain support
 * @param {string} fileType - Query parameter ('ads.txt' or 'app-ads.txt', defaults to 'ads.txt')
 * @param {boolean} force - Query parameter to force refresh the cache
 * @access Public
 */
router.get('/domain/:domain', getAdsTxt);

export default router;
