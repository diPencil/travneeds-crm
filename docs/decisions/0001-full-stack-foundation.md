# Full-stack foundation

## Context

The existing Travneeds UI used React, Vite and local demonstration state. The owner requested full frontend/backend logic backed by the existing XAMPP database, no fake data, feature-based organization, and reuse of business logic from several source systems.

## Decision

Retain React and the Travneeds visual system. Add an Express 5 TypeScript API with mysql2 prepared statements and a dedicated MySQL runtime account. Operational commands provision access and apply checksummed SQL migrations to the existing database. Shared transport types live under a module name in `shared/`.

Authentication uses real user rows, scrypt hashes, opaque server sessions and per-session CSRF tokens. There is no public registration/bootstrap endpoint. The initial administrator is created by an interactive terminal command using the owner's actual details. Administrator-only settings are persisted transactionally and guarded against concurrent overwrite.

The code is currently intended for a single-company, single-API-instance deployment. Login rate limiting is in memory and must move to a shared store before multi-instance deployment. Production requires HTTPS, Secure cookies and a same-origin frontend/API arrangement. Deployment still requires deployment-specific reverse-proxy and process supervision decisions.

## Deferred boundaries

Business module integration will start with `web-source/`. The SQL model for those modules will follow the selected source contracts. Exchange-rate ingestion/conversion and serial validation/issuing are deferred. The activation interface remains visibly inactive.

## Toolchain

Vite was upgraded from 5 to 8 to resolve dependency advisories. The project uses npm, a committed lockfile, TypeScript 5.9 and a minimum Node version compatible with the installed backend/tooling. Backend production output is under `dist/server/`, while the browser build is under `dist/`.
