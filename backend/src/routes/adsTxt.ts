import express from 'express';
import multer from 'multer';
import {
  generateAdsTxtContent,
  getRecordsByRequestId,
  optimizeAdsTxtContent,
  processAdsTxtFile,
  updateRecordStatus,
  validateQuick,
} from '../controllers/adsTxtController';

const router = express.Router();

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Routes
router.patch('/:id/status', updateRecordStatus);

// Quick validation endpoint - fast syntax-only validation
router.post('/validate/quick', validateQuick);

// Support both file upload and text content
router.post(
  '/process',
  // Use multer conditionally when there's a file
  (req, res, next) => {
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      upload.single('adsTxtFile')(req as any, res as any, next);
    } else {
      next();
    }
  },
  processAdsTxtFile
);
router.get('/request/:requestId', getRecordsByRequestId);
router.get('/generate/:requestId', generateAdsTxtContent);
router.post('/optimize', optimizeAdsTxtContent);

export default router;
