import { Router } from 'express';
import { z } from 'zod';
import {
  catalogueKinds,
  catalogueSaveInput,
} from '../../../../shared/catalogue/catalogue.contracts.js';
import { pool } from '../../database/pool.js';
import { requireSession, requireCsrf } from '../auth/auth.middleware.js';
import {
  catalogueList,
  readCatalogueEntry,
  readCatalogueHotel,
  readCatalogueSelection,
} from './catalogue.repository.js';
import { saveCatalogue } from './catalogue.service.js';
export const catalogueRouter = Router();
catalogueRouter.use(requireSession);
const kind = z.enum(catalogueKinds);
const id = z.uuid();
catalogueRouter.get('/options', async (_request, response) =>
  response.json(await readCatalogueSelection()),
);
catalogueRouter.get('/hotels/:id/bundle', async (request, response) =>
  response.json(await readCatalogueHotel(pool, id.parse(request.params.id))),
);
catalogueRouter.get('/:kind', async (request, response) => {
  const { search, page } = z
    .object({
      search: z.string().trim().max(160).default(''),
      page: z.coerce.number().int().min(1).max(10000).default(1),
    })
    .strict()
    .parse(request.query);
  response.json(await catalogueList(kind.parse(request.params.kind), search, page));
});
catalogueRouter.get('/:kind/:id', async (request, response) =>
  response.json(
    await readCatalogueEntry(pool, id.parse(request.params.id), kind.parse(request.params.kind)),
  ),
);
catalogueRouter.post('/:kind', requireCsrf, async (request, response) =>
  response
    .status(201)
    .json(
      await saveCatalogue(
        kind.parse(request.params.kind),
        catalogueSaveInput.parse(request.body),
        response.locals.session.user,
      ),
    ),
);
catalogueRouter.patch('/:kind/:id', requireCsrf, async (request, response) =>
  response.json(
    await saveCatalogue(
      kind.parse(request.params.kind),
      catalogueSaveInput.parse(request.body),
      response.locals.session.user,
      id.parse(request.params.id),
    ),
  ),
);
