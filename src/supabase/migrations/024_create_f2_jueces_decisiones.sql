-- Crear tabla para almacenar decisiones de los jueces de F2
CREATE TABLE IF NOT EXISTS f2_jueces_decisiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL,
  seccion VARCHAR(50) NOT NULL,
  decision JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, seccion)
);

-- Crear índice para búsquedas rápidas por job_id
CREATE INDEX IF NOT EXISTS idx_f2_jueces_decisiones_job_id ON f2_jueces_decisiones(job_id);

-- Otorgar permisos
GRANT ALL ON f2_jueces_decisiones TO supabase_admin;
GRANT ALL ON f2_jueces_decisiones TO authenticated;
GRANT ALL ON f2_jueces_decisiones TO anon;
GRANT ALL ON f2_jueces_decisiones TO service_role;

-- Comentario para documentación
COMMENT ON TABLE f2_jueces_decisiones IS 'Almacena las decisiones de los 6 jueces especializados de F2 (modalidad, scorm, estructura, perfil, estrategias, supuestos)';
