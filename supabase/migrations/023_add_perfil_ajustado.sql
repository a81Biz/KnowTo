-- 020_add_perfil_ajustado.sql
-- Agrega columna perfil_ajustado a fase2_analisis_alcance para almacenar
-- el perfil del participante editado por el cliente en el paso F2.
-- El perfil original de F1 queda en fase1_informe_necesidades.perfil_participante.

ALTER TABLE fase2_analisis_alcance
  ADD COLUMN IF NOT EXISTS perfil_ajustado JSONB;
