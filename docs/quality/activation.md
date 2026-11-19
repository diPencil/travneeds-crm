# Local monthly activation verification

`npm run check` passed 52 tests with Chromium enabled. The browser activated an isolated installation, observed the countdown changing and verified the Manage License link target.

The integration suite checked administrator and CSRF requirements, rejection of client-supplied serials and status, single issuance under concurrent requests, the calendar-month period, masked reads and expiration using the database clock. Migration 022 was also applied locally and the live local license state was verified without reading its raw code.
