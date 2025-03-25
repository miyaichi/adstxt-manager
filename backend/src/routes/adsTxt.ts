import express from 'express';
import multer from 'multer';
import {
  generateAdsTxtContent,
  getRecordsByRequestId,
  processAdsTxtFile,
  updateRecordStatus,
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
// Support both file upload and text content
router.post('/process', 
  // Use multer conditionally when there's a file
  (req, res, next) => {
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      upload.single('adsTxtFile')(req, res, next);
    } else {
      next();
    }
  }, 
  processAdsTxtFile
);
router.get('/request/:requestId', getRecordsByRequestId);
router.get('/generate/:requestId', generateAdsTxtContent);

export default router;
