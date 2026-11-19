# Finance foundation verification — 2026-11-19

The original Financial Controls banner, five cards, filters and seven-column table are restored. Invoice directory/details, client/supplier invoice and payment entry layouts, booking detail and overview/profit/agent report screens are included. Trips code is not imported. Source state remains pending and all financial posting is closed.

## Automated verification

`npm run check` passed: formatting, ESLint, frontend/backend TypeScript, 21 foundation/money/date tests, 15 isolated MySQL integration tests, and frontend/backend production builds. Total: 36 tests, no failures or skipped tests. The initial sandbox run could not open localhost sockets; the same checks passed with local connection permissions. Existing chunk-size warnings remain for the application/chart bundles.

Finance regressions cover unauthenticated and employee denial, posting rejection, invalid date ranges, unavailable source state, exact large monetary values, negative fractional formatting, UTC boundaries, verified refunds, excluded pending payments, unknown costs, supplier filters, multiple invoices without duplicate revenue and cross-currency invoice FK rejection. Test data is confined to a disposable database using the existing operational identity; no MySQL test account is created.

## Browser verification

Checked original desktop Finance in light/dark, all three report views, invoice navigation and client invoice layout, supplier existing/new tabs, payment entry in Arabic RTL and Finance at 390×844. No financial rows are invented to fill the tables/charts. Posting/upload actions are disabled with the integration boundary explained.

- [Restored Financial Controls](screenshots/restored-financial-controls.jpg)
- [Arabic mobile Finance](screenshots/finance-mobile-rtl.jpg)

## Development data verification

Read-only local report: users 1; profiles, leads, customers, suppliers, invitations, notifications, finance booking accounts, invoices and payments all 0. Source trips: pending. Applied migrations: 7; current schema: 20 application tables including schema_migrations.

## Deferred functionality

Real Trips mapping, financial posting, invoice issuance/numbering, tax configuration, receipt uploads and delivery require the future booking workflow. Read models were exercised with isolated database inputs; no live booking/payment workflow is claimed. Automated and agent browser checks are not an independent human QA review.
