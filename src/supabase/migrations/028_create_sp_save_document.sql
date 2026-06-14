-- Eliminar la función existente (con firma específica)
DROP FUNCTION IF EXISTS sp_save_document(TEXT, TEXT, UUID, TEXT);

-- Crear la función corregida para que retorne JSON
CREATE OR REPLACE FUNCTION sp_save_document(
  p_content TEXT,
  p_phase_id TEXT,
  p_project_id UUID,
  p_title TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_document_id UUID;
BEGIN
  INSERT INTO documents (content, phase_id, project_id, title)
  VALUES (p_content, p_phase_id, p_project_id, p_title)
  RETURNING id INTO v_document_id;
  
  RETURN json_build_object('success', true, 'document_id', v_document_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION sp_save_document(TEXT, TEXT, UUID, TEXT) TO authenticated, anon, service_role;