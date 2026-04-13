-- 007_cce_seed_prompts.sql
-- Inserción masiva de los templates modulares del Pipeline Multi-Agente (CCE)

-- Limpiar la tabla si ya existe data.
DELETE FROM cce_prompts;

INSERT INTO cce_prompts (id, agent_type, model, temperature, max_tokens, system_prompt, user_prompt_template, validation_rules, output_schema) VALUES

-- ==========================================
-- FASE 0: MARCO DE REFERENCIA
-- ==========================================
(
  'EXTRACTOR_WEB',
  'extractor',
  'llama-3.1-8b',
  0.1,
  1000,
  'Eres un experto limpiando datos crudos obtenidos de sitios web.',
  'Extrae y resume en no más de 500 palabras la propuesta principal de negocio del siguiente texto web:\n{{crawlerData}}',
  NULL,
  '{"type": "string"}'
),
(
  'SINTETIZADOR_SECTOR',
  'synthesizer',
  'llama-3.1-8b',
  0.2,
  1000,
  'Eres un analista de datos comerciales. Sintetizas información confusa en perfiles limpios.',
  'Usa estos extractos web crudos y genera un perfil de negocio claro (Sector, Actividad Principal, Público Objetivo):\n{{sector_raw}}',
  NULL,
  '{"type": "string"}'
),
(
  'F0_SPECIALIST_NOMS',
  'specialist_a',
  'llama-3.1-8b',
  0.3,
  2000,
  'Eres un consultor experto en normatividad laboral mexicana (NOMs de la STPS).',
  'CONTEXTO:\n{{sector_limpio}}\n\nINPUTS:\n{{userInputs}}\n\nIdentifica las NOMs aplicables al sector descrito. Devuelve el resultado en formato markdown (Título, DOF, y regulación básica).',
  NULL,
  NULL
),
(
  'F0_SPECIALIST_ECS',
  'specialist_b',
  'qwen-2.5-7b',
  0.3,
  2000,
  'Eres un consultor experto del CONOCER enfocado en estándares de competencia laboral (EC).',
  'CONTEXTO:\n{{sector_limpio}}\n\nINPUTS:\n{{userInputs}}\n\nIdentifica los Estándares de Competencia (EC) obligatorios o altamente recomendados para esta empresa.',
  NULL,
  NULL
),
(
  'SINTETIZADOR_F0',
  'synthesizer',
  'llama-3.1-8b',
  0.2,
  3000,
  'Eres un Technical Writer experto en reportes ejecutivos.',
  'Sintetiza la información provista combinando las NOMs y ECs en un solo borrador estructurado.\n\nNOMs APLICABLES:\n{{noms_list}}\n\nESTÁNDARES EC:\n{{ecs_list}}\n\nGenera el documento en Markdown, integrando "ANÁLISIS DEL SECTOR", "NOMs APLICABLES" y "ESTÁNDARES EC".',
  NULL,
  NULL
),
(
  'JUEZ_F0',
  'judge',
  'mistral-7b',
  0.0,
  500,
  'Eres un auditor estricto. Tu única función es emitir JSON que valide el documento contra el conjunto de reglas dictadas.',
  'EVALUA ESTE DOCUMENTO:\n{{borrador_f0}}\n\nAsegúrate de que tiene todas las secciones que exige la metodología y provee el status final.',
  '{
    "sections_required": ["ANÁLISIS DEL SECTOR", "NOMs APLICABLES", "ESTÁNDARES EC"],
    "min_noms": 2,
    "max_noms": 5,
    "min_ecs": 2,
    "max_ecs": 4,
    "noms_must_have_dof_link": true,
    "ecs_must_have_conocer_link": true
  }',
  '{
    "type": "object",
    "properties": {
      "status": { "type": "string", "enum": ["ok", "rechazado"] },
      "razon": { "type": "string" },
      "output_final": { "type": "string" }
    }
  }'
),

