import crypto from 'node:crypto';
import { cloudinary } from '../config/cloudinary.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

function assertEnabled() {
  if (!env.cloudinary.enabled) {
    throw new ApiError(
      503,
      'Image uploads are not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.'
    );
  }
}

/** Uploads an in-memory buffer to Cloudinary. */
export function uploadBuffer(buffer, { folder = env.cloudinary.folder, publicId } = {}) {
  assertEnabled();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'image',
        overwrite: true,
        transformation: [{ width: 800, height: 800, crop: 'limit' }, { quality: 'auto:good' }],
      },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
  });
}

export async function destroyAsset(publicId) {
  if (!publicId) return null;
  assertEnabled();
  return cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}

/**
 * Produces a signature so the browser can upload straight to Cloudinary
 * without the file ever passing through this server.
 */
export function createUploadSignature({ folder = env.cloudinary.folder } = {}) {
  assertEnabled();
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { folder, timestamp };
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  const signature = crypto
    .createHash('sha1')
    .update(toSign + env.cloudinary.apiSecret)
    .digest('hex');

  return {
    signature,
    timestamp,
    folder,
    apiKey: env.cloudinary.apiKey,
    cloudName: env.cloudinary.cloudName,
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.cloudinary.cloudName}/image/upload`,
  };
}
