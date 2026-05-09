---
id: F4_P8_FORM_SCHEMA
name: Generador de Esquema Dinámico P8 (Cronograma de Desarrollo)
version: 2.0.0
tags: [EC0366, formulario, cronograma, desarrollo]
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
      
      Extract ALL units and the total weight of all deliverables from P1-P7.
      SOURCE: The context contains fase3.unidades (F2/F3) and P1-P7 data from productos_previos.
      
      MANDATORY — Extract effort indicators from "productos_previos":
      1. From "productos_previos.P4.capitulos": For each chapter, read chapter.unidad and count the number of keys in chapter.secciones_json (each key = one content section).
      2. From "productos_previos.P5": For each module key (e.g. "modulo_1"), read the activity's "ficha.duracion" string.
      Build "esfuerzo_por_unidad" as a dict keyed by "unidad_N" (e.g. "unidad_1", "unidad_2"):
        - "p4_secciones": integer — count of secciones_json keys for that unit in P4
        - "p5_duracion": string — activity duration from P5 ficha (e.g. "45 minutos") or "" if absent
      If data is absent for a unit, output {"p4_secciones": 0, "p5_duracion": ""}.
      DO NOT invent numbers — derive only from actual P4/P5 data.
      
      DO NOT TRUNCATE. Return every unit.
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {
        "unidades": [{"modulo": 1, "nombre": "...", "objetivo": "..."}, {"modulo": 2, "nombre": "...", "objetivo": "..."}],
        "esfuerzo_por_unidad": {
          "unidad_1": {"p4_secciones": 5, "p5_duracion": "45 minutos"},
          "unidad_2": {"p4_secciones": 3, "p5_duracion": "60 minutos"}
        }
      }

  # ── AGENTE A: DEVELOPMENT PLANNER ────────────────────────────────────────
  - agent: agente_form_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_f4]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You are an EC0366 Production Planner scheduling the development of all course materials.
      
      SOURCE OF TRUTH: The units from the syllabus (F2/F3) and the total weight of P1-P7 deliverables already produced.
      
      FOR EACH UNIT:
      1. Read its "nombre" and "objetivo".
      2. Read the corresponding P1-P7 products to identify WHAT was produced for this unit and HOW MUCH effort it represents.
      3. Design a development task with 6 fields:
         - Entregable: The material to produce for this unit — list the specific P1-P7 products that exist for it.
         - Responsable: Who produces the material — diseñador instruccional, experto de contenido, coordinador, productor multimedia.
         - Fecha inicio: Start week or month — use week numbers (Semana 1, Semana 2...) from a realistic production timeline.
         - Fecha entrega: Delivery deadline for review-ready material.
         - Revisión y ajustes: Estimated time for corrections after client/stakeholder review.
         - Estado: Pendiente / En proceso / Completado — based on whether the P1-P7 product already exists for this unit.
      
      RULES:
      1. SAME NUMBER OF ELEMENTS AS UNITS RECEIVED.
      2. P1-P7 WEIGHT: The schedule MUST reflect the actual production effort. Units with more products (P1-P7 all present) require more development time than units with fewer.
      3. PRODUCTION DEPENDENCIES: Respect the production order from the master flow — P3 before P4 for the same unit, P2 before P4, P1 before P5. Schedule accordingly.
      4. BUSINESS DAYS ONLY: All dates must fall on business days (Mon-Fri). Do not schedule deliveries on weekends.
      5. REALISTIC DURATION: Each unit's development span must allow enough calendar weeks for the estimated production hours. A 40-hour production cannot be delivered in 2 days.
      6. field "name" MUST be: "cronograma_unidad_" + modulo.
      7. USE \n FOR LINE BREAKS in suggested_value.
      
      EXACT OUTPUT FORMAT:
      [
        {
          "name": "cronograma_unidad_1",
          "label": "Desarrollo: [Unit name]",
          "suggested_value": "Entregable: ...\nResponsable: ...\nFecha inicio: ...\nFecha entrega: ...\nRevisión y ajustes: ...\nEstado: Pendiente",
          "type": "textarea"
        }
      ]

  # ── AGENTE B: PRODUCTION RESOURCE PLANNER ────────────────────────────────
  - agent: agente_form_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_f4]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You are an EC0366 Resource Manager planning the production resources and validation milestones.
      
      SOURCE OF TRUTH: The units from the syllabus (F2/F3) and the total weight of P1-P7 deliverables.
      
      FOR EACH UNIT:
      1. Read its "nombre" and "objetivo".
      2. Read the corresponding P1-P7 products to identify types and quantities of materials.
      3. Design a production plan with 6 fields:
         - Módulo: Unit name.
         - Materiales a desarrollar: List of resources — videos, manual chapters, slide decks, activity guides, scripts — with quantities from P1-P7 data.
         - Horas de producción estimadas: Total design and production time — sum efforts across P2 (slides), P3 (scripts), P4 (manual), P5 (activities).
         - Recursos necesarios: Equipment, software, content experts — from F3's plataforma and P3's production notes.
         - Hito de validación: Criterion that indicates the material is ready — from F3's criterios_aceptacion.
         - Prioridad: Alta / Media / Baja — based on whether this unit is a prerequisite for later units.
      
      RULES:
      1. SAME NUMBER OF ELEMENTS AS UNITS RECEIVED.
      2. HOURS FROM PRODUCTS: Horas de producción estimadas must be derived from the actual content volume in P1-P7, not guessed. A unit with 4 P3 scenes + P4 chapter + P5 activity = demonstrably more hours than a unit with only P2 slides.
      3. VALIDATION FROM F3: Hito de validación must reference specific criteria from F3's criterios_aceptacion (contenido, técnicos, pedagógicos, accesibilidad).
      4. PRIORITY LOGIC: Earlier units get Alta prioridad (they unlock later units). Final project units get Media. Review/integration gets Alta.
      5. field "name" MUST be: "cronograma_unidad_" + modulo.
      6. USE \n FOR LINE BREAKS in suggested_value.
      
      EXACT OUTPUT FORMAT:
      [
        {
          "name": "cronograma_unidad_1",
          "label": "Desarrollo: [Unit name]",
          "suggested_value": "Módulo: ...\nMateriales a desarrollar: ...\nHoras de producción estimadas: ...\nRecursos necesarios: ...\nHito de validación: ...\nPrioridad: ...",
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
      
      Compare the arrays from A and B. Choose the best development schedule.
      
      SELECTION CRITERIA:
      1. PRODUCTION REALISM: Are durations realistic given the estimated hours? Does the schedule respect dependencies (P3 before P4, P1 before P5)?
      2. P1-P7 GROUNDING: Are deliverables, hours, and validation criteria derived from actual P1-P7 products and F3 criteria — not invented?
      3. BUSINESS-DAY COMPLIANCE: Are all dates on business days? No weekend deliveries.
      4. COMPLETENESS: Does the array have exactly as many elements as units? All fields filled?
      5. PRIORITY LOGIC: Are prerequisite units prioritized higher? Does the schedule flow make production sense?
      
      OUTPUT ONLY THIS JSON:
      {"seleccion": "A" | "B", "razon": "brief explanation"}

  # ── ASSEMBLER ────────────────────────────────────────────────────────────
  - agent: ensamblador_form_schema
    model: "qwen2.5:14b"
    inputs_from: [juez_form]
    include_template: false
    task: "CÓDIGO - Assembly in form-schema.assembler.ts"
---