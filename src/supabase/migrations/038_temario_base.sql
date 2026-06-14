-- Migration 038: Temario Base
-- Tabla para almacenar el temario canónico de un proyecto.
-- UNIQUE(project_id) permite regeneración via UPSERT sin duplicar registros.
-- Sirve como ancla inmutable para todos los productos F4.
--
-- NOTA SOBRE EJECUCIÓN:
--   docker-entrypoint-initdb.d/ solo ejecuta estos scripts cuando el volumen
--   de datos de PostgreSQL es nuevo (primera vez). Para aplicar esta migración
--   en un entorno existente, ejecutar manualmente:
--     docker exec -i knowto-supabase-db psql -U supabase_admin -d postgres < supabase/migrations/038_temario_base.sql

CREATE TABLE IF NOT EXISTS temario_base (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id              UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version                 INT DEFAULT 1,
  temario                 JSONB NOT NULL DEFAULT '[]',
  -- [{modulo: str, unidades: [{nombre: str, objetivo_bloom: str, duracion_minutos: int, tipo_evaluacion: str}]}]
  tiempos                 JSONB,
  -- [{modulo: str, duracion_total_minutos: int, justificacion: str}]
  duracion_total_minutos  INT,
  total_unidades          INT,
  confirmado_por_usuario  BOOLEAN NOT NULL DEFAULT false,
  confirmado_at           TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id)
);

COMMENT ON TABLE temario_base IS 'Temario canónico por proyecto. Fuente de verdad para unidades, objetivos Bloom y duraciones en F4.';
COMMENT ON COLUMN temario_base.temario IS 'Array JSON: [{modulo, unidades: [{nombre, objetivo_bloom, duracion_minutos, tipo_evaluacion}]}]';
COMMENT ON COLUMN temario_base.tiempos IS 'Array JSON: [{modulo, duracion_total_minutos, justificacion}]';

-- Índice explícito sobre project_id (el UNIQUE ya crea uno, pero lo nombramos para diagnóstico)
CREATE INDEX IF NOT EXISTS idx_temario_base_project ON temario_base(project_id);

-- Trigger updated_at — usa update_updated_at_column() definida en migración 034
CREATE OR REPLACE TRIGGER trigger_update_temario_base_updated_at
  BEFORE UPDATE ON temario_base
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE temario_base ENABLE ROW LEVEL SECURITY;

-- service_role: acceso total (bypassa RLS por BYPASSRLS, pero el policy lo garantiza en self-hosted)
DO $$
BEGIN
  CREATE POLICY "Service role full access" ON temario_base
    FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN undefined_function OR invalid_schema_name THEN
  RAISE WARNING 'temario_base: auth.role() not available during init, skipping service_role policy';
END $$;

-- SELECT: usuarios ven solo su propio temario
DO $$
BEGIN
  CREATE POLICY "Users can read their own temario" ON temario_base
    FOR SELECT USING (
      auth.role() = 'authenticated'
      AND project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );
EXCEPTION WHEN undefined_function OR invalid_schema_name THEN
  RAISE WARNING 'temario_base: auth.role() not available during init, skipping SELECT policy';
END $$;

-- INSERT
DO $$
BEGIN
  CREATE POLICY "Users can insert their own temario" ON temario_base
    FOR INSERT WITH CHECK (
      auth.role() = 'authenticated'
      AND project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );
EXCEPTION WHEN undefined_function OR invalid_schema_name THEN
  RAISE WARNING 'temario_base: auth.role() not available during init, skipping INSERT policy';
END $$;

-- UPDATE
DO $$
BEGIN
  CREATE POLICY "Users can update their own temario" ON temario_base
    FOR UPDATE USING (
      auth.role() = 'authenticated'
      AND project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );
EXCEPTION WHEN undefined_function OR invalid_schema_name THEN
  RAISE WARNING 'temario_base: auth.role() not available during init, skipping UPDATE policy';
END $$;

-- DELETE
DO $$
BEGIN
  CREATE POLICY "Users can delete their own temario" ON temario_base
    FOR DELETE USING (
      auth.role() = 'authenticated'
      AND project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );
EXCEPTION WHEN undefined_function OR invalid_schema_name THEN
  RAISE WARNING 'temario_base: auth.role() not available during init, skipping DELETE policy';
END $$;

-- ─── Permisos de tabla ────────────────────────────────────────────────────────
GRANT ALL ON temario_base TO supabase_admin;
GRANT ALL ON temario_base TO authenticated;
GRANT ALL ON temario_base TO anon;
GRANT ALL ON temario_base TO service_role;
