import express from 'express';
import { 
  getSellersJson, 
  getSellerById, 
  getSellersJsonMetadata 
} from '../controllers/sellersJsonController';

const router = express.Router();

// Route to get only metadata from a domain's sellers.json
router.get('/:domain/metadata', getSellersJsonMetadata);

// Route to get a specific seller by seller_id from a domain's sellers.json
router.get('/:domain/seller/:sellerId', getSellerById);

// Route to get sellers.json for a domain (original endpoint for backward compatibility)
router.get('/:domain', getSellersJson);

export default router;
