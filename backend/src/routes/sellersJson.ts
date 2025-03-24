import express from 'express';
import { getSellersJson } from '../controllers/sellersJsonController';

const router = express.Router();

// Route to get sellers.json for a domain
router.get('/:domain', getSellersJson);

export default router;