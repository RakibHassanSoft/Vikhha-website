import { Router } from 'express';
import authRoutes from './auth.routes.js';
import seekerRoutes from './seeker.routes.js';
import donationRoutes from './donation.routes.js';
import adminRoutes from './admin.routes.js';
import uploadRoutes from './upload.routes.js';
import aiRoutes from './ai.routes.js';
import statsRoutes from './stats.routes.js';

const router = Router();

router.get('/', (_req, res) =>
  res.json({
    success: true,
    data: {
      name: 'Digital Vikha & Sadaqah Portal API',
      version: '1.0.0',
      endpoints: [
        'POST   /auth/register',
        'POST   /auth/login',
        'GET    /auth/me',
        'GET    /seekers',
        'GET    /seekers/map  (?live=true)',
        'GET    /seekers/districts',
        'GET    /seekers/:slug',
        'POST   /seekers',
        'GET    /seekers/me/profile',
        'PATCH  /seekers/me/location',
        'DELETE /seekers/me/location',
        'PATCH  /seekers/:id',
        'POST   /donations',
        'GET    /donations/mine',
        'GET    /donations/received',
        'GET    /donations/receipt/:receiptNo',
        'GET    /stats/overview',
        'GET    /stats/leaderboard',
        'POST   /ai/dua',
        'POST   /uploads/image',
        'GET    /uploads/signature',
        'GET    /admin/seekers',
        'PATCH  /admin/seekers/:id/review',
        'GET    /admin/donations',
        'PATCH  /admin/donations/:id/review',
      ],
    },
  })
);

router.use('/auth', authRoutes);
router.use('/seekers', seekerRoutes);
router.use('/donations', donationRoutes);
router.use('/admin', adminRoutes);
router.use('/uploads', uploadRoutes);
router.use('/ai', aiRoutes);
router.use('/stats', statsRoutes);

export default router;
