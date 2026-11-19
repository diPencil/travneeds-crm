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

Mutating requests require the configured `Origin`. Authenticated mutations also require `X-CSRF-Token` matching the session. API bodies are limited to 16KB. SQL errors, hashes, cookies and raw serials are excluded from API output. Serial/activation endpoints remain unimplemented. User/role changes are restricted to administrator routes below.

## Restored account and notification APIs

| Method | Route | Authorization | Behavior |
| --- | --- | --- | --- |
| GET | /api/dashboard | Session | Returns visible quotation and non-cancelled booking counts, confirmed and completed booking counts, UTC trends, company CRM counts, assigned follow-ups and the latest six incoming messages visible in Inbox. Confirmed and completed booking value is grouped by currency and available to administrators. |
| PATCH | /api/account/profile | Session, Origin, CSRF | Updates account name/email/phone/avatar with version checking and an audit event |
| GET | /api/notifications | Session | Lists the latest 100 owned notifications and total unread count |
| POST | /api/notifications/read-all | Session, Origin, CSRF | Persists read status for the current user's notifications |
| POST | /api/notifications/:id/read | Session, Origin, CSRF | Marks an owned notification read |
| DELETE | /api/notifications/:id | Session, Origin, CSRF | Soft-deletes an owned notification |

Profile writes require fullName, email, phone, avatarGender (male/female) and version. Unknown fields, including role and userId, are rejected. PROFILE_CONFLICT reports a stale profile version. EMAIL_IN_USE reports a duplicate email. Role and department are displayed independently from editable profile fields.

Personal audit responses now include entityType and entityId. The activity filter searches only the current user's returned events. The public landing route has been removed.

Detailed restored module contracts: [User Management and CRM](core-modules-api.md).

## Finance API

See [Finance API](finance-api.md) for the administrator-only booking, invoice and report read contracts. Financial posting remains unavailable pending Trips integration.

## Travel and communications

See [travel and communications](travel-communications.md) for API routes, provider setup, delivery semantics and data boundaries.
