import assert from 'node:assert/strict';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { before, after, test, mock } from 'node:test';
import request from 'supertest';
import { blankQuotation } from '../../shared/quotations/quotation.contracts.js';
import type { DashboardOverview } from '../../shared/dashboard/dashboard.contracts.js';
import { decimalToMinor } from '../../shared/finance/money.js';
import { app } from '../src/app.js';
import { env } from '../src/config/env.js';
import { pool, databaseOptions } from '../src/database/pool.js';
import mysql from 'mysql2/promise';
import { createInitialAdmin } from '../src/modules/users/users.repository.js';
import type { RowDataPacket } from 'mysql2/promise';

if (
  !/^travneeds_crm_test_[a-f0-9]{12}$/.test(env.DB_NAME) ||
  process.env.CORE_TEST_DATABASE !== env.DB_NAME
)
  throw new Error('Integration fixtures require an isolated test database');
// Forward the public connector methods to a real isolated database using the
// existing migration identity. Query results and transactions are never faked.
// The production pool configuration and dedicated-account guard stay intact.
const isolatedPool = mysql.createPool({
  ...databaseOptions,
  user: env.DB_MIGRATION_USER,
  password: env.DB_MIGRATION_PASSWORD,
});
isolatedPool.on('connection', (connection) => {
  connection.query("SET time_zone = '+00:00'");
});
mock.method(pool, 'query', isolatedPool.query.bind(isolatedPool));
mock.method(pool, 'execute', isolatedPool.execute.bind(isolatedPool));
mock.method(pool, 'getConnection', isolatedPool.getConnection.bind(isolatedPool));
const suffix = randomBytes(6).toString('hex');
const password = randomBytes(20).toString('hex');
let admin: { cookie: string; csrf: string; id: string };
let employee: { cookie: string; csrf: string; id: string };
const profile = {
  fullName: suffix,
  email: `${suffix}@example.invalid`,
  phone: '',
  department: '',
  jobTitle: '',
  role: 'employee',
  avatarGender: 'female',
  status: 'active',
};
const customer = {
  fullName: suffix,
  email: '',
  phone: '',
  company: '',
  type: 'Individual',
  status: 'Active',
  nationality: '',
  assignedUserId: '',
  notes: '',
};
const lead = {
  fullName: suffix,
  email: '',
  phone: '',
  company: '',
  type: 'B2C',
  source: 'Website',
  priority: 'Medium',
  status: 'New',
  valueAmount: '12.34',
  currency: 'USD',
  assignedUserId: '',
  notes: '',
  nextFollowUpAt: '',
};
async function signIn(email: string) {
  const response = await request(app)
    .post('/api/auth/login')
    .set('Origin', env.APP_ORIGIN)
    .send({ email, password })
    .expect(200);
  return {
    cookie: String(response.headers['set-cookie'][0]).split(';')[0],
    csrf: response.body.csrfToken,
    id: response.body.user.id,
  };
}

