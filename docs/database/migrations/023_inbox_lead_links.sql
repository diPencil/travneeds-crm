ALTER TABLE leads
  MODIFY COLUMN source ENUM('Website', 'Social Media', 'Referral', 'Email', 'Walk-in', 'Cold Call', 'Facebook Messenger', 'Instagram', 'WhatsApp') NOT NULL,
  MODIFY COLUMN created_by CHAR(36) NULL;

CREATE TABLE IF NOT EXISTS inbox_lead_links (
  thread_id CHAR(36) PRIMARY KEY,
  lead_id BIGINT UNSIGNED NOT NULL,
  INDEX idx_inbox_link_lead (lead_id, thread_id),
  FOREIGN KEY (thread_id) REFERENCES inbox_threads(id),
  FOREIGN KEY (lead_id) REFERENCES leads(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
