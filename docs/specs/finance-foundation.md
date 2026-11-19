# Finance restoration and Trips boundary

The owner requests the original Financial Controls design, invoices and financial reports, prepared now for bookings from the future Trips integration. This task does not import Trips, activate posting, invent bookings or seed financial records.

Restore General Finance's banner, five metric cards, search/status/agent/supplier filters and seven-column booking table. Restore reports (overview, profit analysis, agent performance), customer/supplier invoice entry layouts, payment entry and booking financial details. Add an invoice directory. Preserve AR/RTL, EN/LTR and light/dark appearances.

Finance owns a read projection of source bookings plus invoice/payment snapshots. Opaque source booking/payment keys remain distinct from local primary keys. Foreign keys enforce local booking/invoice/currency relationships. Money is DECIMAL(18,2) in SQL and decimal text at API boundaries. Reports select one currency and never silently convert or combine currencies. Missing verified cost makes profit/payable metrics unavailable; it is not zero. Refunds reduce net received cash, pending payments do not count, and invoices are not counted again as booking revenue.

An operational source configuration starts pending. Only actual future Trips mapping may mark it connected. There is no browser toggle or endpoint for changing this status or inserting projected bookings. Current invoice/payment forms explain the missing source and cannot post. Posting, tax configuration, attachment ingestion, delivery and source synchronization are separate future work. No invoice number, VAT, bank details, receipts or payment-provider success is fabricated.

Read APIs are administrator-only until a distinct finance role/policy is defined. The financial source contract was compared read-only with web-source's Booking, Payment and BookingDocument field shapes; no source code, Prisma schema or Trips logic is copied/imported. The source has explicit verification/refund semantics, so future mapping must select verified settled amounts and retain source keys.

Acceptance: protected real database reads; pending connection has null metrics and genuine empty lists; ready read models aggregate exact values per currency; UTC date boundaries, search and filters are applied consistently; CSV exports reflect the selected data. Restored pages remain navigable while posting is unavailable. Tests use the existing isolated temporary database, never development fixtures. The source archives stay untouched.
