ALTER TABLE users ADD COLUMN IF NOT EXISTS version INT UNSIGNED NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at DATETIME(6) NULL;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS job_title VARCHAR(120) NULL;

CREATE TABLE IF NOT EXISTS user_invitations (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(254) NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  role_code VARCHAR(20) NOT NULL,
  avatar_gender ENUM('male', 'female') NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  invited_by CHAR(36) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  expires_at DATETIME(6) NOT NULL,
  accepted_at DATETIME(6) NULL,
  revoked_at DATETIME(6) NULL,
  INDEX idx_invitation_email (email),
  FOREIGN KEY (role_code) REFERENCES roles(code),
  FOREIGN KEY (invited_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
