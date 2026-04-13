-- 006_cce_pipeline_tables.sql
-- Migración para el soporte de Pipeline Multi-Agente (CCE)

-- 1. Tabla de Templates de Prompts
CREATE TABLE cce_prompts (
  id TEXT PRIMARY KEY,                    -- "F0_SPECIALIST_NOMS"
  agent_type TEXT NOT NULL,               -- "extractor", "specialist_a", "specialist_b", "synthesizer", "judge", "generator"
  model TEXT NOT NULL,                    -- "llama-3.1-8b", "qwen-2.5-7b", "mistral-7b"
  temperature FLOAT DEFAULT 0.3,
  max_tokens INTEGER DEFAULT 2000,
  system_prompt TEXT NOT NULL,            -- Rol fijo del agente
  user_prompt_template TEXT NOT NULL,     -- Con placeholders {{input_X}}
  validation_rules JSONB,                 -- Para jueces: reglas de validación
  output_schema JSONB,                    -- Estructura esperada del output
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Tabla de Persistencia de Salidas Intermedias (Step Outputs)
CREATE TABLE cce_step_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,               -- Referencia al proyecto
  pipeline_id TEXT NOT NULL,              -- "F0", "F1_P1", etc.
  stage_id TEXT NOT NULL,                 -- "extractor_web", "specialist_a", etc.
  output_key TEXT NOT NULL,               -- "sector_raw", "noms_list"
  output_value JSONB NOT NULL,            -- La salida guardada
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '30 days'  -- Limpieza automática
);

-- Índices de consulta frecuente para Step Outputs
CREATE INDEX idx_step_outputs_project ON cce_step_outputs(project_id);
CREATE INDEX idx_step_outputs_key ON cce_step_outputs(project_id, output_key);
