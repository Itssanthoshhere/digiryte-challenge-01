import { NextFunction, Request, Response } from 'express';
import { ApiErrorResponse } from '../types';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: unknown;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected server error occurred.';
  let details: unknown = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.code;
    message = err.message;
    details = err.details;
  } else if (err.name === 'SyntaxError') {
    statusCode = 400;
    errorCode = 'BAD_REQUEST';
    message = 'Invalid JSON request payload.';
  } else {
    console.error('🔥 Unhandled Exception:', err);
  }

  const response: ApiErrorResponse = {
    status: 'error',
    code: errorCode,
    message,
    ...(details ? { details } : {}),
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
};
