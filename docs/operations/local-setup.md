# Local setup with XAMPP

Run commands from the project root using Node 22.13+ and npm. XAMPP supplies the local MySQL-compatible service. The existing database is `travneeds_crm`; the scripts do not create a replacement database.

## First setup

```sh
npm ci
npm run setup:local
npm run db:setup
npm run db:migrate
npm run admin:create
npm run dev
```

`setup:local` writes missing local environment values and generates a random application database password. Existing database settings are preserved. `db:setup` uses the local migration credentials to create `travneeds_app` for TCP connections from 127.0.0.1, with SELECT, INSERT, UPDATE and DELETE on `travneeds_crm` only. It verifies the application connection. It does not reset an existing account password.

The initial administrator command asks for the owner's real full name, email and password in the terminal. Password input is hidden, must contain 12–128 characters, and is confirmed before saving. Bootstrap is guarded against concurrent execution and refuses to create another initial administrator. There are no default application credentials and no user seed.

`setup:local -- --rotate-db-password` rotates only the local configuration value. Use it when provisioning a new account, or coordinate a matching database account rotation before using it on an existing installation.

## Services

| Service | Local URL |
| --- | --- |
| Web | http://127.0.0.1:5173 |
| API | http://127.0.0.1:3001/api/health |
| MySQL-compatible service | 127.0.0.1:3306 |

Use the configured web origin for login. The API rejects mutating requests from other origins. Change `APP_ORIGIN` and the development proxy together when changing the local ports/host. `.env` is local and excluded from Git. `.env.example` lists the required fields without actual credentials.

## Verify

```sh
npm run check
npm audit
```

Tests use in-memory generated security inputs and local HTTP listeners. They do not create sample business data. Database-dependent requests require the service and a verified runtime account. Do not reuse development data for destructive test suites.

## Build and run

```sh
npm run build
npm start
```

The API entry point is `dist/server/server/src/index.js`. Serve the browser build separately, with `/api` routed to the backend under the same origin. Production requires HTTPS and `NODE_ENV=production`, deployment secrets, backups and process supervision. Vite preview is a local inspection command.

## XAMPP recovery

If MySQL stops or returns an Aria write error, inspect the configured data directory and its error log first. A normal restart using the existing XAMPP configuration may recover the service. Recheck table counts, runtime grants and migration status afterward. Database engine log deletion, table repair or changing the data directory requires a separate recovery plan and backup.

During foundation setup an Aria write error occurred while creating the application account. A normal restart of the existing configured service restored access, and the account setup was then retried successfully. No engine log files were deleted or rewritten by project scripts.

## Isolated integration verification

The check command runs tests against a randomly named local travneeds_crm_test_ database using the existing migration identity. It creates no additional MySQL accounts or grants, never inserts test fixtures into travneeds_crm, and removes the test database after the run. A local non-production MySQL server and migration credentials are required.