test(
  'the browser renders the dashboard and quotation editor after a real sign-in',
  { skip: process.env.CORE_TEST_BROWSER !== '1' },
  async (context) => {
    const origin = new URL(env.APP_ORIGIN);
    const fileCustomer = await write('post', '/api/crm/customers')
      .send({ ...customer, fullName: 'Browser file customer' })
      .expect(201);
    const originalFetch = globalThis.fetch;
    context.mock.method(
      globalThis,
      'fetch',
      (resource: Parameters<typeof fetch>[0], init?: RequestInit) =>
        resource === 'https://translation.googleapis.com/language/translate/v2'
          ? Promise.resolve(
              Response.json({ data: { translations: [{ translatedText: 'Suggested title' }] } }),
            )
          : originalFetch(resource, init),
    );
    const inboxThreadId = randomUUID();
    await pool.execute(
      "INSERT INTO inbox_threads (id,channel,account_key,contact_key,contact_name,owner_id) VALUES (?,'web','browser-test',?,?,?)",
      [inboxThreadId, inboxThreadId, 'Browser inbox contact', admin.id],
    );
    await pool.execute(
      "INSERT INTO inbox_messages (thread_id,direction,body,delivery) VALUES (?,'incoming',?,'received')",
      [inboxThreadId, 'Browser incoming message'],
    );
    assert.equal(origin.hostname, '127.0.0.1');
    assert.notEqual(origin.port, '5173', 'The browser test needs its own port');
    await write('post', '/api/quotations')
      .send({
        customerId: '',
        content: blankQuotation('USD'),
        version: 0,
        requestKey: randomUUID(),
      })
      .expect(201);
    const catalogueInput = { version: 0, active: true, optionIds: [], slug: '', hotelId: null };
    const hotel = await write('post', '/api/catalogue/hotels')
      .send({
        ...catalogueInput,
        name: { en: `Browser hotel ${suffix}`, ar: '' },
        details: { rating: '5' },
      })
      .expect(201);
    await write('post', '/api/catalogue/rooms')
      .send({
        ...catalogueInput,
        hotelId: hotel.body.id,
        name: { en: `Browser room ${suffix}`, ar: '' },
        details: { currency: 'USD', price: '58.00' },
      })
      .expect(201);
    const { createServer: createVite } = await import('vite');
    const { default: puppeteer } = await import('puppeteer-core');
    const vite = await createVite({
      cacheDir: 'node_modules/.vite-browser-test',
      server: { middlewareMode: true, hmr: false, watch: null },
    });
    const http = createServer((req, res) => {
      if (req.url?.startsWith('/api/')) app(req, res);
      else vite.middlewares(req, res);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        http.once('error', reject);
        http.listen(Number(origin.port), origin.hostname, resolve);
      });
      const executablePath =
        env.PDF_CHROMIUM_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
      const browser = await puppeteer.launch({ executablePath, headless: true });
      try {
        const page = await browser.newPage();
        const errors: string[] = [];
        const iconRequests = new Set<string>();
        page.on('pageerror', (error) => errors.push(String(error)));
        page.on('request', (request) => {
          const { pathname } = new URL(request.url());
          if (pathname.includes('lucide-react')) iconRequests.add(pathname);
        });
        await page.goto(origin.href, { waitUntil: 'domcontentloaded' });
        await page.locator('input[type="email"]').fill(`admin-${suffix}@example.invalid`);
        await page.locator('input[type="password"]').fill(password);
        const loggedIn = page.waitForResponse(
          (response) => new URL(response.url()).pathname === '/api/auth/login',
        );
        await page.locator('button[type="submit"]').click();
        assert.equal((await loggedIn).status(), 200);
        await page
          .waitForSelector('main h1', { visible: true, timeout: 12000 })
          .catch(() => assert.fail(errors.join('\n') || 'Dashboard never rendered after sign-in'));
        assert.deepEqual(errors, []);
        assert.ok(iconRequests.size < 10, `Unexpected icon module fan-out: ${iconRequests.size}`);
        await page.setViewport({ width: 1440, height: 950 });
        const chartPeriod = 'main select[aria-label="Chart period"]';
        const chartRows = 'main ul[aria-label="Quotations & Bookings"] > li';
        await page.waitForSelector('main .apexcharts-svg');
        assert.equal(await page.$$eval(chartRows, (rows) => rows.length), 6);
        await page.select(chartPeriod, 'weekly');
        assert.equal(await page.$$eval(chartRows, (rows) => rows.length), 8);
        await page.locator(`a[href="/inbox?thread=${inboxThreadId}"]`).click();
        await page.waitForSelector('main ::-p-text(Browser inbox contact)', { visible: true });
        await page.waitForSelector('main ::-p-text(Browser incoming message)', { visible: true });
        await page.goto(new URL('/customers', origin).href, { waitUntil: 'domcontentloaded' });
        await page
          .locator('::-p-aria(Customer File for Browser file customer[role="link"])')
          .click();
        await page.waitForSelector('main ::-p-text(Browser file customer)', { visible: true });
        await page.waitForSelector('main table[aria-labelledby="customer-file-section"] tbody tr');
        await page.locator('nav[aria-label="Customer File"] a[href$="section=bookings"]').click();
        await page.waitForSelector('main ::-p-text(No matching records)', { visible: true });
        assert.equal(new URL(page.url()).pathname, `/customers/${fileCustomer.body.id}`);
        await page.goto(new URL('/users', origin).href, { waitUntil: 'domcontentloaded' });
        await page.locator('::-p-aria(Export[role="button"])').click();
        const exportToast = '[role="status"] ::-p-text(Export download started.)';
        await page.waitForSelector(exportToast, { visible: true, timeout: 5000 });
        await page.goto(new URL('/users/view', origin).href, { waitUntil: 'domcontentloaded' });
        await page.locator('::-p-aria(Activity[role="tab"])').click();
        await page.locator('::-p-aria(Export Log[role="button"])').click();
        await page.waitForSelector('[role="status"] ::-p-text(user-activity.csv)', {
          visible: true,
        });
        assert.ok(
          await page.$eval(exportToast, (node) => {
            const rect = node.getBoundingClientRect();
            const viewport = node.ownerDocument.documentElement;
            return (
              rect.top > viewport.clientHeight * 0.75 &&
              Math.abs(rect.left + rect.width / 2 - viewport.clientWidth / 2) < 50
            );
          }),
        );
        await page.goto(new URL('/users/logs', origin).href, { waitUntil: 'domcontentloaded' });
        await page.locator('::-p-aria(Export Logs[role="button"])').click();
        await page.waitForSelector(exportToast, { visible: true, timeout: 5000 });
        await page.goto(new URL('/settings', origin).href, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('[role="tablist"][aria-orientation="vertical"]');
        await page.waitForSelector('input[type="file"][accept*=".ico"]');
        await page.waitForSelector('img[alt="Logo preview"][src="/logo.png"]', { visible: true });
        await page.waitForSelector('img[alt="Favicon preview"][src="/favicon.svg"]', {
          visible: true,
        });
        await page.locator('#logo-url').fill('/missing-brand-preview.png');
        await page.waitForSelector('::-p-text(Image preview unavailable)', { visible: true });
        const logoUpload = await page.waitForSelector(
          'input[type="file"][aria-label="Upload Logo path"]',
        );
        assert.ok(logoUpload);
        const uploaded = page.waitForResponse(
          (response) =>
            new URL(response.url()).pathname === '/api/settings/brand-assets/logo' &&
            response.request().method() === 'POST',
        );
        await logoUpload.uploadFile('public/avatar-male.png');
        assert.equal((await uploaded).status(), 201);
        await page.waitForSelector('img[alt="Logo preview"][src^="/api/settings/brand-assets/"]', {
          visible: true,
        });
        await page.locator('#settings-tab-currency').click();
        await page.waitForSelector('#new-project-currency option[value="EUR"]');
        await page.locator('#settings-tab-translation').click();
        const settingsSaved = '[role="status"] ::-p-text(Settings saved.)';
        await page.locator('::-p-aria(Save[role="button"])').click();
        await page.waitForSelector(
          '::-p-text(Complete required fields and credentials before enabling.)',
        );
        assert.equal(await page.$(settingsSaved), null);
        await page.locator('#integration-translation-apiKey').fill(randomBytes(24).toString('hex'));
        await page.locator('::-p-aria(Save[role="button"])').click();
        await page.waitForSelector(settingsSaved, { visible: true });
        await page.locator('::-p-aria(Test saved API key[role="button"])').click();
        await page.waitForSelector('::-p-text(The saved API key passed the connection test.)');
        await page.goto(new URL('/quotations/new', origin).href, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#quotation-builder-timeline button[aria-current="step"]');
        const toolbar = 'main [aria-label="Content language"]';
        await page.locator(`${toolbar} ::-p-text(العربية)`).click();
        await page.locator('::-p-aria(Quotation title[role="textbox"])').fill('عنوان الكوتيشن');
        await page.locator(`${toolbar} ::-p-text(English)`).click();
        const translateButton = `${toolbar} ::-p-aria(Translate Arabic → English[role="button"])`;
        await page.locator(translateButton).click();
        const suggestion = '[role="dialog"] textarea';
        await page.waitForSelector(suggestion, { visible: true });
        assert.equal(await page.$eval(suggestion, (element) => element.value), 'Suggested title');
        await page.locator(suggestion).fill('Reviewed title');
        await page.locator('::-p-aria(Apply reviewed translation[role="button"])').click();
        assert.equal(
          await page.$eval('::-p-aria(Quotation title[role="textbox"])', (element) =>
            element.getAttribute('value'),
          ),
          'Reviewed title',
        );
        const draftSaved = page.waitForResponse(
          (response) =>
            new URL(response.url()).pathname === '/api/quotations' &&
            response.request().method() === 'POST',
        );
        await page.locator('::-p-aria(Save Draft[role="button"])').click();
        assert.equal((await draftSaved).status(), 201);
        await page.waitForSelector('[role="status"] ::-p-text(Draft saved.)', { visible: true });
        await page.locator('#quotation-builder-timeline button[data-step="hotels"]').click();
        await page.locator('::-p-aria(Add hotel stay[role="button"])').click();
        await page.locator('button[aria-label="4 stars"]').click();
        await page.waitForSelector('button[aria-label="4 stars"][aria-pressed="true"]');
        await page.select('select[id^="saved-hotel-"]', hotel.body.id);
        await page.waitForSelector('button[aria-label="5 stars"][aria-pressed="true"]');
        const roomNames = await page.$$eval('input', (elements) =>
          elements.map((element) => element.value),
        );
        assert.ok(roomNames.includes(`Browser room ${suffix}`));
        const timeline = 'nav[aria-label="Quotation builder steps"]';
        assert.equal(
          await page.$eval(
            timeline,
            (node) => node.ownerDocument.defaultView?.getComputedStyle(node).position,
          ),
          'sticky',
        );
        await page.locator('#quotation-builder-timeline button[data-step="overview"]').click();
        const editor = '.tiptap[role="textbox"]';
        await page.waitForSelector(`${editor}[dir="ltr"]`);
        await page.locator('button[aria-label="Bold"]').click();
        await page.keyboard.type('Trip overview');
        await page.waitForSelector(`${editor} strong`);
        await page.keyboard.down('Control');
        await page.keyboard.press('a');
        await page.keyboard.up('Control');
        await page.locator('button[aria-label="Link"]').click();
        await page.locator('input[aria-label="Link URL"]').fill('https://example.com/trip');
        await page.locator('::-p-aria(Apply link[role="button"])').click();
        await page.waitForSelector(`${editor} a[href="https://example.com/trip"]`);
        await page.locator('#quotation-builder-timeline button[data-step="pricing"]').click();
        await page.locator('#quotation-builder-timeline button[data-step="overview"]').click();
        assert.equal(
          await page.$eval(`${editor} strong`, (element) => element.textContent),
          'Trip overview',
        );
        if (process.env.CORE_TEST_CAPTURE_DIR)
          await page.screenshot({
            path: `${process.env.CORE_TEST_CAPTURE_DIR}/quotation-editor-desktop.png`,
          });
        await page.locator(`${toolbar} ::-p-text(العربية)`).click();
        await page.waitForSelector(`${editor}[dir="rtl"]`);
        await page.setViewport({ width: 390, height: 844 });
        await page.locator('button[aria-controls="quotation-builder-timeline"]').click();
        if (process.env.CORE_TEST_CAPTURE_DIR)
          await page.screenshot({
            path: `${process.env.CORE_TEST_CAPTURE_DIR}/quotation-editor-mobile.png`,
          });
        await page.locator('#quotation-builder-timeline button[data-step="itinerary"]').click();
        await page.waitForSelector(
          'button[aria-controls="quotation-builder-timeline"][aria-expanded="false"]',
        );
        assert.deepEqual(errors, []);
        const logoutStatus = await page.evaluate(async () => {
          const session = await fetch('/api/auth/session');
          const { csrfToken } = (await session.json()) as { csrfToken: string };
          const logout = await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'X-CSRF-Token': csrfToken },
          });
          return logout.status;
        });
        assert.equal(logoutStatus, 204);
      } finally {
        await browser.close();
      }
    } finally {
      http.close();
      await vite.close();
    }
  },
);
function write(method: 'post' | 'patch' | 'delete', path: string, session = admin) {
  const client = request(app);
  return client[method](path)
    .set('Origin', env.APP_ORIGIN)
    .set('Cookie', session.cookie)
    .set('X-CSRF-Token', session.csrf);
}
before(async () => {
  await createInitialAdmin(suffix, `admin-${suffix}@example.invalid`, password);
  admin = await signIn(`admin-${suffix}@example.invalid`);
  await write('post', '/api/users')
    .send({ ...profile, password })
    .expect(201);
  employee = await signIn(profile.email);
});
after(async () => {
  mock.restoreAll();
  await pool.end();
  await isolatedPool.end();
});

test('directory metrics reflect actual sessions and employees cannot administer accounts', async () => {
  const response = await request(app).get('/api/users').set('Cookie', admin.cookie).expect(200);
  assert.equal(response.body.metrics.total, 2);
  assert.equal(response.body.metrics.activeSessions, 2);
  assert.equal(response.body.metrics.pendingInvites, 0);
  assert.ok(
    response.body.users.every((user: Record<string, unknown>) => !('password_hash' in user)),
  );
  await request(app).get('/api/users').set('Cookie', employee.cookie).expect(403);
  await write('post', '/api/users', employee)
    .send({ ...profile, password })
    .expect(403);
  await write('patch', `/api/users/${admin.id}`)
    .send({ ...profile, email: `admin-${suffix}@example.invalid`, role: 'employee', version: 1 })
    .expect(409);
});

test('profile avatar persists across a new session and rejects unsafe values', async () => {
  await write('patch', '/api/account/profile', employee)
    .send({ fullName: suffix, email: profile.email, phone: '', avatarGender: 'male', version: 1 })
    .expect(200);
  const session = await request(app)
    .get('/api/auth/session')
    .set('Cookie', employee.cookie)
    .expect(200);
  assert.equal(session.body.user.avatarGender, 'male');
  await write('patch', '/api/account/profile', employee)
    .send({ fullName: suffix, email: profile.email, phone: '', avatarGender: 'female', version: 1 })
    .expect(409);
});