-- ==========================================
-- FASE 1: INSTRUMENTOS (F1_P1)
-- ==========================================
(
  'F1_P1_SPECIALIST',
  'specialist_a',
  'llama-3.1-8b',
  0.3,
  3000,
  'Eres un metodólogo experto en creación de instrumentos de investigación de campo e intervención.',
  'Basado en este sector ({{F0_analisis_sector}}) y gaps detectados ({{F0_gaps_iniciales}}), así como en el userInputs ({{userInputs}}), genera 6 instrumentos de diagnóstico formales (Entrevistas y Cuestionarios).',
  NULL,
  NULL
),
(
  'JUEZ_F1_P1',
  'judge',
  'mistral-7b',
  0.0,
  500,
  'Eres un auditor de evaluación educativa. Valida la existencia correcta de 6 instrumentos dictados.',
  'REVISA ESTE OUTPUT:\n{{instrumentos_raw}}',
  '{
    "sections_required": ["INSTRUMENTO 1", "INSTRUMENTO 2", "INSTRUMENTO 3", "INSTRUMENTO 4", "INSTRUMENTO 5", "INSTRUMENTO 6"]
  }',
  '{
    "type": "object",
    "properties": {
      "status": { "type": "string", "enum": ["ok", "rechazado"] },
      "razon": { "type": "string" },
      "output_final": { "type": "string" }
    }
  }'
),

-- ==========================================
-- FASE 1 P2: DIAGNÓSTICO (5 PORQUÉS)
-- ==========================================
(
  'F1_P2_SPECIALIST',
  'specialist_a',
  'llama-3.1-8b',
  0.3,
  2000,
  'Eres un Consultor Lean Six Sigma aplicando la técnica de los 5 Porqués.',
  'Con base en los datos recabados en los instrumentos: {{F1_P1_instrumentos_validados}} y notas del consultor: {{userInputs}}, aplica los 5 porqués hasta hallar la causa raíz que derive en una Necesidad de Capacitación.',
  NULL,
  NULL
),
(
  'JUEZ_F1_P2',
  'judge',
  'mistral-7b',
  0.0,
  500,
  'Auditor estricto verificando 5 Porqués.',
  'EVALUA DIAGNÓSTICO:\n{{diagnostico_raw}}',
  '{
    "sections_required": ["SÍNTESIS DEL CONTEXTO", "TÉCNICA DE LOS 5 PORQUÉS", "CAUSA RAÍZ IDENTIFICADA", "BRECHAS POR ÁREA DE DOMINIO", "NECESIDAD DE CAPACITACIÓN DERIVADA"]
  }',
  '{"type": "object", "properties": {"status": {"type":"string"}, "razon": {"type":"string"}, "output_final": {"type":"string"}}}'
),

-- ==========================================
-- FASE 2: PRIORIZACIÓN (F2_P1)
-- ==========================================
(
  'F2_P1_SPECIALIST',
  'specialist_a',
  'llama-3.1-8b',
  0.5,
  1500,
  'Andragogo recomendando priorización de cursos.',
  'Diagnóstico (causa raíz): {{F1_P2_diagnostico_validado}}. Inputs: {{userInputs}}. Diseña la parrilla de cursos separando en urgentes y necesarios.',
  NULL,
  NULL
),
(
  'JUEZ_F2_P1',
  'judge',
  'mistral-7b',
  0.0,
  500,
  'Auditor estricto.',
  'EVALUA PARRILLA CURSOS:\n{{cursos_raw}}',
  '{
    "sections_required": ["CURSOS URGENTES", "CURSOS NECESARIOS", "CURSOS CRÍTICOS"]
  }',
  '{"type": "object", "properties": {"status": {"type":"string"}, "razon": {"type":"string"}, "output_final": {"type":"string"}}}'
),

-- ==========================================
-- FASE 4: PRODUCCIÓN PAC
-- ==========================================
(
  'F4_P0_PAC',
  'generator',
  'llama-3.1-8b',
  0.3,
  2000,
  'Asistente que llena el formato legal PAC (Programa Anual de Capacitación).',
  'Especificaciones: {{F3_especificaciones_validadas}}. Llénalo en formato markdown estricto. Inputs: {{userInputs}}',
  NULL,
  NULL
);
