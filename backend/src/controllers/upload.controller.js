import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/respond.js';
import { uploadBuffer, createUploadSignature, destroyAsset } from '../services/cloudinary.service.js';
import { env } from '../config/env.js';

/** Server-side upload: the browser posts multipart/form-data with field `image`. */
export const uploadThroughServer = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No image provided (expected field name "image")');

  const folder = `${env.cloudinary.folder}/${req.body?.kind === 'proof' ? 'proofs' : 'avatars'}`;
  const result = await uploadBuffer(req.file.buffer, { folder });

  return ok(res, {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    bytes: result.bytes,
    format: result.format,
  });
});

/** Direct-to-Cloudinary upload: returns a short-lived signature for the browser. */
export const signature = asyncHandler(async (req, res) => {
  const folder = `${env.cloudinary.folder}/${req.query?.kind === 'proof' ? 'proofs' : 'avatars'}`;
  return ok(res, createUploadSignature({ folder }));
});

export const remove = asyncHandler(async (req, res) => {
  const { publicId } = req.body || {};
  if (!publicId) throw ApiError.badRequest('publicId is required');
  const result = await destroyAsset(publicId);
  return ok(res, result);
});

export const status = asyncHandler(async (_req, res) =>
  ok(res, {
    enabled: env.cloudinary.enabled,
    cloudName: env.cloudinary.enabled ? env.cloudinary.cloudName : null,
    maxFileSizeMb: 5,
    allowed: ['image/jpeg', 'image/png', 'image/webp'],
  })
);
