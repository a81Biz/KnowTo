UPDATE fase1_informe_necesidades
SET perfil_participante = jsonb_build_object(
  'perfil_profesional',               'Persona con experiencia en trabajo administrativo o de apoyo, interesada en aprender algoritmos para mejorar su desempeño laboral.',
  'nivel_educativo_minimo',           'Secundaria o bachillerato terminado.',
  'experiencia_previa',               'Sin experiencia previa en programación.',
  'conocimientos_previos_requeridos', 'Ninguno.',
  'rango_de_edad_estimado',           '18-45 años.',
  'motivacion_principal',             'Mejorar su desempeño laboral y entender la lógica detrás de los algoritmos.'
);
