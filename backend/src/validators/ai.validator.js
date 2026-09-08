import { z } from 'zod';
import { objectId } from './common.js';
import { SEEKER_CATEGORIES } from '../utils/constants.js';

export const duaSchema = z
  .object({
    seekerId: objectId.optional(),
    donorName: z.string().trim().max(120).optional(),
    amount: z.coerce.number().int().min(1).max(500000).optional(),
    occasion: z
      .enum(['general', 'parents', 'health', 'rizq', 'business', 'exam', 'travel'])
      .default('general'),
    category: z.enum(SEEKER_CATEGORIES).optional(),
    tone: z.enum(['short', 'warm', 'formal']).default('warm'),
  })
  .strict();
