import express from 'express';
import { getSellersJson, getSellerById } from '../controllers/sellersJsonController';

const router = express.Router();

// Route to get a specific seller by seller_id from a domain's sellers.json
// This route must be defined before the more generic /:domain route to avoid conflicts
router.get('/:domain/seller/:sellerId', getSellerById);

// Route to get sellers.json for a domain
router.get('/:domain', getSellersJson);

export default router;
