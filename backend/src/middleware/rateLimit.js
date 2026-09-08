import rateLimit from 'express-rate-limit';

const common = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many requests, please slow down.' } },
};

export const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 600, ...common });
export const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, ...common });
export const donationLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 40, ...common });
export const aiLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 30, ...common });
export const uploadLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 60, ...common });

/**
 * Live sharing pings roughly every 30s while the switch is on, so this allows a
 * comfortable margin above that without letting a runaway client hammer us.
 */
export const locationLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 300, ...common });
