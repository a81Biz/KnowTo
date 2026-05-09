-- Migration 035: Ampliar validacion_estado de VARCHAR(20) a VARCHAR(30)
-- Motivo: 'aprobado_por_fallback' tiene 21 chars y superaba el límite anterior,
--         causando que saveF4Producto fallara silenciosamente.
ALTER TABLE fase4_productos
  ALTER COLUMN validacion_estado TYPE VARCHAR(30);
