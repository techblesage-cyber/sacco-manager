-- SACCO DOCUMENTS & FORMS

CREATE TABLE IF NOT EXISTS document_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS organization_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id uuid NOT NULL
    REFERENCES organizations(id)
    ON DELETE CASCADE,

  category_id uuid
    REFERENCES document_categories(id)
    ON DELETE SET NULL,

  title text NOT NULL,

  description text,

  document_type text NOT NULL
    CHECK (
      document_type IN (
        'PDF',
        'DOC',
        'DOCX',
        'TEXT'
      )
    ),

  file_name text,

  file_url text,

  content text,

  version integer NOT NULL DEFAULT 1
    CHECK (version > 0),

  published boolean NOT NULL DEFAULT false,

  published_at timestamptz,

  uploaded_by uuid NOT NULL
    REFERENCES users(id),

  created_at timestamptz NOT NULL DEFAULT now(),

  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT organization_documents_source_check
    CHECK (
      NULLIF(trim(content), '') IS NOT NULL
      OR NULLIF(trim(file_url), '') IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_org_documents_org
  ON organization_documents(organization_id);

CREATE INDEX IF NOT EXISTS idx_org_documents_category
  ON organization_documents(organization_id, category_id);

CREATE INDEX IF NOT EXISTS idx_org_documents_published
  ON organization_documents(
    organization_id,
    published,
    created_at DESC
  );

CREATE INDEX IF NOT EXISTS idx_document_categories_org
  ON document_categories(organization_id, active);

-- Default document categories for each existing SACCO.
INSERT INTO document_categories (
  organization_id,
  name,
  description
)
SELECT
  o.id,
  c.name,
  c.description
FROM organizations o
CROSS JOIN (
  VALUES
    ('Constitution', 'SACCO constitution and governing documents'),
    ('Loan Forms', 'Loan applications, agreements and related forms'),
    ('Membership Forms', 'Membership registration and member service forms'),
    ('Savings & Shares', 'Savings and share-related forms'),
    ('Policies', 'SACCO policies and guidelines'),
    ('Notices', 'Official notices and member communications'),
    ('General', 'Other official SACCO documents')
) AS c(name, description)
ON CONFLICT (organization_id, name) DO NOTHING;