# Travel, messaging and provider setup

## Booking and quotation APIs

| Route | Access and behavior |
| --- | --- |
| GET /api/quotations, /api/quotations/options | Staff directory scoped to owner or admin. Options use real active customers and suppliers. |
| POST /api/quotations, PATCH /api/quotations/:id | Create or revise an owner-scoped draft with version and request key. Server validates price and references. |
| POST /api/quotations/:id/status | Save a validated status transition for the supplied version. |
| POST /api/quotations/preview | Validate media ownership and render a draft without saving. |
| POST /api/quotation-media and /api/quotation-media/import | Upload a JPG, PNG or WebP up to 8 MB, or import one from a direct public HTTPS URL. Both store a private media asset. URL import needs a public IPv4 address and does not follow redirects. |
| GET /api/quotations/:id/presentation, /api/quotations/:id/pdf | Saved version in the requested locale. |
| GET/POST /api/quotations/:id/shares and DELETE /api/quotations/:id/shares/:shareId | Scope to owner/admin. Create, list or revoke a revision link. Raw token is returned on creation only. |
| GET /api/public/quotations/:shareId and /api/public/quotations/:shareId/pdf | Protected with X-Quotation-Token. Invalid, expired and revoked links return 404. |
| GET /api/bookings, /api/bookings/candidates, /api/bookings/:id, /api/bookings/quotation/:id | Staff directory, eligible quotation search and booking details. |
| POST /api/bookings | Requires quotation ID, revision and request key. A single transaction creates one pending booking, the Finance projection and audit event. |
| PATCH /api/bookings/:id/status | Versioned transition. Pending can be confirmed/cancelled. Confirmed can be completed/cancelled. |
| GET /api/content-translation/status | Staff. Returns a boolean for editor visibility without returning configuration or credentials. |
| POST /api/content-translation | Staff, origin and CSRF protected. Returns English/Arabic suggestions via Google Cloud Translation Basic v2 when enabled. The editor proposes translations for empty target fields in the active section and applies them after review. |
| POST /api/content-translation/check | Admin, origin and CSRF protected. Translates a fixed sample using the saved, enabled API key. |
| GET/POST /api/catalogue/:kind and GET/PATCH /api/catalogue/:kind/:id | Staff catalogue directories, validated create/update and optimistic versions. Activation changes require an administrator. |
| GET /api/catalogue/hotels/:id/bundle | Hotel details with active rooms, meals, amenities and travel add-ons. |
| POST /api/settings/brand-assets/:kind and GET /api/settings/brand-assets/:file | Admin-only validated file upload up to 512 KB, followed by a normal project identity save. Stored branding URLs serve immutable image bytes. |
| POST /api/settings/currency-list | Admin-only, idempotent addition of a supported currency to the project list. Exchange rates are configured separately. |

Travel records are private to their owner and administrators. Staff mutation APIs require a valid session, configured Origin and CSRF. Customer share URLs keep the token in the fragment. The API receives it through a dedicated header. Bookings reference the unchanged quotation revision and use server-calculated totals. Resolve selected add-ons priced on request before creating a booking. Finance excludes pending/cancelled projections and keeps the record for audit and invoice history. It reports each currency separately.

To set up automatic translation, enable the Cloud Translation API and billing in the Google Cloud project. In **Settings → Content Translation**, enter its Basic v2 API key and save. Use **Test saved API key** to verify the connection. Use **Show translation in quotations** to turn automatic translation on or off while retaining the encrypted key. Configure the installation's `INTEGRATION_SECRET_KEY` on the server before storing any provider key. See [Google Cloud API key authentication](https://docs.cloud.google.com/docs/authentication/api-keys-use).

## Inbox and email

| Route | Access and behavior |
| --- | --- |
| GET/POST /api/public/inbox/:shareId | Share token required. Same-origin writes, idempotent message key and rate limits. |
| GET /api/inbox, GET /api/inbox/:id, GET/POST /api/inbox/:id/messages, PATCH /api/inbox/:id | Staff inbox, direct conversation lookup, message history/replies, mark read, close/reopen. Owners see their quotation threads. Social threads are in the admin queue. |
| PATCH /api/inbox/:id/customer | Admin-only link or unlink for a social thread, with CSRF and the previous linked customer ID to prevent stale changes. Existing messages follow the explicit link into Customer File. |
| PATCH /api/inbox/:id/lead | Admin with CSRF. Accepts `leadId` and `previousLeadId` as numeric strings or null. Null `leadId` creates a lead for an eligible thread and returns its ID. An existing ID links an unarchived lead. Requests to create on an already-linked thread return its current lead. A stale link or an explicit customer link can return 409. |
| GET/POST /api/webhooks/meta/:channel | Provider challenge verification or HMAC-SHA256 validation of the exact body. Scoped to the channel's configured provider account. |
| GET /api/emails | Admin-wide or sender-only delivery history, filter and pagination. |
| POST /api/emails/quotation/:id | Uses a valid current share, stored customer email, request key and optional PDF. An SMTP acceptance is recorded separately from failed or uncertain delivery. |

Inbox web chat polls every five seconds while a conversation is open. Meta adapters handle text messages. WhatsApp delivery/read callbacks can update accepted records. The inbox enforces a 24-hour reply window for provider messages and does not initiate template or bulk outreach. Confirm provider status before resending an uncertain delivery.

The first new verified text from a social conversation creates a New lead when the conversation has neither a lead nor an explicit customer link. Subsequent messages reuse the link. Leads can also be created manually with any of the three named sources. Administrators can link existing social conversations to a lead from Inbox. Messenger and Instagram use the sender ID when their event has no display name. WhatsApp can supply a display name and international phone number. Staff confirm matches across channels by linking them to the same lead. Existing conversations are eligible for manual linking or automatic intake on the next new message. Lead conversion carries the linked conversation into Customer File under the same Inbox access scope.

## Deployment and provider setup

- Set the HTTPS app origin and preserve the installation encryption key in the deployment secret store. Back up the database, encryption key and private quotation media directory. In production the Node process serves `dist/web` and `/api`. Make public branding assets and the packaged fonts available to API workers. Set `QUOTATION_MEDIA_DIRECTORY` to a persistent writable path and set `PDF_CHROMIUM_PATH` if the deployment requires a custom supported Chromium path.
- SMTP requires a public IPv4 endpoint on port 465, 587 or 2525 with verified TLS or STARTTLS. Incoming-mail fields are optional and do not synchronize IMAP. Configure Google Cloud Translation separately from Google Login.
- Register `APP_ORIGIN/api/auth/google/callback` as the authorized OAuth redirect URI. Staff sign in with their existing CRM credentials and link their verified matching Google email from Profile. Google login validates PKCE, state and nonce and issues the existing CRM session cookie.
- Configure channel account ID, Graph API version, app secret, webhook verification token and channel access token in Settings. Instagram uses Instagram Login for an eligible professional account. Messenger uses the Facebook Page account. WhatsApp's channel account ID is the phone-number ID and its business ID is the WABA ID. Subscribe each to its own Settings-displayed webhook endpoint using Meta's tools. Live channel permissions, review and messaging are controlled by Meta.
- Credentials, provider-side app setup and a public HTTPS callback are required for an end-to-end external acceptance test. Verify only with authorized recipients and test business accounts.
