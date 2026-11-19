# User Management and CRM API

All authenticated writes require configured Origin and session CSRF token. Unknown fields are rejected. See [common API boundaries](api.md).

## User Management

All `/api/users` routes require an administrator session.

| Method | Route | Behavior |
| --- | --- | --- |
| GET | /api/users | Account fields and real directory/session metrics |
| POST | /api/users | Creates user, role and profile atomically |
| PATCH | /api/users/:id | Updates account/profile/role/status with account version |
| POST | /api/users/:id/revoke-sessions | Revokes sessions; keepCurrent=true preserves the caller's current session |
| GET | /api/users/logs | Paged actual events with module/severity/search filters |
| GET | /api/users/logs/export | All filtered events, up to 10,000 |
| GET | /api/users/:id | User details, personal fields, sessions, capabilities, activity and metrics |
| POST | /api/users/:id/message | Persists an internal notification to an active account |
| GET | /api/users/invitations | Latest 200 invitations without token/digest |
| POST | /api/users/invitations | Creates a 72-hour invitation and returns its token once |
| DELETE | /api/users/invitations/:id | Revokes an unaccepted invitation |
| GET | /api/invitations/:token | Public usable invitation name and expiry |
| POST | /api/invitations/:token/accept | Origin-protected, single-use acceptance with password |

Account bodies require fullName, email, phone, department, jobTitle, role (admin/employee), avatarGender (male/female), status (active/disabled). Creation requires password (12–128 characters); update requires version. Passwords are hashed and never returned. Invitation creation accepts only fullName, email, role and avatarGender. No email is sent automatically. Public acceptance endpoints allow 20 requests per 15 minutes per IP.

Changing a role or disabling an account revokes its sessions. CANNOT_REVOKE_SELF, LAST_ADMIN and VERSION_CONFLICT are 409 safeguards. Last-login display falls back to actual login audit timestamps for pre-existing sessions. Account profile writes also advance users.version to protect concurrent administrator edits.

## CRM directories

Employees and administrators share the single-company directories. Only administrators can archive, restore or view archived records.

| Method | Route | Behavior |
| --- | --- | --- |
| GET | /api/crm/options | Active agent id/name, stored categories, configured currency |
| GET | /api/crm/:kind | Paginated directory and actual metrics |
| GET | /api/crm/:kind/:id | Persisted details |
| GET | /api/crm/customers/:id/file | Customer profile and scoped summary, verified net receipts grouped by currency for admins |
| GET | /api/crm/customers/:id/file/:section | Paginated timeline, leads, quotations, bookings, payments, invoices, inbox or emails, with the same ownership as each module |
| POST | /api/crm/:kind | Creates record with server-assigned creator |
| PATCH | /api/crm/:kind/:id | Complete validated details plus version |
| PATCH | /api/crm/:kind/:id/archive | Admin-only `{version, archived}`; reversible |
| POST | /api/crm/leads/:id/convert | `{version, customerId?}`; transactional, retry-safe conversion |

Kinds are the fixed allowlist leads/customers/suppliers. Query fields: search, status, type, source, agent, overdue=true/false, archived=true/false, page. Page size is 50. Metrics describe all nonarchived records independently of list filters. Lead new-today metrics use UTC. The UI exports the displayed page with CSV formula protection. Customer booking/spending and supplier operational metrics remain unavailable until those source workflows exist.

All record bodies require fullName, email, phone, company, notes and status. Leads additionally require source, type, priority, valueAmount, currency, assignedUserId and nextFollowUpAt. Customers require type, nationality and assignedUserId. Suppliers require category, contactName, country and city. Optional text is an empty string in write requests and NULL in storage. Follow-ups use UTC ISO timestamps; forms edit local time. Nonnegative decimal money is transported as text, with up to 13 integer/two fractional digits and a paired supported currency code. Conversion, creator, audit and archive fields cannot be supplied through record forms.

VERSION_CONFLICT rejects stale writes. RECORD_ARCHIVED prevents editing archived entries. EMAIL_IN_USE reports a duplicate customer email; conversion can instead link a selected existing customer. Conversion locks the lead and creates/links the customer in one audited transaction. A retry returns the same linked customer. Assignment changes create an owned notification in the record transaction; notifications refresh on focus and every 30 seconds while visible.
