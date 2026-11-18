# Travneeds CRM

Clean CRM foundation for the Travneeds rebuild.

## Run locally

Use Node.js 20+ and npm.

    npm ci
    npm run dev

The development server uses Vite's default port 5173.

    npm run build
    npm run typecheck
    npm run lint
    npm run preview

## Current scope

The application retains the login page, public landing page, application shell,
sidebar, header, shared UI, toast notifications, language switching and appearance
switching. Old business modules and their mock data have been removed.

The workspace links to empty sections prepared for the next implementation step.

| Section | Route | Intended scope |
| --- | --- | --- |
| Leads | /leads | CRM lead management |
| Customers | /customers | Customers and corporate accounts |
| Suppliers | /suppliers | CRM supplier management |
| Finance | /finance | Payment and booking reports |
| User Management | /users | Employee and administrator accounts |
| Settings | /settings | Colors, logo, favicon, project name and currency conversion |

Leads, Customers and Suppliers are grouped under CRM in the sidebar.
These section routes currently display placeholders. Their business logic,
persistence and project settings will be implemented during module integration.

Authentication retains the existing demo account.

- Email admin@travneeds.com
- Password password123

## Design reference

[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) records the existing Travneeds layouts,
colors, typography, cards, tables, tabs, forms, states, dark mode, responsive
behavior and Arabic RTL / English LTR behavior. Shared components remain in
src/components/ui/.

## Source projects

web-source/ and Travneeds-CRM-old-modules/ are local reference projects excluded
from Git and ESLint. Future source projects belong under module-sources/, which
is also excluded. Only selected, integrated code belongs in the CRM source tree.

The first source for future integration is web-source/. Its framework, server
services, database schema and permissions must be reviewed with each selected
module. The current CRM runtime remains React + Vite.

## Repository

Configured origin is https://github.com/diPencil/travneeds-crm.git.

The clean foundation starts on codex/clean-foundation with independent history.
The old master branch remains a local recovery reference.
