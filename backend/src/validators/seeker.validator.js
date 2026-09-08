import { z } from 'zod';
import { bdMobile, objectId } from './common.js';
import { SEEKER_CATEGORIES, SEEKER_STATUSES } from '../utils/constants.js';

const payments = z
  .object({
    bkash: bdMobile.optional(),
    nagad: bdMobile.optional(),
    rocket: bdMobile.optional(),
  })
  .refine((v) => v.bkash || v.nagad || v.rocket, {
    message: 'At least one mobile banking number (bKash, Nagad or Rocket) is required',
  });

const location = z.object({
  address: z.string().trim().min(4).max(200),
  district: z.string().trim().min(2).max(60).default('ঢাকা'),
  lat: z.coerce.number().min(20.5).max(26.7).optional(),
  lng: z.coerce.number().min(88.0).max(92.7).optional(),
});

export const createSeekerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.enum(SEEKER_CATEGORIES),
  story: z.string().trim().min(20, 'Please write at least 20 characters').max(1200),
  dua: z.string().trim().min(5).max(400),
  location,
  payments,
  avatarUrl: z.string().url().optional(),
  proofUrl: z.string().url().optional(),
  dailyTarget: z.coerce.number().int().min(100).max(20000),
});

export const updateSeekerSchema = createSeekerSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: 'Nothing to update' }
);

export const listSeekersQuery = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.enum(SEEKER_CATEGORIES).optional(),
  district: z.string().trim().max(60).optional(),
  sort: z.enum(['newest', 'urgent', 'progress', 'target']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
});

export const adminListSeekersQuery = listSeekersQuery.extend({
  status: z.enum(SEEKER_STATUSES).optional(),
});

export const reviewSeekerSchema = z.object({
  status: z.enum(['approved', 'rejected', 'suspended', 'pending']),
  statusNote: z.string().trim().max(300).optional(),
});

/**
 * Location pings are their own endpoint, so they carry only coordinates and
 * never the fields that would send a profile back for review.
 */
export const updateLocationSchema = z
  .object({
    lat: z.coerce.number().min(20.5, 'Coordinates must be inside Bangladesh').max(26.7),
    lng: z.coerce.number().min(88.0, 'Coordinates must be inside Bangladesh').max(92.7),
    accuracy: z.coerce.number().min(0).max(100000).optional(),
    isSharing: z.coerce.boolean().optional(),
    address: z.string().trim().min(4).max(200).optional(),
  })
  .strict();

export const stopSharingSchema = z.object({}).strict();

export const idParam = z.object({ id: objectId });
export const slugParam = z.object({ slug: z.string().trim().min(1).max(80) });
