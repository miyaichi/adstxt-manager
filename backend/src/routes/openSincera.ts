import express from 'express';
import {
  getPublisherMetadata,
  getPublisherByDomain,
  getPublisherById,
  healthCheck,
} from '../controllers/openSinceraController';

const router = express.Router();

// Health check endpoint
router.get('/health', healthCheck);

// Publisher metadata endpoints
router.get('/publishers/metadata', getPublisherMetadata);
router.get('/publishers/domain/:domain', getPublisherByDomain);
router.get('/publishers/:publisherId', getPublisherById);

export default router;