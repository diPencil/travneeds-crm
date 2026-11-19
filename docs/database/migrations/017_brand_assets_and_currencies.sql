CREATE TABLE IF NOT EXISTS project_brand_assets (
  id CHAR(36) PRIMARY KEY,
  kind ENUM('logo','favicon') NOT NULL,
  extension VARCHAR(5) NOT NULL,
  mime_type VARCHAR(32) NOT NULL,
  content MEDIUMBLOB NOT NULL,
  uploaded_by CHAR(36) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  FOREIGN KEY (uploaded_by) REFERENCES users(id),
  CHECK (OCTET_LENGTH(content) BETWEEN 1 AND 524288)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_currencies (
  code CHAR(3) PRIMARY KEY,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO project_currencies (code) SELECT base_currency FROM project_settings;
INSERT IGNORE INTO project_currencies (code) SELECT base_currency FROM currency_rates;
INSERT IGNORE INTO project_currencies (code) SELECT quote_currency FROM currency_rates;
