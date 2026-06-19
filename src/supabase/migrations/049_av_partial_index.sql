-- Migration 049 — Índice parcial WHERE is_active = true en artifact_versions
-- Reemplaza idx_av_active (migration 046) que cubría (project_id, product_code)
-- sin filtrar is_active. Con versionado inmutable las versiones inactivas acumulan
-- y el query WHERE is_active = true hacía full-scan sobre historial completo.
-- El índice parcial reduce el scan a solo la versión activa por producto/proyecto.

DROP INDEX IF EXISTS idx_av_active;

CREATE INDEX IF NOT EXISTS idx_av_active
  ON artifact_versions (project_id, product_code)
  WHERE is_active = true;
