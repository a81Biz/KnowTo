-- 040_project_brief.sql
-- Añade la columna project_brief (JSONB) a la tabla projects.
-- Almacena los 4 campos semánticos canónicos escritos por el usuario (Semantic Anchor Layer).

ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_brief JSONB;
