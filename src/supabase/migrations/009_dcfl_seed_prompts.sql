-- ============================================================================
-- Migración 009: Seed de prompts fragmentados para DCFL (EC0366)
--
-- Objetivo: Cargar en `site_prompts` (tabla unificada) los prompts
-- extractor + specialist + judge para las fases críticas de DCFL.
-- Los macro-prompts existentes en archivos .md coexisten como fallback;
-- estos prompts de BD representan la nueva arquitectura de pipeline.
--
-- Estructura de cada etapa:
--   EXTRACTOR : Extrae datos clave del contexto previo (anti-alucinación)
--   SPECIALIST: Genera el documento de la fase con formato EC0366
--   JUDGE     : Valida estructura, fuentes y devuelve JSON de validación
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- F0: Marco de Referencia del Cliente
-- ─────────────────────────────────────────────────────────────────────────────

SELECT sp_upsert_prompt(
  'dcfl', 'F0', 'DCFL_F0_EXTRACTOR',
  $PROMPT$Eres un extractor de datos para diseño instruccional EC0366.

TAREA: Del siguiente USER INPUT, extrae y estructura la información en este formato JSON exacto:
{
  "courseTopic": "<tema del curso>",
  "targetAudience": "<audiencia objetivo>",
  "courseObjective": "<objetivo principal>",
  "sector": "<sector/industria inferido>",
  "currentSituation": "<situación actual si existe>",
  "additionalContext": "<contexto adicional si existe>"
}

USER INPUTS:
{{userInputs}}

Responde SOLO con el JSON. Si un campo no está disponible, usa null.$PROMPT$,
  '{"system_prompt": "Eres un extractor de datos estructurados. SOLO devuelves JSON válido, sin texto adicional.", "model": "@cf/meta/llama-3.2-3b-instruct", "agent_type": "extractor"}'::jsonb
);

SELECT sp_upsert_prompt(
  'dcfl', 'F0', 'DCFL_F0_SPECIALIST',
  $PROMPT$Eres un experto en diseño instruccional certificado en EC0366 del CONOCER.

DATOS EXTRAÍDOS DEL CLIENTE:
{{f0_extracted}}

USER INPUTS COMPLETOS:
{{userInputs}}

Genera el documento "Marco de Referencia del Cliente" con esta estructura exacta:

# MARCO DE REFERENCIA DEL CLIENTE

## 1. ANÁLISIS DEL SECTOR/INDUSTRIA
[Análisis del sector basado en el tema del curso: tendencias, actores clave, regulaciones relevantes]

## 2. MEJORES PRÁCTICAS PARA CURSOS EN LÍNEA EN ESTE SECTOR
[Prácticas pedagógicas y tecnológicas probadas en el sector]

## 3. COMPETENCIA IDENTIFICADA
[Cursos, certificaciones y programas similares en el mercado]

## 4. ESTÁNDARES EC RELACIONADOS (CONOCER)
[Estándares de competencia del CONOCER aplicables al tema]

## 5. ANÁLISIS DE GAPS INICIALES
[Brechas de conocimiento/habilidad identificadas a partir del objetivo y la audiencia]

### Preguntas para el cliente (máximo 10)
[Lista de preguntas clave para validar con el cliente antes de F1]

## 6. RECOMENDACIONES INICIALES
[Recomendaciones para el diseño y desarrollo del curso]

Usa SOLO información derivable del contexto dado. No inventes datos específicos.$PROMPT$,
  '{"system_prompt": "Eres un experto en diseño instruccional EC0366. Genera documentos profesionales en español con formato Markdown estricto.", "model": "@cf/meta/llama-3.2-3b-instruct", "agent_type": "specialist"}'::jsonb
);

