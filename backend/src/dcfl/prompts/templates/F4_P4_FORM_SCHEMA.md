---
id: F4_P4_FORM_SCHEMA
name: Generador de Esquema Dinámico P4 (Manual del Participante)
version: 2.0.0
tags: [EC0366, formulario, manual, participante]
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
      
      Extract ALL units from the course syllabus, the F0 reference framework, and the P1 instruments.
      SOURCE: The context contains fase3.unidades (F2/F3), F0 reference framework, and P1 instruments from productos_previos.
      
      DO NOT TRUNCATE. Return every unit.
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {"unidades": [{"modulo": 1, "nombre": "...", "objetivo": "..."}, {"modulo": 2, "nombre": "...", "objetivo": "..."}]}

  # ── AGENTE A: STUDY-GUIDE WRITER ─────────────────────────────────────────
  - agent: agente_form_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_f4]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You are a Technical Writer under EC0366. Your task is to scaffold participant manual chapters with all 7 required sections.
      
      SOURCE OF TRUTH: The units from the syllabus (F2/F3), the F0 reference framework for theory and sources, and the P1 instruments for evaluation alignment.
      
      FOR EACH UNIT:
      1. Read its "nombre" and "objetivo".
      2. Read F0 marco de referencia for industry context, theory, and bibliographic sources.
      3. Read the P1 instrument to align manual content with what will be evaluated.
      4. Write a chapter scaffold with ALL 7 sections (the chapter generator uses these as the primary content source):
         - Introducción: 2-3 sentences contextualizing the topic for the participant.
         - Marco Teórico: 2-3 sentences of theoretical foundation from F0. Cite real sources.
         - Conceptos clave: 5+ key terms with concise definitions. Format as: "Término: definición | Término: definición | ..."
         - Desarrollo: The main procedure as numbered steps. Each step: tool + action + expected result.
         - Ejemplo Práctico: One concrete real-world scenario showing this unit's skill in context.
         - Ejercicio Práctico: A solo activity with: materials needed, numbered steps (min 3), observable result.
         - Puntos a recordar: 3 essential takeaways.
         - Lecturas complementarias: 1-2 real sources with titles from F0 bibliography.
      
      RULES:
      1. SAME NUMBER OF ELEMENTS AS UNITS RECEIVED.
      2. ALL 7 SECTIONS MANDATORY: The chapter generator depends on all 7 sections being scaffolded. Missing sections result in empty chapters.
      3. DEPTH BEYOND SCRIPT: The manual is the deep-reference document. Each concept must be explained with 2-3 sentences.
      4. field "name" MUST be: "manual_unidad_" + modulo.
      5. USE \n FOR LINE BREAKS in suggested_value.
      
      EXACT OUTPUT FORMAT:
      [
        {
          "name": "manual_unidad_1",
          "label": "Capítulo: [Unit name]",
          "suggested_value": "Introducción: ...\nMarco Teórico: ...\nConceptos clave: [término: def | término: def | ...]\nDesarrollo:\n1. ...\n2. ...\n3. ...\nEjemplo Práctico: ...\nEjercicio Práctico:\n1. ...\n2. ...\n3. ...\nPuntos a recordar:\n- ...\n- ...\n- ...\nLecturas complementarias: ...",
          "type": "textarea"
        }
      ]

  # ── AGENTE B: COMPETENCY-BASED WRITER ────────────────────────────────────
  - agent: agente_form_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_f4]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You are a Competency-Based Instructional Designer under EC0366. Your task is to scaffold participant manual chapters with all 7 required sections, focused on demonstrable skills.
      
      SOURCE OF TRUTH: The units from the syllabus (F2/F3), the F0 reference framework, and the P1 instruments.
      
      FOR EACH UNIT:
      1. Read its "nombre" and "objetivo".
      2. Read F0 marco de referencia for theory and sources.
      3. Read P1 instrument to ensure the manual covers what will be evaluated.
      4. Write a chapter scaffold with ALL 7 sections (the chapter generator uses these as the primary content source):
         - Introducción: 2-3 sentences connecting the unit skill to real workplace application.
         - Marco Teórico: Minimum conceptual foundation — grounded in F0. Include at least one real citation.
         - Conceptos clave: 5+ technical terms with definitions. Format as: "Término: definición | Término: definición | ..."
         - Desarrollo: Numbered procedure steps the participant follows. Each step must be physically observable and specify tools/measures.
         - Ejemplo Práctico: A real industry case showing how this skill is applied.
         - Ejercicio Práctico: Competency-validation activity with materials, steps, and verifiable output.
         - Puntos a recordar: 3 competency-oriented takeaways (what the participant must be able to DO).
         - Lecturas complementarias: 1-2 real sources from F0 bibliography.
      
      RULES:
      1. SAME NUMBER OF ELEMENTS AS UNITS RECEIVED.
      2. ALL 7 SECTIONS MANDATORY: Missing sections result in empty chapters in the final document.
      3. COMPETENCY FOCUS: Every section must enable the participant to DO something, not just KNOW something.
      4. THEORY FROM F0: The marco teórico must reference concepts from the F0 reference framework.
      5. field "name" MUST be: "manual_unidad_" + modulo.
      6. USE \n FOR LINE BREAKS in suggested_value.
      
      EXACT OUTPUT FORMAT:
      [
        {
          "name": "manual_unidad_1",
          "label": "Capítulo: [Unit name]",
          "suggested_value": "Introducción: ...\nMarco Teórico: ...\nConceptos clave: [término: def | término: def | ...]\nDesarrollo:\n1. ...\n2. ...\n3. ...\nEjemplo Práctico: ...\nEjercicio Práctico:\n1. ...\n2. ...\n3. ...\nPuntos a recordar:\n- ...\n- ...\n- ...\nLecturas complementarias: ...",
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
      
      Compare the arrays from A and B. Choose the best manual content.
      
      SELECTION CRITERIA:
      1. SELF-CONTAINED: Can a participant study from this manual without watching the videos? Does it provide depth beyond the slides and scripts?
      2. SOURCE GROUNDING: Does the content reference real concepts and sources from F0? Penalize generic theory without foundation.
      3. PRACTICAL APPLICATION: Does the chapter include an exercise or procedure the participant can actually perform?
      4. COMPLETENESS: Does the array have exactly as many elements as units? Does each object have all 5 required sections?
      5. ALIGNMENT WITH P3: Does the written content complement (not contradict, not copy) the video scripts?
      
      OUTPUT ONLY THIS JSON:
      {"seleccion": "A" | "B", "razon": "brief explanation"}

  # ── ASSEMBLER ────────────────────────────────────────────────────────────
  - agent: ensamblador_form_schema
    model: "qwen2.5:14b"
    inputs_from: [juez_form]
    include_template: false
    task: "CÓDIGO - Assembly in form-schema.assembler.ts"
---