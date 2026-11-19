# Read-only source inventory — 2026-11-19

No source project code, environment file, seed dataset or dependency directory is copied into the runtime tree during this review. Findings below are based on the supplied local source, not assumptions about the live website.

## Trip Builder

Primary editor: web-source/components/admin/trip-builder.tsx. It writes the tours APIs and depends on source Next.js/React 19, source CMS/localization, catalogue destinations/categories, rich-text/media helpers and source server auth. Travneeds uses React 18/Vite/Express/mysql2; this requires module adaptation, not direct Next.js imports or source Prisma reuse.

The four canonical types in web-source/data/types.ts are one-day-tours, multi-days-tours, nile-cruises and shore-excursions. Cruise classes are standard/deluxe/superior/luxury; departure port is a separate shore/cruise field.

The editor has eleven steps: Basic, Booking Pricing, Add-ons, Overview, Highlights, Itinerary, Inclusions, Date Pricing, Media, Map, Review & Publish. It stores source content-language independently of the application's UI language. Source translations are manual fields; an automatic translation provider is an additional requested capability.

| Area | Observed fields/behavior to preserve or adapt |
| --- | --- |
| Basic | title/translations, trip type, category/destination membership, location, cruise class, departure port, duration, group size, travel style, summary, base price, manual deal percent/expiry |
| Booking pricing | adult/child/infant per-person rate tables keyed by total travelers, fallback base price; distinct from display-only date pricing |
| Add-ons | translated title, optional price; blank price means on request, not free |
| Overview | formatted narrative and translated content; server sanitization required |
| Highlights | image, translated groups and one-per-line items |
| Itinerary | repeatable day/stop label, title, rich description, meals and image; overall itinerary note |
| Inclusions | translated included/excluded lists |
| Date pricing | period label/start/end/note, price/prefix and arbitrary labeled pricing tiers/suffixes |
| Media | image gallery/cover, bilingual alt/captions, credit label/URL, uploads, journey-video URL/platform/title/date/thumbnail |
| Map | repeatable names/translations and optional latitude/longitude |
| Review | field coverage, preview, draft/save/publish; adapted to quotation readiness/sharing rather than marketplace publication |

Preview types/calculation: web-source/lib/trip-builder/trip-builder-preview.ts. Preview components/style: web-source/components/admin/tours/trip-builder-preview.tsx and .css. Content contracts/translations/rich text: web-source/data/types.ts and web-source/lib/tours/. Validation/write shaping: web-source/lib/tours/tour-write.ts; persistence: web-source/lib/server/catalogue/tours.ts.

Actual customer trip pages are web-source/components/tours/detail/tour-detail.tsx and day-tour-detail.tsx. They include hero/gallery, title/facts, overview, highlights, itinerary, inclusions/exclusions, add-ons, price periods, videos and map with a pricing sidebar. Catalogue favorites/cart, reviews, related tours and analytics belong to the source storefront, not customer quotation records. Do not copy testimonial/rating/demo catalogue data to fill missing quote content. PDF represents video/map content with appropriate poster/location/link information rather than pretending interactive controls work on paper.

No hotel/room stay editor is present in these builder contracts. That tab is new Travneeds functionality and needs its own explicit pricing/occupancy/date rules.

## Bookings

Staff list: web-source/app/admin/bookings/page.tsx; staff detail/handlers: app/admin/bookings/[ref] and app/api/admin/bookings. Shared contracts/price selection: lib/booking/ and lib/admin/admin-booking-row.ts. Domain lifecycle: lib/server/booking/bookings.ts plus booking-validation, values, read-models, queries, replay, checkout and access subfolders.

Prisma source models include Booking, BookingItem, BookingActivity, Payment, BookingAccessToken and BookingDocument. Items freeze actual title/image/date/passenger counts/unit prices/add-ons/line total. Status and payment state are separate. References are display identifiers, never authorization credentials. Access tokens are opaque and stored as hashes with expiry/revocation. Pending payments do not count as settled revenue.

The source checkout booking-quote.ts issues a short-lived HMAC price-confirmation token. It is not a persisted customer proposal and must not be mistaken for the requested CRM Quotation entity. Travneeds needs its own customer-linked quotation revisions, lifecycle, share access and booking snapshots.

## Inbox and Emails

Inbox: web-source/app/admin/inbox/page.tsx; support conversations/replies/read state/assignment/close logic: lib/server/support/support-chat.ts, live-chat.ts, live-chat-session.ts and app/api/admin/conversations. Source browser live updates use periodic requests and real persisted messages; do not describe the transport as WebSockets without implementing that transport. Guest/customer identity is controlled server-side; message bodies never choose sender role or customer ownership.

Email history: web-source/app/admin/emails/page.tsx; app/api/admin/emails; lib/server/email/email.ts and email-smtp.ts. Source history has recipient/type/event/subject/related reference, pending/sent/failed/skipped state, attempts, provider ID and safe diagnostics. It is not a synchronized incoming mailbox. SMTP success means server acceptance, not proof of recipient delivery/opening. Domain event failure must not manufacture a SENT record or roll back a valid booking.

## Settings

Selected source tabs: Currency, Email Configuration and Google Login in web-source/app/admin/settings/page.tsx. Settings contracts and write allowlists: lib/server/settings.ts.

Currency source supports USD/EUR/EGP and configured rates. Travneeds must preserve its explicit base currency and original transaction currency, use exact decimal rate calculations and never silently relabel missing conversions.

Email settings include sender name/email/mailbox, SMTP host/port/encryption/user/password/timeout and incoming protocol/host/port/encryption/user/password. Secrets are write-only in client responses (presence flags). Source-only fields do not prove a live IMAP mailbox engine.

Google OAuth: lib/server/auth/social-provider.ts, social-flow.ts, social-account.ts, social-seal.ts and app/api/auth/social/[provider], callback/[provider]. Source flow is customer-oriented. The CRM has staff/admin identity, so adapt it to verified existing active staff with explicitly bound provider identity and existing session revocation rules; never import customer auto-registration logic.

## PDF limitation

Source lib/server/documents/document-pdf.ts and lib/server/pdf/render.ts generate booking documents with PDFKit. lib/server/pdf/fonts.ts explicitly says Arabic is not supported and source PDF copy is English-only. Those document layouts also differ from the full tour-detail layout. A quotation PDF engine/font/layout choice must be made against the required actual Arabic/English exports, not assumed from this source's booking PDFs. Actual generated pages need rendering and inspection.

## Existing CRM touchpoints

Preserve existing auth/CSRF, owner account, customer lead conversion and archive/version rules. Wire actual bookings into Finance projections, invoice booking selection, customer/supplier metrics and dashboard rather than creating a second independent booking total. Keep known costs separate from unknown costs. Manual invoices remain valid without fake booking rows. Do not mark source connected just because new tables or sidebar entries exist; the committed booking adapter must be implemented and verified first.
