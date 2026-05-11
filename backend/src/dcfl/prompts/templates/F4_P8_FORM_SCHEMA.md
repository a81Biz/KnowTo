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
      
      MANDATORY FIRST ITEMS — always output these 8 before per-unit items:
      1. "fecha_inicio_produccion": The date when material production begins (DD/MM/YYYY format). This anchors all "Fecha inicio" and "Fecha entrega" fields.
      2. "fecha_inicio_formacion": The planned date for the first training session (DD/MM/YYYY format). Production must complete before this date.
      3. "lugar_imparticion": The physical or virtual location where training will take place (e.g., "Centro de capacitación / Sala de juntas / En línea vía Zoom").
      4. "modalidad_imparticion": Training modality — "Presencial", "Virtual", or "Híbrido".
      5. "numero_grupos": Number of candidate groups or total candidate count (e.g., "1 grupo de 12 candidatos").
      6. "nombre_di": Full name of the Instructional Designer (DI) responsible for this project. Required to assign real accountability in quality gates.
      7. "nombre_sme": Full name of the Subject Matter Expert (SME / Experto en la Materia) who validates content accuracy.
      8. "nombre_coordinador": Full name of the project Coordinator responsible for schedule adherence and stakeholder communication.
      
      FOR EACH UNIT (items 6 and beyond):
      1. Read its "nombre" and "objetivo".
      2. Read the corresponding P1-P7 products to identify WHAT was produced and HOW MUCH effort it represents.
      3. Design a development task with 6 fields:
         - Entregable: The specific P1-P7 products that exist for this unit (list them by name).
         - Responsable: Who produces — diseñador instruccional, experto de contenido, coordinador, productor multimedia.
         - Fecha inicio: Real calendar date (DD/MM/YYYY) anchored from fecha_inicio_produccion. Use week offsets.
         - Fecha entrega: Real delivery deadline (DD/MM/YYYY). Must be before fecha_inicio_formacion.
         - Revisión y ajustes: Estimated days for corrections after review.
         - Estado: Pendiente / En proceso / Completado.
      
      RULES:
      1. OUTPUT LENGTH = 8 + number of units.
      2. REAL DATES: All dates must be real DD/MM/YYYY dates anchored from fecha_inicio_produccion. No "Semana N" or "Día X".
      3. BUSINESS DAYS ONLY: Mon-Fri only. No weekend dates.
      4. PRODUCTION DEPENDENCIES: P3 before P4, P2 before P4, P1 before P5. Schedule accordingly.
      5. field "name" MUST be: "cronograma_unidad_" + modulo for unit fields.
      6. USE \n FOR LINE BREAKS in suggested_value.
      7. RESPONSIBLE PERSONS: Use nombre_di, nombre_sme, nombre_coordinador fields in the "Responsable" column of each unit item. Do not use generic roles — use the actual names from these fields.
      
      EXACT OUTPUT FORMAT:
      [
        {
          "name": "fecha_inicio_produccion",
          "label": "Fecha de inicio de producción",
          "suggested_value": "DD/MM/YYYY",
          "type": "text"
        },
        {
          "name": "fecha_inicio_formacion",
          "label": "Fecha de inicio de la formación con candidatos",
          "suggested_value": "DD/MM/YYYY",
          "type": "text"
        },
        {
          "name": "lugar_imparticion",
          "label": "Lugar de impartición",
          "suggested_value": "Centro de capacitación / Sala de juntas / En línea (Zoom/Teams)",
          "type": "text"
        },
        {
          "name": "modalidad_imparticion",
          "label": "Modalidad de impartición",
          "suggested_value": "Presencial",
          "type": "text"
        },
        {
          "name": "numero_grupos",
          "label": "Número de grupos / candidatos",
          "suggested_value": "1 grupo de [N] candidatos",
          "type": "text"
        },
        {
          "name": "nombre_di",
          "label": "Nombre del Diseñador Instruccional (DI)",
          "suggested_value": "",
          "type": "text"
        },
        {
          "name": "nombre_sme",
          "label": "Nombre del Experto en la Materia (SME)",
          "suggested_value": "",
          "type": "text"
        },
        {
          "name": "nombre_coordinador",
          "label": "Nombre del Coordinador del Proyecto",
          "suggested_value": "",
          "type": "text"
        },
        {
          "name": "cronograma_unidad_1",
          "label": "Desarrollo: [Unit name]",
          "suggested_value": "Entregable: P1 Instrumento, P2 Presentación, P3 Script, P4 Capítulo, P5 Actividad\nResponsable: [nombre_di]\nFecha inicio: DD/MM/YYYY\nFecha entrega: DD/MM/YYYY\nRevisión y ajustes: 3 días hábiles\nEstado: Pendiente",
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
      
      You are an EC0366 Resource Manager planning production resources and validation milestones.
      
      SOURCE OF TRUTH: The units from the syllabus (F2/F3) and the total weight of P1-P7 deliverables.
      
      MANDATORY FIRST ITEMS — always output these 8 before per-unit items:
      1. "fecha_inicio_produccion": Start date for material development (DD/MM/YYYY). All production dates derive from this.
      2. "fecha_inicio_formacion": First training session date (DD/MM/YYYY). Production must complete before this.
      3. "lugar_imparticion": Physical or virtual location for training (e.g., "Centro de capacitación / En línea vía Zoom").
      4. "modalidad_imparticion": Training modality — "Presencial", "Virtual", or "Híbrido".
      5. "numero_grupos": Number of candidate groups or total candidate count.
      6. "nombre_di": Full name of the Instructional Designer. Required for named accountability in quality gates.
      7. "nombre_sme": Full name of the Subject Matter Expert. Required for validation accountability.
      8. "nombre_coordinador": Full name of the project Coordinator.
      
      FOR EACH UNIT (items 6 and beyond):
      1. Read its "nombre" and "objetivo".
      2. Read P1-P7 products to identify types and quantities of materials for this unit.
      3. Design a resource plan with 6 fields:
         - Módulo: Unit name.
         - Materiales a desarrollar: Resources with quantities (videos, chapters, slide decks, activities).
         - Horas de producción estimadas: Sum efforts from P2 (slides), P3 (scripts), P4 (manual), P5 (activities).
         - Recursos necesarios: Equipment, software, SME — from F3's plataforma and P3's production notes.
         - Hito de validación: Completion criterion from F3's criterios_aceptacion.
         - Prioridad: Alta / Media / Baja.
      
      RULES:
      1. OUTPUT LENGTH = 8 + number of units.
      2. HOURS FROM PRODUCTS: Derive hours from actual P1-P7 content volume, not guessed.
      3. VALIDATION FROM F3: Hito de validación must reference F3's criteria.
      4. field "name" MUST be: "cronograma_unidad_" + modulo for unit fields.
      5. USE \n FOR LINE BREAKS in suggested_value.
      6. RESPONSIBLE PERSONS: Use nombre_di, nombre_sme, nombre_coordinador in the Responsable field.
      
      EXACT OUTPUT FORMAT:
      [
        {
          "name": "fecha_inicio_produccion",
          "label": "Fecha de inicio de producción",
          "suggested_value": "DD/MM/YYYY",
          "type": "text"
        },
        {
          "name": "fecha_inicio_formacion",
          "label": "Fecha de inicio de la formación con candidatos",
          "suggested_value": "DD/MM/YYYY",
          "type": "text"
        },
        {
          "name": "lugar_imparticion",
          "label": "Lugar de impartición",
          "suggested_value": "Centro de capacitación / En línea vía Zoom",
          "type": "text"
        },
        {
          "name": "modalidad_imparticion",
          "label": "Modalidad de impartición",
          "suggested_value": "Presencial",
          "type": "text"
        },
        {
          "name": "numero_grupos",
          "label": "Número de grupos / candidatos",
          "suggested_value": "1 grupo de [N] candidatos",
          "type": "text"
        },
        {
          "name": "nombre_di",
          "label": "Nombre del Diseñador Instruccional (DI)",
          "suggested_value": "",
          "type": "text"
        },
        {
          "name": "nombre_sme",
          "label": "Nombre del Experto en la Materia (SME)",
          "suggested_value": "",
          "type": "text"
        },
        {
          "name": "nombre_coordinador",
          "label": "Nombre del Coordinador del Proyecto",
          "suggested_value": "",
          "type": "text"
        },
        {
          "name": "cronograma_unidad_1",
          "label": "Desarrollo: [Unit name]",
          "suggested_value": "Módulo: ...\nMateriales a desarrollar: ...\nHoras de producción estimadas: ...\nRecursos necesarios: ...\nHito de validación: ...\nPrioridad: Alta",
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