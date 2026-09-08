import { Router } from 'express';
import * as ctrl from '../controllers/upload.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadImage } from '../middleware/upload.js';
import { uploadLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.get('/status', ctrl.status);
router.get('/signature', requireAuth, uploadLimiter, ctrl.signature);
router.post('/image', requireAuth, uploadLimiter, uploadImage, ctrl.uploadThroughServer);
router.delete('/image', requireAuth, ctrl.remove);

export default router;
