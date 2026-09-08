import { Router } from 'express';
import * as ctrl from '../controllers/seeker.controller.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { locationLimiter } from '../middleware/rateLimit.js';
import {
  createSeekerSchema,
  updateSeekerSchema,
  updateLocationSchema,
  listSeekersQuery,
  idParam,
  slugParam,
} from '../validators/seeker.validator.js';

const router = Router();

// Public
router.get('/', validate(listSeekersQuery, 'query'), ctrl.listPublicSeekers);
router.get('/map', ctrl.mapSeekers);
router.get('/districts', ctrl.districts);

// Authenticated (must come before /:slug so "me" is not read as a slug)
router.get('/me/profile', requireAuth, ctrl.getMyProfile);
router.patch(
  '/me/location',
  requireAuth,
  locationLimiter,
  validate(updateLocationSchema),
  ctrl.updateMyLocation
);
router.delete('/me/location', requireAuth, ctrl.stopSharingLocation);
router.post('/', requireAuth, validate(createSeekerSchema), ctrl.createSeekerProfile);

router.get('/:slug', validate(slugParam, 'params'), ctrl.getSeekerBySlug);
router.patch(
  '/:id',
  requireAuth,
  validate(idParam, 'params'),
  validate(updateSeekerSchema),
  ctrl.updateSeekerProfile
);
router.delete('/:id', requireAuth, validate(idParam, 'params'), ctrl.deleteSeekerProfile);

export default router;
