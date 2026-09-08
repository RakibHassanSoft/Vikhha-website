import { ApiError } from '../utils/ApiError.js';

/**
 * Validates req[source] against a zod schema and replaces it with the parsed
 * (coerced, stripped) value so controllers only ever see clean input.
 */
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.path.join('.') || '(root)',
      message: i.message,
    }));
    return next(ApiError.badRequest('Validation failed', details));
  }
  if (source === 'query') {
    // req.query is a getter-only object in Express 5 style setups; mutate safely.
    Object.defineProperty(req, 'validatedQuery', { value: result.data, writable: true });
  } else {
    req[source] = result.data;
  }
  return next();
};

export const q = (req) => req.validatedQuery ?? req.query;
