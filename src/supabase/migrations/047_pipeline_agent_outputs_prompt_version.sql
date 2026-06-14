-- 047_pipeline_agent_outputs_prompt_version.sql
-- PT-085: Add prompt traceability columns to pipeline_agent_outputs.
--
-- Purpose: Record which prompt template version produced each agent output,
-- enabling full audit trail of LLM-generated content.

ALTER TABLE pipeline_agent_outputs
  ADD COLUMN IF NOT EXISTS prompt_template_id      TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS prompt_template_version TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS prompt_hash             CHAR(64) DEFAULT NULL;

COMMENT ON COLUMN pipeline_agent_outputs.prompt_hash IS
  'SHA-256(prompt_template_id || chr(124) || prompt_template_version). Null for outputs generated before PT-085.';
