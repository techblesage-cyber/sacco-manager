-- ============================================================
-- SACCO MANAGEMENT FEATURES
-- Constitution / SACCO Information
-- Announcements
-- ============================================================

CREATE TABLE IF NOT EXISTS sacco_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  title text NOT NULL,
  description text,

  content text,

  file_name text,
  file_url text,
  file_type text,

  version integer NOT NULL DEFAULT 1,

  published boolean NOT NULL DEFAULT true,

  uploaded_by uuid NOT NULL REFERENCES users(id),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT sacco_documents_content_or_file
    CHECK (
      NULLIF(trim(content), '') IS NOT NULL
      OR NULLIF(trim(file_url), '') IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_sacco_documents_org
  ON sacco_documents(organization_id);

CREATE INDEX IF NOT EXISTS idx_sacco_documents_published
  ON sacco_documents(organization_id, published);


-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  title text NOT NULL,
  message text NOT NULL,

  media_type text NOT NULL DEFAULT 'NONE'
    CHECK (media_type IN ('NONE', 'IMAGE', 'VIDEO')),

  media_url text,

  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,

  active boolean NOT NULL DEFAULT true,

  created_by uuid NOT NULL REFERENCES users(id),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT announcements_expiry_after_start
    CHECK (
      expires_at IS NULL
      OR expires_at > starts_at
    ),

  CONSTRAINT announcements_media_consistency
    CHECK (
      (media_type = 'NONE' AND media_url IS NULL)
      OR
      (media_type IN ('IMAGE', 'VIDEO') AND media_url IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_announcements_org_dates
  ON announcements(
    organization_id,
    starts_at,
    expires_at
  );

CREATE INDEX IF NOT EXISTS idx_announcements_active
  ON announcements(
    organization_id,
    active
  );