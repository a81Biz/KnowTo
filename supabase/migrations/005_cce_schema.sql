-- =============================================================================
-- KNOWTO - Migration 005: CCE Schema (EC0249 Consultoría Empresarial)
-- =============================================================================
-- Extiende el esquema base para el microsite CCE:
--   • Columnas adicionales en projects (company_name, sector, microsite)
--   • Tabla cce_instrument_uploads para archivos de instrumentos de campo
--   • Tabla cce_extracted_contexts para trazabilidad del contexto CCE
--   • Stored procedures sp_cce_* para todas las operaciones del wizard CCE
--   • Vista vw_cce_project_progress
--   • Bucket de Supabase Storage: cce-instruments
-- =============================================================================

-- =============================================================================
-- 0. Corrección: UNIQUE constraint faltante en documents.step_id
--    Requerido por sp_save_document y sp_cce_save_document (ON CONFLICT step_id)
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'documents'::regclass AND contype = 'u'
      AND conname = 'documents_step_id_key'
  ) THEN
    ALTER TABLE documents ADD CONSTRAINT documents_step_id_key UNIQUE (step_id);
  END IF;
END $$;

-- =============================================================================
-- 1. Extender tabla projects con campos CCE
-- =============================================================================
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS sector       TEXT,
  ADD COLUMN IF NOT EXISTS microsite    TEXT NOT NULL DEFAULT 'dcfl'
    CHECK (microsite IN ('dcfl', 'cce'));

-- Índice para filtrar proyectos por microsite
CREATE INDEX IF NOT EXISTS idx_projects_microsite ON projects(microsite);
CREATE INDEX IF NOT EXISTS idx_projects_user_microsite ON projects(user_id, microsite);

-- =============================================================================
-- 2. Tabla: cce_instrument_uploads
--    Almacena metadata de los archivos subidos en el step 4 (Trabajo de Campo).
--    El contenido real reside en Storage bucket "cce-instruments".
-- =============================================================================
CREATE TABLE IF NOT EXISTS cce_instrument_uploads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  instrument_type TEXT NOT NULL,   -- 'director'|'managers'|'collaborators'|'anonymous'|'observation'|'documents'
  file_name       TEXT NOT NULL,
  mime_type       TEXT NOT NULL,
  storage_path    TEXT NOT NULL,   -- path dentro del bucket "cce-instruments"
  size_bytes      INTEGER,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cce_uploads_project
  ON cce_instrument_uploads (project_id, instrument_type);

