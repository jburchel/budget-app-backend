import { Request, Response, NextFunction } from 'express';

/**
 * Custom Error class for handling HTTP exceptions with status codes.
 */
export class HttpException extends Error {
  status: number;
  details?: any; // Optional field for more detailed error info (like validation errors)

  constructor(status: number, message: string, details?: any) {
    super(message);
    this.status = status;
    this.details = details; // Store details if provided
    // Maintaining proper stack trace (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpException);
    }
  }
}

/**
 * Express error handling middleware.
 * Catches errors, specifically HttpExceptions, and sends a formatted JSON response.
 */
export const errorHandler = (
  err: Error | HttpException,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction // next is required for Express to recognize this as error handling middleware
) => {
  console.error('Error handled:', err); // Log the full error server-side regardless

  // Default to 500 Internal Server Error if status is not set or it's not an HttpException
  const status = err instanceof HttpException ? err.status : 500;
  const message = err.message || 'Internal Server Error';
  const details = err instanceof HttpException ? err.details : undefined;

  const responseBody: { status: string; message: string; details?: any; stack?: string } = {
    status: 'error',
    message: message,
  };

  // Include details if they exist (e.g., from validation)
  if (details) {
    responseBody.details = details;
  }

  // Include stack trace only in development mode
  if (process.env.NODE_ENV === 'development' && err.stack) {
    responseBody.stack = err.stack;
  }

  res.status(status).json(responseBody);
}; 