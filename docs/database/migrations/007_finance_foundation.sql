CREATE TABLE IF NOT EXISTS finance_sources (
  code VARCHAR(20) PRIMARY KEY,
  status ENUM('pending', 'connected') NOT NULL DEFAULT 'pending',
  connected_at DATETIME(6) NULL,
  CHECK ((status = 'pending' AND connected_at IS NULL) OR (status = 'connected' AND connected_at IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO finance_sources (code, status) VALUES ('trips', 'pending');

CREATE TABLE IF NOT EXISTS finance_booking_accounts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  source_code VARCHAR(20) NOT NULL,
  source_booking_key VARCHAR(128) NOT NULL,
  booking_reference VARCHAR(80) NOT NULL,
  customer_id BIGINT UNSIGNED NULL,
  customer_name VARCHAR(160) NOT NULL,
  agent_id CHAR(36) NULL,
  service_category VARCHAR(100) NULL,
  currency CHAR(3) NOT NULL,
  total_amount DECIMAL(18,2) NOT NULL,
  deposit_amount DECIMAL(18,2) NULL,
  supplier_cost_total DECIMAL(18,2) NULL,
  total_cost DECIMAL(18,2) NULL,
  due_on DATE NULL,
  booked_at DATETIME(6) NOT NULL,
  synchronized_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_finance_source_booking (source_code, source_booking_key),
  UNIQUE KEY uq_finance_booking_currency (id, currency),
  INDEX idx_finance_booking_date (currency, booked_at, id),
  FOREIGN KEY (source_code) REFERENCES finance_sources(code),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (agent_id) REFERENCES users(id),
  CHECK (total_amount >= 0),
  CHECK (deposit_amount IS NULL OR (deposit_amount >= 0 AND deposit_amount <= total_amount)),
  CHECK (supplier_cost_total IS NULL OR supplier_cost_total >= 0),
  CHECK (total_cost IS NULL OR total_cost >= 0),
  CHECK (total_cost IS NULL OR supplier_cost_total IS NULL OR total_cost >= supplier_cost_total)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS finance_booking_suppliers (
  booking_id BIGINT UNSIGNED NOT NULL,
  supplier_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (booking_id, supplier_id),
  FOREIGN KEY (booking_id) REFERENCES finance_booking_accounts(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS finance_invoices (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT UNSIGNED NOT NULL,
  source_document_key VARCHAR(128) NULL UNIQUE,
  invoice_number VARCHAR(100) NULL UNIQUE,
  party ENUM('customer', 'supplier') NOT NULL,
  supplier_id BIGINT UNSIGNED NULL,
  bill_to VARCHAR(160) NOT NULL,
  kind ENUM('standard', 'corporate', 'proforma', 'deposit', 'credit_note', 'supplier') NOT NULL,
  status ENUM('draft', 'issued', 'void') NOT NULL DEFAULT 'draft',
  currency CHAR(3) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  issued_on DATE NULL,
  due_on DATE NULL,
  payment_terms VARCHAR(120) NULL,
  notes TEXT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_finance_invoice_booking_currency (id, booking_id, currency),
  INDEX idx_finance_invoice_booking (booking_id, id),
  FOREIGN KEY (booking_id, currency) REFERENCES finance_booking_accounts(id, currency),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  CHECK (amount >= 0),
  CHECK (party <> 'supplier' OR supplier_id IS NOT NULL),
  CHECK (status <> 'issued' OR (invoice_number IS NOT NULL AND issued_on IS NOT NULL)),
  CHECK (due_on IS NULL OR issued_on IS NULL OR due_on >= issued_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS finance_payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT UNSIGNED NOT NULL,
  invoice_id BIGINT UNSIGNED NULL,
  source_payment_key VARCHAR(128) NULL UNIQUE,
  supplier_id BIGINT UNSIGNED NULL,
  purpose ENUM('customer_receipt', 'customer_refund', 'supplier_payment', 'supplier_refund') NOT NULL,
  status ENUM('pending', 'verified', 'void') NOT NULL DEFAULT 'pending',
  currency CHAR(3) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  method VARCHAR(40) NOT NULL,
  reference VARCHAR(128) NULL,
  settled_on DATE NULL,
  processed_by CHAR(36) NULL,
  notes TEXT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_finance_payment_booking (booking_id, status, id),
  FOREIGN KEY (booking_id, currency) REFERENCES finance_booking_accounts(id, currency),
  FOREIGN KEY (invoice_id, booking_id, currency) REFERENCES finance_invoices(id, booking_id, currency),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (processed_by) REFERENCES users(id),
  CHECK (amount > 0),
  CHECK (status <> 'verified' OR settled_on IS NOT NULL),
  CHECK (purpose NOT IN ('supplier_payment', 'supplier_refund') OR supplier_id IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
