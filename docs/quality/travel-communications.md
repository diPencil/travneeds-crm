# Travel and communications verification

The local XAMPP database passed `/api/health` both directly and through the Vite proxy. Its migration table held all 16 versions. The runtime account reported zero leads, customers, suppliers, quotations, bookings, chat threads, email deliveries, invoices and payments. Integration fixtures ran in a separate disposable MySQL schema with the existing migration identity.

`CORE_TEST_PDF=1 npm run check` enables the Chromium-backed PDF assertions in addition to formatting, lint, TypeScript, tests and both builds. The isolated scenario checks bilingual persistence, link revocation, ownership, two actual PDF responses, chat from the same link, booking retry safety and the change in Finance amounts on confirmation and cancellation. The Meta test uses a signed local webhook fixture. It covers verification challenge, signature rejection, business account scoping and redelivery handling.

Two Chromium-generated single-page previews were rasterized with PyMuPDF and inspected. Their Arabic/English text was extractable, and the Arabic preview rendered the title, body and pricing with RTL direction. The integration tests also assert the download content type, PDF header and populated files in both locales. The browser automation service timed out before interactive screen review. No live WhatsApp, Messenger, Instagram, SMTP, translation or Google OAuth account was used. External acceptance depends on the configured provider and authorized test accounts. The Vite build reported large existing entry and chart chunks.

## Local browser startup regression

A fresh Chromium session issued 1,439 Lucide requests before the login form appeared. Pre-bundling the package in Vite reduced that to one request in the same local check. The credentialed browser regression uses the isolated integration database and a separate local origin. It opens the login form, authenticates through the real API, checks the dashboard and signs out. The test also limits the number of separately loaded icon modules.

The Business Overview browser regression renders a saved quotation and switches the chart from six monthly buckets to eight weekly buckets. The booking integration exercises pending, confirmed and cancelled states against the dashboard API and checks employee access and the administrator's exact booking value. The tests use an isolated MySQL schema.

The signed-in Chromium test follows a dashboard Inbox preview to its conversation. Integration checks verify that staff see their incoming messages, that outgoing replies stay out of the feed, and that unassigned Messenger threads stay in the admin queue. The booking integration also checks the counts used in Efficiency across status changes.

The translation integration checks scoped settings access, CSRF, the upstream Google Basic v2 request and API-key header, HTML sanitization, provider failure and the hidden state retaining the saved key. Chromium saves a test key, runs the connection check, translates from the toolbar and applies an edited suggestion. Tests use simulated Google responses and an isolated database. The live connection check is available to the administrator after saving a real API key.

Chromium verifies the default logo and favicon previews, the unavailable state for a missing local path, and the refreshed logo preview after a real upload before saving the project identity.

Chromium verifies that an incomplete Content Translation save displays the validation error, a successful settings save shows the global toast, and a quotation draft save shows the toast while opening the saved draft.

On PowerShell with Chromium installed, run:

```powershell
$env:CORE_TEST_BROWSER = '1'
$env:APP_ORIGIN = 'http://127.0.0.1:55173'
npm run check
```

Set `PDF_CHROMIUM_PATH` if Chrome is installed outside the default Windows path.

Quotation media integration verified a real WebP upload, authenticated retrieval of the same bytes, rejection of unsupported URL destinations, and a real PNG import from a public HTTPS domain outside the original host list. The remote test ran with `CORE_TEST_IMAGE_URL` in the isolated schema.

Chromium verification of the quotation builder exercised its desktop timeline, bold formatting, link insertion, content retention across steps, Arabic editing direction, and the mobile disclosure. Desktop and mobile captures were reviewed from the isolated session.

The catalogue and settings pass completed all 50 checks with Chromium enabled. The browser opened the vertical Settings navigation, found the branding upload and currency selector, selected a star rating, and verified that choosing an actual catalogue hotel filled its room in the quote. The isolated MySQL cases covered a ten-room hotel bundle, shared hotel options, automatic catalogue creation from quotation drafts, idempotency, admin-only brand uploads, and enabled currencies flowing into quote options. The development database reported all 19 migrations and zero quotation fixtures.
