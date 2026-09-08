import { Router } from 'express';
import * as ctrl from '../controllers/ai.controller.js';
import { validate } from '../middleware/validate.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import { duaSchema } from '../validators/ai.validator.js';

const router = Router();

router.get('/status', ctrl.aiStatus);
router.post('/dua', aiLimiter, validate(duaSchema), ctrl.dua);

export default router;
