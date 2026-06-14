-- Agregar columna estructura_videos a fase2_5_recomendaciones
ALTER TABLE fase2_5_recomendaciones ADD COLUMN IF NOT EXISTS estructura_videos JSONB;

-- Comentario para documentación
COMMENT ON COLUMN fase2_5_recomendaciones.estructura_videos IS 'Estructura de videos generada por agente_videos en formato JSON: { intro: { cantidad, duracion }, contenido: { cantidad, duracion_min, duracion_max }, resumen: { cantidad, duracion }, total_videos }';
