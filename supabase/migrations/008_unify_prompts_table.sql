-- ============================================================================
-- Migración 008: Tabla unificada site_prompts
--
-- Objetivo: Reemplazar la tabla site-específica `cce_prompts` por una tabla
-- multi-sitio `site_prompts` con columna `site_id` ('dcfl', 'cce', etc.).
--
-- Compatibilidad: La tabla `cce_prompts` NO se elimina; se mantiene como
-- fuente de verdad legada hasta que todos los sitios estén migrados.
-- El backend lee primero de `site_prompts` y hace fallback a `cce_prompts`.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Crear tabla unificada
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS site_prompts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id     text        NOT NULL,
  phase_id    text        NOT NULL,
  prompt_id   text        NOT NULL,
  content     text        NOT NULL,
  metadata    jsonb       NOT NULL DEFAULT '{}',
  version     integer     NOT NULL DEFAULT 1,
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_site_prompts UNIQUE (site_id, prompt_id, version)
);

COMMENT ON TABLE site_prompts IS
  'Tabla unificada de prompts para todos los micrositios. '
  'Discriminada por site_id: ''dcfl'', ''cce'', etc.';

COMMENT ON COLUMN site_prompts.site_id IS
  'Identificador del microsite. Valores: ''dcfl'', ''cce''.';

COMMENT ON COLUMN site_prompts.metadata IS
  'JSONB libre para pipeline_steps, output_guard, model, etc.';

-- ----------------------------------------------------------------------------
-- 2. Índices de consulta
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_site_prompts_lookup
  ON site_prompts (site_id, prompt_id)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_site_prompts_phase
  ON site_prompts (site_id, phase_id)
  WHERE active = true;

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION fn_update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_site_prompts_updated_at ON site_prompts;
CREATE TRIGGER trg_site_prompts_updated_at
  BEFORE UPDATE ON site_prompts
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

-- ----------------------------------------------------------------------------
-- 3. Migrar datos existentes de cce_prompts → site_prompts
-- ----------------------------------------------------------------------------

-- Nota: cce_prompts no tiene columna fase_id/phase_id; se deriva del id del prompt.
INSERT INTO site_prompts (site_id, phase_id, prompt_id, content, metadata, version, active)
SELECT
  'cce'                           AS site_id,
  split_part(id, '_', 1)          AS phase_id,
  id                              AS prompt_id,
  COALESCE(user_prompt_template, '') AS content,
  jsonb_build_object(
    'system_prompt',  COALESCE(system_prompt, ''),
    'model',          COALESCE(model, 'llama3.2:3b'),
    'agent_type',     COALESCE(agent_type, 'specialist')
  )                               AS metadata,
  1                               AS version,
  true                            AS active
FROM cce_prompts
ON CONFLICT (site_id, prompt_id, version) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. RPC unificada: sp_get_prompt
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sp_get_prompt(
  p_site_id   text,
  p_prompt_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'content',  content,
    'metadata', metadata
  )
  INTO v_result
  FROM site_prompts
  WHERE site_id  = p_site_id
    AND prompt_id = p_prompt_id
    AND active    = true
  ORDER BY version DESC
  LIMIT 1;

  RETURN COALESCE(v_result, NULL);
END;
$$;

COMMENT ON FUNCTION sp_get_prompt(text, text) IS
  'Obtiene el prompt activo de mayor versión para un site_id + prompt_id.
   Retorna jsonb con {content, metadata} o NULL si no existe.';

-- ----------------------------------------------------------------------------
-- 5. RPC helper: sp_upsert_prompt (para seeds y actualizaciones)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sp_upsert_prompt(
  p_site_id   text,
  p_phase_id  text,
  p_prompt_id text,
  p_content   text,
  p_metadata  jsonb  DEFAULT '{}',
  p_version   integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO site_prompts (site_id, phase_id, prompt_id, content, metadata, version, active)
  VALUES (p_site_id, p_phase_id, p_prompt_id, p_content, p_metadata, p_version, true)
  ON CONFLICT (site_id, prompt_id, version)
  DO UPDATE SET
    content    = EXCLUDED.content,
    metadata   = EXCLUDED.metadata,
    phase_id   = EXCLUDED.phase_id,
    active     = true,
    updated_at = now();
END;
$$;
