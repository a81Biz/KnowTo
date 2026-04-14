-- 010_create_pipeline_jobs.sql
-- Tabla compartida para jobs asíncronos del pipeline.
-- Compatible con PostgreSQL local (dev) y Supabase (prod).
--
-- En producción: Supabase Realtime detecta los cambios en status y notifica
--   al frontend directamente — NO se necesita el trigger pg_notify.
-- En desarrollo: el trigger pg_notify está comentado; el backend Node.js emite
--   notificaciones por WebSocket usando el event-bus en memoria.
--   Si prefieres activar pg_notify en dev, descomenta el bloque al final.

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
  error        TEXT,
  user_id      UUID        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_status  ON pipeline_jobs(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_project ON pipeline_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_user    ON pipeline_jobs(user_id);

-- Mantener updated_at sincronizado en cualquier UPDATE
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
-- SOLO DESARROLLO — pg_notify (PostgreSQL local)
-- Descomenta este bloque si quieres usar el trigger en lugar del event-bus
-- en memoria del servidor Node.js. NO aplicar en Supabase (prod).
-- ─────────────────────────────────────────────────────────────────────────────

-- CREATE OR REPLACE FUNCTION _notify_pipeline_job_change()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   PERFORM pg_notify(
--     'pipeline_job_' || NEW.user_id::text,
--     json_build_object(
--       'job_id', NEW.id,
--       'status', NEW.status,
--       'result', NEW.result,
--       'error',  NEW.error
--     )::text
--   );
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
--
-- DROP TRIGGER IF EXISTS trg_pipeline_job_notify ON pipeline_jobs;
-- CREATE TRIGGER trg_pipeline_job_notify
-- AFTER UPDATE OF status ON pipeline_jobs
-- FOR EACH ROW
-- WHEN (OLD.status IS DISTINCT FROM NEW.status)
-- EXECUTE FUNCTION _notify_pipeline_job_change();
