import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import mongoose from 'mongoose';

import { env } from './config/env.js';
import routes from './routes/index.js';
import { attachUser } from './middleware/auth.js';
import { generalLimiter } from './middleware/rateLimit.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  // Render terminates TLS at its proxy; trust it so rate limiting sees real IPs.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(morgan(env.isProd ? 'combined' : 'dev'));

  app.use(
    cors({
      origin(origin, cb) {
        // Allow same-origin/server-to-server calls (curl, Render health checks).
        if (!origin) return cb(null, true);
        if (env.corsOrigins.length === 0) return cb(null, true);
        if (env.corsOrigins.includes(origin)) return cb(null, true);
        // Allow any Vercel preview deployment of this project.
        if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return cb(null, true);
        return cb(new Error(`Origin not allowed by CORS: ${origin}`));
      },
      credentials: true,
    })
  );

  app.get('/health', (_req, res) =>
    res.json({
      success: true,
      status: 'ok',
      uptime: Math.round(process.uptime()),
      db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      time: new Date().toISOString(),
    })
  );

  app.get('/', (_req, res) =>
    res.json({
      success: true,
      message: 'Digital Vikha & Sadaqah Portal API',
      docs: `${env.apiPrefix}`,
      health: '/health',
    })
  );

  app.use(generalLimiter);
  app.use(attachUser);
  app.use(env.apiPrefix, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
