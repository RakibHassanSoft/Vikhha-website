/**
 * Schema tests. Mongoose validates in memory, so these run without a database:
 * they check validators, defaults, virtuals, indexes and the toJSON transforms
 * that keep anonymous donors and identity documents from leaking.
 *   node tests/models.test.js
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';

import { User } from '../src/models/User.js';
import { Seeker, LIVE_TTL_MS } from '../src/models/Seeker.js';
import { Donation } from '../src/models/Donation.js';
import { dhakaDateKey } from '../src/utils/dhaka.js';

const oid = () => new mongoose.Types.ObjectId();

const seekerDoc = (overrides = {}) =>
  new Seeker({
    name: 'চাচ্চু কাসেম',
    slug: 'chachchu-kasem-a1b2c3',
    category: 'disabled',
    story: 'দুর্ঘটনায় পা হারানোর পর কাজ করতে পারি না, প্রতিদিন ওষুধের টাকা প্রয়োজন।',
    dua: 'আল্লাহ্ আপনার রিজিকে বরকত দিন।',
    location: { address: 'ফার্মগেট, ঢাকা', district: 'ঢাকা', lat: 23.7583, lng: 90.3897 },
    payments: { bkash: '01711223344' },
    dailyTarget: 600,
    ...overrides,
  });

const donationDoc = (overrides = {}) =>
  new Donation({
    receiptNo: 'VKH-A1B2C3-4567',
    seeker: oid(),
    amount: 250,
    method: 'bkash',
    senderNumber: '01712345678',
    receiverNumber: '01711223344',
    trxId: '9f3kl2qx7a',
    ...overrides,
  });

/* ------------------------------- User ------------------------------- */

test('user requires a valid email', () => {
  const u = new User({ name: 'Rakib', email: 'not-an-email', passwordHash: 'x' });
  const err = u.validateSync();
  assert.ok(err.errors.email, 'expected an email error');
});

test('user lowercases the email and defaults to the donor role', () => {
  const u = new User({ name: 'Rakib', email: '  RAKIB@Example.COM ', passwordHash: 'x' });
  assert.equal(u.email, 'rakib@example.com');
  assert.equal(u.role, 'donor');
});

test('user rejects an unknown role', () => {
  const u = new User({ name: 'X', email: 'a@b.com', passwordHash: 'x', role: 'superuser' });
  assert.ok(u.validateSync().errors.role);
});

test('user rejects a malformed phone but accepts a valid one', () => {
  assert.ok(new User({ name: 'X', email: 'a@b.com', passwordHash: 'x', phone: '12345' }).validateSync().errors.phone);
  assert.equal(new User({ name: 'X', email: 'a@b.com', passwordHash: 'x', phone: '01712345678' }).validateSync(), undefined);
});

test('password hash never survives serialisation', () => {
  const u = new User({ name: 'X', email: 'a@b.com', passwordHash: 'super-secret-hash' });
  const json = JSON.stringify(u.toJSON());
  assert.ok(!json.includes('super-secret-hash'));
  assert.ok(!json.includes('passwordHash'));
});

test('setPassword hashes and verifyPassword round trips', async () => {
  const u = new User({ name: 'X', email: 'a@b.com' });
  await u.setPassword('Password123');
  assert.notEqual(u.passwordHash, 'Password123');
  assert.equal(await u.verifyPassword('Password123'), true);
  assert.equal(await u.verifyPassword('Password124'), false);
});

/* ------------------------------ Seeker ------------------------------ */

test('a well formed seeker validates', () => {
  assert.equal(seekerDoc().validateSync(), undefined);
});

test('seeker defaults to pending with zeroed stats on today key', () => {
  const s = seekerDoc();
  assert.equal(s.status, 'pending');
  assert.equal(s.stats.collectedToday, 0);
  assert.equal(s.stats.collectedTotal, 0);
  assert.equal(s.stats.todayKey, dhakaDateKey());
});

test('seeker rejects a too-short story and an out-of-range target', () => {
  const err = seekerDoc({ story: 'ছোট', dailyTarget: 50 }).validateSync();
  assert.ok(err.errors.story);
  assert.ok(err.errors.dailyTarget);
  assert.ok(seekerDoc({ dailyTarget: 99999 }).validateSync().errors.dailyTarget);
});

test('seeker rejects coordinates outside Bangladesh', () => {
  const err = seekerDoc({ location: { address: 'London', lat: 51.5, lng: -0.12 } }).validateSync();
  assert.ok(err.errors['location.lat']);
  assert.ok(err.errors['location.lng']);
});

test('seeker rejects a malformed mobile banking number', () => {
  assert.ok(seekerDoc({ payments: { bkash: '0171122334' } }).validateSync().errors['payments.bkash']);
});

test('categoryLabel virtual returns bangla for every category', () => {
  for (const category of ['disabled', 'elderly', 'hafeez', 'artist', 'other']) {
    const label = seekerDoc({ category }).categoryLabel;
    assert.match(label, /[ঀ-৿]/, category);
  }
});

test('progressPercent is clamped to 100 and ignores a stale day', () => {
  const s = seekerDoc();
  s.stats.collectedToday = 300;
  s.stats.todayKey = dhakaDateKey();
  assert.equal(s.progressPercent, 50);

  s.stats.collectedToday = 5000;
  assert.equal(s.progressPercent, 100);

  s.stats.todayKey = '2000-01-01';
  assert.equal(s.progressPercent, 0, "yesterday's total must not count as today's");
});

