import express from 'express';
import {
  createMessage,
  getMessagesByRequestId
} from '../controllers/messageController';

const router = express.Router();

// Routes
router.post('/', createMessage);
router.get('/:requestId', getMessagesByRequestId);

export default router;