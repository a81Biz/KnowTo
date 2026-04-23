-- Tabla para componentes estructurados de F0
CREATE TABLE IF NOT EXISTS fase0_componentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  job_id UUID NOT NULL,
  
  -- Componentes estructurados (JSONB)
  sector JSONB,           -- { tamaño, tendencias, regulaciones, certificaciones, desafios: [] }
  practicas JSONB,        -- [{ practica, descripcion, fuente }]
  competencia JSONB,      -- [{ curso, plataforma, precio, alumnos, duracion, enfoque, oportunidad }]
  estandares JSONB,       -- [{ codigo, nombre, proposito, aplicabilidad }]
  gaps JSONB,             -- { mejores_practicas, competencia }
  preguntas JSONB,        -- ["pregunta1", "pregunta2", ...]
  recomendaciones JSONB,  -- ["recomendacion1", ...]
  referencias JSONB,      -- [{ id, referencia }]
  
  documento_final TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(project_id, job_id)
);

-- Permisos
GRANT ALL ON fase0_componentes TO supabase_admin;
GRANT ALL ON fase0_componentes TO authenticated;
GRANT ALL ON fase0_componentes TO anon;
GRANT ALL ON fase0_componentes TO service_role;
