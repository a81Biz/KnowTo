---
id: TEMARIO_BASE
name: Generación del Temario Base (ancla canónica F4)
version: 1.0.0
tags: [temario, diseño-instruccional, bloom, agnostico]
pipeline_steps:

  # ── EXTRACTOR ─────────────────────────────────────────────────────────────
  - agent: extractor_temario
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      Extract the course structure data from the enriched context.
      Read from: estructura_tematica (from F2 analysis), modalidad (from F2), perfil_ingreso (from F2).

      OUTPUT ONLY VALID JSON:
      {
        "courseTopic": "[value of courseTopic or courseName from context root]",
        "modalidad": "[modalidad string from F2, e.g. Presencial, Virtual, Híbrido]",
        "courseHours": [total hours as number, from F3 specs or F2 if available, default 40],
        "modulos_propuestos": [
          {
            "numero": 1,
            "nombre": "[module name from estructura_tematica]",
            "objetivo_modulo": "[module objective from estructura_tematica]",
            "horas_estimadas": [number],
            "unidades_sugeridas": ["[unit name 1]", "[unit name 2]"]
          }
        ],
        "perfil_ingreso_resumen": "[1-2 sentence summary of learner profile]"
      }

      INSTRUCCIONES ADICIONALES DEL USUARIO: {userInputs.instrucciones_adicionales}
      (Si vacío, proceder con fuentes estándar de F2/F3)

      RULES:
      - Use ONLY data present in the context — never invent module names or objectives
      - If estructura_tematica is unavailable, create 1 placeholder module from courseTopic
      - courseHours must be a positive integer

  # ── SECCIÓN 1: ESTRUCTURA PEDAGÓGICA ──────────────────────────────────────
  # Agente A: propuesta de estructura + objetivos Bloom

  - agent: agente_estructura_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_temario]
    include_template: false
    task: |
      You are an expert instructional designer. Design a competency-based course syllabus.

      INPUT: The extracted course data (extractor_temario output) and full enriched context.

      AGNOSTIC RULE (MANDATORY): This template applies to ANY professional course topic.
      Never reference certification standards, norms, or regulatory bodies in the syllabus content.
      The course topic is defined by {courseTopic} in the context.

      NOMBRE_MODULO RULE (MANDATORY): Module names must describe a specific technical sub-domain or competency area derived from {_frozen.dominio_tecnico}. FORBIDDEN: repeating or paraphrasing the full course name ({_frozen.nombre_oficial_curso}). CORRECT: "Instalación y Configuración de Redes", "Diagnóstico de Fallas Eléctricas". INCORRECT: "Fundamentos del Curso de Redes", "Introducción al Curso".

      YOUR TASK: For each proposed module, define its learning units with:
      - nombre: specific, descriptive unit name (not "Unit 1")
      - objetivo_bloom: one observable learning objective using an action verb
        ALLOWED verbs: Aplica, Ejecuta, Construye, Evalúa, Analiza, Diseña, Demuestra, Identifica, Clasifica, Resuelve
        FORBIDDEN verbs: Conocer, Entender, Saber, Comprender, Aprender, Familiarizar
      - tipo_evaluacion: one of ["Lista de Cotejo", "Guía de Observación", "Cuestionario", "Evidencia de Producto", "Portafolio"]
        Guideline:
          - procedural/motor skills → Lista de Cotejo or Guía de Observación
          - conceptual knowledge → Cuestionario
          - tangible deliverables (creates, builds, produces) → Evidencia de Producto
          - cumulative work across multiple units → Portafolio
          FORBIDDEN: "Cuestionario" for physical performance verbs (Ejecuta, Demuestra, Construye, Aplica con herramientas físicas)

      OUTPUT ONLY VALID JSON:
      {
        "propuesta": "A",
        "modulos": [
          {
            "numero": 1,
            "nombre": "[module name]",
            "unidades": [
              {
                "nombre": "[specific unit name]",
                "objetivo_bloom": "[observable verb + measurable outcome]",
                "tipo_evaluacion": "[Lista de Cotejo | Guía de Observación | Cuestionario | Evidencia de Producto | Portafolio]"
              }
            ]
          }
        ]
      }

  # ── SECCIÓN 1: ESTRUCTURA PEDAGÓGICA ──────────────────────────────────────
  # Agente B: variante pedagógica alternativa

  - agent: agente_estructura_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_temario]
    include_template: false
    task: |
      You are an expert instructional designer. Provide an ALTERNATIVE course syllabus design.

      INPUT: The extracted course data (extractor_temario output) and full enriched context.

      AGNOSTIC RULE (MANDATORY): Never reference certification standards or norms.
      The course topic is defined by {courseTopic} in the context.

      NOMBRE_MODULO RULE (MANDATORY): Module names must describe a specific technical sub-domain or competency area derived from {_frozen.dominio_tecnico}. FORBIDDEN: repeating or paraphrasing the full course name ({_frozen.nombre_oficial_curso}). CORRECT: "Instalación y Configuración de Redes", "Diagnóstico de Fallas Eléctricas". INCORRECT: "Fundamentos del Curso de Redes", "Introducción al Curso".

      YOUR TASK: Design an alternative structure that differs from the obvious first choice:
      - Try a different pedagogical sequence (e.g., problem-first instead of concept-first)
      - Consider combining or splitting modules differently
      - Propose different Bloom verb levels if the first approach was too theoretical
      - Each unit must have an observable objective (no Conocer, Entender, Saber, Comprender)
      - tipo_evaluacion must be one of: ["Lista de Cotejo", "Guía de Observación", "Cuestionario", "Evidencia de Producto", "Portafolio"]
      - "Cuestionario" is FORBIDDEN for physical performance verbs (Ejecuta, Demuestra, Construye, Aplica con herramientas físicas)
      - Tangible deliverables → Evidencia de Producto; cumulative work → Portafolio

      OUTPUT ONLY VALID JSON (same schema as Agente A):
      {
        "propuesta": "B",
        "modulos": [
          {
            "numero": 1,
            "nombre": "[module name]",
            "unidades": [
              {
                "nombre": "[specific unit name]",
                "objetivo_bloom": "[observable verb + measurable outcome]",
                "tipo_evaluacion": "[Lista de Cotejo | Guía de Observación | Cuestionario | Evidencia de Producto | Portafolio]"
              }
            ]
          }
        ]
      }

  # ── JUEZ ESTRUCTURA ────────────────────────────────────────────────────────

  - agent: juez_estructura
    model: "qwen2.5:14b"
    inputs_from: [agente_estructura_A, agente_estructura_B]
    include_template: false
    task: |
      Compare two course syllabus proposals (A and B). Select the better one.

      EVALUATION CRITERIA (in order of priority):
      1. Observable objectives: all verbs must be measurable actions (no Conocer, Entender, Saber)
      2. Pedagogical progression: units build on each other from foundational to complex
      3. Evaluation coherence: tipo_evaluacion matches the skill type of each unit
      4. Coverage: all major aspects of the course topic are addressed

      OUTPUT ONLY VALID JSON:
      {"seleccion": "A" | "B", "razon": "[2-3 sentence justification]"}

      VETO: If BOTH proposals have 2+ units with forbidden verbs (Conocer, Entender, Saber, Comprender),
      output: {"seleccion": "A", "razon": "RECHAZADO — ambas propuestas usan verbos no observables. Se requiere reformulación."}

  # ── SECCIÓN 2: TEMPORALIZACIÓN ────────────────────────────────────────────
  # Agente A: distribución de tiempos

  - agent: agente_tiempos_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_temario, juez_estructura]
    include_template: false
    task: |
      You are an instructional design expert specializing in time planning.

      INPUT:
      - extractor_temario: course data including total courseHours and module structure
      - juez_estructura: the selected syllabus structure (field "seleccion" tells you which proposal won)

      YOUR TASK: Assign realistic durations to each unit of the winning structure.

      RULES:
      - Total sum of all unit durations MUST equal courseHours * 60 minutes (±10 minutes tolerance)
      - Practical/procedural units need MORE time than theoretical ones (ratio: 60-40% practical/theoretical)
      - Minimum unit duration: 30 minutes. Maximum: 240 minutes (4 hours)
      - If a unit is very complex, split it into two sub-units rather than exceeding 4 hours

      OUTPUT ONLY VALID JSON:
      {
        "propuesta": "A",
        "duracion_total_minutos": [courseHours * 60],
        "modulos": [
          {
            "numero": 1,
            "nombre": "[module name]",
            "duracion_total_minutos": [sum of unit durations in this module],
            "justificacion": "[1 sentence: why this time allocation]",
            "unidades": [
              {"nombre": "[unit name]", "duracion_minutos": [integer]}
            ]
          }
        ]
      }

  # ── SECCIÓN 2: TEMPORALIZACIÓN ────────────────────────────────────────────
  # Agente B: distribución alternativa

  - agent: agente_tiempos_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_temario, juez_estructura]
    include_template: false
    task: |
      You are an instructional design expert. Propose an ALTERNATIVE time distribution.

      INPUT: Same as agente_tiempos_A.

      YOUR TASK: Propose a different time allocation strategy:
      - Consider a more compressed schedule (fewer hours for theoretical topics)
      - Or a more expanded schedule (more practice time for complex skills)
      - Total MUST equal courseHours * 60 minutes (±10 minutes)
      - Same constraints: min 30 min, max 240 min per unit

      OUTPUT ONLY VALID JSON (same schema as agente_tiempos_A with "propuesta": "B").

  # ── JUEZ TIEMPOS ──────────────────────────────────────────────────────────

  - agent: juez_tiempos
    model: "qwen2.5:14b"
    inputs_from: [agente_tiempos_A, agente_tiempos_B]
    include_template: false
    task: |
      Compare two time distribution proposals for a course syllabus.

      EVALUATION CRITERIA:
      1. Arithmetic correctness: total_minutos matches sum of all units (reject if off by >10 min)
      2. Realism: no unit exceeds 240 min; no unit is below 30 min
      3. Pedagogical balance: practical units have more time than theoretical ones
      4. Coverage: time allocation reflects complexity of each topic

      OUTPUT ONLY VALID JSON:
      {"seleccion": "A" | "B", "razon": "[justification]"}

      VETO (output seleccion A with RECHAZADO note): if the winning proposal's total is off by
      more than 30 minutes from the required courseHours * 60.

  # ── ENSAMBLADOR (TypeScript — no LLM call) ───────────────────────────────

  - agent: ensamblador_temario
    inputs_from: []
    include_template: false
    task: |
      ASSEMBLER — Handled by temario.phase.ts (handleTemarioEvents).
      This slot does not invoke the LLM. The TypeScript handler:
      1. Reads juez_estructura and juez_tiempos winners
      2. Merges structure + timing into a unified temario JSON
      3. Validates: observable verbs, arithmetic totals
      4. Saves to temario_base table via saveTemarioBase (UPSERT)
      5. Returns the assembled temario as JSON string
---

# TEMARIO BASE — Instrucciones generales

Este pipeline genera el Temario Base de un proyecto de diseño instruccional.
El Temario Base es el ancla canónica para todos los productos F4 — define módulos,
unidades, objetivos Bloom, duraciones y tipos de evaluación.

Una vez generado y confirmado por el usuario, sirve como fuente de verdad para
P4 (Manual), P1 (Instrumentos), P5 (Guías de Actividades), P6 (Calendario) y P8 (Cronograma).
