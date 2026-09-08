import dotenv from 'dotenv';

dotenv.config();

const bool = (v, fallback = false) => {
  if (v === undefined || v === null || v === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
};

const list = (v) =>
  String(v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: (process.env.NODE_ENV || 'development') === 'production',
  port: Number(process.env.PORT || 5000),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  corsOrigins: list(process.env.CORS_ORIGINS),

  mongoUri: process.env.MONGODB_URI,
  mongoDbName: process.env.MONGODB_DB_NAME || 'digital_vikha',

  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 10),

  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@vikha.bd',
    password: process.env.ADMIN_PASSWORD || 'Admin@12345',
    name: process.env.ADMIN_NAME || 'Portal Admin',
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    folder: process.env.CLOUDINARY_FOLDER || 'digital-vikha',
    get enabled() {
      return Boolean(
        this.cloudName &&
          this.apiKey &&
          this.apiSecret &&
          !String(this.cloudName).startsWith('REPLACE_')
      );
    },
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    get enabled() {
      return Boolean(this.apiKey);
    },
  },

  autoApproveSeekers: bool(process.env.AUTO_APPROVE_SEEKERS, false),
};

export function assertEnv() {
  const missing = [];
  if (!env.mongoUri) missing.push('MONGODB_URI');
  if (!env.jwtSecret) missing.push('JWT_SECRET');
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  if (env.isProd && env.jwtSecret.length < 24) {
    throw new Error('JWT_SECRET must be at least 24 characters in production');
  }
}
