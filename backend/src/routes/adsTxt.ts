import express from 'express';
import multer from 'multer';
import {
  generateAdsTxtContent,
  getRecordsByRequestId,
  processAdsTxtFile,
  updateRecordStatus
} from '../controllers/adsTxtController';

const router = express.Router();

// Configure multer for file uploads (store in memory)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Routes
router.patch('/:id/status', updateRecordStatus);
router.post('/process', upload.single('adsTxtFile'), processAdsTxtFile);
router.get('/request/:requestId', getRecordsByRequestId);
router.get('/generate/:requestId', generateAdsTxtContent);

export default router;