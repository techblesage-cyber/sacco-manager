ALTER TABLE organization_settings
  ADD COLUMN IF NOT EXISTS share_price numeric(18,2) CHECK (share_price IS NULL OR share_price > 0);
