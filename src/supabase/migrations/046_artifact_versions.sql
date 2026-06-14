-- 046_artifact_versions.sql
-- Certification Canonical Model (CCM) — PT-069
-- Immutable audit trail of all CertificationArtifact versions per product per project.
-- Source of truth for certification state. fase4_productos.datos_certificacion is a projection.

CREATE TABLE IF NOT EXISTS artifact_versions (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  product_code              VARCHAR(10) NOT NULL,   -- 'P1'..'P8', 'F3'
  version                   INT         NOT NULL DEFAULT 1,
  artifact                  JSONB       NOT NULL,   -- CertificationArtifact typed object
  documento_md              TEXT,                   -- rendered Markdown from render(artifact)
  prompt_template_id        VARCHAR(100),
  prompt_template_version   VARCHAR(50),
  -- SHA-256(template_id + '|' + template_version) — NOT hash of rendered text
  prompt_hash               VARCHAR(64),
  model                     VARCHAR(100),
  generated_by              UUID REFERENCES profiles(id),
  cert_score                JSONB,                  -- CertificationScore (6-axis)
  correction_log            JSONB,                  -- CorrectionLog | null
  -- Points to the artifact this version was derived from (auto-corrections only)
  derived_from_artifact_id  UUID REFERENCES artifact_versions(id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active                 BOOLEAN     NOT NULL DEFAULT TRUE,

  UNIQUE (project_id, product_code, version)
);

-- Fast lookup of the active artifact for a product without scanning history
CREATE INDEX IF NOT EXISTS idx_av_active
  ON artifact_versions (project_id, product_code)
  WHERE is_active = TRUE;

-- History scan (all versions for a product, newest first)
CREATE INDEX IF NOT EXISTS idx_av_history
  ON artifact_versions (project_id, product_code, version DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE artifact_versions ENABLE ROW LEVEL SECURITY;

-- Owners can read all versions of their projects' artifacts
CREATE POLICY "artifact_versions_select_own"
  ON artifact_versions FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Owners can insert new artifact versions for their projects
CREATE POLICY "artifact_versions_insert_own"
  ON artifact_versions FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Owners can update (deactivate) their own artifact versions
CREATE POLICY "artifact_versions_update_own"
  ON artifact_versions FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- ── Permissions ───────────────────────────────────────────────────────────────
GRANT ALL ON TABLE artifact_versions TO supabase_admin, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE artifact_versions TO authenticated;
