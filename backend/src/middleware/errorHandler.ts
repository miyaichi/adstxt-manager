import { NextFunction, Request, Response } from 'express';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  statusCode: number;
  
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
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
  let message = 'Internal Server Error';
  
  // Handle specific ApiError instances
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
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
      ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
    }
  });
}

/**
 * Middleware to handle 404 Not Found errors
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const error = new ApiError(404, `Not Found - ${req.originalUrl}`);
  next(error);
}

/**
 * Async handler to wrap async route handlers and catch errors
 */
export const asyncHandler = (fn: Function) => (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};