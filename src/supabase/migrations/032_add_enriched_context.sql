-- Agregar columna enriched_context a pipeline_jobs
ALTER TABLE pipeline_jobs
ADD COLUMN IF NOT EXISTS enriched_context JSONB DEFAULT '{}'::jsonb;

-- Crear índice GIN para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_enriched_context 
ON pipeline_jobs USING gin (enriched_context);

-- Comentario para documentación
COMMENT ON COLUMN pipeline_jobs.enriched_context IS 'Contexto enriquecido con resultados de búsqueda web pre-pipeline';
