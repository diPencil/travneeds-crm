# Itemized customer invoices

Owner request: a professional actual invoice populated from a future booking or manually entered items. Manual entry must be usable now. Trips remains outside this change.

Implement editable drafts, item descriptions/quantities/unit prices, exact totals, fixed discount, optional named tax, billing/issuer snapshots, document/due dates, notes and payment instructions. After an explicit Issue action, assign an immutable unique yearly number. Use version checks, idempotent creation, transactions and real audit entries. No fake bookings or fixtures in the development database. Keep manual invoices separate from booking revenue.

The document and editor use the established Travneeds shell and controls. The document itself is a professional white paper layout with Arabic RTL/English LTR, responsive preview and A4 print styles. Native print offers Save as PDF; no new external service is added. Supplier invoice posting, payments, email delivery and jurisdiction-specific tax/e-invoicing remain future work.
