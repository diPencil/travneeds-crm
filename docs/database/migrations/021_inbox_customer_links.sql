CREATE TABLE IF NOT EXISTS inbox_customer_links (
  thread_id CHAR(36) PRIMARY KEY,
  customer_id BIGINT UNSIGNED NOT NULL,
  INDEX idx_inbox_link_customer (customer_id, thread_id),
  FOREIGN KEY (thread_id) REFERENCES inbox_threads(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
