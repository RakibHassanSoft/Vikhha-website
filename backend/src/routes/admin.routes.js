import { Router } from 'express';
import * as seekerCtrl from '../controllers/seeker.controller.js';
import * as donationCtrl from '../controllers/donation.controller.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  adminListSeekersQuery,
  reviewSeekerSchema,
  idParam,
} from '../validators/seeker.validator.js';
import { listDonationsQuery, reviewDonationSchema } from '../validators/donation.validator.js';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/seekers', validate(adminListSeekersQuery, 'query'), seekerCtrl.adminListSeekers);
router.patch(
  '/seekers/:id/review',
  validate(idParam, 'params'),
  validate(reviewSeekerSchema),
  seekerCtrl.reviewSeeker
);

router.get('/donations', validate(listDonationsQuery, 'query'), donationCtrl.adminListDonations);
router.patch(
  '/donations/:id/review',
  validate(idParam, 'params'),
  validate(reviewDonationSchema),
  donationCtrl.reviewDonation
);

router.get(
  '/seekers/:seekerId/donations',
  validate(listDonationsQuery, 'query'),
  donationCtrl.seekerDonations
);

export default router;
