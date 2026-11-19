# Travneeds CRM

Full-stack CRM foundation with a React/TypeScript frontend, Express 5 API and the existing MySQL-compatible `travneeds_crm` database running in XAMPP. Local verification used MariaDB 10.4.32.

## Project references

| Document | Purpose |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Engineering instructions and file ownership |
| [Constitution](docs/constitution.md) | Product boundaries, quality rules and definition of done |
| [Design system](docs/DESIGN_SYSTEM.md) | Travneeds visual reference and current implementation notes |
| [ERD](docs/ERD.md) | Implemented schema, invariants and future module boundaries |
| [Project guide](docs/project-guide.md) | Current implementation status |
| [Local setup](docs/operations/local-setup.md) | XAMPP, configuration, accounts, migration and startup commands |
| [API](docs/operations/api.md) | Routes, authorization and request contracts |
| [Skills](docs/tooling/skills.md) | Installed repositories, versions and tool limitations |
| [QA report](docs/quality/foundation-verification.md) | Verification evidence and remaining checks |
| [Core-module QA](docs/quality/core-module-restoration.md) | Avatar/module restoration, isolated persistence tests and browser evidence |
| [User tabs and audit QA](docs/quality/user-detail-audit-restoration.md) | Original six-tab user view, full audit table/filter/export and verification |

## Run locally

Use Node 22.13+ and npm. Start XAMPP MySQL and use the existing database.

```sh
npm ci
npm run setup:local
npm run db:setup
npm run db:migrate
npm run admin:create
npm run dev
```

The web app is at http://127.0.0.1:5173 and API health is at http://127.0.0.1:3001/api/health. Use the configured origin for login. During local development, Vite proxies `/api` to the backend.

The initial administrator is created interactively using real owner-provided details. There is no demo login or default password. Account creation requires a terminal, a 12–128 character password and password confirmation.

## Current features

- Database-backed login, server sessions, logout, role checks and personal audit history.
- Original-style login and dashboard, protected application shell, Arabic RTL/English LTR and light/dark appearance.
- Independent account profile with real profile editing, notification center, and filtered personal activity log.
- Administrator settings for project name, primary color, existing local logo/favicon paths and base currency, with optimistic concurrency protection.
- Administrator-maintained exchange rates and exact currency conversion. Provider settings store encrypted credentials for SMTP, Google Login, Google Cloud Translation and the Meta messaging channels.
- Visible monthly/annual activation area. The initial license is inactive and serial validation is deferred.
- Original-style User Management with actual account creation/editing/status, server-enforced admin/employee roles, active-session counts/revocation, expiring invitation links and system audit.
- Original male/female avatar assets, a stored avatar choice and consistent account/header/sidebar display.
- Original six-tab user detail view with database-backed personal/work data, actual sessions, capabilities, activity and metrics. System Audit Trail restores the original table, filters and full filtered CSV export.
- Persisted Leads, Customers and Suppliers directories with forms, search, filters, current-page CSV export, pagination, optimistic updates and recoverable administrator archiving. Lead assignment creates an actual notification; lead conversion is transactional and safe to retry.
- Quotations support four trip types from the source, hotels and rooms, bilingual content, customer links and server-generated PDFs. Bookings can be created explicitly from a saved edition.
- Finance reports read confirmed and completed bookings. Booking-linked and manual customer invoices have editable line items.
- Inbox handles quotation-link chat and has Messenger, Instagram and WhatsApp Business adapters. Emails records SMTP sends initiated from a quotation.

## Organization and data policy

Frontend features live in `src/modules/<module>/`, backend features in `server/src/modules/<module>/`, and shared transport contracts in `shared/<module>/`. Shared UI and application shell remain under `src/components/`. Supporting documents, migration SQL and operational scripts live under named `docs/` subfolders.

Runtime data comes from MySQL through the API. No sample users, customer records, bookings, revenue figures or exchange rates are seeded. The migration installs technical role codes and actual project configuration, including an inactive licensing record.

Local source projects `web-source/`, `Travneeds-CRM-old-modules/`, and `module-sources/` are excluded from Git and all application build/lint/runtime imports. Future integration starts with selected logic from `web-source/`.

## Verification

```sh
npm run check
npm audit
```

The check command verifies Prettier formatting and runs ESLint, frontend/backend type checks, foundation tests, isolated full-stack integration tests and both production builds. Local HTTP and MySQL tests require an environment permitting local sockets. Integration tests use the existing migration identity to create and remove a randomly named local test database. They create no MySQL users or grants and never seed the development database. Keep migration credentials available only to the local operational/test commands.

Build with `npm run build`. Start the compiled production app with `npm start`. It serves the browser build and the API from the same HTTPS origin. See the [Hostinger deployment settings](docs/operations/hostinger.md) and local setup for production configuration.

## Repository

Origin is [diPencil/travneeds-crm](https://github.com/diPencil/travneeds-crm). The clean foundation branch is `codex/clean-foundation`. Old history remains a local recovery reference. Changes in this setup pass are local until explicitly published.

Use npm run format to apply the formatting configuration stored in package.json.

## Finance

Financial Controls, invoices, booking financial details, payment entry and financial reports retain the original design. Authenticated administrator read APIs use MySQL projections. Manual itemized customer invoices can be saved as drafts, edited and issued with unique numbers, then printed or saved as PDF through the browser. Travel Bookings supplies booking reports. Payment posting, supplier invoice entry and payment gateways are outside this delivery. Provider setup and production requirements are documented in [Travel and communications](docs/operations/travel-communications.md). See [Finance API](docs/operations/finance-api.md) and [verification](docs/quality/finance-foundation.md).

[Itemized invoice verification](docs/quality/itemized-invoices.md) documents the exact-money, persistence, concurrency and browser checks.
