import { z } from 'zod';

// Helper to sanitize HTML tags from strings
const sanitizeString = z.string().trim().transform((val) => val.replace(/<[^>]*>?/gm, ''));

export const registerSchema = z.object({
  body: z.object({
    email: sanitizeString.pipe(z.string().email('Must be a valid email address')),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    name: sanitizeString.pipe(z.string().min(2, 'Name must be at least 2 characters')),
    role: z.enum(['USER', 'ADMIN']).optional().default('USER'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: sanitizeString.pipe(z.string().email('Must be a valid email address')),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});
