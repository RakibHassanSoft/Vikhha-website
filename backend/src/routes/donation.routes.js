import { Router } from 'express';
import * as ctrl from '../controllers/donation.controller.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { donationLimiter } from '../middleware/rateLimit.js';
import {
  createDonationSchema,
  listDonationsQuery,
  receiptParam,
} from '../validators/donation.validator.js';

const router = Router();

router.post('/', donationLimiter, validate(createDonationSchema), ctrl.createDonation);
router.get('/mine', requireAuth, validate(listDonationsQuery, 'query'), ctrl.myDonations);
router.get(
  '/received',
  requireAuth,
  validate(listDonationsQuery, 'query'),
  ctrl.seekerDonations
);
router.get('/receipt/:receiptNo', validate(receiptParam, 'params'), ctrl.getReceipt);

export default router;
