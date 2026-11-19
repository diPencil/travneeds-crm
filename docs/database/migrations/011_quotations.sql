CREATE TABLE IF NOT EXISTS quotations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reference VARCHAR(40) NOT NULL UNIQUE,
  customer_id BIGINT UNSIGNED NULL,
  created_by CHAR(36) NOT NULL,
  status ENUM('draft','ready','sent','accepted','declined','expired','booked') NOT NULL DEFAULT 'draft',
  trip_type VARCHAR(32) NOT NULL,
  currency CHAR(3) NOT NULL,
  total DECIMAL(18,2) NULL,
  current_version INT UNSIGNED NOT NULL DEFAULT 1,
  valid_until DATE NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_quotation_owner (created_by,updated_at),
  INDEX idx_quotation_customer (customer_id,status),
  CHECK (total IS NULL OR total>=0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quotation_revisions (
  quotation_id BIGINT UNSIGNED NOT NULL,
  version INT UNSIGNED NOT NULL,
  content_json LONGTEXT NOT NULL,
  price_json LONGTEXT NULL,
  context_json LONGTEXT NOT NULL,
  request_key CHAR(36) NOT NULL UNIQUE,
  request_digest CHAR(64) NOT NULL,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (quotation_id,version),
  FOREIGN KEY (quotation_id) REFERENCES quotations(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  CHECK (JSON_VALID(content_json) AND JSON_VALID(context_json)),
  CHECK (price_json IS NULL OR JSON_VALID(price_json))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quotation_media (
  id CHAR(36) PRIMARY KEY,
  mime_type VARCHAR(40) NOT NULL,
  byte_size INT UNSIGNED NOT NULL,
  content LONGBLOB NOT NULL,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  FOREIGN KEY (created_by) REFERENCES users(id),
  CHECK (byte_size>0 AND byte_size<=8388608)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quotation_shares (
  id CHAR(36) PRIMARY KEY,
  quotation_id BIGINT UNSIGNED NOT NULL,
  quotation_version INT UNSIGNED NOT NULL,
  token_digest CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME(6) NOT NULL,
  revoked_at DATETIME(6) NULL,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  FOREIGN KEY (quotation_id,quotation_version) REFERENCES quotation_revisions(quotation_id,version),
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_quotation_share (quotation_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