test('CRM customer saves persist and concurrent stale edits cannot overwrite each other', async () => {
  const create = await write('post', '/api/crm/customers', employee).send(customer).expect(201);
  const path = `/api/crm/customers/${create.body.id}`;
  const results = await Promise.all(
    ['a', 'b'].map((notes) =>
      write('patch', path, employee).send({ ...customer, notes, version: 1 }),
    ),
  );
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 409]);
  const saved = await request(app).get(path).set('Cookie', employee.cookie).expect(200);
  assert.equal(saved.body.version, 2);
  assert.ok(['a', 'b'].includes(saved.body.notes));
  await write('patch', `${path}/archive`, employee)
    .send({ version: 2, archived: true })
    .expect(403);
  await write('patch', `${path}/archive`).send({ version: 2, archived: true }).expect(204);
  await request(app).get(path).set('Cookie', employee.cookie).expect(403);
  await request(app).get(`${path}/file`).set('Cookie', employee.cookie).expect(403);
  await write('patch', `${path}/archive`).send({ version: 3, archived: false }).expect(204);
});

test('lead conversion is transactional and concurrent retries return the same persisted customer', async () => {
  await write('post', '/api/crm/leads', employee)
    .send({ ...lead, valueAmount: '1e9' })
    .expect(400);
  await write('post', '/api/crm/leads', employee)
    .send({ ...lead, createdBy: admin.id })
    .expect(400);
  const created = await write('post', '/api/crm/leads', employee)
    .send({ ...lead, assignedUserId: employee.id })
    .expect(201);
  const notifications = await request(app)
    .get('/api/notifications')
    .set('Cookie', employee.cookie)
    .expect(200);
  assert.equal(notifications.body.notifications[0].href, `/leads/${created.body.id}`);
  assert.equal(notifications.body.unreadCount, 1);
  const otherNotifications = await request(app)
    .get('/api/notifications')
    .set('Cookie', admin.cookie)
    .expect(200);
  assert.equal(otherNotifications.body.unreadCount, 0);
  const path = `/api/crm/leads/${created.body.id}`;
  const results = await Promise.all(
    [1, 2].map(() => write('post', `${path}/convert`, employee).send({ version: 1 })),
  );
  assert.deepEqual(
    results.map((result) => result.status),
    [200, 200],
  );
  assert.equal(results[0].body.customerId, results[1].body.customerId);
  const persisted = await request(app).get(path).set('Cookie', employee.cookie).expect(200);
  assert.equal(persisted.body.convertedCustomerId, results[0].body.customerId);
  assert.equal(persisted.body.valueAmount, '12.34');
  const [audits] = await pool.execute<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM audit_events WHERE action = 'leads.converted' AND entity_id = ?",
    [created.body.id],
  );
  assert.equal(Number(audits[0].total), 1);
});

test('supplier records persist and unknown fields are rejected', async () => {
  const data = {
    fullName: suffix,
    email: '',
    phone: '',
    company: '',
    category: suffix,
    contactName: '',
    country: '',
    city: '',
    status: 'Active',
    notes: '',
  };
  const created = await write('post', '/api/crm/suppliers', employee).send(data).expect(201);
  const listed = await request(app)
    .get(`/api/crm/suppliers?search=${suffix}`)
    .set('Cookie', employee.cookie)
    .expect(200);
  assert.equal(listed.body.records[0].id, created.body.id);
  await write('post', '/api/crm/suppliers', employee)
    .send({ ...data, version: 1 })
    .expect(400);
});

test('invitations are hashed, single-use and create genuine login accounts', async () => {
  const invitedEmail = `invite-${suffix}@example.invalid`;
  const invitation = await write('post', '/api/users/invitations')
    .send({ fullName: suffix, email: invitedEmail, role: 'employee', avatarGender: 'female' })
    .expect(201);
  const [stored] = await pool.execute<RowDataPacket[]>(
    'SELECT token_hash FROM user_invitations WHERE id = ?',
    [invitation.body.id],
  );
  assert.notEqual(stored[0].token_hash, invitation.body.token);
  await request(app).get(`/api/invitations/${invitation.body.token}`).expect(200);
  await request(app)
    .post(`/api/invitations/${invitation.body.token}/accept`)
    .set('Origin', env.APP_ORIGIN)
    .send({ password })
    .expect(204);
  await request(app)
    .post(`/api/invitations/${invitation.body.token}/accept`)
    .set('Origin', env.APP_ORIGIN)
    .send({ password })
    .expect(410);
  const signed = await signIn(invitedEmail);
  assert.ok(signed.id);
});

test('personal details persist without changing unrelated fields when omitted later', async () => {
  const current = await request(app)
    .get(`/api/users/${employee.id}`)
    .set('Cookie', admin.cookie)
    .expect(200);
  await write('patch', `/api/users/${employee.id}`)
    .send({
      ...profile,
      version: current.body.user.version,
      dateOfBirth: '2000-01-02',
      nationality: suffix,
      gender: 'female',
      address: suffix,
      emergencyContactName: suffix,
      emergencyContactPhone: '123',
      emergencyRelationship: suffix,
    })
    .expect(204);
  const saved = await request(app)
    .get(`/api/users/${employee.id}`)
    .set('Cookie', admin.cookie)
    .expect(200);
  assert.equal(saved.body.personal.dateOfBirth, '2000-01-02');
  assert.equal(saved.body.personal.gender, 'female');
  await write('patch', `/api/users/${employee.id}`)
    .send({ ...profile, version: saved.body.user.version })
    .expect(204);
  const retained = await request(app)
    .get(`/api/users/${employee.id}`)
    .set('Cookie', admin.cookie)
    .expect(200);
  assert.equal(retained.body.personal.dateOfBirth, '2000-01-02');
  await write('patch', `/api/users/${employee.id}`)
    .send({ ...profile, version: retained.body.user.version, dateOfBirth: '2999-01-01' })
    .expect(400);
});

test('detail security can revoke other sessions while keeping the current session', async () => {
  const other = await signIn(`admin-${suffix}@example.invalid`);
  const before = await request(app)
    .get(`/api/users/${admin.id}`)
    .set('Cookie', admin.cookie)
    .expect(200);
  assert.equal(
    before.body.security.sessions.filter((session: { isCurrent: boolean }) => session.isCurrent)
      .length,
    1,
  );
  await write('post', `/api/users/${admin.id}/revoke-sessions`)
    .send({ keepCurrent: true })
    .expect(204);
  await request(app).get('/api/auth/session').set('Cookie', admin.cookie).expect(200);
  await request(app).get('/api/auth/session').set('Cookie', other.cookie).expect(401);
});

test('internal user messages persist as owned notifications and are administrator-only', async () => {
  await write('post', `/api/users/${employee.id}/message`, employee)
    .send({ message: suffix })
    .expect(403);
  await write('post', `/api/users/${employee.id}/message`).send({ message: suffix }).expect(204);
  const inbox = await request(app)
    .get('/api/notifications')
    .set('Cookie', employee.cookie)
    .expect(200);
  assert.equal(inbox.body.notifications[0].content, suffix);
  await request(app)
    .post('/api/auth/login')
    .set('Origin', env.APP_ORIGIN)
    .send({ email: profile.email, password: `${password}x` })
    .expect(401);
  const failures = await request(app)
    .get('/api/users/logs?module=authentication&severity=warning')
    .set('Cookie', admin.cookie)
    .expect(200);
  assert.ok(
    failures.body.events.some(
      (event: { outcome: string; actorId: string | null }) =>
        event.outcome === 'failure' && event.actorId === null,
    ),
  );
});

test('finance stays unavailable until Trips is connected and posting remains closed', async () => {
  await pool.execute(
    "UPDATE finance_sources SET status='pending',connected_at=NULL WHERE code='trips'",
  );
  const response = await request(app).get('/api/finance').set('Cookie', admin.cookie).expect(200);
  assert.equal(response.body.source.status, 'pending_trips');
  assert.equal(response.body.source.postingAvailable, false);
  assert.equal(response.body.summary, null);
  assert.deepEqual(response.body.bookings, []);
  await request(app).get('/api/finance').set('Cookie', employee.cookie).expect(403);
  await write('post', '/api/finance/payments').send({ amount: '1.00' }).expect(405);
  await request(app)
    .get('/api/finance/reports?from=2026-12-01&to=2026-01-01')
    .set('Cookie', admin.cookie)
    .expect(400);
});

