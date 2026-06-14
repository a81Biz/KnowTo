-- 043_reset_project_function.sql
-- Transactional reset function for a project (ordered deletes, safe without FK CASCADE).
-- Once migration 044 adds the missing FK constraints, this simplifies to a single
-- DELETE FROM projects (all child tables CASCADE automatically).

CREATE OR REPLACE FUNCTION reset_project(p_project_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Step 1: Tables referencing job_id without a declared FK (must precede pipeline_jobs delete)
  DELETE FROM fase0_jueces_decisiones
    WHERE job_id IN (SELECT id FROM pipeline_jobs WHERE project_id = p_project_id);
  DELETE FROM f2_jueces_decisiones
    WHERE job_id IN (SELECT id FROM pipeline_jobs WHERE project_id = p_project_id);

  -- Step 2: Tables with project_id but no FK to projects (manual delete required)
  DELETE FROM fase4_productos           WHERE project_id = p_project_id;

  -- Step 3: pipeline_jobs CASCADE to pipeline_agent_outputs; SET NULL on fase1/preguntas job_id
  DELETE FROM pipeline_jobs             WHERE project_id = p_project_id;

  -- Step 4: Remaining tables without FK (job_id now NULL from step 3)
  DELETE FROM fase1_informe_necesidades WHERE project_id = p_project_id;
  DELETE FROM preguntas_fase            WHERE project_id = p_project_id; -- CASCADEs to respuestas_preguntas_fase

  -- Step 5: projects CASCADE to 14 remaining tables (wizard_steps, fase0_componentes, etc.)
  DELETE FROM projects WHERE id = p_project_id;
END;
$$;

GRANT EXECUTE ON FUNCTION reset_project(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION reset_project(UUID) TO authenticated;
