CREATE TABLE IF NOT EXISTS organization_settings (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  display_name text,
  primary_color text NOT NULL DEFAULT '#0f766e' CHECK (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  accent_color  text NOT NULL DEFAULT '#f59e0b' CHECK (accent_color  ~ '^#[0-9a-fA-F]{6}$'),
  logo_data bytea,
  logo_mime text,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO organization_settings(organization_id) SELECT id FROM organizations ON CONFLICT DO NOTHING;

ALTER TABLE members ADD COLUMN IF NOT EXISTS photo_data bytea;
ALTER TABLE members ADD COLUMN IF NOT EXISTS photo_mime text;

CREATE TABLE IF NOT EXISTS member_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loan_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  annual_rate numeric(8,4) NOT NULL CHECK (annual_rate >= 0),
  interest_method text NOT NULL CHECK (interest_method IN ('FLAT','REDUCING_EMI','REDUCING_EQUAL_PRINCIPAL')),
  min_amount numeric(18,2) NOT NULL DEFAULT 0,
  max_amount numeric(18,2),
  max_term_months integer NOT NULL DEFAULT 12 CHECK (max_term_months > 0),
  min_guarantors integer NOT NULL DEFAULT 1 CHECK (min_guarantors >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

ALTER TABLE loans DROP CONSTRAINT IF EXISTS loans_status_check;
ALTER TABLE loans ADD CONSTRAINT loans_status_check CHECK (status IN
  ('APPLICATION','PENDING_GUARANTORS','PENDING_APPROVAL','APPROVED','DISBURSED','ACTIVE','COMPLETED','REJECTED','WRITTEN_OFF'));
ALTER TABLE loans ADD COLUMN IF NOT EXISTS purpose text;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS decided_by uuid REFERENCES users(id);
ALTER TABLE loans ADD COLUMN IF NOT EXISTS decided_at timestamptz;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS decision_note text;

CREATE TABLE IF NOT EXISTS share_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  member_id uuid NOT NULL REFERENCES members(id),
  txn_no text NOT NULL UNIQUE,
  txn_type text NOT NULL CHECK (txn_type IN ('PURCHASE','REVERSAL')),
  shares_count integer NOT NULL CHECK (shares_count > 0),
  unit_value numeric(18,2) NOT NULL CHECK (unit_value > 0),
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  posted_at timestamptz NOT NULL DEFAULT now(),
  entered_by uuid NOT NULL REFERENCES users(id),
  reversal_of uuid REFERENCES share_transactions(id)
);
CREATE INDEX IF NOT EXISTS idx_share_tx_member ON share_transactions(member_id, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_guarantors_member_status ON guarantors(guarantor_member_id, status);
