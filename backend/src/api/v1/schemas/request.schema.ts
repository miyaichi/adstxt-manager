import { body, param, query } from 'express-validator';

/**
 * Validation schemas for request-related endpoints
 */
export const requestValidation = {
  // Create request validation
  create: [
    body('domain')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Domain is required')
      .matches(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/)
      .withMessage('Invalid domain format'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('changes')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Changes are required')
      .isLength({ min: 5, max: 5000 })
      .withMessage('Changes must be between 5 and 5000 characters'),
  ],

  // Get request by ID validation
  getById: [param('id').isUUID().withMessage('Valid request ID is required')],

  // List requests validation
  list: [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a positive integer')
      .toInt(),
    query('domain').optional().isString().trim(),
    query('status')
      .optional()
      .isIn(['pending', 'approved', 'rejected'])
      .withMessage('Status must be one of: pending, approved, rejected'),
  ],
};
