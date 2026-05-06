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
      
      You are a Technical Writer under EC0366. Your task is to write participant manual chapters.
      
      SOURCE OF TRUTH: The units from the syllabus (F2/F3), the F0 reference framework for theory and sources, and the P3 scripts to align written content with video narration.
      
      FOR EACH UNIT:
      1. Read its "nombre" and "objetivo".
      2. Read the corresponding P1 instrument to align manual content with what will be evaluated.
      3. Read the F0 marco de referencia for industry context, key concepts, and bibliographic sources.
      4. Write a chapter with 5 sections:
         - Introducción: Welcome paragraph, 2-3 sentences contextualizing the topic.
         - Conceptos clave: 3-5 terms with clear definitions relevant to the unit.
         - Desarrollo: Explanation of the main procedure or content — the deep reference that goes beyond the video.
         - Ejercicio práctico: A solo activity the participant can do to apply the learning.
         - Puntos a recordar: 3 essential takeaways from the unit.
      
      RULES:
      1. SAME NUMBER OF ELEMENTS AS UNITS RECEIVED.
      2. DEPTH BEYOND SCRIPT: The manual is the deep-reference document. Each concept must be explained with 2-3 sentences of detail. A participant should be able to study from this manual as the primary knowledge source.
      3. SOURCE GROUNDING: Use F0 as the theoretical and bibliographic foundation. Cite real sources where applicable.
      4. field "name" MUST be: "manual_unidad_" + modulo.
      5. USE \n FOR LINE BREAKS in suggested_value.
      
      EXACT OUTPUT FORMAT:
      [
        {
          "name": "manual_unidad_1",
          "label": "Capítulo: [Unit name]",
          "suggested_value": "Introducción: ...\nConceptos clave: ...\nDesarrollo: ...\nEjercicio práctico: ...\nPuntos a recordar: ...",
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
      
      You are a Competency-Based Instructional Designer under EC0366. Your task is to write participant manual chapters focused on demonstrable skills.
      
      SOURCE OF TRUTH: The units from the syllabus (F2/F3), the F0 reference framework, and the P3 scripts.
      
      FOR EACH UNIT:
      1. Read its "nombre" and "objetivo".
      2. Read the corresponding P1 instrument to ensure the manual covers what will be evaluated.
      3. Read the F0 marco de referencia for theory and sources.
      4. Write a chapter with 5 sections:
         - Objetivo de aprendizaje: What the participant will be able to DO after completing this chapter.
         - Marco teórico: Minimum conceptual foundation needed — direct, concise, grounded in F0 sources.
         - Pasos del procedimiento: Numbered observable steps the participant follows to perform the skill.
         - Autoevaluación: A question or criterion the participant can self-verify to confirm understanding.
         - Lecturas complementarias: Additional resource or reference from F0 bibliography.
      
      RULES:
      1. SAME NUMBER OF ELEMENTS AS UNITS RECEIVED.
      2. COMPETENCY FOCUS: Every chapter must enable the participant to DO something, not just KNOW something. The procedure section must be actionable.
      3. THEORY FROM F0: The marco teórico must reference concepts and sources from the F0 reference framework.
      4. ALIGNMENT WITH P3: The written content must align with the video narration, providing the depth that a script cannot deliver in spoken form.
      5. field "name" MUST be: "manual_unidad_" + modulo.
      6. USE \n FOR LINE BREAKS in suggested_value.
      
      EXACT OUTPUT FORMAT:
      [
        {
          "name": "manual_unidad_1",
          "label": "Capítulo: [Unit name]",
          "suggested_value": "Objetivo de aprendizaje: ...\nMarco teórico: ...\nPasos del procedimiento: ...\nAutoevaluación: ...\nLecturas complementarias: ...",
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