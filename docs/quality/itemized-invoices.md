# Itemized invoice verification — 2026-11-19

Owner request: professional invoices with real booking inputs or manually entered items. The manual customer-invoice workflow is implemented end to end; Trips is not imported.

## Persistence and calculation

Applied immutable successor migrations 008 and 009 to the existing development database. Current state: nine migrations and 22 tables. Read-only counts after migration: one actual user; no profiles, leads, customers, suppliers, invitations, notifications, booking accounts, invoices or payments. Trips remains pending. No new MySQL users or grants were created.

Shared exact integer arithmetic calculates each quantity × unit-price line with half-up cent rounding, then fixed discount and optional named tax after discount. Server-side validation rejects malformed amounts, invalid dates, client-supplied totals and mismatched booking currencies. Quantities allow three decimals; prices use two. Invoice header/items/audit writes are transactional.

Creation uses a unique request key and canonical input digest. Retrying the same request returns the same document; changing its payload with the same key returns conflict. Draft edits require a current version. Issuing freezes the invoice and assigns a unique yearly sequence under an exclusive row lock. Issuing the same invoice twice returns the same number and one issue audit event. Source snapshots remain outside the local editor.

The added concurrency regression initially exposed an InnoDB counter deadlock: INSERT IGNORE acquired shared locks that concurrent issuers then upgraded. InnoDB diagnostics confirmed both shared/exclusive counter locks. Replacing it with an upsert that immediately takes the exclusive lock resolved the regression; concurrent distinct invoices now receive distinct numbers. No test was skipped or weakened.

## Browser evidence

Verified adding/removing line items and recomputing totals, invoice preview, English LTR, Arabic RTL, light/dark shell and 390-pixel mobile rendering. The document stays white in dark mode as printable paper. Mobile document width stayed within the viewport (385 versus 390 pixels); its wider line table scrolls inside the document.

- [Professional Arabic invoice preview](screenshots/professional-invoice-preview-rtl.png)
- [Mobile invoice preview](screenshots/invoice-mobile-rtl.png)

Preview entries are explicitly labeled test/unsaved. They were never saved to the development database and were cleared after inspection. The editor is left empty and ready for real entry. Browser tests did not issue a development invoice. Save/update/issue persistence was verified through real isolated MySQL/API integration tests.

A4 print CSS includes 14mm margins, repeated headings and row break protection. Print/Save PDF uses the native browser dialog; a generated PDF export file and long multipage printer output were not separately rendered/verified. There is no server PDF/email service or tax authority integration.

## Quality checks

The final npm run check verifies formatting, lint, frontend/backend types, 22 foundation/calculation/date tests, 16 real isolated MySQL/API tests, and both builds. The new tests cover exact rounding, manual persistence while disconnected, authorization/CSRF, tamper rejection, stale drafts, idempotent creates, repeated and concurrent issuance, booking currency checks and unchanged booking-report revenue. Existing application/chart bundle-size warnings remain. No dependencies were added. These are automated and agent browser checks, not an independent human QA review.

Supplier-invoice posting, payment recording, Trips synchronization, email delivery, invoice cancellation/credit-note workflows and jurisdiction-specific e-invoicing are deferred.
