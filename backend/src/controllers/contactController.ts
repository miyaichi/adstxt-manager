import { Request, Response } from 'express';
import { validationResult, body } from 'express-validator';
import logger from '../utils/logger';
import { sendContactFormEmail } from '../services/emailService';

// Define validation rules for contact form
export const contactValidationRules = [
  body('email').isEmail().withMessage('Invalid email address'),
  body('message').notEmpty().withMessage('Message cannot be empty'),
];

/**
 * Handle contact form submissions
 */
export const submitContactForm = async (req: Request, res: Response) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, message } = req.body;

  try {
    // Send email notification about the contact form submission
    await sendContactFormEmail(email, message);

    logger.info(`Contact form submitted by ${email}`);
    return res.status(200).json({ success: true, message: 'Contact form submitted successfully' });
  } catch (error) {
    logger.error('Error submitting contact form:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit contact form' });
  }
};
