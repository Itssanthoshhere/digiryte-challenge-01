import { z } from 'zod';

const sanitizeString = z.string().trim().transform((val) => val.replace(/<[^>]*>?/gm, ''));

export const transferTransactionSchema = z.object({
  body: z.object({
    recipientId: sanitizeString.pipe(z.string().min(1, 'Recipient ID is required')),
    amount: z.number().positive('Transfer amount must be positive'),
    currency: z.string().length(3, 'Currency must be a 3-letter ISO code (e.g. USD, GBP, EUR)').default('USD'),
  }),
  headers: z.object({
    'x-nonce': z.string().min(1, 'X-Nonce header is required'),
    'x-timestamp': z.string().min(1, 'X-Timestamp header is required'),
  }).passthrough(),
});
