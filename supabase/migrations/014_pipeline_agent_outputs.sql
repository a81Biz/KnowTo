-- 014_pipeline_agent_outputs.sql
-- Almacenamiento de outputs intermedios por agente del pipeline.
--
-- Propósito:
--   - Persistir el resultado de cada agente (research_a, synthesizer_research, etc.)
--     para que un job que falla a mitad pueda retomarse desde el último checkpoint.
--   - Permite inspección/debugging de outputs intermedios sin acceso al servidor.
--   - El sistema lee desde esta tabla cuando un output no está en memoria
--     (ej. retry de un job, o un agente cuyo predecesor fue cacheado).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Tabla principal
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pipeline_agent_outputs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      UUID        NOT NULL REFERENCES pipeline_jobs(id) ON DELETE CASCADE,
  agent_name  TEXT        NOT NULL,
  output      TEXT        NOT NULL,
  char_count  INT         GENERATED ALWAYS AS (length(output)) STORED,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Un job no puede tener dos outputs del mismo agente (UPSERT seguro en retry)
CREATE UNIQUE INDEX IF NOT EXISTS idx_pao_job_agent
  ON pipeline_agent_outputs(job_id, agent_name);

CREATE INDEX IF NOT EXISTS idx_pao_job_id
  ON pipeline_agent_outputs(job_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE pipeline_agent_outputs ENABLE ROW LEVEL SECURITY;

-- El backend (service_role) puede hacer todo
CREATE POLICY pao_service_all ON pipeline_agent_outputs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- El frontend (anon) solo puede leer
CREATE POLICY pao_anon_select ON pipeline_agent_outputs
  FOR SELECT TO anon
  USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Permisos de tabla
-- ─────────────────────────────────────────────────────────────────────────────

GRANT ALL    ON TABLE pipeline_agent_outputs TO service_role;
GRANT SELECT ON TABLE pipeline_agent_outputs TO anon;
GRANT SELECT ON TABLE pipeline_agent_outputs TO authenticated;
GRANT SELECT ON TABLE pipeline_agent_outputs TO postgres;
