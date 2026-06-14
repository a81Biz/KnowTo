-- =============================================================================
-- 018_add_f3_audit_columns.sql
-- Añade columnas de auditoría a la tabla fase3_especificaciones
-- =============================================================================

-- Añadir columnas para almacenar borradores y decisión del juez
ALTER TABLE fase3_especificaciones 
  ADD COLUMN IF NOT EXISTS borrador_A TEXT,
  ADD COLUMN IF NOT EXISTS borrador_B TEXT,
  ADD COLUMN IF NOT EXISTS juez_decision JSONB,
  ADD COLUMN IF NOT EXISTS juez_similitud INTEGER;

-- Comentarios para documentación
COMMENT ON COLUMN fase3_especificaciones.borrador_A IS 'Borrador generado por agente_doble_A_f3';
COMMENT ON COLUMN fase3_especificaciones.borrador_B IS 'Borrador generado por agente_doble_B_f3';
COMMENT ON COLUMN fase3_especificaciones.juez_decision IS 'Decisión del juez: { borrador_elegido, razon, similitud }';
COMMENT ON COLUMN fase3_especificaciones.juez_similitud IS 'Puntuación de similitud entre borradores (0-100)';
