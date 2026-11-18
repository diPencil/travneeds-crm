# Travneeds CRM engineering guide

Read `README.md`, `docs/constitution.md`, `docs/DESIGN_SYSTEM.md`, and `docs/ERD.md` before changing a feature. Follow the owning module and its actual callers through frontend, API, authorization, persistence, and failure states.

## Product and current scope

Travneeds is a single-company CRM. CRM groups Leads, Customers, and Suppliers. Finance is for booking and payment reports. User Management owns employee and administrator accounts. Settings owns project identity, currencies, and the reserved monthly/annual activation area.

The implemented foundation has database-backed sessions, role checks, project identity settings, personal audit history, and an inactive license record. Business module integration and serial validation are future work. Keep `docs/project-guide.md` accurate when that status changes.

## Directory ownership

| Path | Owner / contents |
| --- | --- |
| `src/modules/<module>/` | Frontend feature pages, API client, hooks and feature-specific state |
| `server/src/modules/<module>/` | API routes, services, repositories and authorization for that feature |
| `shared/<module>/` | Transport contracts shared by frontend and backend |
| `src/components/ui/` | Reusable visual primitives |
| `src/components/layout/` | Application shell, sidebar, header and account dropdown |
| `src/localization/` | EN/AR translations and direction infrastructure |
| `src/lib/`, `server/src/http/` | Cross-feature HTTP infrastructure |
| `server/src/database/` | Connection pool and transaction infrastructure |
| `docs/database/migrations/` | Ordered, versioned database schema changes |
| `docs/scripts/` | Operational and one-off scripts with descriptive names |
| `server/tests/` | Foundation tests. Add feature tests under an owning module subfolder as coverage grows |
| `docs/` | Design, architecture, ERD, operations, decisions, QA evidence and tooling records |

Root files are entry-point documentation, dependency manifests and configuration required by tools. Put implementation notes, reports, temporary investigation scripts and future procedures under a named `docs/` subfolder. Add a shared helper only when existing callers require the same behavior. Remove obsolete code and empty directories.

## Non-negotiable implementation rules

1. Application data comes from MySQL through authenticated APIs. No demo users, fixed login credentials, fake customers, invented KPIs, localStorage authentication, seeded transactions, fabricated testimonials, fallback business records or simulated successful saves.
2. Empty datasets render an empty state. Unavailable services render an actionable error. An HTTP success must correspond to a completed operation. Await persistence before announcing success.
3. Use TypeScript strict mode, clear domain names and small cohesive functions. Keep routes thin, business rules in the owning service and SQL in the owning repository/service. Reuse existing representations. Avoid `any`, silent catch blocks, unused state and speculative abstractions.
4. Treat every HTTP input as untrusted. Validate shape, length, enum and ownership server-side. Use bound SQL parameters. Review any interpolated identifier against a fixed allowlist. Apply authorization to every protected API operation.
5. Passwords use the versioned password hashing implementation. Session tokens are random and stored as SHA-256 digests. Cookies are HttpOnly, SameSite Strict, and Secure with a `__Host-` prefix in production. Keep CSRF and Origin checks on authenticated writes.
6. Use database transactions for mutations spanning records. Preserve foreign keys, uniqueness and audit consistency. Protect retries, concurrent writes, and administrative invariants. Represent money and exchange rates with DECIMAL and explicit currency codes.
7. Applied migrations are immutable and checksummed. Add a new migration for a schema change. MariaDB DDL implicitly commits, so migrations must be safely restartable. Review existing data before any destructive change.
8. Secrets belong in local environment files or deployment secret stores. Never print passwords, raw serials, database connection strings, session cookies or SQL errors containing values. Use the dedicated runtime database account. Privileged migration credentials are for operational commands.
9. Reuse the Travneeds design system. Deliver Arabic RTL and English LTR, light/dark appearance, responsive layouts and accessible names and keyboard interaction for changed controls. Keep account, currency, date and reference values isolated where needed.
10. Activation is a reserved UI and schema boundary. Monthly/annual options and an inactive status may be displayed. Implement validation, issuing, renewal and enforcement only when their contract is defined with the owner. Never mark an installation active from a client flag or unchecked serial.
11. Operational configuration rows, role codes, and static design assets are legitimate configuration. Test-only generated inputs stay isolated from runtime data. Tests must never populate the development database with demonstration records.
12. Run the relevant checks, review the diff and document concrete limitations. Do not claim a human or QA engineer reviewed a change unless that review actually happened.

## Verification and maintenance

Run `npm run check` before calling a code change ready. The command checks formatting and runs lint, frontend/backend type checking, foundation tests and both builds. Run `npm audit` when changing dependencies. Test changes that affect authentication, authorization, concurrency, financial values, migrations or persistence. Prefer tests for behavior and regressions over tests that mirror implementation details.

For a new module, verify happy path, invalid input, missing record, unauthenticated access, forbidden access, loading, empty, failed request and retry. Record browser verification independently of API tests. Tests that need sockets or MySQL require an execution environment that permits local connections.

Update `docs/ERD.md` with every schema change, `docs/operations/api.md` with API changes, the module status in `docs/project-guide.md`, and the design reference when shared visual behavior changes. Record material architecture decisions in `docs/decisions/` and completed verification in `docs/quality/`.

## Source projects and installed skills

`web-source/`, `Travneeds-CRM-old-modules/`, and `module-sources/` are local sources excluded from Git, builds, lint and runtime imports. Start future module analysis with `web-source/`. Inspect its validation, authorization and database dependencies, then adapt selected code into the owning Travneeds module. Never copy environment files, dependencies, demo data or whole source repositories into the runtime tree.

Installed skills are documented in `docs/tooling/skills.md`. Use relevant skills for the current task, with this project's design and domain contracts as the local source of truth. Installing a publishing skill does not authorize publishing project code, designs, settings or data to an external service.

Use npm run format to apply the formatting configuration stored in package.json.
