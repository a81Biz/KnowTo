-- Migration 013: Update wizard_steps check constraint and initialize missing steps

-- 1. Modificar el CHECK de 9 a 11
ALTER TABLE wizard_steps DROP CONSTRAINT IF EXISTS wizard_steps_step_number_check;
ALTER TABLE wizard_steps ADD CONSTRAINT wizard_steps_step_number_check CHECK (step_number BETWEEN 0 AND 11);

-- 2. Retroalimentar los pasos 10 y 11 para proyectos previamente creados
-- y actualizar el phase_id de los que hayan cambiado (ej: F6.2 -> F6.2a)
DO $$
DECLARE
  v_project RECORD;
  v_phases TEXT[] := ARRAY['F0','F1','F2','F2.5','F3','F4','F5.1','F5.2','F6.1','F6.2a','F6.2b','CLOSE'];
  v_step INTEGER;
BEGIN
  -- Iterar sobre todos los proyectos
  FOR v_project IN SELECT id FROM projects LOOP
    -- Asegurar que existan todos los pasos de 0 a 11 con el phase_id correcto
    FOR v_step IN 0..11 LOOP
      INSERT INTO wizard_steps (project_id, step_number, phase_id)
      VALUES (v_project.id, v_step, v_phases[v_step + 1])
      ON CONFLICT (project_id, step_number) DO UPDATE
      SET phase_id = EXCLUDED.phase_id;
    END LOOP;
  END LOOP;
END;
$$;
