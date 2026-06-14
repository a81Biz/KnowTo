-- 010_create_pipeline_jobs.sql
-- Tabla compartida para jobs asíncronos del pipeline.
--
-- Estrategia de notificación:
--   Dev + Prod: Supabase Realtime detecta cambios en `status` y notifica
--   al frontend directamente. El backend no necesita hacer nada extra.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Tabla principal
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pipeline_jobs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id      TEXT        NOT NULL,
  project_id   UUID        NOT NULL,
  step_id      UUID,
  phase_id     TEXT        NOT NULL,
  prompt_id    TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','running','completed','failed')),
  context      JSONB,
  user_inputs  JSONB,
  result       JSONB,
  progress     JSONB       DEFAULT '{"currentStep": null, "stepIndex": 0, "totalSteps": 0}'::jsonb,
  error        TEXT,
  user_id      UUID        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_status  ON pipeline_jobs(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_project ON pipeline_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_user    ON pipeline_jobs(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Trigger updated_at
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION _update_pipeline_jobs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pipeline_jobs_ts ON pipeline_jobs;
CREATE TRIGGER trg_pipeline_jobs_ts
BEFORE UPDATE ON pipeline_jobs
FOR EACH ROW EXECUTE FUNCTION _update_pipeline_jobs_timestamp();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2b. Permisos de tabla
--     BYPASSRLS no exime de los permisos a nivel de tabla.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Roles stub — creados si el init de supabase/postgres aún no los registró.
--    El init oficial del image los crea con sus atributos reales.
--    Estos stubs garantizan que las políticas de abajo no fallen.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- CRÍTICO: Supabase Realtime v2 ejecuta internamente:
  --   GRANT USAGE ON SCHEMA realtime TO postgres, anon, authenticated, service_role
  -- Si el rol 'postgres' no existe, la conexión de Realtime al tenant falla con
  -- "role postgres does not exist" y ningún canal de postgres_changes funcionará.
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    CREATE ROLE postgres SUPERUSER LOGIN PASSWORD 'postgres';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS — habilitado para que Supabase Realtime (REPLICATION_MODE=RLS) funcione
--    El frontend usa la anon key; necesita SELECT para recibir cambios.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE pipeline_jobs ENABLE ROW LEVEL SECURITY;

-- Política: el frontend (anon) puede leer cualquier job.
-- En producción con usuarios reales, restringir a: user_id = auth.uid()
CREATE POLICY pipeline_jobs_anon_select ON pipeline_jobs
  FOR SELECT TO anon
  USING (true);

-- El service_role (backend) puede hacer todo sin restricciones.
CREATE POLICY pipeline_jobs_service_all ON pipeline_jobs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Permisos de tabla — necesarios aunque el rol tenga BYPASSRLS
GRANT ALL    ON TABLE pipeline_jobs TO service_role;
GRANT SELECT ON TABLE pipeline_jobs TO anon;
GRANT SELECT ON TABLE pipeline_jobs TO authenticated;
GRANT SELECT ON TABLE pipeline_jobs TO postgres;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Realtime publication
--    Añade pipeline_jobs a la publicación que Supabase Realtime escucha.
--    Se ejecuta en un bloque DO para no fallar si la publicación no existe aún
--    (Realtime la crea cuando arranca; las migraciones corren antes).
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- Sólo añadir si la tabla no está ya en la publicación
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'pipeline_jobs'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE pipeline_jobs;
    END IF;
  END IF;
END $$;
