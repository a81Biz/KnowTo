-- 045_ccm_columns.sql
-- Certification Canonical Model (CCM) — PT-068
-- Adds CCM support columns to existing tables without breaking compatibility.

-- ── fase4_productos: CCM projection columns ───────────────────────────────────
-- datos_certificacion: convenience copy of the active ArtifactVersion.artifact JSONB.
--   Not the source of truth — artifact_versions is. Updated atomically via saveArtifactVersion().
-- active_artifact_id: FK to the currently active artifact_versions row.
--   Used for quick lookup without scanning artifact_versions.

ALTER TABLE fase4_productos
  ADD COLUMN IF NOT EXISTS datos_certificacion JSONB,
  ADD COLUMN IF NOT EXISTS active_artifact_id  UUID;

COMMENT ON COLUMN fase4_productos.datos_certificacion IS
  'Projection of the active ArtifactVersion.artifact JSONB. Source of truth is artifact_versions.';
COMMENT ON COLUMN fase4_productos.active_artifact_id IS
  'FK to the active row in artifact_versions for this product.';

-- ── fase3_especificaciones: idioma_requerido ──────────────────────────────────
-- Captures the project language requirement at F3 time.
-- Propagated to _frozen.idioma_requerido for all downstream pipelines.
-- NULL means no language constraint — validateLanguage is skipped by the engine.

ALTER TABLE fase3_especificaciones
  ADD COLUMN IF NOT EXISTS idioma_requerido VARCHAR(10);

COMMENT ON COLUMN fase3_especificaciones.idioma_requerido IS
  'ISO 639-1 language code required for all products (from project_brief). NULL = no constraint.';