test('finance read models preserve decimal totals, refunds, missing costs and currency boundaries', async () => {
  await pool.execute(
    "UPDATE finance_sources SET status='connected',connected_at=UTC_TIMESTAMP(6) WHERE code='trips'",
  );
  const insertBooking = async (
    key: string,
    currency: string,
    total: string,
    cost: string | null,
    supplierCost: string,
  ) => {
    await pool.execute(
      `INSERT INTO finance_booking_accounts (source_code,source_booking_key,booking_reference,customer_name,agent_id,currency,total_amount,supplier_cost_total,total_cost,due_on,booked_at,synchronized_at)
      VALUES ('trips', ?, ?, ?, ?, ?, ?, ?, ?, '2020-01-01', '2026-11-01 12:00:00',UTC_TIMESTAMP(6))`,
      [key, key, suffix, employee.id, currency, total, supplierCost, cost],
    );
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT CAST(id AS CHAR) AS id FROM finance_booking_accounts WHERE source_booking_key=?',
      [key],
    );
    return String(rows[0].id);
  };
  const first = await insertBooking(`${suffix}-usd`, 'USD', '1000.30', '800.10', '600.00');
  await insertBooking(`${suffix}-small`, 'USD', '0.20', null, '0.00');
  await insertBooking(`${suffix}-eur`, 'EUR', '999.99', '1000.00', '0.00');
  const [suppliers] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM suppliers WHERE full_name=?',
    [suffix],
  );
  const supplierId = String(suppliers[0].id);
  await pool.execute(
    'INSERT INTO finance_booking_suppliers (booking_id,supplier_id) VALUES (?,?)',
    [first, supplierId],
  );
  for (const [purpose, status, amount] of [
    ['customer_receipt', 'verified', '400.10'],
    ['customer_refund', 'verified', '0.10'],
    ['customer_receipt', 'pending', '999.00'],
    ['supplier_payment', 'verified', '100.01'],
  ]) {
    await pool.execute(
      "INSERT INTO finance_payments (booking_id,supplier_id,purpose,status,currency,amount,method,settled_on) VALUES (?, ?, ?, ?, 'USD', ?, 'Bank Transfer', '2026-11-02')",
      [first, purpose === 'supplier_payment' ? supplierId : null, purpose, status, amount],
    );
  }
  for (const kind of ['standard', 'proforma'])
    await pool.execute(
      "INSERT INTO finance_invoices (booking_id,invoice_number,party,bill_to,kind,status,currency,amount,issued_on) VALUES (?,?,'customer',?,?,'issued','USD','1000.30','2026-11-02')",
      [first, `${suffix}-${kind}`, suffix, kind],
    );
  const usd = await request(app)
    .get('/api/finance?currency=USD')
    .set('Cookie', admin.cookie)
    .expect(200);
  assert.equal(usd.body.total, 2);
  assert.equal(usd.body.summary.cashReceived, '400.00');
  assert.equal(usd.body.summary.totalAmount, '1000.50');
  assert.equal(usd.body.summary.receivables, '600.50');
  assert.equal(usd.body.summary.supplierPayables, '499.99');
  assert.equal(usd.body.summary.netProfit, null);
  const eur = await request(app)
    .get('/api/finance?currency=EUR')
    .set('Cookie', admin.cookie)
    .expect(200);
  assert.equal(eur.body.summary.netProfit, '-0.01');
  assert.equal(eur.body.summary.totalAmount, '999.99');
  const filtered = await request(app)
    .get(`/api/finance?supplier=${supplierId}&currency=USD`)
    .set('Cookie', admin.cookie)
    .expect(200);
  assert.equal(filtered.body.total, 1);
  assert.equal(filtered.body.summary.netProfit, '200.20');
  const reports = await request(app)
    .get('/api/finance/reports?currency=USD&from=2026-11-01&to=2026-11-30')
    .set('Cookie', admin.cookie)
    .expect(200);
  assert.equal(reports.body.monthly[0].revenue, '1000.50');
  assert.equal(reports.body.monthly[0].profit, null);
  const invoices = await request(app)
    .get('/api/finance/invoices?currency=USD')
    .set('Cookie', admin.cookie)
    .expect(200);
  assert.equal(invoices.body.total, 2);
  await assert.rejects(() =>
    pool.execute(
      "INSERT INTO finance_invoices (booking_id,party,bill_to,kind,status,currency,amount) VALUES (?,'customer',?,'standard','draft','EUR','1.00')",
      [first, suffix],
    ),
  );
});