-- =============================================================================
-- 3. Tabla: cce_extracted_contexts
--    Trazabilidad del contexto extraído por ContextExtractorService (CCE).
--    Análoga a extracted_contexts del DCFL pero con prefijo cce_.
-- =============================================================================
CREATE TABLE IF NOT EXISTS cce_extracted_contexts (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  extractor_id   TEXT NOT NULL,           -- ej: 'EXTRACTOR_F1_1'
  from_phases    TEXT[] NOT NULL,         -- ej: '{F0,F0_CLIENT_ANSWERS}'
  to_phase       TEXT NOT NULL,           -- ej: 'F1_1'
  content        TEXT NOT NULL,           -- markdown compacto extraído
  parser_used    JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cce_extracted_project_extractor
  ON cce_extracted_contexts (project_id, extractor_id, created_at DESC);

-- =============================================================================
-- 4. sp_cce_create_project
--    Crea un proyecto CCE e inicializa sus 10 wizard_steps con las fases CCE.
-- =============================================================================
CREATE OR REPLACE FUNCTION sp_cce_create_project(
  p_user_id      UUID,
  p_name         TEXT,
  p_client_name  TEXT,
  p_company_name TEXT DEFAULT NULL,
  p_sector       TEXT DEFAULT NULL,
  p_email        TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_project_id UUID;
  v_step       INTEGER;
  -- 10 fases del wizard CCE (steps 0–9)
  v_phases TEXT[] := ARRAY[
    'INTAKE',            -- step 0: datos del cliente
    'F0',                -- step 1: referente de competencia
    'F0_CLIENT_ANSWERS', -- step 2: respuestas del cliente (formulario dinámico)
    'F1_1',              -- step 3: instrumentos de diagnóstico
    'F1_2_FIELDWORK',    -- step 4: trabajo de campo (uploads + instancias digitales)
    'F1_2',              -- step 5: diagnóstico
    'F2',                -- step 6: priorización de brechas
    'F2_5',              -- step 7: estrategia pedagógica + especificaciones
    'F4',                -- step 8: producción (todos los entregables)
    'F5'                 -- step 9: verificación y cierre
  ];
BEGIN
  INSERT INTO projects (user_id, name, client_name, company_name, sector, email, microsite)
  VALUES (p_user_id, p_name, p_client_name, p_company_name, p_sector, p_email, 'cce')
  RETURNING id INTO v_project_id;

  FOR v_step IN 0..9 LOOP
    INSERT INTO wizard_steps (project_id, step_number, phase_id)
    VALUES (v_project_id, v_step, v_phases[v_step + 1]);
  END LOOP;

  RETURN json_build_object(
    'success',    true,
    'project_id', v_project_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 5. sp_cce_save_step
--    Guarda los datos de entrada de un paso CCE del wizard.
-- =============================================================================
CREATE OR REPLACE FUNCTION sp_cce_save_step(
  p_project_id  UUID,
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

  UPDATE projects
  SET current_step = GREATEST(current_step, p_step_number)
  WHERE id = p_project_id AND microsite = 'cce';

  RETURN json_build_object('success', true, 'step_id', v_step_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 6. sp_cce_save_document
--    Guarda (upsert) el documento generado por IA para un paso CCE.
-- =============================================================================
CREATE OR REPLACE FUNCTION sp_cce_save_document(
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
  INSERT INTO documents (project_id, step_id, phase_id, title, content)
  VALUES (p_project_id, p_step_id, p_phase_id, p_title, p_content)
  ON CONFLICT (step_id)
  DO UPDATE SET
    content    = EXCLUDED.content,
    title      = EXCLUDED.title,
    version    = documents.version + 1,
    updated_at = NOW()
  RETURNING id INTO v_doc_id;

  UPDATE wizard_steps
  SET status = 'completed', output_text = p_content, updated_at = NOW()
  WHERE id = p_step_id;

  RETURN json_build_object('success', true, 'document_id', v_doc_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 7. sp_cce_get_project_context
--    Devuelve todo el contexto acumulado de un proyecto CCE.
-- =============================================================================
CREATE OR REPLACE FUNCTION sp_cce_get_project_context(p_project_id UUID)
RETURNS JSON AS $$
DECLARE
  v_project  projects%ROWTYPE;
  v_steps    JSON;
  v_docs     JSON;
  v_contexts JSON;
BEGIN
  SELECT * INTO v_project
  FROM projects
  WHERE id = p_project_id AND microsite = 'cce';

  SELECT json_agg(ws ORDER BY ws.step_number) INTO v_steps
  FROM wizard_steps ws WHERE ws.project_id = p_project_id;

  SELECT json_agg(d ORDER BY d.created_at) INTO v_docs
  FROM documents d WHERE d.project_id = p_project_id;

  SELECT json_agg(ec ORDER BY ec.created_at) INTO v_contexts
  FROM cce_extracted_contexts ec WHERE ec.project_id = p_project_id;

  RETURN json_build_object(
    'project',            row_to_json(v_project),
    'steps',              COALESCE(v_steps, '[]'::json),
    'documents',          COALESCE(v_docs, '[]'::json),
    'extracted_contexts', COALESCE(v_contexts, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 8. sp_cce_save_extracted_context
--    Persiste el contexto extraído por ContextExtractorService para un paso CCE.
-- =============================================================================
CREATE OR REPLACE FUNCTION sp_cce_save_extracted_context(
  p_project_id   UUID,
  p_extractor_id TEXT,
  p_from_phases  TEXT[],
  p_to_phase     TEXT,
  p_content      TEXT,
  p_parser_used  JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO cce_extracted_contexts
    (project_id, extractor_id, from_phases, to_phase, content, parser_used)
  VALUES
    (p_project_id, p_extractor_id, p_from_phases, p_to_phase, p_content, p_parser_used)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'extracted_context_id', v_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =============================================================================
-- 9. Vista: vw_cce_project_progress
--    Progreso de proyectos CCE, incluye company_name y sector.
-- =============================================================================
CREATE OR REPLACE VIEW vw_cce_project_progress AS
SELECT
  p.id              AS project_id,
  p.user_id,
  p.name,
  p.client_name,
  p.company_name,
  p.sector,
  p.email,
  p.current_step,
  p.status,
  COUNT(ws.id) FILTER (WHERE ws.status = 'completed') AS completed_steps,
  COUNT(ws.id)                                         AS total_steps,
  ROUND(
    COUNT(ws.id) FILTER (WHERE ws.status = 'completed')::NUMERIC
    / NULLIF(COUNT(ws.id)::NUMERIC, 0) * 100, 1
  )                                                    AS progress_pct,
  p.created_at,
  p.updated_at
FROM projects p
LEFT JOIN wizard_steps ws ON ws.project_id = p.id
WHERE p.microsite = 'cce'
GROUP BY p.id;

-- =============================================================================
-- 10. RLS: políticas de seguridad para las nuevas tablas
-- =============================================================================
ALTER TABLE cce_instrument_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE cce_extracted_contexts  ENABLE ROW LEVEL SECURITY;

-- Los usuarios sólo ven uploads de sus propios proyectos
CREATE POLICY cce_uploads_owner ON cce_instrument_uploads
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid() AND microsite = 'cce'
    )
  );

-- Los usuarios sólo ven contextos extraídos de sus propios proyectos
CREATE POLICY cce_contexts_owner ON cce_extracted_contexts
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid() AND microsite = 'cce'
    )
  );

-- =============================================================================
-- 11. Storage: bucket cce-instruments (aplicar vía Supabase Dashboard o CLI)
-- =============================================================================
-- NOTA: Los buckets de Storage no se crean con SQL en migraciones estándar.
-- Ejecutar en Supabase Dashboard > Storage > New bucket:
--   Name: cce-instruments
--   Public: false
--   Allowed MIME types: application/pdf, image/*, application/msword,
--     application/vnd.openxmlformats-officedocument.wordprocessingml.document
--   Max file size: 10 MB
--
-- O via supabase CLI:
--   supabase storage create cce-instruments --private
