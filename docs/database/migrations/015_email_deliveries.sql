CREATE TABLE IF NOT EXISTS email_deliveries (
  id CHAR(36) PRIMARY KEY,
  quotation_share_id CHAR(36) NOT NULL,
  actor_id CHAR(36) NOT NULL,
  request_key CHAR(36) NOT NULL UNIQUE,
  request_digest CHAR(64) NOT NULL,
  recipient_email VARCHAR(254) NOT NULL,
  subject VARCHAR(240) NOT NULL,
  status ENUM('sending','sent','failed','unknown') NOT NULL,
  provider_id VARCHAR(254) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  finished_at DATETIME(6) NULL,
  FOREIGN KEY (quotation_share_id) REFERENCES quotation_shares(id),
  FOREIGN KEY (actor_id) REFERENCES users(id),
  INDEX idx_email_actor_created (actor_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
