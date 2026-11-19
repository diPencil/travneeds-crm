# Travneeds engineering constitution

## Objective

Deliver a coherent, maintainable full-stack CRM backed by the owner's existing `travneeds_crm` database. The UI, API, authorization and data model form one feature. A working screen must accurately represent the state of the underlying operation.

## Product boundaries

| Area | Responsibility |
| --- | --- |
| CRM | Leads, Customers and Suppliers within a single navigation group |
| Finance | Booking/payment read reports and itemized customer invoices, with manual or real booking inputs |
| User Management | Real employee and administrator accounts and access rules |
| Settings | Project name, colors, logo, favicon, base currency and future currency conversion |
| Activation | Reserved monthly/annual licensing area, with serial issuing and validation deferred |

The first module source is `web-source/`. Further systems may supply selected logic. Travneeds owns the resulting domain contracts and visual identity.

## Code and data standards

- Organize code by feature ownership. Common infrastructure stays small and explicit. Scripts and supporting documents belong under `docs/`.
- Write readable, typed code with descriptive names. Avoid dense expressions, duplicated business rules, catch-all utility modules, hidden mutations and unused dependencies.
- Persist actual user operations to MySQL. Keep authentication, permissions and invariants on the server. Display loading, empty, validation and failure states based on actual responses.
- Keep application datasets empty until real records are entered or an explicitly authorized migration supplies them. Do not create demo employees, sample clients, invented activity, placeholder bookings or hardcoded revenue figures.
- Technical configuration such as the admin/employee role codes, product identity defaults and an inactive licensing record is versioned configuration. Exchange rates require a real source and effective date.
- Hash passwords, use opaque server-side sessions, protect writes with CSRF and Origin validation, cap request sizes and rate-limit login. Bind SQL values and apply per-operation authorization.
- Use transactions and constraints for multi-record consistency. Guard concurrent settings writes with their version. Keep audit records tied to real operations. Financial amounts require DECIMAL storage and explicit currencies.
- Keep secrets out of Git and logs. Use a database runtime identity restricted to this database. Migration privileges stay in the operational path.
- Preserve Arabic RTL, English LTR, responsive behavior and light/dark appearance. The visual reference is `DESIGN_SYSTEM.md`.

## Feature lifecycle

1. Read the current source and document the feature's inputs, outputs, ownership, permissions and failure cases.
2. Update the ERD/API contract when required, identifying implemented and deferred work accurately.
3. Implement a complete, reviewable slice through UI, server and database. Reuse existing domain logic and shared components.
4. Exercise real entry points and relevant automated tests. Include negative authorization tests and retry/concurrency coverage for affected behavior.
5. Review readability, architecture, security, error handling, data consistency and maintenance cost. Perform the relevant UI checks and record which were actually run.
6. Update documentation alongside the implementation. Report any remaining gap directly.

## Definition of done

The requested behavior works through its normal entry point, persistence and failure cases are covered, relevant checks pass, and schema/API/design/operations documentation matches the code. Required checks are `npm run check` and an updated dependency audit when dependencies change. A failed check is investigated and corrected, or recorded with a specific external blocker.

A passing test suite or clean dependency audit is evidence for its defined scope. Security, QA and human-review claims must name the actual checks or reviewers. Future work must be presented as future work.

## Changes requiring care

An already applied migration gets a successor migration. Destructive schema work requires an identified data outcome and recoverable backup. A dependency upgrade must preserve supported callers and pass verification. Production deployment, external publishing and license issuing require their own explicit task scope.

التنسيق موحّد عبر Prettier وإعداداته داخل package.json. فحص التنسيق جزء من npm run check.
