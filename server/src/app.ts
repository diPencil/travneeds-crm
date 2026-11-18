import express from 'express';
import helmet from 'helmet';
import { checkDatabase } from './database/pool.js';
import { auditRouter } from './modules/audit/audit.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { checkOrigin } from './modules/auth/auth.middleware.js';
import { settingsRouter } from './modules/settings/settings.routes.js';
import { errorHandler } from './http/errors.js';

export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use('/api', (_request, response, next) => {
  response.set('Cache-Control', 'no-store');
  next();
});
app.use('/api', checkOrigin, express.json({ limit: '16kb' }));
app.get('/api/health', async (_request, response) => {
  try {
    await checkDatabase();
    response.json({ status: 'ok', database: 'connected' });
  } catch {
    response.status(503).json({ status: 'unavailable' });
  }
});
app.use('/api/auth', authRouter);
app.use('/api/audit', auditRouter);
app.use('/api/settings', settingsRouter);
app.use((_request, response) => response.status(404).json({ error: { code: 'NOT_FOUND' } }));
app.use(errorHandler);
