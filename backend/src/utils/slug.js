import crypto from 'node:crypto';

/**
 * Bangla names cannot be transliterated reliably, so non-ASCII characters are
 * kept in the slug (they URL-encode fine) and only whitespace/punctuation is
 * normalised. A short random suffix guarantees uniqueness.
 */
export function slugify(input) {
  return String(input || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/["'`~!@#$%^&*()_+=\[\]{}|\\:;<>,.?/]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

export function uniqueSlug(input) {
  const base = slugify(input) || 'seeker';
  return `${base}-${crypto.randomBytes(3).toString('hex')}`;
}

/** Human friendly receipt number, e.g. VKH-6M2X4K-9081 */
export function receiptNumber() {
  const a = crypto.randomBytes(3).toString('hex').toUpperCase();
  const b = String(crypto.randomInt(1000, 9999));
  return `VKH-${a}-${b}`;
}