test('rollDailyWindow resets only when the bangladesh day changed', () => {
  const s = seekerDoc();
  s.stats.collectedToday = 400;
  s.stats.todayKey = dhakaDateKey();
  s.rollDailyWindow();
  assert.equal(s.stats.collectedToday, 400, 'same day must not reset');

  s.stats.todayKey = '2000-01-01';
  s.rollDailyWindow();
  assert.equal(s.stats.collectedToday, 0);
  assert.equal(s.stats.todayKey, dhakaDateKey());
});

test('live sharing is off by default', () => {
  const s = seekerDoc();
  assert.equal(s.live.isSharing, false);
  assert.equal(s.isLive, false);
});

test('isLive requires both the switch on and a recent ping', () => {
  const s = seekerDoc();

  s.live.isSharing = true;
  s.live.lastPingAt = undefined;
  assert.equal(s.isLive, false, 'switch on but never pinged');

  s.live.lastPingAt = new Date();
  assert.equal(s.isLive, true);

  s.live.isSharing = false;
  assert.equal(s.isLive, false, 'switch off must win over a fresh ping');
});

test('a live pin expires on its own once the pings stop', () => {
  const s = seekerDoc();
  s.live.isSharing = true;

  s.live.lastPingAt = new Date(Date.now() - (LIVE_TTL_MS - 5000));
  assert.equal(s.isLive, true, 'just inside the window');

  s.live.lastPingAt = new Date(Date.now() - (LIVE_TTL_MS + 5000));
  assert.equal(s.isLive, false, 'a forgotten switch must not broadcast forever');
});

test('location accepts an accuracy and a source, and rejects a bad source', () => {
  const good = seekerDoc({
    location: { address: 'ফার্মগেট, ঢাকা', lat: 23.75, lng: 90.39, accuracy: 12.5, source: 'live' },
  });
  assert.equal(good.validateSync(), undefined);
  assert.equal(good.location.accuracy, 12.5);

  const bad = seekerDoc({
    location: { address: 'ফার্মগেট, ঢাকা', lat: 23.75, lng: 90.39, source: 'satellite' },
  });
  assert.ok(bad.validateSync().errors['location.source']);
});

test('location source defaults to manual', () => {
  assert.equal(seekerDoc().location.source, 'manual');
});

test('live sharing has an index so the map query stays cheap', () => {
  const idx = Seeker.schema.indexes().map(([fields]) => fields);
  assert.ok(
    idx.some((f) => f.status === 1 && f['live.isSharing'] === 1),
    'expected a status + live.isSharing index'
  );
});

test('identity proof fields are hidden from default queries', () => {
  const paths = Seeker.schema.paths;
  assert.equal(paths.proofUrl.options.select, false);
  assert.equal(paths.proofPublicId.options.select, false);
  assert.equal(paths.avatarPublicId.options.select, false);
});

test('seeker indexes cover slug uniqueness and the public list query', () => {
  const idx = Seeker.schema.indexes().map(([fields, opts]) => ({ fields, opts }));
  assert.ok(idx.some((i) => i.fields.name === 'text'), 'expected a text index');
  assert.ok(
    idx.some((i) => i.fields.status === 1 && i.fields.category === 1),
    'expected a status+category index'
  );
  assert.equal(Seeker.schema.paths.slug.options.unique, true);
});

/* ----------------------------- Donation ----------------------------- */

test('a well formed donation validates and uppercases the trx id', () => {
  const d = donationDoc();
  assert.equal(d.validateSync(), undefined);
  assert.equal(d.trxId, '9F3KL2QX7A');
  assert.equal(d.status, 'pending');
});

test('donation rejects a zero amount, a bad method and a bad sender', () => {
  const err = donationDoc({ amount: 0, method: 'paypal', senderNumber: '999' }).validateSync();
  assert.ok(err.errors.amount);
  assert.ok(err.errors.method);
  assert.ok(err.errors.senderNumber);
});

test('donation rejects a malformed transaction id', () => {
  assert.ok(donationDoc({ trxId: 'abc' }).validateSync().errors.trxId);
  assert.ok(donationDoc({ trxId: 'HAS SPACE!!' }).validateSync().errors.trxId);
});

test('anonymous donations hide the donor name and phone in json', () => {
  const d = donationDoc({
    donor: { name: 'রাকিব হাসান', phone: '01712345678', isAnonymous: true, user: oid() },
  });
  const json = d.toJSON();
  assert.equal(json.donor.name, 'নাম প্রকাশে অনিচ্ছুক');
  assert.equal(json.donor.phone, undefined);
  assert.equal(json.donor.user, undefined);
  assert.ok(!JSON.stringify(json).includes('রাকিব হাসান'));
});

test('named donations keep the donor name', () => {
  const json = donationDoc({ donor: { name: 'রাকিব হাসান', isAnonymous: false } }).toJSON();
  assert.equal(json.donor.name, 'রাকিব হাসান');
});

test('the sender number survives anonymisation so admins can still verify', () => {
  const json = donationDoc({ donor: { name: 'X', isAnonymous: true } }).toJSON();
  assert.equal(json.senderNumber, '01712345678');
  assert.equal(json.trxId, '9F3KL2QX7A');
});

test('a transaction id can only be claimed once per method', () => {
  const idx = Donation.schema.indexes();
  const unique = idx.find(([fields, opts]) => fields.method === 1 && fields.trxId === 1 && opts?.unique);
  assert.ok(unique, 'expected a unique { method, trxId } index');
  assert.equal(Donation.schema.paths.receiptNo.options.unique, true);
});

test('donation caps a single amount at 5 lakh taka', () => {
  assert.ok(donationDoc({ amount: 500001 }).validateSync().errors.amount);
  assert.equal(donationDoc({ amount: 500000 }).validateSync(), undefined);
});
