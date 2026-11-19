import type {
  FinanceSource,
  FinanceOverview,
  FinanceInvoiceList,
  FinanceReports,
} from '../../../../shared/finance/finance.contracts.js';
import type { FinanceQuery, FinanceInvoiceQuery } from './finance.validation.js';
import * as repository from './finance.repository.js';
import { readInvoiceDocument } from './invoice.repository.js';
import { HttpError } from '../../http/errors.js';

function sourceStatus(connected: boolean): FinanceSource {
  return {
    status: connected ? 'ready' : 'pending_trips',
    postingAvailable: false,
    manualInvoicesAvailable: true,
  };
}
export async function readOptions() {
  const configuration = await repository.readFinanceConfiguration();
  return {
    ...(await repository.readFinanceOptions()),
    invoiceCurrencies: Intl.supportedValuesOf('currency'),
    baseCurrency: configuration.baseCurrency,
    source: sourceStatus(configuration.connected),
  };
}
export async function readOverview(
  query: FinanceQuery,
  exportAll = false,
): Promise<FinanceOverview> {
  const configuration = await repository.readFinanceConfiguration();
  const currency = query.currency || configuration.baseCurrency;
  const source = sourceStatus(configuration.connected);
  if (!configuration.connected)
    return {
      source,
      currency,
      summary: null,
      bookings: [],
      total: 0,
      page: query.page,
      pageSize: 50,
    };
  return {
    source,
    currency,
    ...(await repository.readFinanceBookings(query, currency, exportAll)),
  };
}
export async function readInvoices(
  query: FinanceInvoiceQuery,
  exportAll = false,
): Promise<FinanceInvoiceList> {
  const configuration = await repository.readFinanceConfiguration();
  const currency = query.currency || configuration.baseCurrency;
  const source = sourceStatus(configuration.connected);
  return {
    source,
    currency,
    ...(await repository.readFinanceInvoices(query, currency, exportAll)),
  };
}
export async function readReports(query: FinanceQuery): Promise<FinanceReports> {
  const overview = await readOverview(query);
  const groups =
    overview.source.status === 'ready'
      ? await repository.readFinanceReportGroups(query, overview.currency)
      : { monthly: [], categories: [], agents: [] };
  return {
    source: overview.source,
    currency: overview.currency,
    summary: overview.summary,
    ...groups,
  };
}
async function requireConnected() {
  const configuration = await repository.readFinanceConfiguration();
  if (!configuration.connected) throw new HttpError(409, 'BOOKING_SOURCE_NOT_CONNECTED');
  return sourceStatus(true);
}
export async function readBookingDetail(id: string) {
  const source = await requireConnected();
  return { source, ...(await repository.readFinanceBookingDetail(id)) };
}
export async function readInvoiceDetail(id: string) {
  const configuration = await repository.readFinanceConfiguration();
  return { source: sourceStatus(configuration.connected), invoice: await readInvoiceDocument(id) };
}
