-- 044_add_missing_fks.sql
-- Adds the 6 FK constraints that were omitted in earlier migrations.
-- After this migration, reset_project() can be simplified to:
--   DELETE FROM projects WHERE id = p_project_id;
-- because all child tables will CASCADE automatically.

ALTER TABLE pipeline_jobs
  ADD CONSTRAINT fk_pipeline_jobs_project
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE fase4_productos
  ADD CONSTRAINT fk_fase4_productos_project
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE fase1_informe_necesidades
  ADD CONSTRAINT fk_fase1_informe_project
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE preguntas_fase
  ADD CONSTRAINT fk_preguntas_fase_project
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE fase0_jueces_decisiones
  ADD CONSTRAINT fk_fase0_jueces_job
  FOREIGN KEY (job_id) REFERENCES pipeline_jobs(id) ON DELETE CASCADE;

ALTER TABLE f2_jueces_decisiones
  ADD CONSTRAINT fk_f2_jueces_job
  FOREIGN KEY (job_id) REFERENCES pipeline_jobs(id) ON DELETE CASCADE;

-- Update reset_project to use the simpler CASCADE-based approach now that all FKs are in place
CREATE OR REPLACE FUNCTION reset_project(p_project_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM projects WHERE id = p_project_id;
END;
$$;
