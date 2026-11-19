import { Router } from 'express';
import type { AuthSession } from '../../../../shared/auth/auth.contracts.js';
import { requireSession } from '../auth/auth.middleware.js';
import { readDashboard } from './dashboard.service.js';

export const dashboardRouter = Router();
dashboardRouter.get('/', requireSession, async (_request, response) => {
  const { user } = response.locals.session as AuthSession;
  response.json(await readDashboard(user));
});
