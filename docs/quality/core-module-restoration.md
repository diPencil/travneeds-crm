# Core-module restoration verification

Completed locally on 19 November 2026 after the owner reported that default avatars and retained module interfaces had been removed. This report supersedes the earlier placeholder-module status in the foundation report.

## Delivered and inspected

Original male/female PNGs were copied from the untouched local archive into public assets. Avatar choice is persisted on user_profiles and used in account/profile/header/sidebar/directory displays. Browser inspection confirmed both the male default and switching the new-user form preview to the original female asset, without submitting a user or changing the owner's profile.

The Users, Leads and Customers pages were compared with the owner's supplied screenshots and original source classes: blue banners, original metric cards/icons, filter surfaces, tables, navigation children and form styling are retained. Suppliers uses the archived tracker styling. Arabic RTL and English LTR, light/dark appearances and a 390×844 Arabic customer viewport were inspected. The shared page banner had a double RTL reversal; removing that extra reversal restored the title/action placement. The original viewport, English locale and dark appearance were restored after testing. The retained browser tab is on User Management.

Saved screenshot evidence is in screenshots/restored-users.jpg, restored-female-avatar.jpg, restored-leads.jpg, restored-customers-rtl.jpg and restored-customers-mobile-rtl.jpg. These are development UI evidence, not seeded runtime data.

## Automated checks

`npm run check` passed: formatting, ESLint, frontend/backend TypeScript, 16 foundation tests, 8 isolated integration tests, browser production build and API production build. Git diff whitespace checks passed. Vite still reports large chunks, including the restored chart library and application chunk; bundle splitting remains a performance follow-up, not a failed build.

Regression tests were first observed failing for the missing routes, avatar input and unsupported currency validation, then passed after implementation. The isolated integration suite exercises actual Express routes, transactions and MySQL persistence. It verifies:

- Real directory/session metrics and employee denial on administrator routes.
- Persisted avatar choice and rejection of stale profile writes.
- Persisted customer updates, conflicting concurrent edits and archive authorization/restoration.
- Decimal validation, rejected mass assignment, transactional and concurrent retry-safe lead conversion.
- Assignment notifications and notification ownership.
- Persisted supplier creation/listing and unknown-field rejection.
- Hashed single-use invitation tokens and genuine login after acceptance.
- Disabled-account session revocation and rejected login.
- Concurrent administrator demotions preserving one active administrator.

The suite creates a randomly named local test database and removes it in finally. It forwards the database connector to the existing migration identity within tests only; query results and transactions are real. Production connection guards remain intact. The owner declined a new MySQL test account, so no additional MySQL account or grant is created. Integration setup is restricted to a local non-production server and test names are checked before cleanup.

## Development data and limits

The read-only state check reported users=1, profiles=0, leads=0, customers=0, suppliers=0, invitations=0, notifications=0, applied migrations=5. The original owner account remains. No demonstration business records, new development accounts or profile edits were created during browser verification. All generated application fixtures belong exclusively to the temporary test database.

Current module behavior includes actual create/read/update, paging/filtering, current-page CSV export, administrator archive/restore, assignment, conversion, user status/role changes, session revocation, expiring invitation acceptance and system audit. The two implemented roles are admin and employee; custom role creation is not represented as working. Invitations yield a link for manual sharing and do not claim email delivery. The campaign control remains disabled with its integration requirement explained. Booking/payment totals and supplier operational metrics remain unavailable until their real source workflows are integrated. No bookings or payments were fabricated to populate these cards.

Browser checks exercised visual layout, navigation, responsive behavior and avatar preview. Persisted mutations were exercised by the isolated API integration suite; no production-deployment or independent human QA review is claimed.
