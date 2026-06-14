---
id: F4_P4_CHAPTER
name: Generador de Capítulo — Manual del Participante
version: 1.0.0
tags: [manual, capitulo, participante]
pipeline_steps:

  # ── EXTRACTOR ────────────────────────────────────────────────────────────
  - agent: extractor_capitulo
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      Read the context. Your job is to organize the chapter data for one specific unit.

      SOURCE MAPPING:
      - capitulo_index: the chapter index (0-based integer in context)
      - capitulo_numero: the 1-based global chapter number (integer in context)
      - unidad_nombre: the unit name/title (in context)
      - unidad_objetivo: the learning objective for this unit (in context)
      - webSearchResults: research object with keys: practicas, referencias, tendencias, contexto_industria
      - userInputs keys starting with "manual_unidad_": the participant manual form content for this unit

      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {
        "capitulo_index": 0,
        "unidad_nombre": "[unidad_nombre from context]",
        "unidad_objetivo": "[unidad_objetivo from context]",
        "form_content": "[exact content of the matching manual_unidad_N field, empty string if not present]",
        "research": {
          "practicas": ["[practice 1]", "[practice 2]"],
          "referencias": ["[URL or source 1]", "[URL or source 2]"],
          "tendencias": ["[trend 1]"],
          "contexto_industria": "[industry context or empty string]"
        }
      }

      RULES:
      - Do NOT invent content. Extract ONLY what exists in the context.
      - If webSearchResults is empty or null, use empty arrays for all research fields.
      - Copy form content verbatim, preserving exact user text.
      - Set capitulo_index as the integer value from context.
      - Set capitulo_numero as the integer value from context (1-based global chapter number).

  # ── AGENTE A: ENFOQUE CONCEPTUAL ─────────────────────────────────────────
  - agent: agente_contenido_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_capitulo]
    include_template: false
    task: |
      ANCLA SEMÁNTICA (FUENTE DE VERDAD INMUTABLE):
      - Nombre oficial del curso: {_frozen.nombre_oficial_curso}
      - Dominio técnico: {_frozen.dominio_tecnico}
      - Resultado central: {_frozen.resultado_central}
      - Audiencia primaria: {_frozen.audiencia_primaria}
      PROHIBIDO: Contradecir, redefinir o ignorar estas anclas en cualquier sección.

      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.

      You are an Instructional Designer writing ONE chapter of a participant manual.

      ENFOQUE A — CONCEPTUAL: Emphasize theoretical framework and underlying principles first,
      then show how they apply step by step. Ideal for learners who need to understand WHY
      before doing.

      UNIT DATA: Read the extractor_capitulo output for the exact unit name, objective,
      form content, and research data.

      DOMAIN LOCK — MANDATORY. READ BEFORE WRITING ANYTHING:
      STEP 1 — Build your AUTHORIZED INVENTORY: Scan the form_content. List every tool,
      material, instrument, and technique explicitly named there. That is your authorized list.
      STEP 2 — Research scope: research data may only deepen HOW to use inventory items.
      It CANNOT introduce tools, materials, or techniques absent from the form content.
      STEP 3 — Self-check before outputting: for each tool/material you cite, confirm it
      appears in the form content. If it does not, REMOVE it.

      Write ONE chapter with this EXACT structure in Spanish:

      ## Capítulo {capitulo_numero}: {unidad_nombre}

      ### Introducción
      Hook sentence + what this chapter covers. 2–3 sentences connecting to the unit objective.

      ### Marco Teórico
      Real theory from the research data. 4–6 sentences with sourced facts and industry
      standards. Do NOT write "F0 marco de referencia" — state facts directly.

      ### Conceptos Clave
      Markdown table: | Término | Definición | Ejemplo |
      MINIMUM 5 terms from both form content and research data.
      Include every technical term introduced for the first time in this chapter.
      Each row must have all 3 columns filled.

      ### Desarrollo
      The procedure step by step. Expand form steps with research details. Numbered steps.
      Each step MUST start with an active, observable verb (Instalar, Aplicar, Verificar...).
      FORBIDDEN verbs: Aprender, Entender, Conocer, Saber.
      Each step MUST specify: exact tool/instrument, quantity/measure, physical action, expected result.

      ### Ejemplo Práctico
      One concrete real-world scenario from research practices or trends.

      ### Ejercicio Práctico
      Concrete activity with: (1) materials/tools needed, (2) minimum 3 numbered steps,
      (3) an observable, measurable result.
      FORBIDDEN: rhetorical questions or reflection prompts without physical steps.

      ### Puntos a Recordar
      - 3 bullet points: the essential takeaways from this chapter.

      ### Lecturas Complementarias
      Real references from research.referencias with URLs.
      Format: "- [Title or description]. Disponible en: [URL]"
      If none: "- No se encontraron referencias en línea para este tema."

      CRITICAL RULES:
      - ALL text in Spanish.
      - NO unresolved placeholders: {variable}, [PENDIENTE], [INSERTAR], [TODO], TBD.
      - Minimum 800 characters of substantive content beyond form fields.
      - Chapter title must be exactly the unit name from extractor output.
      - NO raw JSON field names visible in output.

      OUTPUT ONLY THIS JSON:
      {"documento_md": "[complete chapter markdown using \\n for line breaks]"}

  # ── AGENTE B: ENFOQUE PROCEDIMENTAL ──────────────────────────────────────
  - agent: agente_contenido_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_capitulo]
    include_template: false
    task: |
      ANCLA SEMÁNTICA (FUENTE DE VERDAD INMUTABLE):
      - Nombre oficial del curso: {_frozen.nombre_oficial_curso}
      - Dominio técnico: {_frozen.dominio_tecnico}
      - Resultado central: {_frozen.resultado_central}
      - Audiencia primaria: {_frozen.audiencia_primaria}
      PROHIBIDO: Contradecir, redefinir o ignorar estas anclas en cualquier sección.

      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.

      You are an Instructional Designer writing ONE chapter of a participant manual.

      ENFOQUE B — PROCEDIMENTAL: Emphasize practical skills and hands-on application first.
      Show the procedure with concrete steps, then explain the theory behind each step.
      Plain language accessible to a worker with no prior formal training.

      UNIT DATA: Read the extractor_capitulo output for the exact unit name, objective,
      form content, and research data.

      DOMAIN LOCK — MANDATORY. READ BEFORE WRITING ANYTHING:
      STEP 1 — Build your AUTHORIZED INVENTORY from form_content.
      STEP 2 — Research data may only deepen HOW to use inventory items.
      STEP 3 — Self-check before outputting.

      Write ONE chapter with this EXACT structure in Spanish:

      ## Capítulo {capitulo_numero}: {unidad_nombre}

      ### Objetivo de Aprendizaje
      What the participant will DO after completing this chapter. From the form objective.
      Starts with an active, observable verb.

      ### Marco Teórico
      Minimum conceptual foundation. 4–6 sentences from research data.
      Do NOT write "F0 marco de referencia" — state facts directly.

      ### Conceptos que Debes Conocer
      Markdown table: | Término | Significado | Ejemplo Cotidiano |
      MINIMUM 5 terms. Plain language for a worker with no prior training.
      Explain technical terms in accessible, everyday language.

      ### Pasos del Procedimiento
      Numbered observable steps from the form, expanded with research details.
      Each step MUST specify: exact tool, measure, physical action, expected result at that step.
      Do NOT use cross-references like "ver Capítulo X" — write standalone steps only.

      ### Ejemplo en el Trabajo Real
      A concrete workplace scenario from research practices or trends.

      ### Errores Comunes que Debes Evitar
      2–3 frequent mistakes from research or common industry knowledge in this domain.

      ### Autoevaluación
      Self-assessment items from the form content. Add one additional question based on research.

      ### Lecturas Complementarias
      Real references from research.referencias with URLs.
      If none: "- No se encontraron referencias en línea para este tema."

      CRITICAL RULES:
      - ALL text in Spanish.
      - NO unresolved placeholders: {variable}, [PENDIENTE], [INSERTAR], [TODO], TBD.
      - Minimum 800 characters beyond form fields.
      - Chapter title must be exactly the unit name.
      - Plain language — explain every technical term.

      OUTPUT ONLY THIS JSON:
      {"documento_md": "[complete chapter markdown using \\n for line breaks]"}

  # ── JUEZ ─────────────────────────────────────────────────────────────────
  - agent: juez_capitulo
    model: "qwen2.5:14b"
    inputs_from: [agente_contenido_A, agente_contenido_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.

      Compare "documento_md" from A and B. Select the better participant manual chapter.

      DOMAIN LOCK CHECK (highest priority):
      1. Read the form_content from the extractor_capitulo output. That is the AUTHORIZED INVENTORY.
      2. Extract every tool, material, instrument, and technique cited in each chapter.
      3. Cross-check each item against the authorized inventory.
         - If ONLY A has domain violations → select B.
         - If ONLY B has domain violations → select A.
         - If BOTH have domain violations → evaluate remaining criteria; emit RECHAZADO only
           if BOTH also fail criteria 2–5.

      SELECTION CRITERIA:
      1. Domain Lock: no items outside the authorized inventory (see above).
      2. Completeness: all required sections present with substantive content.
      3. Depth: real theory from research data, specific steps with tools and measures.
      4. Language: all text in Spanish, plain and accessible.
      5. No placeholders: {variable}, [PENDIENTE], [INSERTAR], [TODO], TBD are disqualifiers.
      6. Chapter title matches the unit name exactly.

      VETO CRITERIA — emit RECHAZADO only if ALL of the following apply to BOTH chapters:
      1. Both have domain violations (items not from form content).
      2. Both have 3 or more unresolved placeholders.

      OUTPUT ONLY THIS JSON:
      {"seleccion": "A" | "B" | "RECHAZADO", "razon": "1-line explanation in Spanish"}

  # ── ENSAMBLADOR ──────────────────────────────────────────────────────────
  - agent: ensamblador_capitulo
    model: "qwen2.5:14b"
    inputs_from: [juez_capitulo]
    include_template: false
    task: "CÓDIGO - Assembly in p4-chapter.helper.ts"
---
