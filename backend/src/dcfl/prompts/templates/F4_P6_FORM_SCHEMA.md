---
id: F4_P6_FORM_SCHEMA
name: Generador de Esquema Dinámico P6 (Calendario General)
version: 2.0.0
tags: [EC0366, formulario, calendario, cronograma]
pipeline_steps:

  # ── EXTRACTOR ────────────────────────────────────────────────────────────
  - agent: extractor_f4
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      YOU ARE AN EXTRACTOR, NOT AN EDITOR. Your ONLY job is to copy fields verbatim from the source.
      NEVER rewrite, rephrase, improve, or apply any verb rules to any text — copy it EXACTLY as written.
      Even if the objective says "comprenderá", "sabrá", or "conocerá" — copy it as-is. Do NOT change it.
      
      Extract ALL units and the volume of content generated across P1-P5.
      SOURCE: The context contains fase3.unidades (F2/F3) and P1-P5 data from productos_previos or userInputs.
      
      MANDATORY — Extract P5 activity data from "productos_previos.P5":
      Look in "productos_previos.P5.partesAcumuladas" (or top-level keys matching "modulo_N").
      For each unit's module key (e.g. "modulo_1"), extract from the activity's "ficha":
        - "objetivo": activity objective string
        - "duracion": estimated duration string
      Also extract the activity's "logistica.materiales" array.
      Build "p5_actividades" as a dict keyed by "unidad_N" (e.g. "unidad_1", "unidad_2").
      If "productos_previos.P5" is absent or a module key is missing, output empty objects.
      DO NOT invent data — copy only what literally appears in the P5 datos_producto.
      
      DO NOT TRUNCATE. Return every unit.
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {
        "unidades": [{"modulo": 1, "nombre": "...", "objetivo": "..."}, {"modulo": 2, "nombre": "...", "objetivo": "..."}],
        "p5_actividades": {
          "unidad_1": {"objetivo": "...", "duracion": "45 minutos", "materiales": ["item from P5"]},
          "unidad_2": {"objetivo": "", "duracion": "", "materiales": []}
        }
      }

  # ── AGENTE A: SCHEDULE PLANNER ───────────────────────────────────────────
  - agent: agente_form_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_f4]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You are a Course Scheduler under EC0366. Your task is to plan the session schedule for a course.
      
      SOURCE OF TRUTH: The units from the syllabus (F2/F3), the duration calculations from F3, and the volume of content from P1-P5.
      
      FOR EACH UNIT:
      1. Read its "nombre" and "objetivo".
      2. Read F3's calculo_duracion for the unit's allocated hours.
      3. Read the volume of P1-P5 content generated for this unit to estimate realistic session time.
      4. Design a session plan with 6 fields:
         - Sesión: Session number in the course sequence.
         - Tema principal: Unit name being covered.
         - Duración: Estimated hours for this session — must align with F3's calculated duration.
         - Modalidad: Presencial / En línea / Mixto — from F2's modality selection.
         - Actividades programadas: List of learning activities drawn from P2 (slides), P3 (videos), P4 (manual study), P5 (practice activities).
         - Evaluación: The specific instrument or evidence to collect in this session — reference P1's instrument type by name.
      
      RULES:
      1. SAME NUMBER OF ELEMENTS AS UNITS RECEIVED.
      2. P1-P5 VOLUME: The Duración must realistically accommodate the content volume already produced. If P3 generated 4 scenes per unit and P5 generated a 45-minute activity, the session must have enough hours to cover them.
      3. F3 ALIGNMENT: Total hours across all sessions must match F3's duracion_total_horas_aprox.
      4. SPECIFIC INSTRUMENT NAME: The Evaluación field MUST state the exact instrument type from P1 (e.g., "Guía de Observación", "Lista de Cotejo", "Cuestionario"). Do not abbreviate or paraphrase.
      5. field "name" MUST be: "sesion_unidad_" + modulo.
      6. USE \n FOR LINE BREAKS in suggested_value.
      
      EXACT OUTPUT FORMAT:
      [
        {
          "name": "sesion_unidad_1",
          "label": "Sesión: [Unit name]",
          "suggested_value": "Sesión: ...\nTema principal: ...\nDuración: ...\nModalidad: ...\nActividades programadas: ...\nEvaluación: ...",
          "type": "textarea"
        }
      ]

  # ── AGENTE B: DESCRIPTIVE CHART PLANNER ──────────────────────────────────
  - agent: agente_form_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_f4]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You are a Course Logistics Planner under EC0366. Your task is to create descriptive session charts.
      
      SOURCE OF TRUTH: The units from the syllabus (F2/F3), the F3 duration data, and the P1-P5 content volume.
      
      FOR EACH UNIT:
      1. Read its "nombre" and "objetivo".
      2. Read F3's calculo_duracion for hours distribution.
      3. Read P1-P5 to identify resources, products, and responsible roles.
      4. Design a descriptive chart with 6 fields:
         - Unidad: Module name.
         - Horas teóricas: Hours for conceptual content (from F3's desglose).
         - Horas prácticas: Hours for workshop/practice (from F3's desglose).
         - Recursos didácticos: Materials, equipment, or platform required — list real items from P5's materiales and P2's visual resources.
         - Productos esperados: Evidence the participant delivers — from P1's Evidencia and P5's Evidencia a entregar.
         - Responsable: Instructor / Facilitador / Coordinador — based on the activity type.
      
      RULES:
      1. SAME NUMBER OF ELEMENTS AS UNITS RECEIVED.
      2. HOURS BREAKDOWN: Horas teóricas + Horas prácticas must equal the unit's total duration from F3.
      3. REAL RESOURCES: Recursos didácticos must list actual items from P5 and P2, not generic categories.
      4. REAL PRODUCTS: Productos esperados must reference the specific evidence names from P1 and P5.
      5. field "name" MUST be: "sesion_unidad_" + modulo.
      6. USE \n FOR LINE BREAKS in suggested_value.
      
      EXACT OUTPUT FORMAT:
      [
        {
          "name": "sesion_unidad_1",
          "label": "Sesión: [Unit name]",
          "suggested_value": "Unidad: ...\nHoras teóricas: ...\nHoras prácticas: ...\nRecursos didácticos: ...\nProductos esperados: ...\nResponsable: ...",
          "type": "textarea"
        }
      ]

  # ── JUDGE ────────────────────────────────────────────────────────────────
  - agent: juez_form
    model: "qwen2.5:14b"
    inputs_from: [agente_form_A, agente_form_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.
      
      Compare the arrays from A and B. Choose the best course schedule.
      
      SELECTION CRITERIA:
      1. P1-P5 COVERAGE: Does the schedule accommodate the actual content volume produced? Are all activities, videos, and evaluations realistically distributed?
      2. F3 ALIGNMENT: Do total hours and theoretical/practical breakdown match F3's duracion_total_horas_aprox and desglose?
      3. SPECIFICITY: Are evaluation instruments, resources, and products named specifically — not "materiales varios" or "evaluación de la unidad"?
      4. COMPLETENESS: Does the array have exactly as many elements as units? All fields filled?
      5. REALISTIC SEQUENCING: Does the session order make pedagogical sense? Are prerequisites covered before advanced topics?
      
      OUTPUT ONLY THIS JSON:
      {"seleccion": "A" | "B", "razon": "brief explanation"}

  # ── ASSEMBLER ────────────────────────────────────────────────────────────
  - agent: ensamblador_form_schema
    model: "qwen2.5:14b"
    inputs_from: [juez_form]
    include_template: false
    task: "CÓDIGO - Assembly in form-schema.assembler.ts"
---