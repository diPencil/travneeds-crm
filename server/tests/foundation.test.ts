import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, test } from 'node:test';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/database/pool.js';
import { checkDatabase } from '../src/database/pool.js';
import { readSettingsPage } from '../src/modules/settings/settings.service.js';
import { hashPassword, verifyPassword } from '../src/modules/auth/passwords.js';
import { tokenHash } from '../src/modules/auth/auth.service.js';
import { settingsInput } from '../src/modules/settings/settings.service.js';
import { env } from '../src/config/env.js';
import { requireAdmin, requireCsrf } from '../src/modules/auth/auth.middleware.js';
import express from 'express';
import { errorHandler } from '../src/http/errors.js';
import { profileInput } from '../src/modules/account/account.routes.js';
import { leadInput } from '../src/modules/crm/crm.validation.js';

after(async () => {
  await pool.end();
});

test('CRM validation rejects non-currencies and unpaired or malformed money', () => {
  const details = {
    fullName: randomBytes(5).toString('hex'),
    email: '',
    phone: '',
    company: '',
    notes: '',
    type: 'B2C',
    source: 'Website',
    priority: 'Medium',
    status: 'New',
    assignedUserId: '',
    nextFollowUpAt: '',
    valueAmount: '12.34',
    currency: 'USD',
  };
  assert.equal(leadInput.safeParse(details).success, true);
  assert.equal(leadInput.safeParse({ ...details, currency: 'ZZZ' }).success, false);
  assert.equal(leadInput.safeParse({ ...details, currency: '' }).success, false);
  assert.equal(leadInput.safeParse({ ...details, valueAmount: '-1' }).success, false);
  assert.equal(leadInput.safeParse({ ...details, valueAmount: '1.234' }).success, false);
  assert.equal(leadInput.safeParse({ ...details, convertedCustomerId: '1' }).success, false);
});

test('retained core modules require server authentication', async () => {
  for (const path of [
    '/users',
    '/users/invitations',
    '/users/logs',
    '/crm/leads',
    '/crm/customers',
    '/crm/suppliers',
  ]) {
    await request(app).get(`/api${path}`).expect(401);
  }
});

test('user detail tabs require a real administrator session', async () => {
  await request(app).get('/api/users/00000000-0000-4000-8000-000000000000').expect(401);
});

test('finance foundation read APIs require authentication', async () => {
  for (const path of ['/finance', '/finance/reports', '/finance/invoices', '/finance/options']) {
    await request(app).get(`/api${path}`).expect(401);
  }
});

test('restored account, notification and dashboard APIs require a real session', async () => {
  await request(app).get('/api/dashboard').expect(401);
  await request(app).get('/api/notifications').expect(401);
  await request(app)
    .patch('/api/account/profile')
    .set('Origin', env.APP_ORIGIN)
    .send({})
    .expect(401);
});

test('profile updates reject role and ownership assignment', () => {
  const details = {
    fullName: randomBytes(8).toString('hex'),
    email: `${randomBytes(8).toString('hex')}@example.invalid`,
    phone: '',
    avatarGender: 'female',
    version: 0,
  };
  assert.equal(profileInput.safeParse(details).success, true);
  assert.equal(profileInput.safeParse({ ...details, avatarGender: 'other' }).success, false);
  assert.equal(profileInput.safeParse({ ...details, roles: ['admin'] }).success, false);
  assert.equal(
    profileInput.safeParse({ ...details, userId: randomBytes(16).toString('hex') }).success,
    false,
  );
});

test('notification mutations reject unauthenticated requests', async () => {
  await request(app)
    .post('/api/notifications/read-all')
    .set('Origin', env.APP_ORIGIN)
    .send({})
    .expect(401);
  await request(app)
    .post('/api/notifications/1/read')
    .set('Origin', env.APP_ORIGIN)
    .send({})
    .expect(401);
  await request(app).delete('/api/notifications/1').set('Origin', env.APP_ORIGIN).expect(401);
});

