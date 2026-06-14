-- Migration 042: test_run_logs
-- Tabla de progreso para /dcfl/test/run-all.
-- Cada fila = un paso del run (form-schema o document por producto/módulo).
-- El frontend suscribe via Supabase Realtime postgres_changes WHERE run_id=eq.<id>
-- para ver avance en tiempo real sin polling HTTP.

CREATE TABLE IF NOT EXISTS test_run_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id      TEXT        NOT NULL,
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  step        TEXT        NOT NULL,
  status      TEXT        NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'skipped', 'timeout')),
  job_id      TEXT,
  detail      JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS test_run_logs_run_idx     ON test_run_logs (run_id, created_at);
CREATE INDEX IF NOT EXISTS test_run_logs_project_idx ON test_run_logs (project_id, created_at);

ALTER TABLE test_run_logs ENABLE ROW LEVEL SECURITY;

-- Service role: acceso total (el backend usa service_role_key)
CREATE POLICY "service_role_all" ON test_run_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Usuarios autenticados: solo leen logs de sus propios proyectos
CREATE POLICY "authenticated_read" ON test_run_logs
  FOR SELECT TO authenticated
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Permisos de acceso por rol (necesario en Supabase self-hosted para que PostgREST funcione)
GRANT ALL ON test_run_logs TO service_role;
GRANT SELECT ON test_run_logs TO authenticated;
GRANT SELECT ON test_run_logs TO anon;
