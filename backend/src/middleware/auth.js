import { ApiError } from '../utils/ApiError.js';
import { verifyToken } from '../utils/token.js';
import { User } from '../models/User.js';

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

/** Attaches req.user when a valid token is present; never throws. */
export async function attachUser(req, _res, next) {
  try {
    const token = extractToken(req);
    if (!token) return next();
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (user && user.isActive) req.user = user;
    return next();
  } catch {
    return next();
  }
}

/** Requires a signed-in, active user. */
export function requireAuth(req, _res, next) {
  if (!req.user) return next(ApiError.unauthorized());
  return next();
}

/** Requires one of the given roles. */
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
    return next();
  };
}
