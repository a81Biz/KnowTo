---
id: F4_P4_GENERATE_DOCUMENT
name: Compilador de Documento P4 — Manual del Participante
version: 2.0.0
tags: [EC0366, manual, participante, markdown]
pipeline_steps:

  # ── EXTRACTOR ────────────────────────────────────────────────────────────
  - agent: extractor_doc_generic
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      Read from userInputs AND webSearchResults in the provided context. Ignore previousData entirely.
      
      SOURCE MAPPING:
      - Form fields: "manual_unidad_N" where N is the unit number.
      - webSearchResults: Tavily search results with 8 categories for research.
      - projectName and clientName from the context root.
      
      YOUR TASK:
      1. Map each form field to its unit number. Preserve EXACT text.
      2. For each unit, extract from webSearchResults the relevant research data:
         - From "practices": best practices and techniques related to the unit topic.
         - From "references": authoritative sources, articles, or documentation.
         - From "trends": current trends or innovations in the unit's domain.
         - From "market_size": industry context and relevance of the topic.
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {
        "producto": "P4",
        "proyecto": "[projectName]",
        "candidato": "[clientName]",
        "secciones": [
          { "campo": "manual_unidad_1", "contenido": "[EXACT value]" }
        ],
        "investigacion": [
          {
            "unidad": "1",
            "practicas": ["[practice 1]", "[practice 2]"],
            "referencias": ["[URL or source 1]", "[URL or source 2]"],
            "tendencias": ["[trend 1]"],
            "contexto_industria": "[industry relevance]"
          }
        ]
      }
      
      RULES:
      - Include ONLY manual_unidad_* fields in secciones.
      - Preserve exact form text.
      - For investigacion: extract REAL data from webSearchResults. If a category is empty, use empty array [].

  # ── AGENTE A: STUDY-GUIDE COMPILER ───────────────────────────────────────
  - agent: agente_doc_generic_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_doc_generic]
    include_template: false
    task: |
      ANCLA SEMÁNTICA (FUENTE DE VERDAD INMUTABLE):
      - Nombre oficial del curso: {_frozen.nombre_oficial_curso}
      - Dominio técnico: {_frozen.dominio_tecnico}
      - Resultado central: {_frozen.resultado_central}
      - Audiencia primaria: {_frozen.audiencia_primaria}
      PROHIBIDO: Contradecir, redefinir o ignorar estas anclas en cualquier sección del documento.

      RESTRICCIONES_OBLIGATORIAS (verifica ANTES de escribir cualquier línea):
      - IDIOMA: Escribe EXCLUSIVAMENTE en {_frozen.idioma_requerido ?? 'español'}. PROHIBIDO mezclar idiomas.
      - MODALIDAD: El contenido debe reflejar la modalidad "{_frozen.modalidad_canonica ?? 'presencial'}". Ajusta ejemplos y terminología.
      - REFERENCIAS_VERIFICADAS: PROHIBIDO inventar URLs, DOIs, autores, fechas o nombres de publicaciones que no provengan de investigacion.referencias (Tavily). Si no hay referencia real, escribe "Consultar al facilitador del curso."
      - TERMINOS_PROHIBIDOS: No usar sustantivos de estado interno (conocimiento, comprensión, dominio, conciencia). Reemplazar con resultados verificables.
      - NO_PLACEHOLDERS: PROHIBIDO {{variable}}, [PENDIENTE], [INSERTAR], TBD en cualquier campo.

      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.

      GLOBAL CONSTRAINTS (check context._reglas_globales):
      - The certification standard (if any) is in _frozen.estandar_norma. NOT the course name or topic. Never use the standard code as the course title.
      - BIBLIOGRAPHY RULE: Only cite sources that appear in the investigacion.referencias array (real URLs from Tavily). NEVER invent authors, publications, ISBNs, or URLs. If no real references are available for a unit, omit the bibliography for that unit — do not fabricate.
      - NEVER leave unresolved placeholders: {{variable}}, [PENDIENTE], [INSERTAR], [TODO], TBD.

      You are a Technical Writer compiling the official participant manual.

      SOURCE: The manual sections AND the investigacion data extracted from webSearchResults.
      
      HOW TO BUILD THE DOCUMENT — PROCESS EACH UNIT ONE AT A TIME:
      
      FOR EACH UNIT in the extracted secciones:
      
      STEP 1 — Read the unit's form content (objetivo, marco teórico base, pasos del procedimiento, autoevaluación).
      STEP 2 — Read the unit's investigacion data (practicas, referencias, tendencias, contexto_industria).
      STEP 3 — Write the complete chapter using this EXACT narrative structure:
      
         ### Introducción
         Hook sentence + what this chapter covers (2-3 sentences connecting to the unit's objective).
         
         ### Marco Teórico
         Real theory from the investigacion data. 4-6 sentences with sourced facts, industry data, or established techniques. Do NOT write "F0 marco de referencia". Use the research: mention real methods, real tools, real industry standards.
         
         ### Conceptos Clave
         Markdown table: | Término | Definición | Ejemplo |
         Use 3-5 terms derived from BOTH the form content and the research data.
         
         ### Desarrollo
         The procedure explained step by step. Expand each form step with concrete details from the research. Include measurements, specific tools, techniques, and expected results. Write in instructional prose with numbered steps.
         
         ### Ejemplo Práctico
         One concrete real-world scenario or case from the investigacion practicas or tendencias that illustrates the chapter's concepts.
         
         ### Ejercicio Práctico
         The practice activity from the form. Preserve the user-confirmed procedure.
         
         ### Puntos a Recordar
         3 bullet points — the essential takeaways from this chapter.
      
      STEP 4 — MOVE TO THE NEXT UNIT. Repeat STEPS 1-4 for ALL units.
      
      CRITICAL RULES:
      1. FORM CONTENT IS SACRED: The learning objective, procedure steps, and self-assessment come from the user-confirmed form. Do NOT replace or rewrite them.
      2. RESEARCH ADDS DEPTH: The investigacion data provides real theory, real examples, and real bibliography. Use it to enrich every section.
      3. COVERAGE RULE: Process ALL units in order. If there are 3 units, the output MUST have 3 complete chapters. Before finalizing, verify: "Have I written all chapters?" If not, continue.
      4. MINIMUM DEPTH: Each chapter must be at least 800 characters of substantive content beyond the form fields.
      5. NO FAKE REFERENCES: Bibliography must use real URLs from the investigacion.referencias arrays.
      6. NO RAW JSON OR FIELD NAMES in the output. Clean, professional manual in Spanish.
      
      FINAL OUTPUT STRUCTURE:
      # Manual del Participante
      ## Capítulo 1: [Unit Name]
      ### Introducción
      ...
      ### Puntos a Recordar
      - ...
      ## Capítulo 2: [Unit Name]
      ...
      (ALL chapters included)
      ## Glosario
      | Término | Definición |
      |---|---|
      ...
      ## Bibliografía
      - [Real source]. Available at: [Real URL]
      
      OUTPUT ONLY THIS JSON:
      {"documento_md": "[complete manual with ALL chapters]"}

  # ── AGENTE B: SELF-STUDY DESIGNER ────────────────────────────────────────
  - agent: agente_doc_generic_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_doc_generic]
    include_template: false
    task: |
      ANCLA SEMÁNTICA (FUENTE DE VERDAD INMUTABLE):
      - Nombre oficial del curso: {_frozen.nombre_oficial_curso}
      - Dominio técnico: {_frozen.dominio_tecnico}
      - Resultado central: {_frozen.resultado_central}
      - Audiencia primaria: {_frozen.audiencia_primaria}
      PROHIBIDO: Contradecir, redefinir o ignorar estas anclas en cualquier sección del documento.

      RESTRICCIONES_OBLIGATORIAS (verifica ANTES de escribir cualquier línea):
      - IDIOMA: Escribe EXCLUSIVAMENTE en {_frozen.idioma_requerido ?? 'español'}. PROHIBIDO mezclar idiomas.
      - MODALIDAD: Refleja la modalidad "{_frozen.modalidad_canonica ?? 'presencial'}". Ajusta ejemplos y terminología.
      - REFERENCIAS_VERIFICADAS: PROHIBIDO inventar URLs, DOIs, autores o publicaciones que no estén en investigacion.referencias.
      - TERMINOS_PROHIBIDOS: No usar sustantivos de estado interno. Usa resultados verificables.
      - NO_PLACEHOLDERS: PROHIBIDO {{variable}}, [PENDIENTE], [INSERTAR], TBD.

      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.

      GLOBAL CONSTRAINTS (check context._reglas_globales):
      - The certification standard (if any) is in _frozen.estandar_norma. NOT the course name or topic.
      - BIBLIOGRAPHY RULE: Only cite sources that appear in investigacion.referencias (real Tavily URLs). NEVER invent authors, ISBNs, or URLs. Omit bibliography if no real sources exist — do not fabricate.
      - NEVER leave unresolved placeholders: {{variable}}, [PENDIENTE], [INSERTAR], [TODO], TBD.

      You are a Self-Study Instructional Designer compiling a comprehensive participant manual.

      SOURCE: The manual sections AND the investigacion data extracted from webSearchResults.
      
      HOW TO BUILD THE DOCUMENT — PROCESS EACH UNIT ONE AT A TIME:
      
      FOR EACH UNIT in the extracted secciones:
      
      STEP 1 — Read the unit's form content.
      STEP 2 — Read the unit's investigacion data.
      STEP 3 — Write the complete chapter using this EXACT self-study structure:
      
         ### Objetivo de Aprendizaje
         What the participant will DO after completing this chapter. From the form.
         
         ### Marco Teórico
         Minimum conceptual foundation. Use the investigacion data for real theory. 4-6 sentences. Do NOT write "F0 marco de referencia".
         
         ### Conceptos que Debes Conocer
         Markdown table: | Término | Significado | Ejemplo Cotidiano |
         Accessible language for a worker with no prior training.
         
         ### Pasos del Procedimiento
         Numbered observable steps from the form. Expand each with details from research — specific techniques, tools, measurements.
         
         ### Ejemplo en el Trabajo Real
         A concrete workplace scenario from the investigacion practicas or tendencias.
         
         ### Errores Comunes que Debes Evitar
         2-3 frequent mistakes. Derive from the investigacion challenges data if available, or from common industry knowledge in the research.
         
         ### Autoevaluación
         The self-assessment from the form. Add one additional self-check question based on the research.
         
         ### Lecturas Complementarias
         Real references from the investigacion.referencias array with URLs.
      
      STEP 4 — MOVE TO THE NEXT UNIT. Repeat for ALL units.
      
      CRITICAL RULES:
      1. FORM CONTENT IS SACRED: The learning objective, procedure steps, and self-assessment come from the form. Do NOT replace.
      2. PLAIN LANGUAGE: Write for a worker with no prior training. Explain technical terms.
      3. COVERAGE RULE: ALL units must have complete chapters. Verify before outputting.
      4. MINIMUM DEPTH: Each chapter at least 800 characters beyond form fields.
      5. CROSS-REFERENCES: Where a concept relates to another chapter, add (→ ver Capítulo X).
      6. NO RAW JSON OR FIELD NAMES in output.
      
      FINAL OUTPUT STRUCTURE:
      # Manual del Participante — Autoestudio
      ## Capítulo 1: [Unit Name]
      ...
      ## Glosario General
      (ALL terms from ALL chapters merged)
      ## Bibliografía
      - [Real source]. Available at: [Real URL]
      
      OUTPUT ONLY THIS JSON:
      {"documento_md": "[complete manual with ALL chapters]"}

  # ── JUDGE ────────────────────────────────────────────────────────────────
  - agent: juez_doc_generic
    model: "qwen2.5:14b"
    inputs_from: [agente_doc_generic_A, agente_doc_generic_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.

      Compare "documento_md" from A and B. Select the better Manual del Participante.

      SELECTION CRITERIA:
      1. No raw JSON or field names visible — clean, professional document.
      2. Self-contained: Can a participant study this manual without any other resource?
      3. Clear chapter structure with all required sections present.
      4. Practical application: Does each chapter include exercises, checklists, or self-assessment?
      5. Fidelity to form: ALL content comes from userInputs — no invented concepts or procedures.
      6. Correct chapter count: ALL chapters from the form input are present; none missing, none added.
      7. Reference quality: Bibliography uses ONLY real URLs from the investigacion.referencias data.
      8. No unresolved placeholders: {{variable}}, [PENDIENTE], [INSERTAR], [TODO], TBD are automatic disqualifiers.

      VETO CRITERIA — Output "RECHAZADO" ONLY IF ALL of the following apply to BOTH documents simultaneously:
      1. Both documents contain invented bibliographic references (authors/ISBNs/URLs not from investigacion.referencias).
      2. Both documents contain 3 or more unresolved template placeholders.
      If RECHAZADO, "razon" MUST describe the specific shared deficiency.

      OUTPUT ONLY THIS JSON:
      {"seleccion": "A" | "B" | "RECHAZADO", "razon": "1-line explanation"}

  # ── ASSEMBLER ────────────────────────────────────────────────────────────
  - agent: ensamblador_doc_generic
    model: "qwen2.5:14b"
    inputs_from: [juez_doc_generic]
    include_template: false
    task: "CÓDIGO - Assembly in document-generic.assembler.ts"
---