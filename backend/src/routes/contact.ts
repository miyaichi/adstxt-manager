import express from 'express';
import { contactValidationRules, submitContactForm } from '../controllers/contactController';

const router = express.Router();

/**
 * @route POST /api/contact
 * @desc Submit contact form
 * @access Public
 */
router.post('/', contactValidationRules, submitContactForm);

export default router;
