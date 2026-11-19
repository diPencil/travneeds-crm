CREATE TABLE IF NOT EXISTS finance_invoice_customers (
  invoice_id BIGINT UNSIGNED PRIMARY KEY,
  customer_id BIGINT UNSIGNED NOT NULL,
  INDEX idx_finance_invoice_customer (customer_id, invoice_id),
  FOREIGN KEY (invoice_id) REFERENCES finance_invoices(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