test('quotations preserve bilingual source content, require commercial readiness and reject stale or foreign edits', async () => {
  const [customers] = await pool.query<RowDataPacket[]>(
    'SELECT CAST(converted_customer_id AS CHAR) AS id FROM leads WHERE converted_customer_id IS NOT NULL ORDER BY id LIMIT 1',
  );
  const content = blankQuotation('USD');
  content.title = { en: suffix, ar: 'محتوى اختبار معزول' };
  content.overview.en = '<p>Stored <strong>content</strong></p><script>unsafe()</script>';
  content.pricing.basePrice = '100.50';
  content.pricing.startDate = '2030-01-01';
  content.validUntil = '2030-02-01';
  const payload = {
    customerId: String(customers[0].id),
    content,
    version: 0,
    requestKey: randomUUID(),
  };
  await request(app)
    .post('/api/quotations')
    .set('Origin', env.APP_ORIGIN)
    .send(payload)
    .expect(401);
  const created = await write('post', '/api/quotations', employee).send(payload).expect(201);
  assert.equal(created.body.price.total, '100.50');
  assert.equal(created.body.status, 'draft');
  assert.ok(!created.body.content.overview.en.includes('script'));
  const id = created.body.id;
  const replay = await write('post', '/api/quotations', employee).send(payload).expect(201);
  assert.equal(replay.body.id, id);
  await write('patch', `/api/quotations/${id}`, employee)
    .send({ ...payload, version: 0, requestKey: randomUUID() })
    .expect(409);
  const ready = await write('post', `/api/quotations/${id}/status`, employee)
    .send({ version: 1, status: 'ready', requestKey: randomUUID() })
    .expect(200);
  assert.equal(ready.body.version, 2);
  assert.equal(ready.body.status, 'ready');
  const share = await write('post', `/api/quotations/${id}/shares`, employee)
    .send({ version: 2, expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() })
    .expect(201);
  const token = new URL(share.body.url).hash.slice('#token='.length);
  await request(app).get(`/api/public/quotations/${share.body.id}`).expect(404);
  const publicView = await request(app)
    .get(`/api/public/quotations/${share.body.id}?locale=ar`)
    .set('X-Quotation-Token', token)
    .expect(200);
  assert.ok(publicView.body.html.includes('dir="rtl"'));
  assert.ok(!('content' in publicView.body));
  assert.ok(!JSON.stringify(publicView.body).includes('costPerNight'));
  const guestPath = `/api/public/inbox/${share.body.id}`;
  const guestKey = randomUUID();
  const guestBody = { body: 'Request from quotation holder', requestKey: guestKey };
  await request(app).get(guestPath).expect(404);
  for (let attempt = 0; attempt < 2; attempt++) {
    const guest = await request(app)
      .post(guestPath)
      .set('Origin', env.APP_ORIGIN)
      .set('X-Quotation-Token', token)
      .send(guestBody)
      .expect(201);
    assert.equal(guest.body.messages.length, 1);
  }
  const inbox = await request(app).get('/api/inbox').set('Cookie', employee.cookie).expect(200);
  const conversation = inbox.body.threads.find(
    (item: { quotationId: string }) => item.quotationId === id,
  );
  assert.equal(conversation.unread, 1);
  await write('post', `/api/inbox/${conversation.id}/messages`, employee)
    .send({ body: 'Reply from the assigned consultant', requestKey: randomUUID() })
    .expect(201);
  const chat = await request(app).get(guestPath).set('X-Quotation-Token', token).expect(200);
  assert.equal(chat.body.messages.length, 2);
  assert.equal(chat.body.messages[1].direction, 'outgoing');
  await request(app).get(`/api/inbox/${conversation.id}`).expect(401);
  const detail = await request(app)
    .get(`/api/inbox/${conversation.id}`)
    .set('Cookie', employee.cookie)
    .expect(200);
  assert.equal(detail.body.id, conversation.id);
  const overview = await request(app)
    .get('/api/dashboard')
    .set('Cookie', employee.cookie)
    .expect(200);
  assert.deepEqual(
    (overview.body as DashboardOverview).recentIncomingMessages.map(({ preview, threadId }) => ({
      preview,
      threadId,
    })),
    [{ preview: guestBody.body, threadId: conversation.id }],
  );
  await request(app).get('/api/emails').expect(401);
  const emailList = await request(app)
    .get('/api/emails')
    .set('Cookie', employee.cookie)
    .expect(200);
  assert.equal(emailList.body.total, 0);
  await pool.execute(
    "INSERT INTO email_deliveries (id,quotation_share_id,actor_id,request_key,request_digest,recipient_email,subject,status,finished_at) VALUES (?,?,?,?,?,'file@example.invalid','Customer file test','sent',UTC_TIMESTAMP(6))",
    [randomUUID(), share.body.id, employee.id, randomUUID(), '0'.repeat(64)],
  );
  await request(app).get('/api/auth/google/link').expect(401);
  const google = await request(app).get('/api/auth/google/availability').expect(200);
  assert.equal(google.body.available, false);
  if (process.env.CORE_TEST_PDF === '1') {
    for (const locale of ['en', 'ar']) {
      const pdf = await request(app)
        .get(`/api/public/quotations/${share.body.id}/pdf?locale=${locale}`)
        .set('X-Quotation-Token', token)
        .expect('Content-Type', /application\/pdf/)
        .expect(200);
      assert.equal(pdf.body.subarray(0, 5).toString(), '%PDF-');
      assert.ok(pdf.body.length > 10000);
    }
  }
  const [storedShares] = await pool.execute<RowDataPacket[]>(
    'SELECT token_digest FROM quotation_shares WHERE id=?',
    [share.body.id],
  );
  assert.notEqual(storedShares[0].token_digest, token);
  await write('delete', `/api/quotations/${id}/shares/${share.body.id}`, employee).expect(204);
  await request(app).get(guestPath).set('X-Quotation-Token', token).expect(404);
  await request(app)
    .get(`/api/public/quotations/${share.body.id}`)
    .set('X-Quotation-Token', token)
    .expect(404);

  const historical = await request(app)
    .get(`/api/quotations/${id}?version=1`)
    .set('Cookie', employee.cookie)
    .expect(200);
  assert.equal(historical.body.content.title.ar, content.title.ar);
  const other = await write('post', '/api/quotations')
    .send({ ...payload, requestKey: randomUUID() })
    .expect(201);
  await request(app)
    .get(`/api/quotations/${other.body.id}`)
    .set('Cookie', employee.cookie)
    .expect(404);
  const unpriced = await write('post', '/api/quotations', employee)
    .send({ ...payload, customerId: '', content: blankQuotation('USD'), requestKey: randomUUID() })
    .expect(201);
  await write('post', `/api/quotations/${unpriced.body.id}/status`, employee)
    .send({ version: 1, status: 'ready', requestKey: randomUUID() })
    .expect(400);
  const list = await request(app)
    .get('/api/quotations?status=ready')
    .set('Cookie', employee.cookie)
    .expect(200);
  assert.equal(list.body.total, 1);
  const bookingInput = { quotationId: id, quotationVersion: 2, requestKey: randomUUID() };
  const attempts = await Promise.all([
    write('post', '/api/bookings', employee).send(bookingInput).expect(201),
    write('post', '/api/bookings', employee).send(bookingInput).expect(201),
  ]);
  const booking = attempts[0].body;
  assert.equal(attempts[1].body.id, booking.id);
  assert.equal(booking.status, 'pending');
  assert.equal(booking.total, '100.50');
  const reporting = async () => {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT is_reporting FROM finance_booking_accounts WHERE id=?',
      [booking.financeId],
    );
    return rows[0].is_reporting;
  };
  assert.equal(await reporting(), 0);
  const dashboard = async (cookie: string): Promise<DashboardOverview> =>
    (await request(app).get('/api/dashboard').set('Cookie', cookie).expect(200)).body;
  const pending = await dashboard(employee.cookie);
  assert.equal(pending.metrics.bookings, 1);
  assert.equal(pending.metrics.pendingBookings, 1);
  assert.equal(pending.metrics.confirmedBookings, 0);
  assert.equal(pending.metrics.quotations, 2);
  assert.equal(pending.trend.weekly.length, 8);
  assert.equal(pending.trend.monthly.length, 6);
  assert.equal(
    pending.trend.weekly.reduce((count, point) => count + point.bookings, 0),
    1,
  );
  assert.equal(pending.bookedValue, null);
  const bookingValue = async () => {
    const { bookedValue } = await dashboard(admin.cookie);
    return decimalToMinor(bookedValue?.find((line) => line.currency === 'USD')?.amount ?? '0');
  };
  const previousValue = await bookingValue();
  const finance = () =>
    request(app)
      .get('/api/finance')
      .query({ currency: 'USD', search: booking.reference })
      .set('Cookie', admin.cookie)
      .expect(200);
  assert.equal((await finance()).body.bookings.length, 0);
  const filePath = `/api/crm/customers/${payload.customerId}/file`;
  await request(app).get(filePath).expect(401);
  await request(app)
    .get('/api/crm/customers/999999999999/file')
    .set('Cookie', admin.cookie)
    .expect(404);
  const readFileSection = (section: string, session = employee) =>
    request(app).get(`${filePath}/${section}`).set('Cookie', session.cookie);
  assert.equal((await readFileSection('leads').expect(200)).body.rows.length, 1);
  const savedQuotes = (await readFileSection('quotations').expect(200)).body.rows;
  assert.ok(
    savedQuotes.some(
      (row: { sharedLinks: number; lastSentAt: string | null }) =>
        row.sharedLinks === 1 && row.lastSentAt,
    ),
  );
  assert.equal((await readFileSection('inbox').expect(200)).body.rows.length, 2);
  assert.equal((await readFileSection('emails').expect(200)).body.rows[0].status, 'sent');
  assert.equal((await readFileSection('bookings').expect(200)).body.rows[0].id, booking.id);
  await readFileSection('payments').expect(403);
  await pool.execute(
    `INSERT INTO finance_payments (booking_id,purpose,status,currency,amount,method,settled_on) VALUES
      (?,'customer_receipt','verified','USD','15.00','bank',UTC_DATE()),
      (?,'customer_refund','verified','USD','4.25','bank',UTC_DATE())`,
    [booking.financeId, booking.financeId],
  );
  assert.equal((await readFileSection('payments', admin).expect(200)).body.rows.length, 2);
  const adminFile = await request(app).get(filePath).set('Cookie', admin.cookie).expect(200);
  assert.deepEqual(adminFile.body.finance, [{ currency: 'USD', netReceived: '10.75' }]);
  const basicFile = await request(app).get(filePath).set('Cookie', employee.cookie).expect(200);
  assert.equal(basicFile.body.finance, null);
  assert.ok(
    (await readFileSection('timeline').expect(200)).body.rows.some(
      (row: { event: string }) => row.event === 'leads.converted',
    ),
  );
  assert.ok(
    (await readFileSection('timeline', admin).expect(200)).body.rows.some(
      (row: { category: string }) => row.category === 'payment',
    ),
  );
  await readFileSection('bookings?page=0').expect(400);
  assert.deepEqual((await readFileSection('bookings?page=2').expect(200)).body.rows, []);
  const unrelated = await write('post', '/api/crm/customers')
    .send({ ...customer, fullName: 'Unrelated file customer' })
    .expect(201);
  const otherFile = await request(app)
    .get(`/api/crm/customers/${unrelated.body.id}/file`)
    .set('Cookie', admin.cookie)
    .expect(200);
  assert.deepEqual(otherFile.body.totals, { quotations: 0, bookings: 0, inbox: 0, emails: 0 });
  await write('patch', `/api/quotations/${other.body.id}`)
    .send({ ...payload, customerId: unrelated.body.id, version: 1, requestKey: randomUUID() })
    .expect(200);
  const historicalFile = (await readFileSection('quotations', admin).expect(200)).body.rows;
  assert.deepEqual(
    historicalFile
      .filter((row: { id: string }) => row.id === other.body.id)
      .map((row: { version: number }) => row.version),
    [1],
  );
  const newFile = await request(app)
    .get(`/api/crm/customers/${unrelated.body.id}/file/quotations`)
    .set('Cookie', admin.cookie)
    .expect(200);
  assert.deepEqual(
    newFile.body.rows.map((row: { version: number }) => row.version),
    [2],
  );
  await write('patch', `/api/bookings/${booking.id}/status`, employee)
    .send({ status: 'confirmed', version: 1 })
    .expect(200);
  assert.equal(await reporting(), 1);
  const confirmed = await dashboard(employee.cookie);
  assert.equal(confirmed.metrics.pendingBookings, 0);
  assert.equal(confirmed.metrics.confirmedBookings, 1);
  assert.equal(await bookingValue(), previousValue + 10050n);
  assert.equal((await finance()).body.summary.totalAmount, '100.50');
  const invoiceBooking = await request(app)
    .get(`/api/finance/bookings/${booking.financeId}`)
    .set('Cookie', admin.cookie)
    .expect(200);
  assert.equal(invoiceBooking.body.invoiceDefaults.items[0].unitPrice, '100.50');
  await write('patch', `/api/bookings/${booking.id}/status`, employee)
    .send({ status: 'cancelled', version: 1 })
    .expect(409);
  await write('patch', `/api/bookings/${booking.id}/status`, employee)
    .send({ status: 'cancelled', version: 2 })
    .expect(200);
  assert.equal(await reporting(), 0);
  const cancelled = await dashboard(employee.cookie);
  assert.equal((await readFileSection('bookings').expect(200)).body.rows[0].status, 'cancelled');
  assert.equal(cancelled.metrics.bookings, 0);
  assert.equal(cancelled.metrics.confirmedBookings, 0);
  assert.equal(
    cancelled.trend.monthly.reduce((count, point) => count + point.bookings, 0),
    0,
  );
  assert.equal(await bookingValue(), previousValue);
  assert.equal((await finance()).body.bookings.length, 0);
  await write('post', '/api/quotation-media/import', employee)
    .send({ url: 'https://127.0.0.1/private' })
    .expect(400);
});

