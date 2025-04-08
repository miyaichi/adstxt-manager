import { NextFunction, Request, Response } from 'express';
import i18next from '../i18n';

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
  console.error(err);

  // Default status code and message
  let statusCode = 500;
  let message = i18next.t('common:errors.internalServerError', { lng: req.language });

  // Handle specific ApiError instances
  if (err instanceof ApiError) {
    statusCode = err.statusCode;

    // Use i18n key if available, otherwise use the message directly
    if (err.i18nKey) {
      message = i18next.t(err.i18nKey, { ...err.i18nParams, lng: req.language });
    } else {
      message = err.message;
    }
  } else if (err.name === 'ValidationError') {
    // Handle validation errors
    statusCode = 400;
    message = err.message;
  }

  // Send the error response
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
