-- Tabla para datos estructurados de F0 (evita parseo de Markdown)
CREATE TABLE IF NOT EXISTS fase0_estructurado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES pipeline_jobs(id) ON DELETE CASCADE,
  
  -- Datos estructurados
  project_name VARCHAR(255),
  industry VARCHAR(255),
  course_topic VARCHAR(255),
  
  analisis_sector JSONB,      -- { tamaño, tendencias, regulaciones, certificaciones }
  desafios JSONB,             -- [{ desafio, fuente }]
  mejores_practicas JSONB,    -- [{ practica, descripcion, fuente }]
  competencia JSONB,          -- [{ curso, plataforma, precio, alumnos, duracion, enfoque, oportunidad }]
  estandares_ec JSONB,        -- [{ codigo, nombre, proposito, aplicabilidad }]
  brechas JSONB,              -- { mejores_practicas: string, competencia: string }
  recomendaciones JSONB,      -- [string]
  referencias JSONB,          -- [{ id, referencia }]
  
  documento_final TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(project_id, job_id)
);

-- Permisos
GRANT ALL ON fase0_estructurado TO supabase_admin;
GRANT ALL ON fase0_estructurado TO authenticated;
GRANT ALL ON fase0_estructurado TO anon;
GRANT ALL ON fase0_estructurado TO service_role;
