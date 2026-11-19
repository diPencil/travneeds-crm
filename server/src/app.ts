import { catalogueRouter } from './modules/catalogue/catalogue.routes.js';
import { googleLoginRouter } from './modules/auth/google-login.routes.js';
import { emailsRouter } from './modules/emails/emails.routes.js';
import { inboxRouter, metaWebhookRouter, publicInboxRouter } from './modules/inbox/inbox.routes.js';
import { bookingsRouter } from './modules/bookings/bookings.routes.js';
import express from 'express';
import helmet from 'helmet';
import { checkDatabase } from './database/pool.js';
import { auditRouter } from './modules/audit/audit.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { checkOrigin } from './modules/auth/auth.middleware.js';
import { settingsRouter } from './modules/settings/settings.routes.js';
import { errorHandler } from './http/errors.js';
import { accountRouter } from './modules/account/account.routes.js';
import { notificationsRouter } from './modules/notifications/notifications.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { usersRouter, invitationsRouter } from './modules/users/users.routes.js';
import { crmRouter } from './modules/crm/crm.routes.js';
import { financeRouter } from './modules/finance/finance.routes.js';
import { quotationsRouter } from './modules/quotations/quotations.routes.js';
import { quotationMediaRouter } from './modules/quotations/quotation-media.routes.js';
import { translationRouter } from './modules/translation/translation.routes.js';
import { publicQuotationsRouter } from './modules/quotations/quotation-documents.routes.js';

export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use('/api', (_request, response, next) => {
  response.set('Cache-Control', 'no-store');
  next();
});
app.use('/api/webhooks/meta', metaWebhookRouter);
app.use('/api/finance/invoices', checkOrigin, express.json({ limit: '512kb' }));
app.use('/api/catalogue', checkOrigin, express.json({ limit: '128kb' }));
app.use('/api/quotations', checkOrigin, express.json({ limit: '2mb' }));
app.use('/api/content-translation', checkOrigin, express.json({ limit: '128kb' }));
app.use('/api', checkOrigin, express.json({ limit: '16kb' }));
app.get('/api/health', async (_request, response) => {
  try {
    await checkDatabase();
    response.json({ status: 'ok', database: 'connected' });
  } catch {
    response.status(503).json({ status: 'unavailable' });
  }
});
app.use('/api/auth/google', googleLoginRouter);
app.use('/api/auth', authRouter);
app.use('/api/audit', auditRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/account', accountRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/users', usersRouter);
app.use('/api/invitations', invitationsRouter);
app.use('/api/crm', crmRouter);
app.use('/api/emails', emailsRouter);
app.use('/api/inbox', inboxRouter);
app.use('/api/public/inbox', publicInboxRouter);
app.use('/api/catalogue', catalogueRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/finance', financeRouter);
app.use('/api/quotations', quotationsRouter);
app.use('/api/public/quotations', publicQuotationsRouter);
app.use('/api/quotation-media', quotationMediaRouter);
app.use('/api/content-translation', translationRouter);
app.use((_request, response) => response.status(404).json({ error: { code: 'NOT_FOUND' } }));
app.use(errorHandler);
