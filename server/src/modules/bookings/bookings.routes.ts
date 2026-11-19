import { Router } from 'express';
import { z } from 'zod';
import { bookingStatuses } from '../../../../shared/bookings/booking.contracts.js';
import { requireCsrf, requireSession } from '../auth/auth.middleware.js';
import { bookingCandidates, listBookings, readBooking } from './bookings.repository.js';
import { createBooking, setBookingStatus } from './bookings.service.js';

const idInput = z.string().regex(/^[1-9]\d{0,18}$/);
const version = z.number().int().positive();
const status = z.enum(bookingStatuses);
const search = z.string().trim().max(120).default('');
export const bookingsRouter = Router();
bookingsRouter.use(requireSession);
bookingsRouter.get('/', async (request, response) => {
  const query = z
    .object({
      search,
      status: status.optional(),
      customerId: idInput.optional(),
      page: z.coerce.number().int().min(1).max(10000).default(1),
    })
    .strict()
    .parse(request.query);
  response.json(await listBookings(response.locals.session.user, query));
});
bookingsRouter.get('/candidates', async (request, response) => {
  const query = z.object({ search, customerId: idInput.optional() }).strict().parse(request.query);
  response.json({
    quotations: await bookingCandidates(
      response.locals.session.user,
      query.search,
      query.customerId,
    ),
  });
});
bookingsRouter.get('/quotation/:id', async (request, response) => {
  response.json(
    await readBooking(response.locals.session.user, {
      quotationId: idInput.parse(request.params.id),
    }),
  );
});
bookingsRouter.get('/:id', async (request, response) => {
  response.json(
    await readBooking(response.locals.session.user, { id: idInput.parse(request.params.id) }),
  );
});
bookingsRouter.post('/', requireCsrf, async (request, response) => {
  const input = z
    .object({ quotationId: idInput, quotationVersion: version, requestKey: z.uuid() })
    .strict()
    .parse(request.body);
  response.status(201).json(await createBooking(response.locals.session.user, input));
});
bookingsRouter.patch('/:id/status', requireCsrf, async (request, response) => {
  const input = z.object({ version, status }).strict().parse(request.body);
  response.json(
    await setBookingStatus(
      response.locals.session.user,
      idInput.parse(request.params.id),
      input.version,
      input.status,
    ),
  );
});
