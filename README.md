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
- Public landing page, protected application shell, Arabic RTL/English LTR and light/dark appearance.
- Administrator settings for project name, primary color, existing local logo/favicon paths and base currency, with optimistic concurrency protection.
- Stored exchange-rate display with a real empty state. Source integration and conversion workflow are pending.
- Visible monthly/annual activation area. The initial license is inactive and serial validation is deferred.
- Prepared CRM sections for Leads, Customers and Suppliers, plus Finance and User Management. Their business workflows await source-module integration.

## Organization and data policy

Frontend features live in `src/modules/<module>/`, backend features in `server/src/modules/<module>/`, and shared transport contracts in `shared/<module>/`. Shared UI and application shell remain under `src/components/`. Supporting documents, migration SQL and operational scripts live under named `docs/` subfolders.

Runtime data comes from MySQL through the API. No sample users, customer records, bookings, revenue figures or exchange rates are seeded. The migration installs technical role codes and actual project configuration, including an inactive licensing record.

Local source projects `web-source/`, `Travneeds-CRM-old-modules/`, and `module-sources/` are excluded from Git and all application build/lint/runtime imports. Future integration starts with selected logic from `web-source/`.

## Verification

```sh
npm run check
npm audit
```

The check command verifies Prettier formatting and runs ESLint, frontend/backend type checks, security/foundation tests and both production builds. Local HTTP and MySQL tests require an environment permitting local sockets. Tests keep generated security inputs in memory and do not seed the development database.

Build with `npm run build`. Start the compiled API with `npm start`. Serve the browser build separately with a same-origin `/api` reverse proxy. Production requires HTTPS, deployment secrets, backups and process supervision. See the local setup and architecture decision for deployment boundaries.

## Repository

Origin is [diPencil/travneeds-crm](https://github.com/diPencil/travneeds-crm). The clean foundation branch is `codex/clean-foundation`. Old history remains a local recovery reference. Changes in this setup pass are local until explicitly published.

Use npm run format to apply the formatting configuration stored in package.json.
