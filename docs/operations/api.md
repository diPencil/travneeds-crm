# API contracts

All routes use the `/api` prefix. JSON errors have the shape `{ "error": { "code": "ERROR_CODE" } }`. Responses use `Cache-Control: no-store`. The browser sends same-origin credentials through the Vite proxy during local development.

| Method | Route | Authorization | Behavior |
| --- | --- | --- | --- |
| GET | /api/health | Public | Checks database connectivity and the required migration, returns 200/503 |
| POST | /api/auth/login | Configured Origin, login rate limit | Validates credentials, creates a server-side session, sets HttpOnly cookie, returns user and CSRF token |
| GET | /api/auth/session | Session | Returns current database-backed identity and CSRF token |
| POST | /api/auth/logout | Session, configured Origin, CSRF | Revokes current session and records a logout event |
| GET | /api/settings/branding | Public | Returns project name, primary color and logo/favicon paths |
| GET | /api/settings | Session, admin | Returns project settings, stored exchange rates and license status |
| PATCH | /api/settings | Session, admin, configured Origin, CSRF | Validates and persists project settings, increments version and records an audit event |
| GET | /api/audit/mine | Session | Returns the latest 50 activity events owned by the current user |

## Settings write body

`projectName`, `primaryColor`, `logoUrl`, `faviconUrl`, `baseCurrency` and `version` are required. Unknown keys are rejected. Asset paths must refer to existing files within `public/`. Currency must be a supported three-letter code. A stale version returns 409 `SETTINGS_CONFLICT`. Re-read the current settings before retrying.

## Security boundaries

Login accepts `email` and `password` only. Invalid identities and passwords share a 401 `INVALID_CREDENTIALS` response. Login is limited to 10 requests per 15 minutes per IP for the current API process. The session expires after 8 hours. Server-side user status and roles are read for each session request.

Mutating requests require the configured `Origin`. Authenticated mutations also require `X-CSRF-Token` matching the session. API bodies are limited to 16KB. SQL errors, hashes, cookies and raw serials are excluded from API output. There is no endpoint for accepting a serial, issuing a license, changing a role or creating a user through the browser in the current foundation.
