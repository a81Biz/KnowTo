---
id: F4_P2_FORM_SCHEMA
name: Generador de Esquema Dinámico P2 (Presentación Electrónica)
version: 2.0.0
tags: [EC0366, formulario, presentacion, diapositivas]
pipeline_steps:

  # ── EXTRACTOR ────────────────────────────────────────────────────────────
  - agent: extractor_f4
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      Extract ALL units from the course syllabus and the P1 evaluation instruments.
      
      SOURCE: The context contains fase3.unidades (F2/F3) and P1 instruments from productos_previos or userInputs.
      
      DO NOT TRUNCATE. Return every unit.
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {"unidades": [{"modulo": 1, "nombre": "...", "objetivo": "..."}, {"modulo": 2, "nombre": "...", "objetivo": "..."}]}

  # ── AGENTE A: SLIDE DESIGNER ────────────────────────────────────────────
  - agent: agente_form_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_f4]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You are a Presentation Designer under EC0366. Your task is to design slide structures for a course.
      
      SOURCE OF TRUTH: The units extracted from the syllabus (F2/F3) and the evaluation instruments from P1.
      
      FOR EACH UNIT:
      1. Read its "nombre" (name) and "objetivo" (objective).
      2. Read the corresponding P1 instrument to align slide content with what will be evaluated.
      3. Design 4 slides that guide the instructor through the unit:
         - Slide 1 — Título: Opening slide with the unit name and a hook.
         - Slide 2 — Contenido: Key points of the unit, structured as bullet points.
         - Slide 3 — Actividad: A visual exercise, demonstration, or dynamic that engages learners.
         - Slide 4 — Cierre: Synthesis and key takeaways.
      
      RULES:
      1. SAME NUMBER OF ELEMENTS AS UNITS RECEIVED.
      2. CONTENT ALIGNMENT: The slides must cover what P1 evaluates for this unit.
      3. field "name" MUST be: "presentacion_unidad_" + modulo.
      4. USE \n FOR LINE BREAKS in suggested_value.
      
      EXACT OUTPUT FORMAT:
      [
        {
          "name": "presentacion_unidad_1",
          "label": "Presentación: [Unit name]",
          "suggested_value": "Diapositiva 1 - Título: ...\nDiapositiva 2 - Contenido: ...\nDiapositiva 3 - Actividad: ...\nDiapositiva 4 - Cierre: ...",
          "type": "textarea"
        }
      ]

  # ── AGENTE B: VISUAL NARRATIVE DESIGNER ─────────────────────────────────
  - agent: agente_form_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_f4]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You are a Visual Narrative Designer under EC0366. Your task is to design engaging presentation flows.
      
      SOURCE OF TRUTH: The units extracted from the syllabus (F2/F3) and the evaluation instruments from P1.
      
      FOR EACH UNIT:
      1. Read its "nombre" and "objetivo".
      2. Read the corresponding P1 instrument to ensure visual content aligns with evaluation criteria.
      3. Design a visual narrative with 4 components:
         - Apertura: A visual hook or triggering question to capture attention.
         - Desarrollo: 3-5 visual points with action verbs and concrete examples.
         - Ejemplo visual: A suggested case, image, diagram, or demonstration.
         - Cierre: The unit's key message in one memorable sentence.
      
      RULES:
      1. SAME NUMBER OF ELEMENTS AS UNITS RECEIVED.
      2. VISUAL THINKING: Every point must be translatable into a slide visual — no abstract concepts without concrete visual representation.
      3. field "name" MUST be: "presentacion_unidad_" + modulo.
      4. USE \n FOR LINE BREAKS in suggested_value.
      
      EXACT OUTPUT FORMAT:
      [
        {
          "name": "presentacion_unidad_1",
          "label": "Presentación: [Unit name]",
          "suggested_value": "Apertura: ...\nDesarrollo: ...\nEjemplo visual: ...\nCierre: ...",
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
      
      Compare the arrays from A and B. Choose the best presentation design.
      
      SELECTION CRITERIA:
      1. CLARITY: Can each slide be directly translated into a visual by a designer? Penalize abstract or vague descriptions.
      2. ALIGNMENT WITH P1: Does the presentation cover what will be evaluated? Cross-check against the unit objectives.
      3. COMPLETENESS: Does the array have exactly as many elements as units? Does each object have all required fields?
      4. ENGAGEMENT: Which design is more likely to keep learners attentive? Penalize flat, lecture-style structures.
      
      OUTPUT ONLY THIS JSON:
      {"seleccion": "A" | "B", "razon": "brief explanation"}

  # ── ASSEMBLER ────────────────────────────────────────────────────────────
  - agent: ensamblador_form_schema
    model: "qwen2.5:14b"
    inputs_from: [juez_form]
    include_template: false
    task: "CÓDIGO - Assembly in form-schema.assembler.ts"
---