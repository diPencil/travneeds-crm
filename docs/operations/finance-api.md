# Finance API

All routes under `/api/finance` require an authenticated administrator. GET `/`, `/options`, `/reports`, `/invoices`, `/bookings/:id`, `/invoices/:id`, `/export` and `/invoices/export` read real MySQL projections. Shared DTOs live in `shared/finance/finance.contracts.ts`.

Filters: search, currency, agent, supplier, status, from/to and page. Invoice lists additionally accept party and invoiceStatus. ISO dates filter booking creation in UTC with inclusive end dates. Invalid input returns 400, missing records 404, disconnected booking detail requests 409, exports above 10,000 records 422.

One currency per response; no implicit conversion. Money is exact decimal text from SQL DECIMAL. Verified receipts less refunds define net cash; pending/void payments are excluded. Unknown cost makes profit/payable metrics unavailable. Invoice snapshots never increase booking revenue.

The trips source starts pending: status `pending_trips`, empty booking lists, null booking summary. The future authoritative adapter must populate the projections and connect the source. No runtime endpoint changes source state.

`postingAvailable` describes booking/payment ledger posting and remains false; `manualInvoicesAvailable` is true. Manual invoice lists/details work while Trips is pending. Booking reports do not include manual invoice totals.

## Customer invoice writes

An optional numeric `customerId` explicitly links an invoice to a CRM customer. The Customer File opens a manual draft with this identifier. The link is saved transactionally and preserved during edits. If a booking is also supplied, it must belong to the linked customer.

All require administrator sessions, configured Origin and X-CSRF-Token. Shared input/document contracts are in shared/finance/invoice.contracts.ts.

| Method/path | Behavior |
| --- | --- |
| POST /invoices | Create a draft from manual items or a connected local booking; 201 with invoice document |
| PATCH /invoices/:id | Replace a local draft header/items using its current version; 200 |
| POST /invoices/:id/issue | Assign INV-YYYY-NNNNNN once and lock document; body: version; 200 |

Create input requires requestKey UUID, bookingId (empty for manual), billTo, customerEmail/Phone/Address, issuerAddress/Contact, currency, documentDate, optional-empty dueOn, reference, discount, taxRate, taxLabel, terms, notes and 1–100 items (description, quantity, unitPrice). Optional textual fields are empty strings. Quantity accepts up to three decimals, unit price/discount/tax rate up to two. Unit prices are capped at 9,999,999,999.99. Server recomputes totals; unknown fields including client totals are rejected. Full creation retry with the same key/payload returns the original invoice; reusing the key with different data returns 409. PATCH accepts the same business fields plus version, without requestKey. Stale drafts return 409 RECORD_CHANGED; issued changes return 409 INVOICE_IMMUTABLE. Issuance retries return the same number. Only local editor-created invoices can be modified.

A supplied booking must exist in a connected source and have the same currency. Invoice items are a document snapshot and do not modify the booking value or its report totals. Issuer name/logo are taken from project settings at draft creation; all document snapshots remain stable after issue. Tax name/rate are explicit user input; no jurisdictional compliance or tax registration is assumed. Travel Bookings now supplies the Trips projection. Pending and cancelled bookings stay out of operational report metrics. Posting payments, receipt uploads, supplier invoice writes and invoice delivery remain unavailable.

Invoice bodies have a bounded 512 KiB parser to accommodate the capped item list; other API payloads retain their existing 16 KiB limit. Invoice operations write finance audit events in the same transaction. Print/Save PDF uses the browser print dialog, not a server PDF/email service.
