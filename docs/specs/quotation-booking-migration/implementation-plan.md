# Implementation plan — approved initiative

The owner approved implementation and expanded Inbox to Messenger, Instagram and WhatsApp Business. Routine implementation choices within this map proceed under that approval; no repeat map-approval request.

1. Implemented: administrator integration settings with encrypted secrets, provider readiness and exact currency rates/conversion.
2. Implemented behind configured provider credentials: media and bilingual/manual/automatic translation; actual SMTP delivery outbox/history.
3. Implemented: full customer-linked quotation builder, four source trip types, hotel/room tab and source-style presentation.
4. Implemented: revision-specific share links and real Arabic/English PDF files.
5. Implemented: bookings from quotation snapshots and existing Finance/CRM/dashboard adapter.
6. Implemented: quotation-link chat and signed Meta text-message ingestion/replies with failure states. Live Meta acceptance requires a real provider setup.
7. Implemented: Google OAuth sign-in for existing linked active accounts. External acceptance requires real provider credentials. See the quality record for completed verification.

Every item needs authenticated APIs, MySQL, input validation, failure states and relevant tests. Provider configuration is not proof of a successful external connection. Missing credentials are a configuration requirement, never a simulated connection.
