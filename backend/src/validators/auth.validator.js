import { z } from 'zod';
import { bdMobile } from './common.js';

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password is too long');

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  phone: bdMobile.optional(),
  password,
  role: z.enum(['donor', 'seeker']).default('donor'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, 'Password is required'),
});

export const updateMeSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    phone: bdMobile.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: password,
});
