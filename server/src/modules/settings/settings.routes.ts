import { Router, raw } from 'express';
import { z } from 'zod';
import { transaction } from '../../database/pool.js';
import { writeAuditEvent } from '../audit/audit.repository.js';
import { brandAssetLimit, readBrandAsset, uploadBrandAsset } from './brand-assets.service.js';
import type { AuthSession } from '../../../../shared/auth/auth.contracts.js';
import { requireAdmin, requireCsrf, requireSession } from '../auth/auth.middleware.js';
import { readSettings, readSettingsPage, saveSettings, settingsInput } from './settings.service.js';
import { integrationsRouter } from './integrations.routes.js';
import { activateMonthlyLicense, readLicense } from './activation.service.js';
import {
  saveCurrencyRate,
  convertStoredCurrency,
  currencyRateInput,
  currencyConversionInput,
} from './currency.service.js';

export const settingsRouter = Router();
settingsRouter.use('/integrations', integrationsRouter);
settingsRouter.get('/activation', requireSession, requireAdmin, async (_request, response) => {
  response.json(await readLicense());
});
settingsRouter.post(
  '/activate',
  requireSession,
  requireAdmin,
  requireCsrf,
  async (request, response) => {
    z.object({})
      .strict()
      .parse(request.body ?? {});
    const { user } = response.locals.session as AuthSession;
    response.status(201).json(await activateMonthlyLicense(user.id));
  },
);
settingsRouter.get('/brand-assets/:file', async (request, response) => {
  const file = z.string().max(48).parse(request.params.file);
  const asset = await readBrandAsset(`/api/settings/brand-assets/${file}`);
  response
    .type(asset.mime)
    .set('Cache-Control', 'public, max-age=31536000, immutable')
    .send(asset.content);
});
settingsRouter.post(
  '/brand-assets/:kind',
  requireSession,
  requireAdmin,
  requireCsrf,
  raw({
    type: [
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/vnd.microsoft.icon',
      'image/x-icon',
      'application/octet-stream',
    ],
    limit: brandAssetLimit,
  }),
  async (request, response) => {
    const kind = z.enum(['logo', 'favicon']).parse(request.params.kind);
    response
      .status(201)
      .json(await uploadBrandAsset(kind, request.body, response.locals.session.user.id));
  },
);
settingsRouter.post(
  '/currency-list',
  requireSession,
  requireAdmin,
  requireCsrf,
  async (request, response) => {
    const { code } = z
      .object({
        code: z.string().refine((value) => Intl.supportedValuesOf('currency').includes(value)),
      })
      .strict()
      .parse(request.body);
    await transaction(async (connection) => {
      const [result] = await connection.execute(
        'INSERT IGNORE INTO project_currencies (code) VALUES (?)',
        [code],
      );
      if ('affectedRows' in result && result.affectedRows) {
        await writeAuditEvent(connection, {
          actorId: response.locals.session.user.id,
          action: 'settings.currency_added',
          module: 'settings',
          entityType: 'currency',
          entityId: code,
        });
      }
    });
    response.json(await readSettingsPage());
  },
);
settingsRouter.post(
  '/currencies',
  requireSession,
  requireAdmin,
  requireCsrf,
  async (request, response) => {
    await saveCurrencyRate(currencyRateInput.parse(request.body), response.locals.session.user.id);
    response.json(await readSettingsPage());
  },
);
settingsRouter.post(
  '/currencies/convert',
  requireSession,
  requireAdmin,
  requireCsrf,
  async (request, response) =>
    response.json(await convertStoredCurrency(currencyConversionInput.parse(request.body))),
);

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
