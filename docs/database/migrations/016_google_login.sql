CREATE TABLE IF NOT EXISTS google_staff_identities (
  user_id CHAR(36) PRIMARY KEY,
  client_id VARCHAR(180) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  subject VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  linked_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_google_subject (client_id,subject),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS google_oauth_flows (
  state_digest CHAR(64) PRIMARY KEY,
  browser_digest CHAR(64) NOT NULL,
  verifier CHAR(43) NOT NULL,
  nonce CHAR(43) NOT NULL,
  client_id VARCHAR(180) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  user_id CHAR(36) NULL,
  session_digest CHAR(64) NULL,
  expires_at DATETIME(6) NOT NULL,
  INDEX idx_google_flow_expiry (expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
