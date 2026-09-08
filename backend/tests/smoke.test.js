/**
 * End-to-end test against a real MongoDB.
 *
 *   npm run test:smoke
 *
 * Uses a throwaway database (<MONGODB_DB_NAME>_test) and drops it afterwards,
 * so it never touches your real data. Requires network access to your
 * MongoDB Atlas cluster.
 */
process.env.NODE_ENV = 'test';
process.env.AUTO_APPROVE_SEEKERS = 'false';

import dotenv from 'dotenv';
dotenv.config();
process.env.MONGODB_DB_NAME = `${process.env.MONGODB_DB_NAME || 'digital_vikha'}_test`;

const { env, assertEnv } = await import('../src/config/env.js');
const { connectDB, disconnectDB } = await import('../src/config/db.js');
const { createApp } = await import('../src/app.js');
const { User } = await import('../src/models/User.js');
const mongoose = (await import('mongoose')).default;

let passed = 0;
let failed = 0;
const failures = [];

function check(label, condition, extra) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    failures.push(label);
    console.log(`  ✗ ${label}${extra ? `\n      ${JSON.stringify(extra).slice(0, 400)}` : ''}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

const rand = Math.random().toString(36).slice(2, 8);
const trx = (n) => `TST${rand.toUpperCase()}${n}`;

async function main() {
  assertEnv();
  await connectDB();
  console.log(`[smoke] using throwaway database: ${mongoose.connection.name}`);

  const app = createApp();
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}${env.apiPrefix}`;

  const api = async (path, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    let json = null;
    try {
      json = await res.json();
    } catch {
      /* no body */
    }
    return { status: res.status, ...json };
  };

  try {
    /* ---------------- auth ---------------- */
    section('Auth');

    const donorEmail = `donor.${rand}@test.bd`;
    const seekerEmail = `seeker.${rand}@test.bd`;
    const adminEmail = `admin.${rand}@test.bd`;

    const donorReg = await api('/auth/register', {
      method: 'POST',
      body: { name: 'রাকিব দাতা', email: donorEmail, password: 'Password123', phone: '01712345678' },
    });
    check('donor registers', donorReg.status === 201 && !!donorReg.data?.token, donorReg);
    const donorToken = donorReg.data?.token;

    const dup = await api('/auth/register', {
      method: 'POST',
      body: { name: 'দ্বিতীয়', email: donorEmail, password: 'Password123' },
    });
    check('duplicate email is rejected with 409', dup.status === 409, dup);

    const badLogin = await api('/auth/login', {
      method: 'POST',
      body: { email: donorEmail, password: 'WrongPassword' },
    });
    check('wrong password is rejected with 401', badLogin.status === 401, badLogin);

    const login = await api('/auth/login', {
      method: 'POST',
      body: { email: donorEmail, password: 'Password123' },
    });
    check('donor logs in', login.status === 200 && !!login.data?.token, login);

    const meRes = await api('/auth/me', { token: donorToken });
    check('GET /auth/me returns the donor', meRes.data?.user?.email === donorEmail, meRes);
    check('password hash is never returned', !JSON.stringify(meRes).includes('passwordHash'));

    const seekerReg = await api('/auth/register', {
      method: 'POST',
      body: { name: 'কাসেম আলী', email: seekerEmail, password: 'Password123', role: 'seeker' },
    });
    check('seeker user registers', seekerReg.status === 201, seekerReg);
    const seekerToken = seekerReg.data?.token;

    // Admins are created server-side only, never through the public API.
    const adminUser = new User({ name: 'Test Admin', email: adminEmail, role: 'admin' });
    await adminUser.setPassword('Password123');
    await adminUser.save();
    const adminLogin = await api('/auth/login', {
      method: 'POST',
      body: { email: adminEmail, password: 'Password123' },
    });
    const adminToken = adminLogin.data?.token;
    check('admin logs in', !!adminToken, adminLogin);

    const forbidden = await api('/admin/seekers', { token: donorToken });
    check('donor cannot reach admin routes (403)', forbidden.status === 403, forbidden);

    /* ---------------- seeker profile ---------------- */
    section('Seeker profile');

    const profileBody = {
      name: 'পরীক্ষামূলক চাচা কাসেম',
      category: 'disabled',
      story: 'দুর্ঘটনায় পা হারানোর পর কাজ করতে পারি না, প্রতিদিন ওষুধের টাকা প্রয়োজন।',
      dua: 'আল্লাহ্ আপনার রিজিকে বরকত দিন।',
      location: { address: 'ফার্মগেট ফুটওভার ব্রিজ, ঢাকা', district: 'ঢাকা', lat: 23.7583, lng: 90.3897 },
      payments: { bkash: '01711223344', nagad: '01811223344' },
      dailyTarget: 600,
    };

    const createProfile = await api('/seekers', { method: 'POST', body: profileBody, token: seekerToken });
    check('seeker creates a profile', createProfile.status === 201, createProfile);
    const seekerId = createProfile.data?.id || createProfile.data?._id;
    const slug = createProfile.data?.slug;
    check('profile starts as pending', createProfile.data?.status === 'pending', createProfile.data?.status);

    const second = await api('/seekers', { method: 'POST', body: profileBody, token: seekerToken });
    check('a second profile for the same user is rejected', second.status === 409, second);

    const hiddenList = await api('/seekers');
    check(
      'pending profiles are not publicly listed',
      !(hiddenList.data || []).some((s) => s.slug === slug),
      hiddenList.meta
    );

    const hiddenDetail = await api(`/seekers/${encodeURIComponent(slug)}`);
    check('pending profile is not publicly readable (404)', hiddenDetail.status === 404, hiddenDetail);

    const donationTooEarly = await api('/donations', {
      method: 'POST',
      body: { seekerId, amount: 100, method: 'bkash', senderNumber: '01712345678', trxId: trx('EARLY') },
    });
    check('donations to an unapproved seeker are refused', donationTooEarly.status === 400, donationTooEarly);

    const pendingQueue = await api('/admin/seekers?status=pending', { token: adminToken });
    check('admin sees the pending queue', (pendingQueue.data || []).some((s) => s.slug === slug), pendingQueue.meta);

    const approve = await api(`/admin/seekers/${seekerId}/review`, {
      method: 'PATCH',
      body: { status: 'approved', statusNote: 'যাচাই সম্পন্ন' },
      token: adminToken,
    });
    check('admin approves the seeker', approve.data?.status === 'approved', approve);

    const publicList = await api('/seekers?category=disabled');
    check('approved profile appears publicly', (publicList.data || []).some((s) => s.slug === slug), publicList.meta);

    const detail = await api(`/seekers/${encodeURIComponent(slug)}`);
    check('public detail page loads', detail.status === 200 && detail.data?.seeker?.slug === slug, detail.status);
    check('bangla category label is exposed', !!detail.data?.seeker?.categoryLabel, detail.data?.seeker?.categoryLabel);

    const search = await api(`/seekers?q=${encodeURIComponent('ফার্মগেট')}`);
    check('search by location finds the seeker', (search.data || []).some((s) => s.slug === slug), search.meta);

    const mapRes = await api('/seekers/map');
    check('map endpoint includes real coordinates', (mapRes.data || []).some((s) => s.slug === slug), mapRes.status);

    const districtsRes = await api('/seekers/districts');
    check('district facets are returned', Array.isArray(districtsRes.data), districtsRes);

    /* ---------------- live location ---------------- */
    section('Live location sharing');

    const beforeLive = await api(`/seekers/${encodeURIComponent(slug)}`);
    check('sharing is off until the seeker turns it on', beforeLive.data?.seeker?.isLive === false, beforeLive.data?.seeker?.live);

    const ping = await api('/seekers/me/location', {
      method: 'PATCH',
      token: seekerToken,
      body: { lat: 23.7601, lng: 90.3899, accuracy: 14 },
    });
    check('seeker can send a location ping', ping.status === 200, ping);
    check('ping marks the profile live', ping.data?.isLive === true, ping.data);
    check('ping records the accuracy', ping.data?.location?.accuracy === 14, ping.data?.location);
    check("ping tags the source as 'live'", ping.data?.location?.source === 'live', ping.data?.location);

    const afterPing = await api(`/seekers/${encodeURIComponent(slug)}`);
    check('coordinates moved to the new fix', afterPing.data?.seeker?.location?.lat === 23.7601, afterPing.data?.seeker?.location);
    check(
      'a location ping does NOT send the profile back for review',
      afterPing.data?.seeker?.status === 'approved',
      afterPing.data?.seeker?.status
    );

    const liveMap = await api('/seekers/map?live=true');
    check('live-only map includes the sharing seeker', (liveMap.data || []).some((s) => s.slug === slug), liveMap.status);

    const outsideBd = await api('/seekers/me/location', {
      method: 'PATCH',
      token: seekerToken,
      body: { lat: 51.5, lng: -0.12 },
    });
    check('coordinates outside Bangladesh are rejected', outsideBd.status === 400, outsideBd);

    const sneaky = await api('/seekers/me/location', {
      method: 'PATCH',
      token: seekerToken,
      body: { lat: 23.76, lng: 90.39, dailyTarget: 20000 },
    });
    check('the location endpoint refuses unrelated fields', sneaky.status === 400, sneaky);

    const strangerPing = await api('/seekers/me/location', {
      method: 'PATCH',
      token: donorToken,
      body: { lat: 23.76, lng: 90.39 },
    });
    check('a donor with no profile cannot ping a location', strangerPing.status === 404, strangerPing);

    const stop = await api('/seekers/me/location', { method: 'DELETE', token: seekerToken });
    check('seeker can stop sharing', stop.status === 200 && stop.data?.isLive === false, stop);

    const afterStop = await api('/seekers/map?live=true');
    check('stopped seeker drops off the live map', !(afterStop.data || []).some((s) => s.slug === slug), afterStop.status);

    const stillOnMap = await api('/seekers/map');
    check('but the last known pin stays on the normal map', (stillOnMap.data || []).some((s) => s.slug === slug), stillOnMap.status);

    /* ---------------- donations ---------------- */
    section('Donations');

    const badMethod = await api('/donations', {
      method: 'POST',
      body: { seekerId, amount: 100, method: 'rocket', senderNumber: '01712345678', trxId: trx('ROCK') },
    });
    check('a method the seeker has not registered is refused', badMethod.status === 400, badMethod);

    const trxId = trx('1');
    const donate = await api('/donations', {
      method: 'POST',
      token: donorToken,
      body: {
        seekerId,
        amount: 250,
        method: 'bkash',
        senderNumber: '01712345678',
        trxId,
        donorName: 'রাকিব',
        message: 'দোয়া করবেন',
      },
    });
    check('donation is recorded', donate.status === 201, donate);
    check('donation starts as pending', donate.data?.donation?.status === 'pending', donate.data?.donation?.status);
    check('receipt number is issued', /^VKH-/.test(donate.data?.donation?.receiptNo || ''), donate.data?.donation?.receiptNo);
    check('receiver number is snapshotted', donate.data?.donation?.receiverNumber === '01711223344', donate.data?.donation?.receiverNumber);
    check('a bangla dua comes back', /[ঀ-৿]/.test(donate.data?.dua?.text || ''), donate.data?.dua);
    const donationId = donate.data?.donation?.id || donate.data?.donation?._id;
    const receiptNo = donate.data?.donation?.receiptNo;

    const replay = await api('/donations', {
      method: 'POST',
      body: { seekerId, amount: 250, method: 'bkash', senderNumber: '01712345678', trxId },
    });
    check('the same transaction id cannot be submitted twice', replay.status === 409, replay);

    const beforeVerify = await api(`/seekers/${encodeURIComponent(slug)}`);
    check(
      'pending donations do not inflate the total',
      beforeVerify.data?.seeker?.stats?.collectedTotal === 0,
      beforeVerify.data?.seeker?.stats
    );

    const receipt = await api(`/donations/receipt/${receiptNo}`);
    check('receipt is publicly retrievable', receipt.status === 200 && receipt.data?.receiptNo === receiptNo, receipt.status);

    const mine = await api('/donations/mine', { token: donorToken });
    check('donor sees their own donation', (mine.data || []).some((d) => d.receiptNo === receiptNo), mine.meta);

    const received = await api('/donations/received', { token: seekerToken });
    check('seeker sees donations received', (received.data || []).some((d) => d.receiptNo === receiptNo), received.meta);

    const adminQueue = await api('/admin/donations?status=pending', { token: adminToken });
    check('admin sees the pending donation queue', (adminQueue.data || []).some((d) => d.receiptNo === receiptNo), adminQueue.meta);

    const verify = await api(`/admin/donations/${donationId}/review`, {
      method: 'PATCH',
      body: { status: 'verified' },
      token: adminToken,
    });
    check('admin verifies the donation', verify.data?.status === 'verified', verify);

    const doubleVerify = await api(`/admin/donations/${donationId}/review`, {
      method: 'PATCH',
      body: { status: 'verified' },
      token: adminToken,
    });
    check('a donation cannot be verified twice', doubleVerify.status === 400, doubleVerify);

    const afterVerify = await api(`/seekers/${encodeURIComponent(slug)}`);
    const stats = afterVerify.data?.seeker?.stats;
    check('verified amount lands in the total', stats?.collectedTotal === 250, stats);
    check("verified amount lands in today's collection", stats?.collectedToday === 250, stats);
    check('donation count increments', stats?.donationCount === 1, stats);
    check('progress percent is computed', afterVerify.data?.seeker?.progressPercent === 42, afterVerify.data?.seeker?.progressPercent);
    check('verified donation shows on the profile', (afterVerify.data?.recentDonations || []).length === 1, afterVerify.data?.recentDonations?.length);

    /* --- anonymity --- */
    const anonTrx = trx('2');
    const anon = await api('/donations', {
      method: 'POST',
      body: {
        seekerId,
        amount: 100,
        method: 'nagad',
        senderNumber: '01912345678',
        trxId: anonTrx,
        donorName: 'গোপন দাতা',
        donorPhone: '01912345678',
        isAnonymous: true,
      },
    });
    check('anonymous donation is accepted', anon.status === 201, anon.status);
    check('anonymous donor name is masked', anon.data?.donation?.donor?.name === 'নাম প্রকাশে অনিচ্ছুক', anon.data?.donation?.donor);
    check('anonymous donor phone is not exposed', !anon.data?.donation?.donor?.phone, anon.data?.donation?.donor);

    /* ---------------- stats & ai ---------------- */
    section('Stats, AI and uploads');

    const overview = await api('/stats/overview');
    check('overview counts the verified amount today', overview.data?.today?.collected >= 250, overview.data?.today);
    check('overview counts active seekers', overview.data?.activeSeekers >= 1, overview.data?.activeSeekers);
    check('overview counts pending donations', overview.data?.pendingDonations >= 1, overview.data?.pendingDonations);

    const board = await api('/stats/leaderboard');
    check('leaderboard returns rows', Array.isArray(board.data) && board.data.length >= 1, board.status);

    const duaRes = await api('/ai/dua', { method: 'POST', body: { occasion: 'parents', tone: 'short' } });
    check('dua endpoint returns bangla text', /[ঀ-৿]/.test(duaRes.data?.text || ''), duaRes.data);
    console.log(`      dua source: ${duaRes.data?.source} — "${duaRes.data?.text}"`);

    const up = await api('/uploads/status');
    check('upload status is readable', up.status === 200, up);
    console.log(`      cloudinary configured: ${up.data?.enabled}`);

    /* ---------------- ownership ---------------- */
    section('Authorisation boundaries');

    const otherReg = await api('/auth/register', {
      method: 'POST',
      body: { name: 'অন্য ব্যবহারকারী', email: `other.${rand}@test.bd`, password: 'Password123' },
    });
    const otherToken = otherReg.data?.token;

    const hijack = await api(`/seekers/${seekerId}`, {
      method: 'PATCH',
      body: { dailyTarget: 20000 },
      token: otherToken,
    });
    check("another user cannot edit someone else's profile", hijack.status === 403, hijack);

    const selfEdit = await api(`/seekers/${seekerId}`, {
      method: 'PATCH',
      body: { dailyTarget: 900 },
      token: seekerToken,
    });
    check('owner can edit their profile', selfEdit.data?.dailyTarget === 900, selfEdit.status);
    check('editing sends the profile back for review', selfEdit.data?.status === 'pending', selfEdit.data?.status);

    const notAdmin = await api(`/admin/donations/${donationId}/review`, {
      method: 'PATCH',
      body: { status: 'rejected' },
      token: seekerToken,
    });
    check('non-admins cannot review donations', notAdmin.status === 403, notAdmin);
  } finally {
    section('Cleanup');
    await mongoose.connection.dropDatabase();
    console.log('  ✓ throwaway database dropped');
    server.close();
    await disconnectDB();
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`  passed: ${passed}    failed: ${failed}`);
  if (failed) console.log(`  failing checks:\n   - ${failures.join('\n   - ')}`);
  console.log('='.repeat(50));
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error('\n[smoke] crashed:', err);
  process.exit(1);
});
