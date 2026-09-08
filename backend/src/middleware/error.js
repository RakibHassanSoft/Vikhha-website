import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let error = err;

  // Mongoose duplicate key
  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || {}).join(', ');
    error = ApiError.conflict(`Duplicate value for: ${field || 'unique field'}`);
  }
  // Mongoose validation
  else if (err?.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    error = ApiError.badRequest('Validation failed', details);
  }
  // Bad ObjectId
  else if (err?.name === 'CastError') {
    error = ApiError.badRequest(`Invalid value for ${err.path}`);
  }
  // JWT
  else if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
    error = ApiError.unauthorized('Invalid or expired session token');
  }
  // Multer
  else if (err?.code === 'LIMIT_FILE_SIZE') {
    error = ApiError.badRequest('File is too large (max 5 MB)');
  }

  const statusCode = error.statusCode || 500;
  if (statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message: error.message || 'Something went wrong',
      ...(error.details ? { details: error.details } : {}),
      ...(env.isProd ? {} : { stack: err.stack }),
    },
  });
}
