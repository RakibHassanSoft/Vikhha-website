import { z } from 'zod';
import { bdMobile, objectId } from './common.js';
import { PAYMENT_METHODS, DONATION_STATUSES, TRX_ID_RE } from '../utils/constants.js';

export const createDonationSchema = z.object({
  seekerId: objectId,
  amount: z.coerce.number().int().min(1, 'Amount must be at least ৳1').max(500000),
  method: z.enum(PAYMENT_METHODS),
  senderNumber: bdMobile,
  trxId: z
    .string()
    .trim()
    .toUpperCase()
    .regex(TRX_ID_RE, 'Transaction ID should be 6–20 letters/digits, e.g. 9F3KL2QX7A'),
  donorName: z.string().trim().min(2).max(120).optional(),
  donorPhone: bdMobile.optional(),
  isAnonymous: z.coerce.boolean().default(false),
  message: z.string().trim().max(500).optional(),
});

export const listDonationsQuery = z.object({
  status: z.enum(DONATION_STATUSES).optional(),
  seekerId: objectId.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const reviewDonationSchema = z.object({
  status: z.enum(['verified', 'rejected']),
  statusNote: z.string().trim().max(300).optional(),
});

export const receiptParam = z.object({ receiptNo: z.string().trim().min(4).max(40) });
