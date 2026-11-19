import { Router } from 'express';
import { z } from 'zod';
import { integrationProviders } from '../../../../shared/settings/integrations.contracts.js';
import { requireAdmin, requireSession, requireCsrf } from '../auth/auth.middleware.js';
import { readIntegration, saveIntegration, integrationInput } from './integrations.service.js';

export const integrationsRouter = Router();
integrationsRouter.use(requireSession, requireAdmin);
integrationsRouter.get('/:provider', async (request, response) =>
  response.json(await readIntegration(z.enum(integrationProviders).parse(request.params.provider))),
);
integrationsRouter.patch('/:provider', requireCsrf, async (request, response) =>
  response.json(
    await saveIntegration(
      z.enum(integrationProviders).parse(request.params.provider),
      integrationInput.parse(request.body),
      response.locals.session.user.id,
    ),
  ),
);
