ALTER TABLE travel_catalogue ADD COLUMN IF NOT EXISTS price_currency CHAR(3) NULL;
ALTER TABLE travel_catalogue ADD COLUMN IF NOT EXISTS price_amount DECIMAL(18,2) NULL;
ALTER TABLE travel_catalogue ADD COLUMN IF NOT EXISTS cost_amount DECIMAL(18,2) NULL;
