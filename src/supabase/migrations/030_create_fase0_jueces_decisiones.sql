-- Tabla para decisiones de jueces en Fase 0
CREATE TABLE IF NOT EXISTS fase0_jueces_decisiones (
  job_id UUID NOT NULL,
  seccion TEXT NOT NULL,
  decision JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (job_id, seccion)
);

-- Permisos
GRANT ALL ON fase0_jueces_decisiones TO authenticated, anon, service_role;