test('quotation photos accept a real upload and direct public HTTPS links only', async () => {
  const image = await readFile('public/avatar-male.png');
  const saved = await write('post', '/api/quotation-media', employee)
    .type('image/webp')
    .send(image)
    .expect(201);
  const asset = await request(app)
    .get(`/api/quotation-media/${saved.body.id}`)
    .set('Cookie', employee.cookie)
    .expect('Content-Type', /image\/webp/)
    .expect(200);
  assert.deepEqual(asset.body, image);
  for (const url of [
    'http://example.com/image.png',
    'https://localhost/image.png',
    'https://example.com:8443/image.png',
  ]) {
    await write('post', '/api/quotation-media/import', employee).send({ url }).expect(400);
  }
  const testUrl = process.env.CORE_TEST_IMAGE_URL;
  if (testUrl) {
    const imported = await write('post', '/api/quotation-media/import', employee)
      .send({ url: testUrl })
      .expect(201);
    assert.ok(imported.body.byteSize > 0);
    await request(app)
      .get(`/api/quotation-media/${imported.body.id}`)
      .set('Cookie', employee.cookie)
      .expect(200);
  }
});

test('project branding accepts actual assets and stores multiple supported currencies', async () => {
  const image = await readFile('public/avatar-male.png');
  const upload = '/api/settings/brand-assets/logo';
  await write('post', upload, employee).type('image/webp').send(image).expect(403);
  const logo = await write('post', upload).type('image/webp').send(image).expect(201);
  const favicon = await write('post', '/api/settings/brand-assets/favicon')
    .type('image/webp')
    .send(image)
    .expect(201);
  const { body } = await request(app).get('/api/settings').set('Cookie', admin.cookie).expect(200);
  await write('patch', '/api/settings')
    .send({ ...body.settings, logoUrl: favicon.body.url })
    .expect(400);
  const settings = await write('patch', '/api/settings')
    .send({ ...body.settings, logoUrl: logo.body.url, faviconUrl: favicon.body.url })
    .expect(200);
  const branding = await request(app).get('/api/settings/branding').expect(200);
  assert.equal(branding.body.logoUrl, settings.body.logoUrl);
  assert.equal(branding.body.faviconUrl, favicon.body.url);
  assert.deepEqual(
    (
      await request(app)
        .get(branding.body.logoUrl)
        .expect('Content-Type', /image\/webp/)
        .expect(200)
    ).body,
    image,
  );
  await write('post', '/api/settings/currency-list', employee).send({ code: 'JPY' }).expect(403);
  await write('post', '/api/settings/currency-list').send({ code: 'INVALID' }).expect(400);
  await write('post', '/api/settings/currency-list').send({ code: 'JPY' }).expect(200);
  const saved = await write('post', '/api/settings/currency-list')
    .send({ code: 'CAD' })
    .expect(200);
  assert.ok(saved.body.currencies.includes('JPY') && saved.body.currencies.includes('CAD'));
  const quoteOptions = await request(app)
    .get('/api/quotations/options')
    .set('Cookie', employee.cookie)
    .expect(200);
  assert.ok(quoteOptions.body.currencies.includes('CAD'));
  await write('patch', '/api/settings').send(body.settings).expect(409);
});

test('travel catalogue links hotel options and stores new quotation entries without changing existing records', async () => {
  const en = (value: string) => ({ en: `${value}-${suffix}`, ar: '' });
  const base = { version: 0, active: true, optionIds: [], hotelId: null, slug: '', details: {} };
  await request(app).get('/api/catalogue/options').expect(401);
  const make = (kind: string, name: string, extras: object = {}) =>
    write('post', `/api/catalogue/${kind}`, employee)
      .send({ ...base, name: en(name), ...extras })
      .expect(201);
  const destination = (
    await make('destinations', 'Destination', { details: { showInOneDayTours: true } })
  ).body;
  const hotel = (
    await make('hotels', 'Hotel', { details: { rating: '5', destinationId: destination.id } })
  ).body;
  const meal = (await make('meals', 'Meal', { linkHotelId: hotel.id })).body;
  const amenity = (await make('amenities', 'Amenity', { linkHotelId: hotel.id })).body;
  const addon = (
    await make('travel-add-ons', 'Extras', {
      linkHotelId: hotel.id,
      details: { currency: 'USD', price: '16.00' },
    })
  ).body;
  for (let i = 0; i < 10; i++)
    await make('rooms', `Room ${i}`, {
      hotelId: hotel.id,
      details: { mealId: meal.id, adults: 2, currency: 'USD', price: String(100 + i) },
    });
  const bundle = await request(app)
    .get(`/api/catalogue/hotels/${hotel.id}/bundle`)
    .set('Cookie', employee.cookie)
    .expect(200);
  assert.equal(bundle.body.rooms.length, 10);
  assert.deepEqual(
    new Set(bundle.body.options.map((item: { id: string }) => item.id)),
    new Set([meal.id, amenity.id, addon.id]),
  );
  const content = blankQuotation('USD');
  content.type = 'multi-days-tours';
  content.destination = en('Manual destination');
  content.categories = [en('Manual category').en];
  content.addOns = [{ id: randomUUID(), title: en('Manual add on'), price: '4.00' }];
  content.hotels = [
    {
      id: randomUUID(),
      name: en('Manual hotel'),
      description: en('Description'),
      location: en('Address'),
      rating: '4',
      supplierId: '',
      contact: '',
      amenities: en('Manual amenity'),
      meals: en('Manual meal'),
      extras: en('Manual hotel extra'),
      images: [],
      checkIn: '',
      checkOut: '',
      includedInPackage: true,
      rooms: [
        {
          id: randomUUID(),
          name: en('Manual room'),
          board: en('Manual meal'),
          count: 1,
          adults: 2,
          children: 0,
          infants: 0,
          childAges: [],
          sellPerNight: '45.00',
          costPerNight: '',
        },
      ],
    },
  ];
  const requestKey = randomUUID();
  const input = { customerId: '', content, version: 0, requestKey };
  const saved = await write('post', '/api/quotations', employee).send(input).expect(201);
  const replay = await write('post', '/api/quotations', employee).send(input).expect(201);
  assert.equal(saved.body.id, replay.body.id);
  const manualHotel = saved.body.content.hotels[0];
  assert.equal(saved.body.content.categoryCatalogueRefs[0].name, content.categories[0]);
  const fromQuote = await request(app)
    .get(`/api/catalogue/hotels/${manualHotel.catalogueId}/bundle`)
    .set('Cookie', employee.cookie)
    .expect(200);
  assert.equal(fromQuote.body.rooms.length, 1);
  assert.equal(fromQuote.body.rooms[0].details.price, '45.00');
  assert.equal(fromQuote.body.options.length, 3);
  const list = await request(app)
    .get('/api/catalogue/options')
    .set('Cookie', employee.cookie)
    .expect(200);
  assert.ok(
    list.body.destinations.some(
      (entry: { id: string }) => entry.id === saved.body.content.destinationCatalogueId,
    ),
  );
  assert.ok(
    list.body['multi-day-categories'].some(
      (entry: { name: { en: string } }) => entry.name.en === content.categories[0],
    ),
  );
  await write('patch', `/api/catalogue/rooms/${fromQuote.body.rooms[0].id}`, employee)
    .send({ ...base, version: 1, hotelId: hotel.id, name: en('Manual room') })
    .expect(409);
});

test('quotation translation uses the saved key, respects visibility and protects reviewed content', async (context) => {
  const providerPath = '/api/settings/integrations/translation';
  const endpoint = '/api/content-translation';
  const status = () =>
    request(app).get(`${endpoint}/status`).set('Cookie', employee.cookie).expect(200);
  const configuration = await request(app)
    .get(providerPath)
    .set('Cookie', admin.cookie)
    .expect(200);
  const key = randomBytes(24).toString('hex');
  const settings = {
    enabled: true,
    fields: {},
    secrets: { apiKey: key },
    clearSecrets: [],
    version: configuration.body.version,
  };
  const saved = await write('patch', providerPath).send(settings).expect(200);
  assert.deepEqual((await status()).body, { available: true });
  await request(app).get(`${endpoint}/status`).expect(401);
  const originalFetch = globalThis.fetch;
  let upstream: RequestInit | undefined;
  let failure = false;
  context.mock.method(
    globalThis,
    'fetch',
    (resource: Parameters<typeof fetch>[0], init?: RequestInit) => {
      if (resource !== 'https://translation.googleapis.com/language/translate/v2')
        return originalFetch(resource, init);
      upstream = init;
      return Promise.resolve(
        failure
          ? new Response(null, { status: 403 })
          : Response.json({
              data: {
                translations: [
                  {
                    translatedText:
                      '<p>Welcome <strong>aboard</strong></p><script>unsafe()</script>',
                  },
                ],
              },
            }),
      );
    },
  );
  const text = { source: 'ar', target: 'en', format: 'html', texts: ['<p>مرحبًا</p>'] };
  await request(app)
    .post(endpoint)
    .set('Cookie', employee.cookie)
    .set('Origin', env.APP_ORIGIN)
    .send(text)
    .expect(403);
  const result = await write('post', endpoint, employee).send(text).expect(200);
  assert.equal(new Headers(upstream?.headers).get('X-goog-api-key'), key);
  assert.deepEqual(JSON.parse(String(upstream?.body)), {
    source: 'ar',
    target: 'en',
    format: 'html',
    q: text.texts,
  });
  assert.deepEqual(result.body, {
    translations: ['<p>Welcome <strong>aboard</strong></p>'],
    provider: 'google-cloud',
  });
  await write('post', `${endpoint}/check`, employee).expect(403);
  await write('post', `${endpoint}/check`).expect(204);
  failure = true;
  await write('post', `${endpoint}/check`).expect(502);
  const hidden = await write('patch', providerPath)
    .send({ ...settings, enabled: false, secrets: {}, version: saved.body.version })
    .expect(200);
  assert.equal(hidden.body.secrets.apiKey, true);
  assert.deepEqual((await status()).body, { available: false });
  upstream = undefined;
  await write('post', endpoint, employee).send(text).expect(503);
  assert.equal(upstream, undefined);
});

