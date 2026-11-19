CREATE TABLE IF NOT EXISTS travel_catalogue (
  id CHAR(36) PRIMARY KEY,
  kind ENUM('destinations','multi-day-categories','hotels','rooms','meals','amenities','travel-add-ons') NOT NULL,
  hotel_id CHAR(36) NULL,
  scope_key VARCHAR(36) NOT NULL DEFAULT '',
  name_en VARCHAR(200) NOT NULL,
  name_ar VARCHAR(200) NOT NULL,
  en_key CHAR(64) NULL,
  ar_key CHAR(64) NULL,
  slug VARCHAR(80) NULL,
  details LONGTEXT NOT NULL CHECK(JSON_VALID(details)),
  version INT UNSIGNED NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_travel_catalogue_en (kind,scope_key,en_key),
  UNIQUE KEY uq_travel_catalogue_ar (kind,scope_key,ar_key),
  UNIQUE KEY uq_travel_catalogue_slug (kind,slug),
  INDEX idx_travel_catalogue_hotel (hotel_id,active),
  FOREIGN KEY (hotel_id) REFERENCES travel_catalogue(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  CHECK ((kind='rooms' AND hotel_id IS NOT NULL AND scope_key=hotel_id) OR (kind<>'rooms' AND hotel_id IS NULL AND scope_key=''))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS travel_catalogue_media (
  entry_id CHAR(36) NOT NULL,
  media_id CHAR(36) NOT NULL,
  PRIMARY KEY (entry_id,media_id),
  INDEX idx_catalogue_media (media_id),
  FOREIGN KEY (entry_id) REFERENCES travel_catalogue(id),
  FOREIGN KEY (media_id) REFERENCES quotation_media(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS travel_hotel_options (
  hotel_id CHAR(36) NOT NULL,
  option_id CHAR(36) NOT NULL,
  PRIMARY KEY (hotel_id,option_id),
  FOREIGN KEY (hotel_id) REFERENCES travel_catalogue(id),
  FOREIGN KEY (option_id) REFERENCES travel_catalogue(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
