import { z } from 'zod';
import { BD_MOBILE_RE } from '../utils/constants.js';

export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const bdMobile = z
  .string()
  .trim()
  .regex(BD_MOBILE_RE, 'Must be a valid Bangladeshi mobile number (e.g. 01712345678)');

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
});
