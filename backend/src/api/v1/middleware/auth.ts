import { Request, Response, NextFunction } from 'express';
import config from '../../../config/api';

/**
 * Middleware to validate API keys for external API access
 */
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  // Check if API integration is enabled
  if (!config.api.enabled) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'API_DISABLED',
        message: 'API integration is currently disabled',
      },
    });
  }

  const apiKey = req.headers['x-api-key'];

  // Check if API key is provided
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'MISSING_API_KEY',
        message: 'API key is required',
      },
    });
  }

  // Validate API key
  if (!config.api.validApiKeys.includes(apiKey.toString())) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'INVALID_API_KEY',
        message: 'Invalid API key',
      },
    });
  }

  next();
};
