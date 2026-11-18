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
