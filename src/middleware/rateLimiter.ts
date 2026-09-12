import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/**
 * Standard global rate limiter for general API requests.
 */
export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS, // Default: 15 minutes
  limit: env.RATE_LIMIT_MAX_REQUESTS, // Default: 100 requests per IP/window
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    status: 'error',
    code: 'TOO_MANY_REQUESTS',
    message: 'Too many requests from this IP. Please try again later.',
    timestamp: new Date().toISOString(),
  },
  skip: () => env.NODE_ENV === 'test', // Skip rate limiter during automated testing
});

/**
 * Tighter rate limiter for sensitive endpoints (auth login, token refresh, transaction transfer).
 */
export const sensitiveRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  limit: env.SENSITIVE_RATE_LIMIT_MAX_REQUESTS, // Default: 10 requests per minute
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    status: 'error',
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Rate limit exceeded for sensitive operation. Please wait a minute before retrying.',
    timestamp: new Date().toISOString(),
  },
  skip: () => env.NODE_ENV === 'test',
});
