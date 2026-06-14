-- 1. Migrar datos existentes de fase0_estructurado a fase0_componentes (si los hay)
INSERT INTO fase0_componentes (project_id, job_id, sector, practicas, competencia, estandares, gaps, preguntas, recomendaciones, referencias, documento_final, created_at)
SELECT 
  project_id, 
  job_id,
  analisis_sector as sector,
  mejores_practicas as practicas,
  competencia,
  estandares_ec as estandares,
  brechas as gaps,
  NULL as preguntas,  -- preguntas ya están en tabla independiente
  recomendaciones,
  referencias,
  documento_final,
  created_at
FROM fase0_estructurado
ON CONFLICT (project_id, job_id) DO NOTHING;

-- 2. Eliminar tabla duplicada
DROP TABLE IF EXISTS fase0_estructurado;

-- 3. Otorgar permisos a fase0_componentes
GRANT ALL ON fase0_componentes TO supabase_admin;
GRANT ALL ON fase0_componentes TO authenticated;
GRANT ALL ON fase0_componentes TO anon;
GRANT ALL ON fase0_componentes TO service_role;

-- 4. Asegurar que fase0_jueces_decisiones tiene la estructura correcta
ALTER TABLE fase0_jueces_decisiones 
  ADD COLUMN IF NOT EXISTS seleccion VARCHAR(1),
  ADD COLUMN IF NOT EXISTS razon TEXT;

-- 5. Actualizar decisiones existentes para extraer seleccion
UPDATE fase0_jueces_decisiones 
SET seleccion = (decision->>'seleccion')::VARCHAR(1),
    razon = decision->>'razon'
WHERE seleccion IS NULL;
