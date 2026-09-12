import { z } from 'zod';

const sanitizeString = z.string().trim().transform((val) => val.replace(/<[^>]*>?/gm, ''));

export const createAssetSchema = z.object({
  body: z.object({
    name: sanitizeString.pipe(z.string().min(2, 'Asset name must be at least 2 characters')),
    type: sanitizeString.pipe(z.string().min(2, 'Asset type must be at least 2 characters')),
    value: z.number().positive('Asset value must be a positive number'),
    ownerId: sanitizeString.optional(),
  }),
});

export const deleteAssetSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Asset ID is required'),
  }),
});