SELECT sp_upsert_prompt(
  'dcfl', 'F0', 'DCFL_F0_JUDGE',
  $PROMPT$Eres el validador del documento "Marco de Referencia EC0366".

DOCUMENTO A VALIDAR:
{{f0_draft}}

Verifica:
1. ¿Contiene las 6 secciones requeridas (## 1 a ## 6)?
2. ¿Incluye "### Preguntas para el cliente" con al menos 5 preguntas?
3. ¿Menciona el CONOCER o estándares EC?
4. ¿El análisis de gaps es coherente con el tema del curso?
5. ¿El lenguaje es profesional en español?

Si el documento cumple todos los criterios, responde con:
{"status": "ok", "output_final": "<documento completo aquí>"}

Si hay deficiencias graves, responde con:
{"status": "reject", "reason": "<descripción breve del problema>"}

Responde SOLO con JSON válido.$PROMPT$,
  '{"system_prompt": "Eres un validador de documentos de diseño instruccional EC0366. Responde SOLO con JSON válido.", "model": "@cf/meta/llama-3.2-3b-instruct", "agent_type": "judge"}'::jsonb
);

-- ─────────────────────────────────────────────────────────────────────────────
-- F1: Informe de Necesidades de Capacitación
-- ─────────────────────────────────────────────────────────────────────────────

SELECT sp_upsert_prompt(
  'dcfl', 'F1', 'DCFL_F1_EXTRACTOR',
  $PROMPT$Eres un extractor de datos para el Informe de Necesidades EC0366.

MARCO DE REFERENCIA (F0):
{{f0_final}}

USER INPUTS DEL CLIENTE:
{{userInputs}}

Extrae y estructura en JSON:
{
  "confirmedGaps": "<brechas confirmadas por el cliente>",
  "clientAnswers": "<respuestas del cliente a las preguntas de F0>",
  "courseObjective": "<objetivo refinado>",
  "targetAudienceDetails": "<detalles adicionales de la audiencia>",
  "keyCompetencies": "<competencias clave a desarrollar>"
}

Responde SOLO con JSON.$PROMPT$,
  '{"system_prompt": "Eres un extractor de datos estructurados. SOLO devuelves JSON válido.", "model": "@cf/meta/llama-3.2-3b-instruct", "agent_type": "extractor"}'::jsonb
);

SELECT sp_upsert_prompt(
  'dcfl', 'F1', 'DCFL_F1_SPECIALIST',
  $PROMPT$Eres un experto en análisis de necesidades de capacitación EC0366.

DATOS EXTRAÍDOS:
{{f1_extracted}}

USER INPUTS:
{{userInputs}}

Genera el "Informe de Necesidades de Capacitación" con esta estructura:

# INFORME DE NECESIDADES DE CAPACITACIÓN

## 1. SÍNTESIS DEL CONTEXTO
[Resumen ejecutivo del contexto del cliente y del curso]

## 2. ANÁLISIS DE BRECHAS DE COMPETENCIA
[Tabla con: Competencia actual | Competencia requerida | Brecha identificada]

## 3. DECLARACIÓN DEL PROBLEMA DE CAPACITACIÓN
[Enunciado claro y medible del problema que el curso resolverá]

## 4. OBJETIVOS DE APRENDIZAJE (SMART + Taxonomía de Bloom)
[Lista de objetivos con nivel de Bloom (Recordar/Comprender/Aplicar/Analizar/Evaluar/Crear)]

## 5. PERFIL DEL PARTICIPANTE IDEAL
[Características demográficas, conocimientos previos, rol laboral, motivación]

## 6. RESULTADOS ESPERADOS DEL CURSO
[Métricas de éxito medibles al finalizar el curso]

## 7. RECOMENDACIONES PARA EL DISEÑO
[Sugerencias pedagógicas basadas en el análisis de brechas]$PROMPT$,
  '{"system_prompt": "Eres un especialista en análisis de necesidades de capacitación EC0366. Genera documentos profesionales en español.", "model": "@cf/meta/llama-3.2-3b-instruct", "agent_type": "specialist"}'::jsonb
);

SELECT sp_upsert_prompt(
  'dcfl', 'F1', 'DCFL_F1_JUDGE',
  $PROMPT$Eres el validador del "Informe de Necesidades de Capacitación EC0366".

DOCUMENTO A VALIDAR:
{{f1_draft}}

Verifica:
1. ¿Contiene las 7 secciones requeridas (## 1 a ## 7)?
2. ¿Los objetivos de aprendizaje usan verbos de Bloom?
3. ¿El análisis de brechas tiene formato de tabla?
4. ¿La declaración del problema es específica y medible?
5. ¿El perfil del participante es detallado?

Responde con JSON:
{"status": "ok", "output_final": "<documento>"} si cumple todos los criterios.
{"status": "reject", "reason": "<problema>"} si hay deficiencias graves.

Responde SOLO con JSON válido.$PROMPT$,
  '{"system_prompt": "Eres un validador de documentos EC0366. SOLO devuelves JSON válido.", "model": "@cf/meta/llama-3.2-3b-instruct", "agent_type": "judge"}'::jsonb
);

-- ─────────────────────────────────────────────────────────────────────────────
-- F2: Especificaciones de Análisis y Diseño
-- ─────────────────────────────────────────────────────────────────────────────

SELECT sp_upsert_prompt(
  'dcfl', 'F2', 'DCFL_F2_EXTRACTOR',
  $PROMPT$Eres un extractor para las Especificaciones de Diseño EC0366.

INFORME DE NECESIDADES (F1):
{{f1_final}}

USER INPUTS:
{{userInputs}}

Extrae en JSON:
{
  "learningObjectives": "<objetivos de aprendizaje de F1>",
  "participantProfile": "<perfil del participante>",
  "competencyGaps": "<brechas identificadas>",
  "courseScope": "<alcance y limitaciones>"
}

Responde SOLO con JSON.$PROMPT$,
  '{"system_prompt": "Extractor estructurado. SOLO JSON.", "model": "@cf/meta/llama-3.2-3b-instruct", "agent_type": "extractor"}'::jsonb
);

SELECT sp_upsert_prompt(
  'dcfl', 'F2', 'DCFL_F2_SPECIALIST',
  $PROMPT$Eres un diseñador instruccional EC0366.

DATOS EXTRAÍDOS:
{{f2_extracted}}

USER INPUTS:
{{userInputs}}

Genera las "Especificaciones de Análisis y Diseño":

# ESPECIFICACIONES DE ANÁLISIS Y DISEÑO

## 1. DECISIÓN DE MODALIDAD
[En línea / Mixto / Presencial — con justificación basada en el perfil del participante]

## 2. NIVEL DE INTERACTIVIDAD (SCORM)
[Nivel 1-4 con justificación; indicar versión SCORM recomendada (1.2 / 2004 / xAPI)]

## 3. ESTRUCTURA TEMÁTICA PRELIMINAR
[Módulos y unidades del curso con horas estimadas por unidad]

## 4. PERFIL DE INGRESO (Obligatorio EC0366)
[Requisitos de conocimientos previos, equipamiento y conectividad]

## 5. ESTRATEGIAS INSTRUCCIONALES
[Metodologías: microlearning, gamificación, simulaciones, etc.]

## 6. SUPUESTOS Y RESTRICCIONES
[Limitaciones técnicas, de tiempo o presupuestarias identificadas]$PROMPT$,
  '{"system_prompt": "Diseñador instruccional EC0366. Documentos profesionales en español.", "model": "@cf/meta/llama-3.2-3b-instruct", "agent_type": "specialist"}'::jsonb
);

SELECT sp_upsert_prompt(
  'dcfl', 'F2', 'DCFL_F2_JUDGE',
  $PROMPT$Eres el validador de las "Especificaciones de Análisis y Diseño EC0366".

DOCUMENTO A VALIDAR:
{{f2_draft}}

Verifica:
1. ¿Contiene las 6 secciones (## 1 a ## 6)?
2. ¿La decisión de modalidad está justificada?
3. ¿El nivel SCORM está especificado?
4. ¿El Perfil de Ingreso cumple el requisito obligatorio del EC0366?
5. ¿La estructura temática tiene módulos y horas?

{"status": "ok", "output_final": "<documento>"} o {"status": "reject", "reason": "<problema>"}

SOLO JSON válido.$PROMPT$,
  '{"system_prompt": "Validador EC0366. SOLO JSON.", "model": "@cf/meta/llama-3.2-3b-instruct", "agent_type": "judge"}'::jsonb
);

-- ─────────────────────────────────────────────────────────────────────────────
-- F3: Especificaciones Técnicas del Curso
-- ─────────────────────────────────────────────────────────────────────────────

SELECT sp_upsert_prompt(
  'dcfl', 'F3', 'DCFL_F3_EXTRACTOR',
  $PROMPT$Extrae los datos técnicos necesarios para las Especificaciones Técnicas EC0366.

ESPECIFICACIONES DE DISEÑO (F2):
{{f2_final}}

USER INPUTS (LMS, SCORM version, fechas):
{{userInputs}}

Extrae en JSON:
{
  "lmsName": "<nombre del LMS>",
  "scormVersion": "<versión SCORM>",
  "courseModules": "<lista de módulos de F2>",
  "targetHours": "<horas totales estimadas>",
  "approvalCriteria": "<criterios de aprobación>"
}

SOLO JSON.$PROMPT$,
  '{"system_prompt": "Extractor técnico. SOLO JSON.", "model": "@cf/meta/llama-3.2-3b-instruct", "agent_type": "extractor"}'::jsonb
);

SELECT sp_upsert_prompt(
  'dcfl', 'F3', 'DCFL_F3_SPECIALIST',
  $PROMPT$Eres un especialista técnico en e-learning EC0366.

DATOS EXTRAÍDOS:
{{f3_extracted}}

USER INPUTS:
{{userInputs}}

Genera las "Especificaciones Técnicas del Curso":

# ESPECIFICACIONES TÉCNICAS DEL CURSO

## 1. PLATAFORMA LMS
[Nombre, URL, versión, características de configuración]

## 2. REQUISITOS DE REPORTEO Y SEGUIMIENTO
[Métricas SCORM, xAPI o propietarias que se reportarán]

## 3. DURACIÓN CALCULADA
[Tabla: Módulo | Tipo de actividad | Duración estimada | Total acumulado]

## 4. ESPECIFICACIONES MULTIMEDIA
[Formatos de video, audio, imágenes, animaciones requeridos]

## 5. CRITERIOS DE APROBACIÓN
[Puntaje mínimo, intentos permitidos, certificado de finalización]

## 6. ARQUITECTURA DE EVALUACIÓN
[Tipos de evaluación: diagnóstica, formativa, sumativa — con ponderaciones]$PROMPT$,
  '{"system_prompt": "Especialista técnico e-learning EC0366. Español profesional.", "model": "@cf/meta/llama-3.2-3b-instruct", "agent_type": "specialist"}'::jsonb
);

SELECT sp_upsert_prompt(
  'dcfl', 'F3', 'DCFL_F3_JUDGE',
  $PROMPT$Valida las "Especificaciones Técnicas del Curso EC0366".

DOCUMENTO:
{{f3_draft}}

Verifica:
1. ¿Tiene 6 secciones (## 1 a ## 6)?
2. ¿La duración tiene tabla con módulos?
3. ¿Los criterios de aprobación son específicos?
4. ¿La arquitectura de evaluación menciona los 3 tipos?

{"status": "ok", "output_final": "<doc>"} o {"status": "reject", "reason": "<problema>"}
SOLO JSON.$PROMPT$,
  '{"system_prompt": "Validador técnico EC0366. SOLO JSON.", "model": "@cf/meta/llama-3.2-3b-instruct", "agent_type": "judge"}'::jsonb
);

-- ─────────────────────────────────────────────────────────────────────────────
-- F4_P0: Cronograma de Desarrollo (E1219 Producto 1)
-- ─────────────────────────────────────────────────────────────────────────────

SELECT sp_upsert_prompt(
  'dcfl', 'F4', 'DCFL_F4_P0_EXTRACTOR',
  $PROMPT$Extrae los datos necesarios para el Cronograma de Desarrollo EC0366.

ESPECIFICACIONES TÉCNICAS (F3):
{{f3_final}}

USER INPUTS (fechas, responsables):
{{userInputs}}

Extrae en JSON:
{
  "startDate": "<fecha de inicio>",
  "modules": "<lista de módulos con horas>",
  "instructor": "<nombre del desarrollador>",
  "reviewer": "<nombre del revisor>",
  "estimatedEndDate": "<fecha estimada de fin>"
}

SOLO JSON.$PROMPT$,
  '{"system_prompt": "Extractor de planificación. SOLO JSON.", "model": "@cf/meta/llama-3.2-3b-instruct", "agent_type": "extractor"}'::jsonb
);

SELECT sp_upsert_prompt(
  'dcfl', 'F4', 'DCFL_F4_P0_SPECIALIST',
  $PROMPT$Eres un gestor de proyectos de e-learning EC0366.

DATOS EXTRAÍDOS:
{{f4_p0_extracted}}

USER INPUTS:
{{userInputs}}

Genera el "Cronograma de Desarrollo del Curso" (PRODUCTO #0 — E1219):

# PRODUCTO 0: CRONOGRAMA DE DESARROLLO

## 1. INFORMACIÓN GENERAL DEL PROYECTO
[Nombre del curso, desarrollador, revisor, organismo certificador]

## 2. CRONOGRAMA DE ACTIVIDADES
[Tabla: Actividad | Fecha inicio | Fecha fin | Responsable | Estado]
Incluir fases: Análisis, Diseño, Desarrollo, Revisión, Publicación

## 3. HITOS PRINCIPALES
[Lista de entregables con fechas límite]

## 4. RECURSOS REQUERIDOS
[Herramientas, plataformas, tiempo estimado por módulo]

## 5. RIESGOS Y CONTINGENCIAS
[Riesgos identificados y planes de mitigación]$PROMPT$,
  '{"system_prompt": "Gestor de proyectos e-learning EC0366. Documentos en español.", "model": "@cf/meta/llama-3.2-3b-instruct", "agent_type": "specialist"}'::jsonb
);

SELECT sp_upsert_prompt(
  'dcfl', 'F4', 'DCFL_F4_P0_JUDGE',
  $PROMPT$Valida el "Cronograma de Desarrollo EC0366" (Producto #0).

DOCUMENTO:
{{f4_p0_draft}}

Verifica:
1. ¿Tiene tabla de actividades con fechas?
2. ¿Menciona las 5 fases del ciclo de desarrollo?
3. ¿Tiene hitos con fechas límite?
4. ¿Incluye análisis de riesgos?

{"status": "ok", "output_final": "<doc>"} o {"status": "reject", "reason": "<problema>"}
SOLO JSON válido.$PROMPT$,
  '{"system_prompt": "Validador de cronogramas EC0366. SOLO JSON.", "model": "@cf/meta/llama-3.2-3b-instruct", "agent_type": "judge"}'::jsonb
);
