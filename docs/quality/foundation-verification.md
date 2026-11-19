# Foundation verification

This file records the current verification scope. Automated checks are distinct from browser inspection and human review.

## Scope

- Frontend and backend TypeScript compilation and production builds.
- ESLint on runtime code, shared contracts, tests and operational scripts.
- Versioned password hashing, incorrect-password rejection and malformed-hash handling.
- Session digest shape, session guard and employee/admin authorization boundary.
- Origin rejection, CSRF rejection and valid-CSRF acceptance.
- Input schema rejection for unknown keys, malformed colors, external paths, unsupported currencies and attempted license mutation.
- Real database connection, required migration and stored configuration reads through the limited runtime account.
- No activation issue/validation route and no runtime demonstration dataset.
- Local API/web startup, health check and frontend proxy verification.
- Dependency audit after updating the lockfile.

## Database setup

The existing database was empty before the foundation migration. Nine foundation tables were created. The dedicated account was provisioned after the owner approved its exact connection scope and DML grants. An Aria write error interrupted the first account-creation attempt. A normal restart using the existing XAMPP configuration restored service, after which provisioning and the migration re-run succeeded. The original failed operation did not create an application account.

The development database is intentionally left without application users, sessions, exchange rates or business records. The owner creates the first real administrator interactively. No default credential is provided.

## Pending verification

Successful login/logout using a real owner-created administrator and interactive settings editing require that administrator to be created. Complete their browser checks in both directions and themes after account setup. A human review has not been performed in this pass. The automated suite does not replace deployment-specific security review or backup/restore exercises.

## Recorded command outcomes

| Check | Result |
| --- | --- |
| Prettier check | Passed |
| ESLint 10 with current React/TypeScript plugins | Passed, zero warnings and errors |
| Frontend/backend TypeScript | Passed |
| Foundation suite | 11 passed, zero failed |
| Browser production build | Passed, route-level chunks generated |
| API production build | Passed |
| Migration re-run | Passed without changing the applied migration |
| Direct API health | HTTP 200, database connected |
| Vite `/api` proxy | Returned actual branding configuration |
| Dependency audit | Zero reported advisories in the project dependency tree |
| Current development data | users 0, auth_sessions 0, currency_rates 0 |
| Runtime database grants | SELECT, INSERT, UPDATE, DELETE on travneeds_crm only, connection account at 127.0.0.1 |

Checks were run locally on 18 November 2026. Security guard tests use generated inputs in memory. The suite created no application users or business records. Browser interaction with a real administrator and a human review remain pending as described above.

## Login design restoration

The login page was restored from the archived original after the owner reported an unintended redesign. Comparison against that source confirmed the original card widths, 700px desktop map panel, rounded form controls, both Lottie placements and footer. The current authentication call remains server-backed. Former demo-fill controls have been removed; the original login layout and animation are retained. Google login reports that it is unconfigured, and password recovery directs the user to their administrator.

Formatting, ESLint, TypeScript, all 11 foundation tests and both builds passed after restoration. Dependency installation reported zero advisories. This source-level comparison is distinct from a browser screenshot comparison, which has not been completed.

## Dashboard and account UI restoration

The original dashboard source was restored with its 3x2 metric-card grid, original banner and quick-action styling, 2/3 revenue chart, 1/3 distribution chart, reminders card and activity card. Business values and chart points remain unavailable until real source modules are connected. Personal activity is read from the database.

The profile dialog is restored as an independent editable account interface, with original two-column fields, status badge, avatar area and edit/save footer. Notifications restore the original page layout and are backed by owner-scoped read/delete APIs. The activity log restores its original modal styling and search/type/date filters, with an additional full-page route sharing the same content.

The owner removed Landing from scope. Its module and route were deleted. The login source retains the original visual structure. The login was inspected in the in-app browser, including its original card and animated plane.

An existing owner session was used to inspect the restored dashboard, independent profile dialog, notification center, and activity page in the browser. Profile edit mode enabled name, email and phone while keeping role and department disabled; Cancel closed edit mode without saving changes. The activity page displayed actual audit records. Notifications displayed the empty state, and switching to Arabic visibly mirrored the layout to RTL. English was restored after the check. No profile write, notification insertion or settings write was performed during these checks. Profile persistence and interactive settings saves remain separate verification tasks.

The regression check initially failed on missing restored API routes, then passed after implementation. The final suite has 14 passing tests, including protected routes, profile mass-assignment rejection, and notification mutation authentication. Formatting, lint, TypeScript and both builds passed. npm audit reported zero advisories. The chart bundles produce a size warning because the original chart library is restored.

The database check found one existing account, zero profile rows and zero notifications. This restoration did not insert accounts, profile rows, notifications, business KPIs or chart points. Migration 002 adds the required storage only.

## Hostinger startup

Loading `server.js` through CommonJS `require()` reproduced the LiteSpeed startup error locally. After switching the entry file to dynamic import, the same loader returned HTTP 200 for the web root and for `/api/health` with MySQL connected. The full project check passed.
