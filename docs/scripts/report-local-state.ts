import { pool, checkDatabase } from '../../server/src/database/pool.js';
import type { RowDataPacket } from 'mysql2/promise';

try {
  await checkDatabase();
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT
    (SELECT COUNT(*) FROM users) AS users,
    (SELECT COUNT(*) FROM user_profiles) AS profiles,
    (SELECT COUNT(*) FROM leads) AS leads,
    (SELECT COUNT(*) FROM customers) AS customers,
    (SELECT COUNT(*) FROM suppliers) AS suppliers,
    (SELECT COUNT(*) FROM user_invitations) AS invitations,
    (SELECT COUNT(*) FROM notifications) AS notifications,
    (SELECT COUNT(*) FROM quotations) AS quotations,
    (SELECT COUNT(*) FROM travel_bookings) AS bookings,
    (SELECT COUNT(*) FROM inbox_threads) AS inbox_threads,
    (SELECT COUNT(*) FROM email_deliveries) AS email_deliveries,
    (SELECT COUNT(*) FROM finance_booking_accounts) AS finance_bookings,
    (SELECT COUNT(*) FROM finance_invoices) AS finance_invoices,
    (SELECT COUNT(*) FROM finance_payments) AS finance_payments,
    (SELECT status FROM finance_sources WHERE code = 'trips') AS trips_source,
    (SELECT COUNT(*) FROM schema_migrations) AS migrations`);
  console.log(JSON.stringify(rows[0]));
} finally {
  await pool.end();
}
