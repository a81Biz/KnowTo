-- Migration 004: Tabla para contextos extraídos por el ContextExtractorService
-- Traza de dónde viene (from_phases) y a dónde va (to_phase) cada extracto.
-- Permite reutilizar el extracto si el usuario regenera sin cambiar las fases previas.

CREATE TABLE IF NOT EXISTS extracted_contexts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  extractor_id         TEXT NOT NULL,              -- ej: 'EXTRACTOR_F2'
  from_phases          TEXT[] NOT NULL,            -- ej: '{F0,F1}'
  to_phase             TEXT NOT NULL,              -- ej: 'F2'
  content              TEXT NOT NULL,              -- markdown compacto extraído
  parser_used          JSONB NOT NULL DEFAULT '{}', -- {campo: true/false}
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para recuperación rápida por proyecto + extractor
CREATE INDEX IF NOT EXISTS idx_extracted_contexts_project_extractor
  ON extracted_contexts (project_id, extractor_id, created_at DESC);

-- ── Stored procedure ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sp_save_extracted_context(
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
  INSERT INTO extracted_contexts
    (project_id, extractor_id, from_phases, to_phase, content, parser_used)
  VALUES
    (p_project_id, p_extractor_id, p_from_phases, p_to_phase, p_content, p_parser_used)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'extracted_context_id', v_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
