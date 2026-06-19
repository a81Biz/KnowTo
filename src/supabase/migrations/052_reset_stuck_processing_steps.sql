-- Migration 052: Resetear wizard_steps bloqueados en 'processing' sin output_text.
-- Estos steps quedaron en este estado por BUG-1 (saveDocument sin p_step_id),
-- donde el pipeline completaba pero wizard_steps nunca pasaba a 'completed'.
-- Ejecutar DESPUÉS de que PT-167 esté activo para que los usuarios regeneren
-- con el backend corregido.
UPDATE wizard_steps
SET    status     = 'pending',
       updated_at = NOW()
WHERE  status     = 'processing'
  AND  output_text IS NULL;
