---
id: F4_P5_GENERATE_DOCUMENT
name: Generador de Guías de Actividades — Por Módulo
version: 3.0.0
tags: [EC0366, guias, actividades, json-structured]
pipeline_steps:

  # ── EXTRACTOR ────────────────────────────────────────────────────────────
  - agent: extractor_p5
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      Extract from userInputs the data for ONE single activity.
      
      FIELDS: "actividad_unidad_N" (where N is _modulo_actual), "_modulo_actual", "_nombre_actividad"
      Also check "fase3.unidades" and "productos_previos.P1" for context.
      
      OUTPUT ONLY VALID JSON:
      {
        "modulo": 1,
        "nombre": "string",
        "contenido_form": "verbatim text from form",
        "instrumentos_p1": [
          {"unidad": 1, "tipo": "Guía de Observación", "reactivos": ["..."]}
        ]
      }

  # ═══════════════════════════════════════════════════════════════════════
  # SECCIÓN 1: FICHA DE LA ACTIVIDAD
  # ═══════════════════════════════════════════════════════════════════════
  - agent: agente_ficha_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_p5]
    include_template: false
    task: |
      ROLE: Activity Designer. TASK: Generate activity metadata.
      
      INPUT: {nombre}, {contenido_form}
      
      OUTPUT ONLY THIS JSON:
      {
        "ficha": {
          "objetivo": "Concrete SMART objective using physical verbs",
          "duracion": "X minutes",
          "modalidad": "Presencial/Virtual/Híbrida",
          "tipo": "Demostración/Práctica/Roleplay"
        }
      }

  - agent: agente_ficha_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_p5]
    include_template: false
    task: |
      SAME AS AGENT A. ADD: "pre-requisitos", "complejidad" (Baja/Media/Alta).
      OUTPUT ONLY THIS JSON:
      {"ficha": {"objetivo": "...", "duracion": "...", "modalidad": "...", "tipo": "...", "pre_requisitos": "...", "complejidad": "..."}}

  - agent: juez_ficha
    model: "qwen2.5:14b"
    inputs_from: [agente_ficha_A, agente_ficha_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. Compare METADATA.
      SELECTION: most concrete objective, realistic timing.
      OUTPUT: {"seleccion": "A"|"B", "razon": "one-line"}

  # ═══════════════════════════════════════════════════════════════════════
  # SECCIÓN 2: MATERIALES Y EQUIPO
  # ═══════════════════════════════════════════════════════════════════════
  - agent: agente_materiales_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_p5]
    include_template: false
    task: |
      ROLE: Logistic Planner. TASK: Generate lists.
      INPUT: {contenido_form}
      
      OUTPUT ONLY THIS JSON:
      {
        "logistica": {
          "materiales": ["Item 1 with quantity", "Item 2"],
          "herramientas": ["Tool 1", "Tool 2"],
          "consumibles": ["Consumable 1", "Consumable 2"]
        }
      }

  - agent: agente_materiales_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_p5]
    include_template: false
    task: |
      SAME AS AGENT A. ADD: "especificaciones_tecnicas" (e.g. "Voltaje 110V", "Luz natural").
      OUTPUT ONLY THIS JSON:
      {"logistica": {"materiales": [...], "herramientas": [...], "consumibles": [...], "especificaciones_tecnicas": "..."}}

  - agent: juez_materiales
    model: "qwen2.5:14b"
    inputs_from: [agente_materiales_A, agente_materiales_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. Compare LOGISTICS.
      SELECTION: completeness, specificity.
      OUTPUT: {"seleccion": "A"|"B", "razon": "one-line"}

  # ═══════════════════════════════════════════════════════════════════════
  # SECCIÓN 3: PROCEDIMIENTO (EL "HACER")
  # ═══════════════════════════════════════════════════════════════════════
  - agent: agente_procedimiento_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_p5]
    include_template: false
    task: |
      ROLE: Instructional Designer. TASK: Step-by-step guide.
      CRITICAL: Use ONLY physical action verbs (Coloca, Mide, Corta). NO mental verbs.
      
      OUTPUT ONLY THIS JSON:
      {
        "procedimiento": {
          "preparacion": ["Step 1", "Step 2"],
          "ejecucion": ["Step 1", "Step 2", "Step 3", "Step 4"],
          "cierre_limpieza": ["Step 1", "Step 2"]
        }
      }

  - agent: agente_procedimiento_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_p5]
    include_template: false
    task: |
      SAME AS AGENT A. ADD: "medidas_seguridad" (at least 3 specific warnings).
      OUTPUT ONLY THIS JSON:
      {"procedimiento": {"preparacion": [...], "ejecucion": [...], "cierre_limpieza": [...], "medidas_seguridad": [...]}}

  - agent: juez_procedimiento
    model: "qwen2.5:14b"
    inputs_from: [agente_procedimiento_A, agente_procedimiento_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. Compare PROCEDURES.
      SELECTION: physical verbs only, clear flow, safety included.
      OUTPUT: {"seleccion": "A"|"B", "razon": "one-line"}

  # ═══════════════════════════════════════════════════════════════════════
  # SECCIÓN 4: EVALUACIÓN Y RÚBRICA (ALINEADO A P1)
  # ═══════════════════════════════════════════════════════════════════════
  - agent: agente_evaluacion_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_p5]
    include_template: false
    task: |
      ROLE: Evaluator. TASK: Rubric aligned to P1.
      INPUT: {instrumentos_p1}
      
      OUTPUT ONLY THIS JSON:
      {
        "evaluacion": {
          "evidencia_producto": "What the learner produces (e.g. 'Miniatura pintada')",
          "rubrica": [
            {"criterio": "Specific observable action", "puntos": 5, "indicador_exito": "Description of success"},
            {"criterio": "...", "puntos": 5, "indicador_exito": "..."}
          ]
        }
      }

  - agent: agente_evaluacion_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_p5]
    include_template: false
    task: |
      SAME AS AGENT A. ADD: "errores_comunes" (What to watch for).
      OUTPUT ONLY THIS JSON:
      {"evaluacion": {"evidencia_producto": "...", "rubrica": [...], "errores_comunes": [...]}}

  - agent: juez_evaluacion
    model: "qwen2.5:14b"
    inputs_from: [agente_evaluacion_A, agente_evaluacion_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. Compare EVALUATION.
      SELECTION: alignment to P1, clear rubric, common errors.
      OUTPUT: {"seleccion": "A"|"B", "razon": "one-line"}

  # ═══════════════════════════════════════════════════════════════════════
  # ASSEMBLER
  # ═══════════════════════════════════════════════════════════════════════
  - agent: ensamblador_doc_p5
    model: "qwen2.5:14b"
    inputs_from: [juez_ficha, juez_materiales, juez_procedimiento, juez_evaluacion]
    include_template: false
    task: "CÓDIGO - Assembly in p5-document.assembler.ts"