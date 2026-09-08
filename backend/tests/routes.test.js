/**
 * HTTP contract tests that do NOT need a database: routing, validation,
 * auth guards, CORS, error envelope shape.
 *   node tests/routes.test.js
 */
import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';

let server;
let base;

before(async () => {
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server?.close());

const call = async (path, init) => {
  const res = await fetch(`${base}${path}`, init);
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* empty body */
  }
  return { status: res.status, body, headers: res.headers };
};

const json = (obj) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(obj),
});

test('GET /health reports status and db state', async () => {
  const { status, body } = await call('/health');
  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.equal(body.status, 'ok');
  assert.ok(['connected', 'disconnected'].includes(body.db));
});

test('GET / returns the service banner', async () => {
  const { status, body } = await call('/');
  assert.equal(status, 200);
  assert.equal(body.docs, env.apiPrefix);
});

test('GET /api/v1 lists the endpoints', async () => {
  const { status, body } = await call(env.apiPrefix);
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.data.endpoints));
  assert.ok(body.data.endpoints.some((e) => e.includes('/donations')));
});

test('unknown routes return a 404 envelope', async () => {
  const { status, body } = await call('/nope/nope');
  assert.equal(status, 404);
  assert.equal(body.success, false);
  assert.match(body.error.message, /Route not found/);
});

test('x-powered-by is hidden and helmet headers are present', async () => {
  const { headers } = await call('/health');
  assert.equal(headers.get('x-powered-by'), null);
  assert.equal(headers.get('x-content-type-options'), 'nosniff');
});

test('register rejects an invalid body with field level details', async () => {
  const { status, body } = await call(
    `${env.apiPrefix}/auth/register`,
    json({ name: 'A', email: 'not-an-email', password: 'short' })
  );
  assert.equal(status, 400);
  const fields = body.error.details.map((d) => d.field);
  assert.deepEqual(fields.sort(), ['email', 'name', 'password']);
});

test('register rejects the admin role being self-assigned', async () => {
  const { status, body } = await call(
    `${env.apiPrefix}/auth/register`,
    json({ name: 'Hacker', email: 'h@x.com', password: 'password123', role: 'admin' })
  );
  assert.equal(status, 400);
  assert.ok(body.error.details.some((d) => d.field === 'role'));
});

test('login requires both fields', async () => {
  const { status } = await call(`${env.apiPrefix}/auth/login`, json({ email: 'a@b.com' }));
  assert.equal(status, 400);
});

test('protected routes reject a missing token', async () => {
  for (const path of [
    '/auth/me',
    '/seekers/me/profile',
    '/donations/mine',
    '/donations/received',
    '/admin/seekers',
    '/admin/donations',
    '/uploads/signature',
  ]) {
    const { status } = await call(`${env.apiPrefix}${path}`);
    assert.equal(status, 401, `${path} should be 401`);
  }
});

test('protected routes reject a garbage token', async () => {
  const { status } = await call(`${env.apiPrefix}/auth/me`, {
    headers: { Authorization: 'Bearer not.a.real.token' },
  });
  assert.equal(status, 401);
});

test('location updates reject a missing token', async () => {
  const { status } = await call(`${env.apiPrefix}/seekers/me/location`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat: 23.75, lng: 90.39 }),
  });
  assert.equal(status, 401);
});

test('stopping location sharing rejects a missing token', async () => {
  const { status } = await call(`${env.apiPrefix}/seekers/me/location`, { method: 'DELETE' });
  assert.equal(status, 401);
});

test('seeker listing rejects an unknown category', async () => {
  const { status, body } = await call(`${env.apiPrefix}/seekers?category=banana`);
  assert.equal(status, 400);
  assert.ok(body.error.details.some((d) => d.field === 'category'));
});

test('seeker listing caps the page size', async () => {
  const { status } = await call(`${env.apiPrefix}/seekers?limit=5000`);
  assert.equal(status, 400);
});

test('donation submission validates amount, method, number and trx id', async () => {
  const { status, body } = await call(
    `${env.apiPrefix}/donations`,
    json({ seekerId: 'not-an-id', amount: -5, method: 'paypal', senderNumber: '123', trxId: '!!' })
  );
  assert.equal(status, 400);
  const fields = body.error.details.map((d) => d.field).sort();
  assert.deepEqual(fields, ['amount', 'method', 'senderNumber', 'seekerId', 'trxId'].sort());
});

test('upload status reports whether cloudinary is configured', async () => {
  const { status, body } = await call(`${env.apiPrefix}/uploads/status`);
  assert.equal(status, 200);
  assert.equal(typeof body.data.enabled, 'boolean');
  assert.equal(body.data.maxFileSizeMb, 5);
});

test('ai status reports whether gemini is configured', async () => {
  const { status, body } = await call(`${env.apiPrefix}/ai/status`);
  assert.equal(status, 200);
  assert.equal(typeof body.data.enabled, 'boolean');
});

test('ai dua rejects unknown fields and bad occasions', async () => {
  const bad = await call(`${env.apiPrefix}/ai/dua`, json({ occasion: 'birthday' }));
  assert.equal(bad.status, 400);

  const strict = await call(`${env.apiPrefix}/ai/dua`, json({ nope: 1 }));
  assert.equal(strict.status, 400);
});

test('ai dua returns bangla text (gemini or curated fallback)', async () => {
  const { status, body } = await call(
    `${env.apiPrefix}/ai/dua`,
    json({ occasion: 'health', tone: 'short', donorName: 'রাকিব' })
  );
  assert.equal(status, 200);
  assert.match(body.data.text, /[ঀ-৿]/);
});

test('cors allows the configured origin and vercel/netlify deployments', async () => {
  for (const origin of [
    'http://localhost:3000',
    'https://vikha-git-main-rakib.vercel.app',
    'https://digital-vikha.netlify.app',
    'https://68f2ab--digital-vikha.netlify.app',
  ]) {
    const res = await fetch(`${base}/health`, { headers: { Origin: origin } });
    assert.equal(res.headers.get('access-control-allow-origin'), origin, `${origin} should be allowed`);
  }
});

test('cors refuses an unknown origin quietly, without a 500', async () => {
  for (const origin of [
    'https://evil-site.com',
    'https://digital-vikha.netlify.app.evil.com',
    'http://digital-vikha.netlify.app',
  ]) {
    const res = await fetch(`${base}/health`, { headers: { Origin: origin } });
    assert.equal(res.status, 200, `${origin} should not blow up the request`);
    assert.equal(
      res.headers.get('access-control-allow-origin'),
      null,
      `${origin} must not receive the CORS header`
    );
  }
});

test('malformed json produces a 400, not a crash', async () => {
  const res = await fetch(`${base}${env.apiPrefix}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{ not json',
  });
  assert.equal(res.status, 400);
});
