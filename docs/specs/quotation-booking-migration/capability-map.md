# Quotations, bookings and communications — capability map

Status: owner approved the map and implementation on 2026-11-19. Scope amendment: Instagram, Messenger and WhatsApp Business are now included, superseding the earlier WhatsApp deferral. This initiative extends the existing foundation; archived sources remain read-only and excluded from runtime/Git.

## Requested product cycle

An employee creates an empty customer-linked quotation using one of the four source trip types, enters EN/AR content manually or uses a configured translation provider, adds itinerary/pricing/media and hotel/room stays, and saves a versioned draft. A prepared quotation has a customer-facing tour-style view, an actual downloadable PDF and a revocable customer link. The employee selects a valid saved quotation when confirming New Booking. The booking stores its own immutable commercial/content snapshot and customer link. Editing a quotation never silently changes an existing booking. Creating a quotation draft does not automatically create a booking.

Existing Leads -> Customer conversion supplies actual customers. Quotations may be saved as unassigned drafts, but sharing to a customer or creating a booking requires a customer. No lead/customer, transaction, price, hotel availability, conversion or delivery success is fabricated.

## Modules and dependency direction

Existing providers: identity/session/CSRF, admin/employee policy, CRM customers/suppliers, audit, project branding and exact-money finance contracts.

| Stable module id | Owns | Depends on |
| --- | --- | --- |
| integration-settings | Protected SMTP, Google OAuth and translation configuration; secret write-only inputs/presence flags; provider readiness | Existing settings/auth/audit |
| currency-settings | Base currency, stored explicit exchange rates/effective dates and exact conversions; preserves original amounts | Existing settings/exact money |
| content-translation | EN/AR source/target selection, configured automatic translation, editable result and overwrite protection | integration-settings |
| quotation-media | Validated uploads/local media, captions, credits, video URLs/posters and controlled PDF assets | Existing auth/settings |
| email-deliveries | SMTP delivery, deduplicated outbox, delivery-history metrics/list/detail and safe diagnostics | integration-settings |
| quotations | Four trip types, customer link, complete builder fields, hotel/room tab, versioned content and authoritative commercial pricing; metrics/list/editor | currency-settings, quotation-media; optional content-translation and email-deliveries |
| quotation-documents | Tour-style customer view, revocable/expiring revision-specific share link and real PDF file download in selected EN/AR language | quotations, quotation-media |
| bookings | New Booking selects an actual quotation, validates ownership/revision/pricing, freezes snapshot and stores customer/travelers/dates/add-ons/stays/status/activity; metrics/list/detail | quotations, currency-settings; optional email-deliveries |
| booking-finance-adapter | Projects persisted booking values/costs and verified payments into existing Finance, invoice picker, CRM metrics and dashboard; prevents double counting | bookings, existing Finance |
| live-inbox | Persistent customer/staff conversations, assignment, unread counts, replies and close/reopen; customer share-link chat plus Messenger, Instagram and WhatsApp Business adapters with signed webhooks and delivery states | quotation-documents; optional bookings and email-deliveries |
| google-login | Configured Google sign-in for existing active staff only, bound identity, state/nonce/PKCE and existing session controls | integration-settings, existing identity |

## Build order

1. Integration settings and currency settings, including real unconfigured/error states and secret protection.
2. Quotation media, manual/automatic content-translation boundary and email outbox/history.
3. Quotations: all four types and complete original builder fields plus hotel/room stays, saved and reloaded from MySQL.
4. Customer quotation view, safe share access and actual EN/AR PDF export using the same saved revision.
5. Bookings from quotations, followed by Finance/CRM/dashboard integration against persisted bookings.
6. Customer/staff live Inbox and Google sign-in, with external provider checks when configured.
7. Cross-module regression, browser/PDF/mobile/RTL verification and accurate final documentation.

Each stage is implemented as complete UI/API/MySQL slices. A later module is not represented as working merely because a sidebar item exists. Preserve the Travneeds shell and original shared design. The owner explicitly chooses the source trip-detail layouts for quotation presentation; do not introduce a new public landing page or a tour marketplace.

## Hotel and room addition

One quotation can contain multiple hotel stays and multiple room selections per stay. Capture bilingual hotel name/description/location, optional supplier/contact/rating/amenities/images, check-in/out, computed nights, room/category/board basis, room count and occupancy (adults/children/infants), selling price and optional known supplier cost. Indicate whether a stay is already included in the package or is an additional charged component so it cannot be counted twice. No external hotel availability or reservation claim without an actual integration.

## Review points and operational boundaries

- Confirm quotation drafts do not auto-create bookings; New Booking explicitly freezes a selected valid quotation and actual customer.
- Manual and automatic EN/AR editing are both requested and confirmed. Automatic translation requires configured credentials and never replaces edited translations silently.
- Customer live chat starts from the shared quotation page; no connection to the original website's running production database is assumed.
- Emails means delivery history like the source, plus actual application-event sending when SMTP is configured. Incoming IMAP fields from the source can be represented accurately; configuring them does not claim a received-mail synchronization engine exists.
- Google Login adapts the source's customer OAuth flow to existing active staff accounts. No public self-registration or automatic admin/employee creation.
- PDF is an application/pdf download, not a print-dialog substitute. The source PDF is English-only and cannot satisfy this requirement unchanged. Arabic shaping/fonts and actual exported pages must be verified.
- SMTP/Google/translation credentials are supplied through protected settings or deployment configuration; never copied from source environment files. Until configured, dependent external operations report their actual unavailable state. No real emails are sent during development verification.
- Messenger, Instagram and WhatsApp Business are included by the latest owner instruction. Real account linking/activation needs the owner’s business accounts, tokens, approved permissions and reachable HTTPS webhooks. No external account settings are changed or real messages sent during development.
- Existing data and immutable invoice migrations/documents remain intact. New migrations use the current MySQL/MariaDB infrastructure and existing accounts. Tests stay in disposable isolated databases.

This map is the index for the later per-module specifications and tasks. The source inventory is recorded separately in source-inventory.md.
