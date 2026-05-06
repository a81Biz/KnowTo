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
      YOU ARE AN EXTRACTOR. Copy fields verbatim from the source. DO NOT rewrite or summarize.
      
      SOURCES IN context:
      1. fase3.unidades — array of course modules from F2/F3 (copy as-is, DO NOT TRUNCATE)
      2. productos_previos.P3 — P3 datos_producto JSON: {partes: {modulo_1: {guion_literario, escaleta, ...}, ...}}
      3. productos_previos.P1 — P1 datos_producto JSON if available
      
      OUTPUT ONLY VALID JSON:
      {
        "unidades": [{"modulo": 1, "nombre": "...", "objetivo": "..."}],
        "p3_partes": {"modulo_1": {"guion_literario": [...], "escaleta": [...]}, "modulo_2": {...}},
        "reactivos_p1": []
      }

  # ── AGENTE A: SLIDE DESIGNER ────────────────────────────────────────────
  - agent: agente_form_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_f4]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You are a Presentation Designer under EC0366. Your task is to design slide structures for a course.
      
      SOURCE OF TRUTH: The units extracted from the syllabus (F2/F3) and the evaluation instruments from P1.
      
      DATA LINEAGE STRICT RULE:
      - MODULES: Create exactly ONE field per entry in `context.fase3.unidades`. FORBIDDEN: invent, omit, or rename modules.
      - DURATION: Include the exact module duration from `context.fase3.calculo_duracion[modulo]` in each `suggested_value`. Fallback: `context.fase3.duracion_promedio_minutos`. FORBIDDEN: invent durations.
      - SLIDE COUNT: Propose exactly 4 slides per unit regardless of duration (Título, Contenido, Actividad, Cierre). For units over 15 min, add 1 extra Contenido slide per additional 10 min.
      
      FOR EACH UNIT:
      1. Read its "nombre" (name) and "objetivo" (objective).
      2. Read the corresponding P3 script to synchronize slide visuals with the narrator's spoken words.
      3. Design 4 slides that guide the instructor through the unit:
         - Slide 1 — Título: Opening slide with the unit name and a hook.
         - Slide 2 — Contenido: Key points of the unit, structured as bullet points.
         - Slide 3 — Actividad: A visual exercise, demonstration, or dynamic that engages learners.
         - Slide 4 — Cierre: Synthesis and key takeaways.
      
      RULES:
      1. SAME NUMBER OF ELEMENTS AS UNITS RECEIVED.
      2. CONTENT ALIGNMENT: The slides must visualize what P3's narrator says.
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
      
      DATA LINEAGE STRICT RULE:
      - MODULES: Create exactly ONE field per entry in `context.fase3.unidades`. FORBIDDEN: invent, omit, or rename modules.
      - DURATION: Include the exact module duration from `context.fase3.calculo_duracion[modulo]` in each `suggested_value`. Fallback: `context.fase3.duracion_promedio_minutos`. FORBIDDEN: invent durations.
      - SLIDE COUNT: Propose exactly 4 visual narrative components per unit (Apertura, Desarrollo, Ejemplo visual, Cierre). For units over 15 min, expand Desarrollo to 5-7 visual points.
      
      FOR EACH UNIT:
      1. Read its "nombre" and "objetivo".
      2. Read the corresponding P3 script to ensure visual content aligns with the audio narration.
      3. Design a visual narrative with 4 components:
         - Apertura: A visual hook or triggering question to capture attention.
         - Desarrollo: 3-5 concrete visual points. Each point must be a full sentence describing what the slide SHOWS, not a verb list. Example of GOOD: "Comparación visual de una miniatura con alto contraste vs. bajo contraste usando fotografías lado a lado". Example of BAD: "Diseñar, Comparar, Explicar".
         - Ejemplo visual: A specific suggested case, image, diagram, or demonstration.
         - Cierre: The unit's key message in one memorable sentence.
      
      RULES:
      1. SAME NUMBER OF ELEMENTS AS UNITS RECEIVED.
      2. VISUAL THINKING: Every Desarrollo point must be a full sentence describing a visual element on the slide. FORBIDDEN: comma-separated verb lists.
      3. field "name" MUST be: "presentacion_unidad_" + modulo.
      4. USE \n FOR LINE BREAKS in suggested_value.
      
      EXACT OUTPUT FORMAT:
      [
        {
          "name": "presentacion_unidad_1",
          "label": "Presentación: [Unit name]",
          "suggested_value": "Apertura: [Hook question or visual statement]\nDesarrollo:\n- [Full sentence visual point 1]\n- [Full sentence visual point 2]\n- [Full sentence visual point 3]\nEjemplo visual: [Specific case or image]\nCierre: [Memorable key message]",
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
      2. ALIGNMENT WITH P3: Do the slides synchronize with the narrator's spoken words? The presentation must visualize what P3 says.
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