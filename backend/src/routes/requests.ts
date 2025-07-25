import express from 'express';
import multer from 'multer';
import {
  createRequest,
  getRequest,
  getRequestsByEmail,
  updatePublisherInfo,
  updateRequest,
  updateRequestStatus,
} from '../controllers/requestController';

const router = express.Router();

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Routes
router.post('/', upload.single('adsTxtFile') as any, createRequest);
router.get('/:id', getRequest);
router.patch('/:id/status', updateRequestStatus);
router.patch('/:id/publisher', updatePublisherInfo);
router.put('/:id', updateRequest);
router.get('/email/:email', getRequestsByEmail);

export default router;
