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

/**
 * Middleware to validate Chrome extension access as an alternative to API keys
 */
export const validateChromeExtension = (req: Request, res: Response, next: NextFunction) => {
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

  const origin = req.headers['origin'];

  // Check if request is from a Chrome extension
  if (!origin || !origin.startsWith('chrome-extension://')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_ORIGIN',
        message: 'Request must be from an authorized Chrome extension',
      },
    });
  }

  // Get allowed extension IDs from environment variable
  const allowedExtensions = process.env.ALLOWED_CHROME_EXTENSIONS ? 
    process.env.ALLOWED_CHROME_EXTENSIONS.split(',') : [];
  
  if (allowedExtensions.length === 0) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'EXTENSION_AUTH_NOT_CONFIGURED',
        message: 'Chrome extension authentication is not properly configured',
      },
    });
  }
  
  // Extract extension ID from origin
  const extensionId = origin.replace('chrome-extension://', '').split('/')[0];
  
  if (!allowedExtensions.includes(extensionId)) {
    console.warn(`Unauthorized Chrome extension access attempt: ${extensionId}`);
    return res.status(403).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED_EXTENSION',
        message: 'Chrome extension not authorized',
        details: { extensionId },
      },
    });
  }

  console.log(`Authorized Chrome extension access: ${extensionId}`);
  next();
};

/**
 * Middleware that accepts either API key or Chrome extension authentication
 */
export const validateApiKeyOrExtension = (req: Request, res: Response, next: NextFunction) => {
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
  const origin = req.headers['origin'];

  // Try API key authentication first
  if (apiKey && config.api.validApiKeys.includes(apiKey.toString())) {
    console.log('Authenticated via API key');
    return next();
  }

  // Try Chrome extension authentication
  if (origin && origin.startsWith('chrome-extension://')) {
    const allowedExtensions = process.env.ALLOWED_CHROME_EXTENSIONS ? 
      process.env.ALLOWED_CHROME_EXTENSIONS.split(',') : [];
    
    if (allowedExtensions.length > 0) {
      const extensionId = origin.replace('chrome-extension://', '').split('/')[0];
      if (allowedExtensions.includes(extensionId)) {
        console.log(`Authenticated via Chrome extension: ${extensionId}`);
        return next();
      }
    }
  }

  // Neither authentication method succeeded
  return res.status(401).json({
    success: false,
    error: {
      code: 'AUTHENTICATION_REQUIRED',
      message: 'Valid API key or authorized Chrome extension required',
    },
  });
};