test('integration settings encrypt write-only credentials and reject unauthorized or stale changes', async () => {
  const path = '/api/settings/integrations/smtp';
  await request(app).get(path).expect(401);
  await request(app).get(path).set('Cookie', employee.cookie).expect(403);
  const initial = await request(app).get(path).set('Cookie', admin.cookie).expect(200);
  assert.equal(initial.body.configurationStatus, 'not_configured');
  assert.equal(initial.body.version, 0);
  const secret = randomBytes(24).toString('hex');
  const input = {
    enabled: true,
    fields: {
      host: 'smtp.example.invalid',
      port: '587',
      encryption: 'starttls',
      username: suffix,
      fromName: suffix,
      fromEmail: `${suffix}@example.invalid`,
    },
    secrets: { password: secret },
    clearSecrets: [],
    version: 0,
  };
  await write('patch', path, employee).send(input).expect(403);
  await request(app)
    .patch(path)
    .set('Origin', env.APP_ORIGIN)
    .set('Cookie', admin.cookie)
    .send(input)
    .expect(403);
  const saved = await write('patch', path).send(input).expect(200);
  assert.equal(saved.body.secrets.password, true);
  assert.equal(saved.body.configurationStatus, 'configured');
  assert.ok(!JSON.stringify(saved.body).includes(secret));
  assert.ok(!('connected' in saved.body));
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT secrets_json FROM integration_settings WHERE provider='smtp'",
  );
  assert.ok(!rows[0].secrets_json.includes(secret));
  await write('patch', path).send(input).expect(409);
  await write('patch', path)
    .send({ ...input, version: 1, fields: { unexpected: 'value' } })
    .expect(400);
  const preserved = await write('patch', path)
    .send({ ...input, version: 1, secrets: { password: '' } })
    .expect(200);
  assert.equal(preserved.body.secrets.password, true);
  await write('patch', path)
    .send({ ...input, version: 2, secrets: {}, clearSecrets: ['password'] })
    .expect(400);
  const cleared = await write('patch', path)
    .send({ ...input, enabled: false, version: 2, secrets: {}, clearSecrets: ['password'] })
    .expect(200);
  assert.equal(cleared.body.secrets.password, false);
  await request(app)
    .get('/api/settings/integrations/unsupported')
    .set('Cookie', admin.cookie)
    .expect(400);
});

test('Meta webhooks require a signature, scope incoming messages and deduplicate deliveries', async () => {
  const appSecret = randomBytes(24).toString('hex');
  const verifyToken = randomBytes(24).toString('hex');
  await write('patch', '/api/settings/integrations/messenger')
    .send({
      enabled: true,
      fields: { accountId: '321', apiVersion: 'v27.0' },
      secrets: { appSecret, verifyToken, accessToken: randomBytes(24).toString('hex') },
      clearSecrets: [],
      version: 0,
    })
    .expect(200);
  const path = '/api/webhooks/meta/messenger';
  const challenge = await request(app)
    .get(path)
    .query({
      'hub.mode': 'subscribe',
      'hub.verify_token': verifyToken,
      'hub.challenge': '129',
    })
    .expect(200);
  assert.equal(challenge.text, '129');
  const webhook = (account: string) =>
    JSON.stringify({
      object: 'page',
      entry: [
        {
          id: account,
          messaging: [
            {
              sender: { id: '432' },
              recipient: { id: account },
              timestamp: Date.now(),
              message: { mid: `mid-${suffix}`, text: 'Incoming provider message' },
            },
          ],
        },
      ],
    });
  const sendWebhook = (body: string, signature?: string) => {
    const call = request(app).post(path).type('application/json').send(body);
    return signature ? call.set('X-Hub-Signature-256', signature) : call;
  };
  const signatureFor = (body: string) =>
    'sha256=' + createHmac('sha256', appSecret).update(body).digest('hex');
  const body = webhook('321');
  await sendWebhook(body).expect(403);
  const unrelated = webhook('999');
  await sendWebhook(unrelated, signatureFor(unrelated)).expect(200);
  await sendWebhook(body, signatureFor(body)).expect(200);
  await sendWebhook(body, signatureFor(body)).expect(200);
  const adminInbox = await request(app)
    .get('/api/inbox?channel=messenger')
    .set('Cookie', admin.cookie)
    .expect(200);
  assert.equal(adminInbox.body.total, 1);
  assert.equal(adminInbox.body.threads[0].unread, 1);
  const employeeInbox = await request(app)
    .get('/api/inbox?channel=messenger')
    .set('Cookie', employee.cookie)
    .expect(200);
  assert.equal(employeeInbox.body.total, 0);
  const customerMatch = await write('post', '/api/crm/customers')
    .send({ ...customer, fullName: 'Linked Messenger customer' })
    .expect(201);
  const customerId = customerMatch.body.id;
  const customerLink = `/api/inbox/${adminInbox.body.threads[0].id}/customer`;
  const customerInbox = (session = admin) =>
    request(app)
      .get(`/api/crm/customers/${customerId}/file/inbox`)
      .set('Cookie', session.cookie)
      .expect(200);
  assert.deepEqual((await customerInbox()).body.rows, []);
  await write('patch', customerLink, employee)
    .send({ customerId, previousCustomerId: null })
    .expect(403);
  await write('patch', customerLink).send({ customerId, previousCustomerId: null }).expect(204);
  assert.equal((await customerInbox()).body.rows[0].body, 'Incoming provider message');
  assert.deepEqual((await customerInbox(employee)).body.rows, []);
  await write('patch', customerLink)
    .send({ customerId: null, previousCustomerId: null })
    .expect(409);
  await write('patch', customerLink)
    .send({ customerId: null, previousCustomerId: customerId })
    .expect(204);
  assert.deepEqual((await customerInbox()).body.rows, []);
  await request(app)
    .get(`/api/inbox/${adminInbox.body.threads[0].id}`)
    .set('Cookie', employee.cookie)
    .expect(404);
  for (const [session, visible] of [
    [admin, true],
    [employee, false],
  ] as const) {
    const overview = await request(app)
      .get('/api/dashboard')
      .set('Cookie', session.cookie)
      .expect(200);
    assert.equal(
      (overview.body as DashboardOverview).recentIncomingMessages.some(
        (message) => message.channel === 'messenger',
      ),
      visible,
    );
  }
});

test('exchange rates persist with versions and conversions never invent missing rates', async () => {
  const rate = {
    baseCurrency: 'USD',
    quoteCurrency: 'EGP',
    rate: '50.25000000',
    effectiveAt: '2026-01-01T00:00:00Z',
    source: suffix,
    version: 0,
  };
  await write('post', '/api/settings/currencies', employee).send(rate).expect(403);
  const saved = await write('post', '/api/settings/currencies').send(rate).expect(200);
  assert.equal(saved.body.rates[0].rate, '50.25000000');
  assert.equal(saved.body.rates[0].version, 1);
  await write('post', '/api/settings/currencies').send(rate).expect(409);
  const converted = await write('post', '/api/settings/currencies/convert')
    .send({ baseCurrency: 'USD', quoteCurrency: 'EGP', amount: '12.34' })
    .expect(200);
  assert.equal(converted.body.convertedAmount, '620.09');
  await write('post', '/api/settings/currencies/convert')
    .send({ baseCurrency: 'EGP', quoteCurrency: 'USD', amount: '1.00' })
    .expect(409);
  await write('post', '/api/settings/currencies')
    .send({ ...rate, version: 1, rate: '0' })
    .expect(400);
});

