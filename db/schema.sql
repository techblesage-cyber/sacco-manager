CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  currency char(3) NOT NULL DEFAULT 'UGX',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  member_no text NOT NULL,
  first_name text NOT NULL,
  middle_name text,
  last_name text NOT NULL,
  phone text,
  email text,
  join_date date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','SUSPENDED','EXITED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, member_no)
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  member_id uuid REFERENCES members(id),
  username text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('MEMBER','TELLER','LOAN_OFFICER','APPROVER','TREASURER','ADMINISTRATOR','SUPER_ADMINISTRATOR')),
  active boolean NOT NULL DEFAULT true,
  must_change_password boolean NOT NULL DEFAULT false,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, username)
);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS savings_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  member_id uuid NOT NULL REFERENCES members(id),
  account_no text NOT NULL,
  product_name text NOT NULL DEFAULT 'Savings',
  balance numeric(18,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','CLOSED','FROZEN')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, account_no)
);

CREATE TABLE IF NOT EXISTS savings_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  member_id uuid NOT NULL REFERENCES members(id),
  savings_account_id uuid NOT NULL REFERENCES savings_accounts(id),
  txn_no text NOT NULL UNIQUE,
  txn_type text NOT NULL CHECK (txn_type IN ('DEPOSIT','WITHDRAWAL','REVERSAL')),
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  posted_at timestamptz NOT NULL DEFAULT now(),
  reference text,
  description text,
  entered_by uuid NOT NULL REFERENCES users(id),
  reversal_of uuid REFERENCES savings_transactions(id),
  complaint_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shares_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  member_id uuid NOT NULL REFERENCES members(id),
  shares_count integer NOT NULL DEFAULT 0 CHECK (shares_count >= 0),
  share_value numeric(18,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, member_id)
);

CREATE TABLE IF NOT EXISTS loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  member_id uuid NOT NULL REFERENCES members(id),
  loan_no text NOT NULL UNIQUE,
  product_name text NOT NULL,
  principal numeric(18,2) NOT NULL CHECK (principal > 0),
  annual_rate numeric(8,4) NOT NULL CHECK (annual_rate >= 0),
  term_months integer NOT NULL CHECK (term_months > 0),
  interest_method text NOT NULL CHECK (interest_method IN ('FLAT','REDUCING_EMI','REDUCING_EQUAL_PRINCIPAL')),
  status text NOT NULL DEFAULT 'APPLICATION' CHECK (status IN ('APPLICATION','APPROVED','DISBURSED','ACTIVE','COMPLETED','REJECTED','WRITTEN_OFF')),
  applied_at timestamptz NOT NULL DEFAULT now(),
  disbursed_at timestamptz,
  outstanding_principal numeric(18,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loan_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  installment_no integer NOT NULL,
  due_date date NOT NULL,
  principal_due numeric(18,2) NOT NULL,
  interest_due numeric(18,2) NOT NULL,
  total_due numeric(18,2) NOT NULL,
  principal_paid numeric(18,2) NOT NULL DEFAULT 0,
  interest_paid numeric(18,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'PENDING',
  UNIQUE (loan_id, installment_no)
);

CREATE TABLE IF NOT EXISTS loan_repayments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  member_id uuid NOT NULL REFERENCES members(id),
  loan_id uuid NOT NULL REFERENCES loans(id),
  txn_no text NOT NULL UNIQUE,
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  principal_amount numeric(18,2) NOT NULL DEFAULT 0,
  interest_amount numeric(18,2) NOT NULL DEFAULT 0,
  penalty_amount numeric(18,2) NOT NULL DEFAULT 0,
  posted_at timestamptz NOT NULL DEFAULT now(),
  entered_by uuid NOT NULL REFERENCES users(id),
  reversal_of uuid REFERENCES loan_repayments(id)
);

CREATE TABLE IF NOT EXISTS guarantors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  guarantor_member_id uuid NOT NULL REFERENCES members(id),
  guaranteed_amount numeric(18,2) NOT NULL CHECK (guaranteed_amount > 0),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','DECLINED','RELEASED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (loan_id, guarantor_member_id)
);

CREATE TABLE IF NOT EXISTS complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  member_id uuid NOT NULL REFERENCES members(id),
  reference_no text NOT NULL UNIQUE,
  category text NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  related_transaction_id uuid,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_REVIEW','RESOLVED','REJECTED')),
  response text,
  responded_by uuid REFERENCES users(id),
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  actor_user_id uuid REFERENCES users(id),
  event_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  ip_address inet,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_members_org_name ON members(organization_id, last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_savings_tx_member_date ON savings_transactions(member_id, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_loan_member_status ON loans(member_id, status);
CREATE INDEX IF NOT EXISTS idx_complaints_member_status ON complaints(member_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_org_date ON audit_events(organization_id, created_at DESC);
