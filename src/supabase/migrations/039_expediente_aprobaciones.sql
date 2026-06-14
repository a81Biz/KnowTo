-- 039_expediente_aprobaciones.sql
-- Audit trail table for F4 product approvals.
-- Each approval generates a deterministic folio: DCFL-{hash8}-{seq:3}.

CREATE TABLE IF NOT EXISTS expediente_aprobaciones (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  folio            TEXT        NOT NULL,
  fase             TEXT        NOT NULL,
  aprobado_por     TEXT        NOT NULL,
  cargo            TEXT,
  fecha_aprobacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  observaciones    TEXT,
  documento_md     TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expediente_project_id
  ON expediente_aprobaciones (project_id);

CREATE INDEX IF NOT EXISTS idx_expediente_project_fase
  ON expediente_aprobaciones (project_id, fase);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE expediente_aprobaciones TO anon, authenticated, service_role;
