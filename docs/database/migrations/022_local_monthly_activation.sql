ALTER TABLE installation_license ADD COLUMN IF NOT EXISTS serial_suffix CHAR(6) NULL;
