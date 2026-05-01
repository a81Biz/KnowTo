-- 033_add_objetivos_especificos_to_f1.sql
-- Agrega la columna objetivos_especificos a la tabla fase1_informe_necesidades
-- para permitir el pre-llenado dinámico en la Fase 2 (Human-in-the-loop).

ALTER TABLE fase1_informe_necesidades 
ADD COLUMN IF NOT EXISTS objetivos_especificos JSONB;

COMMENT ON COLUMN fase1_informe_necesidades.objetivos_especificos IS 'Lista de objetivos específicos filtrados para F2 [{objetivo, nivel_bloom, dominio}]';
