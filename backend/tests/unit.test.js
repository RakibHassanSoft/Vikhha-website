/**
 * Pure-logic tests. No database, no network.
 *   node tests/unit.test.js
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { dhakaDateKey, dhakaDayStart } from '../src/utils/dhaka.js';
import { slugify, uniqueSlug, receiptNumber } from '../src/utils/slug.js';
import { signToken, verifyToken } from '../src/utils/token.js';
import { createUploadSignature } from '../src/services/cloudinary.service.js';
import { generateDua } from '../src/services/gemini.service.js';
import { BD_MOBILE_RE, TRX_ID_RE, CATEGORY_LABELS_BN } from '../src/utils/constants.js';
import { createDonationSchema } from '../src/validators/donation.validator.js';
import { createSeekerSchema } from '../src/validators/seeker.validator.js';
import { env } from '../src/config/env.js';

test('dhaka day key is +6h ahead of UTC', () => {
  // 2026-09-08T19:00Z is already 2026-09-09 in Dhaka (01:00).
  assert.equal(dhakaDateKey(new Date('2026-09-08T19:00:00Z')), '2026-09-09');
  // 2026-09-08T17:59Z is still 2026-09-08 in Dhaka (23:59).
  assert.equal(dhakaDateKey(new Date('2026-09-08T17:59:00Z')), '2026-09-08');
});

test('dhaka day start maps back to 18:00 UTC the previous day', () => {
  const start = dhakaDayStart(new Date('2026-09-08T12:00:00Z'));
  assert.equal(start.toISOString(), '2026-09-07T18:00:00.000Z');
  assert.ok(start.getTime() <= Date.parse('2026-09-08T12:00:00Z'));
});

test('slugify keeps bangla, drops punctuation and collapses spaces', () => {
  assert.equal(slugify('চাচ্চু কাসেম (কাসেম আলী)'), 'চাচ্চু-কাসেম-কাসেম-আলী');
  assert.equal(slugify('  Multiple   Spaces  '), 'multiple-spaces');
});

test('uniqueSlug is unique across calls', () => {
  const a = uniqueSlug('same name');
  const b = uniqueSlug('same name');
  assert.notEqual(a, b);
  assert.ok(a.startsWith('same-name-'));
});

test('receipt numbers match the VKH-XXXXXX-NNNN shape and do not repeat', () => {
  const set = new Set(Array.from({ length: 200 }, () => receiptNumber()));
  assert.equal(set.size, 200);
  assert.match([...set][0], /^VKH-[0-9A-F]{6}-\d{4}$/);
});

test('jwt round trips and carries the role', () => {
  const token = signToken({ sub: '507f1f77bcf86cd799439011', role: 'admin' });
  const payload = verifyToken(token);
  assert.equal(payload.sub, '507f1f77bcf86cd799439011');
  assert.equal(payload.role, 'admin');
});

test('jwt rejects a tampered token', () => {
  const token = signToken({ sub: 'x' });
  assert.throws(() => verifyToken(`${token}tampered`));
});

test('bangladeshi mobile regex', () => {
  for (const good of ['01712345678', '01311111111', '01987654321']) {
    assert.ok(BD_MOBILE_RE.test(good), good);
  }
  for (const bad of ['0171234567', '017123456789', '01212345678', '+8801712345678', 'abc']) {
    assert.ok(!BD_MOBILE_RE.test(bad), bad);
  }
});

test('transaction id regex', () => {
  assert.ok(TRX_ID_RE.test('9F3KL2QX7A'));
  assert.ok(!TRX_ID_RE.test('abc'));
  assert.ok(!TRX_ID_RE.test('WITH SPACE'));
});

test('every category has a bangla label', () => {
  for (const key of ['disabled', 'elderly', 'hafeez', 'artist', 'other']) {
    assert.ok(CATEGORY_LABELS_BN[key]?.length > 0, key);
  }
});

test('donation schema uppercases the trx id and coerces the amount', () => {
  const parsed = createDonationSchema.parse({
    seekerId: '507f1f77bcf86cd799439011',
    amount: '250',
    method: 'bkash',
    senderNumber: '01712345678',
    trxId: '9f3kl2qx7a',
  });
  assert.equal(parsed.trxId, '9F3KL2QX7A');
  assert.equal(parsed.amount, 250);
  assert.equal(parsed.isAnonymous, false);
});

test('donation schema rejects a zero amount and a bad sender number', () => {
  const bad = createDonationSchema.safeParse({
    seekerId: '507f1f77bcf86cd799439011',
    amount: 0,
    method: 'bkash',
    senderNumber: '12345',
    trxId: '9F3KL2QX7A',
  });
  assert.equal(bad.success, false);
  const fields = bad.error.issues.map((i) => i.path.join('.'));
  assert.ok(fields.includes('amount'));
  assert.ok(fields.includes('senderNumber'));
});

test('seeker schema requires at least one mobile banking number', () => {
  const base = {
    name: 'পরীক্ষা',
    category: 'elderly',
    story: 'এটি একটি যথেষ্ট দীর্ঘ পরীক্ষামূলক গল্প যা বিশ অক্ষরের বেশি।',
    dua: 'আল্লাহ্ ভালো রাখুন।',
    location: { address: 'ফার্মগেট, ঢাকা' },
    dailyTarget: 500,
  };
  assert.equal(createSeekerSchema.safeParse({ ...base, payments: {} }).success, false);
  assert.equal(
    createSeekerSchema.safeParse({ ...base, payments: { nagad: '01712345678' } }).success,
    true
  );
});

test('cloudinary signature is deterministic for the same params', () => {
  if (!env.cloudinary.enabled) {
    // Cloud name not filled in yet — the service must refuse rather than sign garbage.
    assert.throws(() => createUploadSignature(), /not configured/i);
    return;
  }
  const sig = createUploadSignature({ folder: 'test' });
  assert.match(sig.signature, /^[0-9a-f]{40}$/);
  assert.equal(sig.folder, 'test');
  assert.ok(sig.uploadUrl.includes(env.cloudinary.cloudName));
});

test('dua generation always returns bangla text, even with no network', async () => {
  const result = await generateDua({ occasion: 'parents', tone: 'short' });
  assert.ok(typeof result.text === 'string' && result.text.length > 5);
  assert.ok(['gemini', 'fallback'].includes(result.source));
  assert.match(result.text, /[ঀ-৿]/, 'expected Bangla characters');
});

test('dua generation covers every occasion', async () => {
  for (const occasion of ['general', 'parents', 'health', 'rizq', 'business', 'exam', 'travel']) {
    const r = await generateDua({ occasion });
    assert.ok(r.text.length > 5, occasion);
  }
});
