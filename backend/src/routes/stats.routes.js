import { Router } from 'express';
import * as ctrl from '../controllers/stats.controller.js';

const router = Router();

router.get('/overview', ctrl.overview);
router.get('/leaderboard', ctrl.leaderboard);

export default router;
