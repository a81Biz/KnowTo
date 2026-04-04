-- =============================================================================
-- KNOWTO - Migration 003: Stored Procedures
-- =============================================================================

-- =============================================================================
-- sp_create_project: Crea un proyecto e inicializa sus wizard_steps
-- =============================================================================
CREATE OR REPLACE FUNCTION sp_create_project(
  p_user_id     UUID,
  p_name        TEXT,
  p_client_name TEXT,
  p_industry    TEXT DEFAULT NULL,
  p_email       TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_project_id UUID;
  v_step       INTEGER;
  v_phases     TEXT[] := ARRAY['F0','F1','F2','F3','F4','F5.1','F5.2','F6.1','F6.2','CLOSE'];
BEGIN
  -- Crear el proyecto
  INSERT INTO projects (user_id, name, client_name, industry, email)
  VALUES (p_user_id, p_name, p_client_name, p_industry, p_email)
  RETURNING id INTO v_project_id;

  -- Inicializar los 10 wizard_steps
  FOR v_step IN 0..9 LOOP
    INSERT INTO wizard_steps (project_id, step_number, phase_id)
    VALUES (v_project_id, v_step, v_phases[v_step + 1]);
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'project_id', v_project_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- sp_save_step: Guarda datos de entrada de un paso del wizard
-- =============================================================================
CREATE OR REPLACE FUNCTION sp_save_step(
  p_project_id UUID,
  p_step_number INTEGER,
  p_input_data  JSONB
)
RETURNS JSON AS $$
DECLARE
  v_step_id UUID;
BEGIN
  UPDATE wizard_steps
  SET input_data = p_input_data, status = 'processing', updated_at = NOW()
  WHERE project_id = p_project_id AND step_number = p_step_number
  RETURNING id INTO v_step_id;

  IF v_step_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Step not found');
  END IF;

  -- Avanzar current_step del proyecto si corresponde
  UPDATE projects
  SET current_step = GREATEST(current_step, p_step_number)
  WHERE id = p_project_id;

  RETURN json_build_object('success', true, 'step_id', v_step_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- sp_save_document: Guarda el documento generado por IA para un paso
-- =============================================================================
CREATE OR REPLACE FUNCTION sp_save_document(
  p_project_id UUID,
  p_step_id    UUID,
  p_phase_id   TEXT,
  p_title      TEXT,
  p_content    TEXT
)
RETURNS JSON AS $$
DECLARE
  v_doc_id UUID;
BEGIN
  -- Upsert: si ya existe para ese step, actualiza
  INSERT INTO documents (project_id, step_id, phase_id, title, content)
  VALUES (p_project_id, p_step_id, p_phase_id, p_title, p_content)
  ON CONFLICT (step_id)
  DO UPDATE SET content = EXCLUDED.content, title = EXCLUDED.title,
    version = documents.version + 1, updated_at = NOW()
  RETURNING id INTO v_doc_id;

  -- Marcar el step como completado
  UPDATE wizard_steps
  SET status = 'completed', output_text = p_content, updated_at = NOW()
  WHERE id = p_step_id;

  RETURN json_build_object('success', true, 'document_id', v_doc_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- sp_get_project_context: Devuelve todo el contexto acumulado de un proyecto
-- =============================================================================
CREATE OR REPLACE FUNCTION sp_get_project_context(p_project_id UUID)
RETURNS JSON AS $$
DECLARE
  v_project  projects%ROWTYPE;
  v_steps    JSON;
  v_docs     JSON;
BEGIN
  SELECT * INTO v_project FROM projects WHERE id = p_project_id;

  SELECT json_agg(ws ORDER BY ws.step_number) INTO v_steps
  FROM wizard_steps ws WHERE ws.project_id = p_project_id;

  SELECT json_agg(d ORDER BY d.created_at) INTO v_docs
  FROM documents d WHERE d.project_id = p_project_id;

  RETURN json_build_object(
    'project',   row_to_json(v_project),
    'steps',     COALESCE(v_steps, '[]'::json),
    'documents', COALESCE(v_docs, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- sp_mark_step_error: Marca un step como fallido
-- =============================================================================
CREATE OR REPLACE FUNCTION sp_mark_step_error(
  p_step_id     UUID,
  p_error_msg   TEXT
)
RETURNS JSON AS $$
BEGIN
  UPDATE wizard_steps
  SET status = 'error', error_message = p_error_msg, updated_at = NOW()
  WHERE id = p_step_id;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- VISTAS
-- =============================================================================
CREATE OR REPLACE VIEW vw_project_progress AS
SELECT
  p.id AS project_id,
  p.name,
  p.client_name,
  p.current_step,
  p.status,
  COUNT(ws.id) FILTER (WHERE ws.status = 'completed') AS completed_steps,
  COUNT(ws.id) AS total_steps,
  ROUND(
    COUNT(ws.id) FILTER (WHERE ws.status = 'completed')::NUMERIC
    / COUNT(ws.id)::NUMERIC * 100, 1
  ) AS progress_pct,
  p.created_at,
  p.updated_at
FROM projects p
LEFT JOIN wizard_steps ws ON ws.project_id = p.id
GROUP BY p.id;
