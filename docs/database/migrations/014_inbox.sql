CREATE TABLE IF NOT EXISTS inbox_threads (
  id CHAR(36) PRIMARY KEY,
  channel ENUM('web','messenger','instagram','whatsapp') NOT NULL,
  account_key VARCHAR(80) NOT NULL,
  contact_key VARCHAR(100) NOT NULL,
  contact_name VARCHAR(180) NOT NULL,
  quotation_share_id CHAR(36) NULL UNIQUE,
  owner_id CHAR(36) NULL,
  status ENUM('open','closed') NOT NULL DEFAULT 'open',
  last_message_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  last_inbound_at DATETIME(6) NULL,
  UNIQUE KEY uq_inbox_channel_contact (channel,account_key,contact_key),
  INDEX idx_inbox_owner_time (owner_id,last_message_at),
  FOREIGN KEY (quotation_share_id) REFERENCES quotation_shares(id),
  FOREIGN KEY (owner_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inbox_messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  thread_id CHAR(36) NOT NULL,
  actor_id CHAR(36) NULL,
  direction ENUM('incoming','outgoing') NOT NULL,
  body TEXT NOT NULL,
  delivery ENUM('received','sending','sent','failed','unknown','delivered','read') NOT NULL,
  client_key CHAR(36) NULL UNIQUE,
  provider_key VARCHAR(190) CHARACTER SET ascii COLLATE ascii_bin NULL,
  read_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_inbox_provider_message (thread_id,provider_key),
  FOREIGN KEY (thread_id) REFERENCES inbox_threads(id),
  FOREIGN KEY (actor_id) REFERENCES users(id),
  INDEX idx_inbox_message_order (thread_id,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
