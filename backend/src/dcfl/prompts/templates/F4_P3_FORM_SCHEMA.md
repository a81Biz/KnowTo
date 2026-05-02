---
id: F4_P3_FORM_SCHEMA
name: Generador de Esquema Dinámico P3 (Guiones Multimedia)
version: 2.0.0
tags: [EC0366, formulario, guiones, multimedia]
pipeline_steps:

  # ── EXTRACTOR ────────────────────────────────────────────────────────────
  - agent: extractor_f4
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      Extract ALL units from the course syllabus and the P2 presentation content.
      
      SOURCE: The context contains fase3.unidades (F2/F3) and P2 presentation data from productos_previos or userInputs.
      
      DO NOT TRUNCATE. Return every unit.
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {"unidades": [{"modulo": 1, "nombre": "...", "objetivo": "..."}, {"modulo": 2, "nombre": "...", "objetivo": "..."}]}

  # ── AGENTE A: TECHNICAL SCRIPTWRITER ─────────────────────────────────────
  - agent: agente_form_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_f4]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You are a Multimedia Scriptwriter under EC0366. Your task is to write technical scripts for course videos.
      
      SOURCE OF TRUTH: The units extracted from the syllabus (F2/F3) and the P2 presentation slides.
      
      FOR EACH UNIT:
      1. Read its "nombre" and "objetivo".
      2. Read the corresponding P2 slides to align the script with the visual content the instructor will show.
      3. Write a 4-scene technical script:
         - Escena 1 — Introducción: Opening narration with the unit hook. Include estimated duration in brackets [XX seg].
         - Escena 2 — Desarrollo: Content explanation. Include estimated duration [2-3 min].
         - Escena 3 — Demostración: Visual step-by-step observable demonstration synchronized with the slides.
         - Escena 4 — Cierre: Summary and call to action. Include estimated duration [XX seg].
         - Recursos visuales: Suggested images, graphics, or animations that should appear on screen.
      
      RULES:
      1. SAME NUMBER OF ELEMENTS AS UNITS RECEIVED.
      2. SLIDE ALIGNMENT: Each scene must reference the corresponding P2 slide it accompanies.
      3. SPOKEN LANGUAGE: Write narration in natural spoken Spanish, not academic prose.
      4. field "name" MUST be: "guion_unidad_" + modulo.
      5. USE \n FOR LINE BREAKS in suggested_value.
      
      EXACT OUTPUT FORMAT:
      [
        {
          "name": "guion_unidad_1",
          "label": "Guión: [Unit name]",
          "suggested_value": "Escena 1 - Introducción: ... [30 seg]\nEscena 2 - Desarrollo: ... [2-3 min]\nEscena 3 - Demostración: ...\nEscena 4 - Cierre: ... [20 seg]\nRecursos visuales: ...",
          "type": "textarea"
        }
      ]

  # ── AGENTE B: NARRATIVE SCRIPTWRITER ─────────────────────────────────────
  - agent: agente_form_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_f4]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You are a Narrative Scriptwriter under EC0366. Your task is to write engaging spoken scripts for course videos.
      
      SOURCE OF TRUTH: The units extracted from the syllabus (F2/F3) and the P2 presentation slides.
      
      FOR EACH UNIT:
      1. Read its "nombre" and "objetivo".
      2. Read the corresponding P2 slides to synchronize narration with visuals.
      3. Write a narrative script with 5 components:
         - Voz en off (apertura): Exact text the narrator will read — 2-3 sentences that hook the learner.
         - Contenido principal: Key points in spoken language — not academic, not read from slides.
         - Ejemplo o caso: Description of a real situation or case to show on screen.
         - Voz en off (cierre): Memorable closing message.
         - Notas de producción: Rhythm, tone, sound effects, and any production directions.
      
      RULES:
      1. SAME NUMBER OF ELEMENTS AS UNITS RECEIVED.
      2. SPEAKABLE TEXT: Read each line aloud in your head — if it sounds unnatural, rewrite it.
      3. SLIDE REFERENCE: The script must complement the P2 slides, not repeat them verbatim.
      4. field "name" MUST be: "guion_unidad_" + modulo.
      5. USE \n FOR LINE BREAKS in suggested_value.
      
      EXACT OUTPUT FORMAT:
      [
        {
          "name": "guion_unidad_1",
          "label": "Guión: [Unit name]",
          "suggested_value": "Voz en off (apertura): ...\nContenido principal: ...\nEjemplo o caso: ...\nVoz en off (cierre): ...\nNotas de producción: ...",
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
      
      Compare the arrays from A and B. Choose the best multimedia script.
      
      SELECTION CRITERIA:
      1. PRODUCTIBILITY: Can a video producer directly use this script? Penalize vague stage directions or missing durations.
      2. SLIDE SYNCHRONIZATION: Does the script align with P2 slide content? The script should complement slides, not ignore or contradict them.
      3. SPEAKABILITY: Is the narration natural spoken Spanish? Penalize academic prose that sounds unnatural when read aloud.
      4. COMPLETENESS: Does the array have exactly as many elements as units? Does each object have all required fields?
      5. ENGAGEMENT: Which script is more likely to hold learner attention?
      
      OUTPUT ONLY THIS JSON:
      {"seleccion": "A" | "B", "razon": "brief explanation"}

  # ── ASSEMBLER ────────────────────────────────────────────────────────────
  - agent: ensamblador_form_schema
    model: "qwen2.5:14b"
    inputs_from: [juez_form]
    include_template: false
    task: "CÓDIGO - Assembly in form-schema.assembler.ts"
---