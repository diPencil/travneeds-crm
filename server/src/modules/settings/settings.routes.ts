import { Router } from 'express';
import type { AuthSession } from '../../../../shared/auth/auth.contracts.js';
import { requireAdmin, requireCsrf, requireSession } from '../auth/auth.middleware.js';
import { readSettings, readSettingsPage, saveSettings, settingsInput } from './settings.service.js';

export const settingsRouter = Router();

settingsRouter.get('/branding', async (_request, response) => {
  const { projectName, primaryColor, logoUrl, faviconUrl } = await readSettings();
  response.json({ projectName, primaryColor, logoUrl, faviconUrl });
});
settingsRouter.get('/', requireSession, requireAdmin, async (_request, response) => {
  response.json(await readSettingsPage());
});
settingsRouter.patch('/', requireSession, requireAdmin, requireCsrf, async (request, response) => {
  const input = settingsInput.parse(request.body);
  const session = response.locals.session as AuthSession;
  response.json(await saveSettings(input, session.user.id));
});
