import { NextFunction, Request, Response } from 'express';
import i18next from '../i18n';
import { messageService } from '../services/messageService';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  statusCode: number;
  i18nKey?: string;
  i18nParams?: Record<string, any>;

  constructor(
    statusCode: number,
    message: string,
    i18nKey?: string,
    i18nParams?: Record<string, any>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
    this.i18nKey = i18nKey;
    this.i18nParams = i18nParams;
  }
}

/**
 * Global error handling middleware
 */
export function errorHandler(
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip webpack hot update files
  if (req.originalUrl.includes('.hot-update.json') || req.originalUrl.includes('.hot-update.js')) {
    if (!res.headersSent) {
      res.status(404).end();
    }
    return;
  }

  console.error(`Error handling request to ${req.originalUrl}:`, err);

  // Prevent double-sending headers
  if (res.headersSent) {
    return next(err);
  }

  // Default status code and message
  let statusCode = 500;
  let message = i18next.t('common:errors.internalServerError', { lng: req.language });

  // Handle specific ApiError instances
  if (err instanceof ApiError) {
    statusCode = err.statusCode;

    // Use enhanced message service if available, otherwise fall back to i18n
    if (err.i18nKey) {
      const enhancedError = messageService.formatApiError(
        err.i18nKey,
        err.i18nParams ? Object.values(err.i18nParams).map(String) : [],
        req.language || 'ja'
      );
      message = enhancedError.message;

      // Include additional information in development
      if (process.env.NODE_ENV === 'development' && enhancedError.helpUrl) {
        message += ` (Help: ${enhancedError.helpUrl})`;
      }
    } else {
      message = err.message;
    }
  } else if (err.name === 'ValidationError') {
    // Handle validation errors
    statusCode = 400;
    message = err.message;
  }

  // For non-API requests in production that accept HTML, we might want to show a nice error page
  if (
    process.env.NODE_ENV === 'production' &&
    !req.path.startsWith('/api/') &&
    !req.xhr &&
    req.accepts('html')
  ) {
    // For static file errors in production, send a basic HTML error page
    if (statusCode === 404) {
      res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Page Not Found - Ads.txt Manager</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 40px; }
            h1 { color: #e74c3c; }
            a { color: #3498db; text-decoration: none; }
          </style>
        </head>
        <body>
          <h1>Page Not Found</h1>
          <p>The page you are looking for does not exist.</p>
          <p><a href="/">Return to home page</a></p>
        </body>
        </html>
      `);
      return;
    }
  }

  // Send the error response as JSON
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    },
  });
}

/**
 * Middleware to handle 404 Not Found errors
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  // Ignore HMR webpack hot-update files in development
  if (req.originalUrl.includes('.hot-update.json') || req.originalUrl.includes('.hot-update.js')) {
    res.status(404).end();
    return;
  }

  // Skip API or status routes, let them handle 404s through the API error handler
  if (req.path.startsWith('/api/') || req.path.startsWith('/api-docs') || req.path === '/status' || req.path === '/health') {
    const error = new ApiError(404, `Not Found - ${req.originalUrl}`, 'common:errors.notFound', {
      url: req.originalUrl,
    });
    return next(error);
  }

  // For non-API routes in production, let the static file handling middleware try to serve index.html
  // to support client-side routing
  if (process.env.NODE_ENV === 'production' && !req.xhr && req.accepts('html')) {
    return next();
  }

  // For all other cases, send a 404 error
  const error = new ApiError(404, `Not Found - ${req.originalUrl}`, 'common:errors.notFound', {
    url: req.originalUrl,
  });
  next(error);
}

/**
 * Async handler to wrap async route handlers and catch errors
 */
export const asyncHandler =
  (fn: Function) =>
  (req: Request, res: Response, next: NextFunction): Promise<void> => {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