test('manual invoices persist independently of Trips, validate totals and freeze on issuance', async () => {
  await pool.execute(
    "UPDATE finance_sources SET status='pending',connected_at=NULL WHERE code='trips'",
  );
  const input = {
    requestKey: randomUUID(),
    bookingId: '',
    billTo: suffix,
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    issuerAddress: '',
    issuerContact: '',
    currency: 'USD',
    documentDate: '2026-11-19',
    dueOn: '2026-12-01',
    reference: '',
    discount: '1.00',
    taxRate: '14.00',
    taxLabel: 'Tax',
    terms: '',
    notes: '',
    items: [{ description: suffix, quantity: '1.125', unitPrice: '10.00' }],
  };
  await write('post', '/api/finance/invoices', employee).send(input).expect(403);
  await request(app)
    .post('/api/finance/invoices')
    .set('Origin', env.APP_ORIGIN)
    .set('Cookie', admin.cookie)
    .send(input)
    .expect(403);
  await write('post', '/api/finance/invoices')
    .send({ ...input, requestKey: randomUUID(), dueOn: '2026-01-01' })
    .expect(400);
  await write('post', '/api/finance/invoices')
    .send({ ...input, requestKey: randomUUID(), bookingId: '999999' })
    .expect(409);
  await write('post', '/api/finance/invoices')
    .send({
      ...input,
      requestKey: randomUUID(),
      items: [{ description: 'Invalid', quantity: '1e3', unitPrice: '1.00' }],
    })
    .expect(400);
  const first = await write('post', '/api/finance/invoices').send(input).expect(201);
  assert.equal(first.body.invoice.amount, '11.69');
  assert.equal(first.body.invoice.items[0].amount, '11.25');
  assert.equal(first.body.invoice.bookingId, null);
  const id = first.body.invoice.id;
  const repeated = await write('post', '/api/finance/invoices').send(input).expect(201);
  assert.equal(repeated.body.invoice.id, id);
  await write('post', '/api/finance/invoices')
    .send({ ...input, billTo: 'changed' })
    .expect(409);
  await write('post', '/api/finance/invoices')
    .send({ ...input, requestKey: randomUUID(), amount: '0.01' })
    .expect(400);
  await write('post', '/api/finance/invoices')
    .send({ ...input, requestKey: randomUUID(), discount: '99.00' })
    .expect(400);
  const edit = Object.fromEntries(Object.entries(input).filter(([key]) => key !== 'requestKey'));
  const updated = await write('patch', `/api/finance/invoices/${id}`)
    .send({
      ...edit,
      version: 1,
      notes: 'Persisted terms',
      terms: 'Payment instructions '.repeat(20),
    })
    .expect(200);
  assert.equal(updated.body.invoice.version, 2);
  await write('patch', `/api/finance/invoices/${id}`)
    .send({ ...edit, version: 1 })
    .expect(409);
  const issued = await Promise.all(
    [1, 2].map(() =>
      write('post', `/api/finance/invoices/${id}/issue`).send({ version: 2 }).expect(200),
    ),
  );
  assert.match(issued[0].body.invoice.number, /^INV-\d{4}-\d{6,}$/);
  assert.equal(issued[0].body.invoice.number, issued[1].body.invoice.number);
  await write('patch', `/api/finance/invoices/${id}`)
    .send({ ...edit, version: 3 })
    .expect(409);
  const detail = await request(app)
    .get(`/api/finance/invoices/${id}`)
    .set('Cookie', admin.cookie)
    .expect(200);
  assert.equal(detail.body.invoice.notes, 'Persisted terms');
  assert.equal(detail.body.invoice.terms, 'Payment instructions '.repeat(20).trim());
  assert.equal(detail.body.invoice.issuerName, 'Travneeds CRM');
  const list = await request(app)
    .get('/api/finance/invoices?search=' + suffix)
    .set('Cookie', admin.cookie)
    .expect(200);
  assert.ok(list.body.invoices.some((invoice: { id: string }) => invoice.id === id));
  const [audit] = await pool.execute<RowDataPacket[]>(
    "SELECT action FROM audit_events WHERE entity_type='invoice' AND entity_id=?",
    [id],
  );
  assert.equal(audit.filter((row) => row.action === 'finance.invoice_issued').length, 1);
  const drafts = await Promise.all(
    [1, 2].map(() =>
      write('post', '/api/finance/invoices')
        .send({ ...input, requestKey: randomUUID() })
        .expect(201),
    ),
  );
  const distinct = await Promise.all(
    drafts.map((draft) =>
      write('post', `/api/finance/invoices/${draft.body.invoice.id}/issue`)
        .send({ version: 1 })
        .expect(200),
    ),
  );
  assert.notEqual(distinct[0].body.invoice.number, distinct[1].body.invoice.number);
  await pool.execute(
    "UPDATE finance_sources SET status='connected',connected_at=UTC_TIMESTAMP(6) WHERE code='trips'",
  );
  const [bookings] = await pool.query<RowDataPacket[]>(
    "SELECT CAST(id AS CHAR) AS id FROM finance_booking_accounts WHERE currency='USD' ORDER BY id LIMIT 1",
  );
  await write('post', '/api/finance/invoices')
    .send({ ...input, requestKey: randomUUID(), bookingId: bookings[0].id, currency: 'EUR' })
    .expect(400);
  const linked = await write('post', '/api/finance/invoices')
    .send({ ...input, requestKey: randomUUID(), bookingId: bookings[0].id })
    .expect(201);
  assert.equal(linked.body.invoice.bookingId, bookings[0].id);
  const overview = await request(app)
    .get('/api/finance?currency=USD')
    .set('Cookie', admin.cookie)
    .expect(200);
  assert.equal(overview.body.summary.totalAmount, '1000.50');
  const fileCustomer = await write('post', '/api/crm/customers')
    .send({ ...customer, fullName: 'Manual invoice customer' })
    .expect(201);
  const customerId = fileCustomer.body.id;
  const manual = await write('post', '/api/finance/invoices')
    .send({ ...input, customerId, requestKey: randomUUID() })
    .expect(201);
  assert.equal(manual.body.invoice.customerId, customerId);
  assert.equal(manual.body.invoice.bookingId, null);
  const fileInvoices = await request(app)
    .get(`/api/crm/customers/${customerId}/file/invoices`)
    .set('Cookie', admin.cookie)
    .expect(200);
  assert.deepEqual(
    fileInvoices.body.rows.map((row: { id: string }) => row.id),
    [manual.body.invoice.id],
  );
});

test('disabling an account revokes its real sessions and rejects subsequent login', async () => {
  const directory = await request(app).get('/api/users').set('Cookie', admin.cookie).expect(200);
  const target = directory.body.users.find((user: { id: string }) => user.id === employee.id);
  await write('patch', `/api/users/${employee.id}`)
    .send({ ...profile, status: 'disabled', version: target.version })
    .expect(204);
  await request(app).get('/api/auth/session').set('Cookie', employee.cookie).expect(401);
  await request(app)
    .post('/api/auth/login')
    .set('Origin', env.APP_ORIGIN)
    .send({ email: profile.email, password })
    .expect(401);
});

test('user detail tabs expose persisted facts without session or password secrets', async () => {
  const detail = await request(app)
    .get(`/api/users/${admin.id}`)
    .set('Cookie', admin.cookie)
    .expect(200);
  assert.equal(detail.body.user.id, admin.id);
  assert.ok(Array.isArray(detail.body.security.sessions));
  assert.ok(detail.body.permissions.includes('users.manage'));
  assert.equal(detail.body.security.twoFactorEnabled, false);
  assert.equal(detail.body.personal.dateOfBirth, null);
  const json = JSON.stringify(detail.body);
  for (const secret of ['password_hash', 'token_hash', 'csrf_token'])
    assert.equal(json.includes(secret), false);
  await request(app).get(`/api/users/${admin.id}`).set('Cookie', employee.cookie).expect(401);
});

test('system audit trail supports actual module/severity filters and export', async () => {
  const logs = await request(app)
    .get('/api/users/logs?module=authentication&severity=info')
    .set('Cookie', admin.cookie)
    .expect(200);
  assert.ok(logs.body.events.length > 0);
  assert.ok(
    logs.body.events.every(
      (event: { module: string; severity: string }) =>
        event.module === 'authentication' && event.severity === 'info',
    ),
  );
  assert.ok(logs.body.total >= logs.body.events.length);
  const exported = await request(app)
    .get('/api/users/logs/export?module=authentication&severity=info')
    .set('Cookie', admin.cookie)
    .expect(200);
  assert.equal(exported.body.events.length, exported.body.total);
  await request(app)
    .get('/api/users/logs?severity=invalid')
    .set('Cookie', admin.cookie)
    .expect(400);
});

test('concurrent administrator demotions cannot remove the last active administrator', async () => {
  const secondEmail = `second-admin-${suffix}@example.invalid`;
  const created = await write('post', '/api/users')
    .send({ ...profile, email: secondEmail, role: 'admin', password })
    .expect(201);
  const second = await signIn(secondEmail);
  const attempts = await Promise.all([
    write('patch', `/api/users/${created.body.id}`).send({
      ...profile,
      email: secondEmail,
      role: 'employee',
      version: 1,
    }),
    write('patch', `/api/users/${admin.id}`, second).send({
      ...profile,
      email: `admin-${suffix}@example.invalid`,
      role: 'employee',
      version: 1,
    }),
  ]);
  assert.equal(attempts.filter((result) => result.status === 204).length, 1);
  assert.ok(attempts.some((result) => [401, 403, 409].includes(result.status)));
  const [admins] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM users u JOIN user_roles r ON r.user_id = u.id WHERE u.status = 'active' AND r.role_code = 'admin'",
  );
  assert.equal(Number(admins[0].total), 1);
});
