# Core module restoration

The owner requests the original male/female default avatars and the retained CRM/user-management interfaces, with actual frontend, API and MySQL behavior. Screenshots supplied on 18 November 2026 and the local original sources define the visual reference. No redesign or demonstration records are authorized.

| Module | Deliverable | Dependency |
| --- | --- | --- |
| account | Original avatars, stored selection, consistent header/sidebar/profile | Existing sessions |
| users | Original directory/cards/table, account creation/edit/status, role matrix, invitations and system audit | Account |
| leads | Original list/cards/filters, persisted create/edit/details, assignment, follow-up and customer conversion | Users, customers |
| customers | Original directory/cards/filters, persisted individual/corporate profiles | Users |
| suppliers | Original supplier interface, persisted directory and forms | Users |

Build order: account → users → customers → leads → suppliers. Finance retains its agreed booking/payment-report scope; it must never invent transactions or totals before those source workflows are integrated.

Acceptance: reload retains saved records; server validates inputs, ownership/roles and stale versions; account status changes revoke access; the last active administrator cannot be removed. All mutation audits represent committed operations. Lists support search/filter/export and display loading, empty and failure states. Monetary input stays decimal text in API/storage. Conversion is transactional and idempotent. Arabic RTL/English LTR and the original light/dark design remain supported.

Use static local avatar assets; never infer gender from names. Invitations produce expiring local acceptance links with hashed tokens, rather than falsely claiming an email was sent. Only the owner can enter actual records. Automated fixtures must run in a separate test database, never seed the development database. External source logic is examined selectively; archived files remain untouched.

Verification: regression tests before behavior changes, isolated persistence/concurrency/authorization checks, project checks, and browser inspection of the original-style pages. No publishing or deployment is part of this correction.
