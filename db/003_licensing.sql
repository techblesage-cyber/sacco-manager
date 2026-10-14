ALTER TABLE organizations ADD COLUMN IF NOT EXISTS licence_expires_at timestamptz;

CREATE TABLE IF NOT EXISTS activation_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash text NOT NULL UNIQUE,
  label text NOT NULL,
  valid_months integer NOT NULL DEFAULT 12 CHECK (valid_months > 0),
  status text NOT NULL DEFAULT 'UNUSED' CHECK (status IN ('UNUSED', 'USED', 'REVOKED')),
  organization_id uuid REFERENCES organizations(id),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
