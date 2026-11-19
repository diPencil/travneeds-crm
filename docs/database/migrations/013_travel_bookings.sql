ALTER TABLE finance_booking_accounts ADD COLUMN IF NOT EXISTS is_reporting BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS travel_bookings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  quotation_id BIGINT UNSIGNED NOT NULL UNIQUE,
  quotation_version INT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  finance_id BIGINT UNSIGNED NOT NULL UNIQUE,
  owner_id CHAR(36) NOT NULL,
  created_by CHAR(36) NOT NULL,
  request_key CHAR(36) NOT NULL UNIQUE,
  status ENUM('pending','confirmed','completed','cancelled') NOT NULL DEFAULT 'pending',
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX idx_travel_bookings_owner (owner_id, id),
  INDEX idx_travel_bookings_customer (customer_id, status, id),
  FOREIGN KEY (quotation_id, quotation_version) REFERENCES quotation_revisions(quotation_id, version),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (finance_id) REFERENCES finance_booking_accounts(id),
  FOREIGN KEY (owner_id) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

UPDATE finance_sources SET status='connected', connected_at=UTC_TIMESTAMP(6)
WHERE code='trips' AND status='pending';
