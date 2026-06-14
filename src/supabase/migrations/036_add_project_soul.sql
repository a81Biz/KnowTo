-- =============================================================================
-- KNOWTO - Migration 036: Añadir columna project_soul a projects
-- =============================================================================
-- El "Project Soul" es un párrafo canónico que contiene la identidad inmutable
-- del proyecto. Se genera tras completar F1 y se inyecta como System Prompt
-- prioritario en todas las llamadas subsecuentes al AIService.
--
-- NOTA SOBRE EJECUCIÓN:
--   docker-entrypoint-initdb.d/ solo ejecuta estos scripts cuando el volumen
--   de datos de PostgreSQL es nuevo (primera vez). Para aplicar esta migración
--   en un entorno existente, ejecutar manualmente:
--     docker exec -i knowto-supabase-db psql -U supabase_admin -d postgres < supabase/migrations/036_add_project_soul.sql
-- =============================================================================

-- 1. Añadir columna (idempotente con IF NOT EXISTS)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_soul TEXT;

-- 2. Función dedicada para guardar el Project Soul
CREATE OR REPLACE FUNCTION sp_save_project_soul(
  p_project_id UUID,
  p_soul       TEXT
)
RETURNS JSON AS $$
BEGIN
  UPDATE projects
  SET project_soul = p_soul, updated_at = NOW()
  WHERE id = p_project_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Project not found');
  END IF;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Permisos de ejecución sobre la nueva función
-- service_role ya tiene ALL en la tabla projects (migración 029).
-- Las funciones SECURITY DEFINER ejecutan como el owner (supabase_admin),
-- pero necesitamos GRANT EXECUTE para que PostgREST/RPC las pueda invocar.
GRANT EXECUTE ON FUNCTION sp_save_project_soul(UUID, TEXT) TO service_role, authenticated;

-- 4. Nota: sp_get_project_context (migración 003) ya devuelve project_soul
--    automáticamente porque usa `SELECT * INTO v_project` con %ROWTYPE.
--    No necesita actualizarse — la nueva columna se incluye por el wildcard.