test('the configured runtime account can read the applied schema and stored configuration', async () => {
  await checkDatabase();
  const result = await readSettingsPage();
  assert.ok(result.settings.projectName.length > 0);
  assert.match(result.settings.primaryColor, /^#[a-f0-9]{6}$/i);
  assert.equal(result.license.activationAvailable, false);
  assert.ok(Array.isArray(result.rates));
});

test('password hashing salts credentials and rejects incorrect or malformed credentials', async () => {
  const password = randomBytes(24).toString('hex');
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword(`${password}x`, first), false);
  assert.equal(await verifyPassword(password, 'invalid'), false);
});

test('session storage uses a fixed-size irreversible digest', () => {
  const token = randomBytes(32).toString('hex');
  assert.match(tokenHash(token), /^[a-f0-9]{64}$/);
  assert.notEqual(tokenHash(token), token);
});

test('state-changing requests require the configured origin', async () => {
  await request(app).post('/api/auth/login').send({}).expect(403);
  await request(app)
    .post('/api/auth/login')
    .set('Origin', 'https://untrusted.invalid')
    .send({})
    .expect(403);
});

test('login rejects unknown input fields and malformed bodies before database access', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .set('Origin', env.APP_ORIGIN)
    .send({ email: 'invalid', password: 'x', role: 'admin' })
    .expect(400);
  assert.equal(response.body.error.code, 'INVALID_INPUT');
});

test('settings and audit require a valid server session', async () => {
  await request(app).get('/api/settings').expect(401);
  await request(app).get('/api/audit/mine').expect(401);
  await request(app).get('/api/auth/session').set('Cookie', 'travneeds_session=true').expect(401);
});

test('employee role cannot reach administrator settings', async () => {
  const guarded = express();
  guarded.use((_request, response, next) => {
    response.locals.session = { user: { roles: ['employee'] } };
    next();
  });
  guarded.get('/', requireAdmin, (_request, response) => {
    response.json({ ok: true });
  });
  guarded.use(errorHandler);
  await request(guarded).get('/').expect(403);
});

test('CSRF protection requires the exact session token', async () => {
  const csrf = randomBytes(32).toString('hex');
  const guarded = express();
  guarded.use((_request, response, next) => {
    response.locals.session = { csrfToken: csrf };
    next();
  });
  guarded.post('/', requireCsrf, (_request, response) => {
    response.status(204).end();
  });
  guarded.use(errorHandler);
  await request(guarded).post('/').expect(403);
  await request(guarded).post('/').set('X-CSRF-Token', randomBytes(32).toString('hex')).expect(403);
  await request(guarded).post('/').set('X-CSRF-Token', csrf).expect(204);
});

test('settings schema rejects external assets, malformed colors, unknown currencies and license writes', () => {
  const settings = {
    projectName: 'Travneeds CRM',
    primaryColor: '#2563EB',
    logoUrl: '/logo.png',
    faviconUrl: '/favicon.svg',
    baseCurrency: 'USD',
    version: 1,
  };
  assert.equal(settingsInput.safeParse(settings).success, true);
  for (const changes of [
    { logoUrl: '//host/logo.png' },
    { logoUrl: '/../../secret.png' },
    { primaryColor: 'red;display:none' },
    { baseCurrency: 'ZZZ' },
    { status: 'active' },
  ]) {
    assert.equal(settingsInput.safeParse({ ...settings, ...changes }).success, false);
  }
});

test('API errors and responses do not cache session material or expose stack traces', async () => {
  const response = await request(app).get('/api/missing').expect(404);
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.equal(response.headers['x-powered-by'], undefined);
  assert.deepEqual(response.body, { error: { code: 'NOT_FOUND' } });
});

test('activation requests have no issuing or validation endpoint', async () => {
  await request(app)
    .post('/api/settings/activate')
    .set('Origin', env.APP_ORIGIN)
    .send({})
    .expect(404);
});
