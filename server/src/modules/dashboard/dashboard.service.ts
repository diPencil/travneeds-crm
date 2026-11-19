import type { RowDataPacket } from 'mysql2/promise';
import type { AuthUser } from '../../../../shared/auth/auth.contracts.js';
import type {
  DashboardOverview,
  DashboardPeriod,
} from '../../../../shared/dashboard/dashboard.contracts.js';
import { pool } from '../../database/pool.js';
import { bookingScope } from '../bookings/bookings.repository.js';
import { actorScope } from '../quotations/quotations.repository.js';
import { readReportedBookingValue } from '../finance/finance.repository.js';
import { readRecentIncomingMessages } from '../inbox/inbox.repository.js';

function periodStart(period: DashboardPeriod, now: Date): Date {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (period === 'weekly') date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  else date.setUTCDate(1);
  return date;
}

function getTrendDates(period: DashboardPeriod, now: Date): string[] {
  const count = period === 'weekly' ? 8 : 6;
  const date = periodStart(period, now);
  const dates = [date.toISOString().slice(0, 10)];
  for (let index = 1; index < count; index++) {
    if (period === 'weekly') date.setUTCDate(date.getUTCDate() - 7);
    else date.setUTCMonth(date.getUTCMonth() - 1);
    dates.unshift(date.toISOString().slice(0, 10));
  }
  return dates;
}

export async function readDashboard(actor: AuthUser): Promise<DashboardOverview> {
  const bookedScope = bookingScope(actor);
  const quoteScope = actorScope(actor);
  const bookingWhere = `b.status<>'cancelled' AND ${bookedScope.clause}`;
  const now = new Date();
  const dates = { monthly: getTrendDates('monthly', now), weekly: getTrendDates('weekly', now) };
  const [
    [quoteCounts],
    [bookingCounts],
    [leadSourceRows],
    [customerCounts],
    [quotationTrend],
    [bookingTrend],
    [reminders],
    recentIncomingMessages,
    bookedValue,
  ] = await Promise.all([
    pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM quotations q WHERE ${quoteScope.sql}`,
      quoteScope.values,
    ),
    pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total,COUNT(CASE WHEN b.status='pending' THEN 1 END) AS pending,
      COUNT(CASE WHEN b.status IN ('confirmed','completed') THEN 1 END) AS confirmed
      FROM travel_bookings b WHERE ${bookingWhere}`,
      bookedScope.values,
    ),
    pool.query<(RowDataPacket & { source: DashboardOverview['leadSources'][number]['source'] })[]>(
      'SELECT source,COUNT(*) AS count,COUNT(converted_customer_id) AS converted FROM leads WHERE archived_at IS NULL GROUP BY source ORDER BY source',
    ),
    pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM customers WHERE archived_at IS NULL',
    ),
    pool.execute<RowDataPacket[]>(
      `SELECT DATE_FORMAT(created_at,'%Y-%m-%d') AS date,COUNT(*) AS total FROM quotations q
      WHERE ${quoteScope.sql} AND q.created_at>=? AND q.created_at<=UTC_TIMESTAMP(6) GROUP BY 1`,
      [...quoteScope.values, dates.monthly[0]],
    ),
    pool.execute<RowDataPacket[]>(
      `SELECT DATE_FORMAT(created_at,'%Y-%m-%d') AS date,COUNT(*) AS total FROM travel_bookings b
      WHERE ${bookingWhere} AND b.created_at>=? AND b.created_at<=UTC_TIMESTAMP(6) GROUP BY 1`,
      [...bookedScope.values, dates.monthly[0]],
    ),
    pool.execute<(RowDataPacket & DashboardOverview['reminders'][number])[]>(
      `SELECT CAST(id AS CHAR) AS id,full_name AS title,next_follow_up_at AS time,priority FROM leads
      WHERE archived_at IS NULL AND assigned_user_id=? AND converted_customer_id IS NULL
        AND next_follow_up_at IS NOT NULL AND status NOT IN ('Closed Won','Closed Lost')
      ORDER BY next_follow_up_at,id LIMIT 6`,
      [actor.id],
    ),
    readRecentIncomingMessages(actor),
    actor.roles.includes('admin') ? readReportedBookingValue() : null,
  ]);
  function aggregate(period: DashboardPeriod, rows: RowDataPacket[]) {
    const totals = new Map(dates[period].map((date) => [date, 0]));
    for (const row of rows) {
      const date = periodStart(period, new Date(row.date + 'T00:00:00Z'))
        .toISOString()
        .slice(0, 10);
      if (totals.has(date)) totals.set(date, (totals.get(date) ?? 0) + Number(row.total));
    }
    return totals;
  }
  function series(period: DashboardPeriod) {
    const quotes = aggregate(period, quotationTrend);
    const bookings = aggregate(period, bookingTrend);
    return dates[period].map((date) => ({
      date,
      quotations: quotes.get(date) ?? 0,
      bookings: bookings.get(date) ?? 0,
    }));
  }
  return {
    metrics: {
      quotations: Number(quoteCounts[0].total),
      bookings: Number(bookingCounts[0].total),
      pendingBookings: Number(bookingCounts[0].pending),
      customers: Number(customerCounts[0].total),
      leads: leadSourceRows.reduce((total, row) => total + Number(row.count), 0),
      convertedLeads: leadSourceRows.reduce((total, row) => total + Number(row.converted), 0),
      confirmedBookings: Number(bookingCounts[0].confirmed),
    },
    trend: { monthly: series('monthly'), weekly: series('weekly') },
    bookedValue,
    leadSources: leadSourceRows.map((row) => ({ source: row.source, count: Number(row.count) })),
    reminders,
    recentIncomingMessages,
  };
}
