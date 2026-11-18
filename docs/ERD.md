# Database model

Database is `travneeds_crm`. Local XAMPP reports MariaDB 10.4.32. The schema uses MySQL-compatible InnoDB tables, utf8mb4 text, foreign keys and explicit constraints. Initial migration is `docs/database/migrations/001_foundation.sql`.

## Implemented foundation

```mermaid
erDiagram
  users ||--o{ user_roles : has
  roles ||--o{ user_roles : assigns
  users ||--o{ auth_sessions : authenticates
  users o|--o{ audit_events : performs
  users ||--o{ currency_rates : records

  users {
    char36 id PK
    varchar254 email UK
    varchar160 full_name
    varchar255 password_hash
    enum status
    datetime created_at
    datetime updated_at
  }
  roles {
    varchar20 code PK
  }
  user_roles {
    char36 user_id PK,FK
    varchar20 role_code PK,FK
  }
  auth_sessions {
    char64 token_hash PK
    char64 csrf_token
    char36 user_id FK
    datetime created_at
    datetime expires_at
  }
  audit_events {
    bigint id PK
    char36 actor_id FK
    varchar80 action
    varchar60 entity_type
    varchar64 entity_id
    datetime created_at
  }
  project_settings {
    tinyint id PK
    varchar100 project_name
    char7 primary_color
    varchar255 logo_url
    varchar255 favicon_url
    char3 base_currency
    int version
    datetime updated_at
  }
  currency_rates {
    char3 base_currency PK
    char3 quote_currency PK
    decimal20_8 rate
    datetime effective_at
    varchar160 source
    char36 updated_by FK
  }
  installation_license {
    tinyint id PK
    enum status
    enum plan
    char64 serial_digest
    datetime activated_at
    datetime expires_at
    datetime updated_at
  }
  schema_migrations {
    varchar100 version PK
    char64 checksum
    datetime applied_at
  }
```

## Constraints and state

| Table | Ownership and invariant |
| --- | --- |
| users | Authentication/user management. Unique email, UUID identifier, versioned password hash, active/disabled status |
| roles | Technical codes `admin` and `employee` |
| user_roles | Composite primary key prevents duplicate assignments |
| auth_sessions | SHA-256 token digest, CSRF token, absolute 8-hour expiry, FK to user, expiry/user indexes |
| audit_events | Actual login, logout, bootstrap and settings events. Nullable actor preserves events if an account is removed |
| project_settings | Singleton id 1, optimistic version increments with each saved change |
| currency_rates | Positive DECIMAL(20,8), distinct base/quote currencies, real source and effective date, author FK |
| installation_license | Singleton id 1, starts inactive with nullable plan/digest/dates. An active record requires plan, digest and valid dates |
| schema_migrations | Immutable migration version and content checksum |

The migration inserts the two role codes, the actual default project identity, and an inactive license record. It inserts no users, sessions, exchange rates or business records. USD is the initial base-currency configuration and can be changed by an administrator.

Currency-rate ingestion/conversion, serial issuing, activation verification, renewal and license enforcement are deferred. No endpoint currently changes licensing status. The raw activation serial is absent from storage and application logs.

## Future module contracts

Leads, Customers, Suppliers, Bookings and Payments do not yet have tables in this foundation. Their fields and foreign keys will be derived from the selected source modules. The expected domain flow is a Lead associated with a Customer, booking ownership under a Customer, supplier participation in booked services, and payments linked to their booking/customer. Finance reports will read those persisted records once the contracts are implemented.

Each module integration must add a migration and update this diagram with the actual model. Preserve optional and historical relationships explicitly. Monetary values require DECIMAL, currency codes, transaction boundaries and ownership checks. No placeholder booking or payment schema is presented as an implemented workflow.

## Operations

Migrations use a database advisory lock, statement-by-statement execution and a checksum ledger. DDL implicitly commits on MariaDB, so an interrupted migration is rerun using idempotent statements. Never edit a migration after it has been applied. The runtime account uses DML permissions on this database. Schema and account setup use the separate operational credentials.
