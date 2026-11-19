-- Keep large media out of MySQL packets while existing blob rows remain readable.
ALTER TABLE quotation_media
  MODIFY content LONGBLOB NULL,
  ADD COLUMN IF NOT EXISTS storage_key VARCHAR(80) NULL;
