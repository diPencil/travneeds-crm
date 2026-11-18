CREATE TABLE IF NOT EXISTS roles (
  code VARCHAR(20) PRIMARY KEY,
  CONSTRAINT chk_role_code CHECK (code IN ('admin', 'employee'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  full_name VARCHAR(160) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_roles (
  user_id CHAR(36) NOT NULL,
  role_code VARCHAR(20) NOT NULL,
  PRIMARY KEY (user_id, role_code),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_role FOREIGN KEY (role_code) REFERENCES roles(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash CHAR(64) PRIMARY KEY,
  csrf_token CHAR(64) NOT NULL,
  user_id CHAR(36) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  expires_at DATETIME(6) NOT NULL,
  INDEX idx_sessions_expiry (expires_at),
  INDEX idx_sessions_user (user_id),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_id CHAR(36) NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_audit_actor_time (actor_id, created_at),
  INDEX idx_audit_entity_time (entity_type, entity_id, created_at),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_settings (
  id TINYINT UNSIGNED PRIMARY KEY,
  project_name VARCHAR(100) NOT NULL,
  primary_color CHAR(7) NOT NULL,
  logo_url VARCHAR(255) NOT NULL,
  favicon_url VARCHAR(255) NOT NULL,
  base_currency CHAR(3) NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT chk_settings_singleton CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS currency_rates (
  base_currency CHAR(3) NOT NULL,
  quote_currency CHAR(3) NOT NULL,
  rate DECIMAL(20,8) NOT NULL,
  effective_at DATETIME(6) NOT NULL,
  source VARCHAR(160) NOT NULL,
  updated_by CHAR(36) NOT NULL,
  PRIMARY KEY (base_currency, quote_currency),
  CONSTRAINT chk_currency_rate CHECK (rate > 0 AND base_currency <> quote_currency),
  CONSTRAINT fk_currency_author FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS installation_license (
  id TINYINT UNSIGNED PRIMARY KEY,
  status ENUM('inactive', 'active', 'expired') NOT NULL DEFAULT 'inactive',
  plan ENUM('monthly', 'annual') NULL,
  serial_digest CHAR(64) NULL,
  activated_at DATETIME(6) NULL,
  expires_at DATETIME(6) NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT chk_license_singleton CHECK (id = 1),
  CONSTRAINT chk_active_license CHECK (status <> 'active' OR (plan IS NOT NULL AND serial_digest IS NOT NULL AND activated_at IS NOT NULL AND expires_at > activated_at))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO roles (code) VALUES ('admin'), ('employee');
INSERT IGNORE INTO project_settings (id, project_name, primary_color, logo_url, favicon_url, base_currency)
VALUES (1, 'Travneeds CRM', '#2563EB', '/logo.png', '/favicon.svg', 'USD');
INSERT IGNORE INTO installation_license (id) VALUES (1);
