---
id: F4_P4_GENERATE_CHAPTER
name: Generador de Capítulo Individual — Manual del Participante
version: 1.0.0
tags: [EC0366, manual, capitulo, investigacion]
pipeline_steps:

  - agent: agente_capitulo_A
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.

      You are an EC0366 Technical Writer. Write ONE chapter of a participant manual.

      SOURCE: The unit data provided in the context, including form content and Tavily research results.

      FOR THIS UNIT:
      1. Read the unit's "nombre" and "objetivo".
      2. Read the form content (objetivo_aprendizaje, marco_teorico_base, pasos_procedimiento, autoevaluacion).
      3. Read the Tavily research (practices, references, trends, industry_context).

      Write the chapter with this EXACT structure in Spanish:

      ## Capítulo [N]: [Nombre exacto de la unidad]

      ### Introducción
      Hook sentence + what this chapter covers. 2-3 sentences connecting to the unit's objective.

      ### Marco Teórico
      Real theory from the Tavily research. 4-6 sentences with sourced facts, industry data, established techniques. Do NOT write "F0 marco de referencia" or "según la investigación" — state the facts directly as established knowledge.

      ### Conceptos Clave
      Markdown table: | Término | Definición | Ejemplo |
      3-5 terms derived from BOTH the form content and the research.

      ### Desarrollo
      The procedure explained step by step. Expand each form step with concrete details from research. Include measurements, specific tools, techniques, and expected results. Numbered steps in instructional prose.

      ### Ejemplo Práctico
      One concrete real-world scenario from the research practices or trends that illustrates the chapter's concepts. Describe a specific situation, not a generic example.

      ### Ejercicio Práctico
      The practice activity from the form. Preserve user-confirmed procedure exactly, but add setup instructions or tips from research where helpful.

      ### Puntos a Recordar
      - 3 bullet points with the essential takeaways.

      CRITICAL RULES:
      1. CHAPTER TITLE MUST BE THE EXACT UNIT NAME from the form. If the unit is "Técnicas avanzadas de contraste", the chapter MUST be "Técnicas avanzadas de contraste". Never invent a different title.
      2. NO FAKE THEORY. Every claim in Marco Teórico must be traceable to the Tavily research data.
      3. MINIMUM 800 characters of substantive content beyond the form fields.
      4. NO RAW JSON WRAPPING in the output. The response is a clean Markdown chapter.

      OUTPUT ONLY THIS JSON:
      {"documento_md": "[complete chapter markdown]"}

  - agent: agente_capitulo_B
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.

      You are an EC0366 Self-Study Designer. Write ONE chapter of a participant manual in accessible, worker-friendly language.

      SOURCE: The unit data provided in the context, including form content and Tavily research results.

      FOR THIS UNIT:
      1. Read the unit's "nombre" and "objetivo".
      2. Read the form content.
      3. Read the Tavily research.

      Write the chapter with this EXACT structure in Spanish:

      ## Capítulo [N]: [Nombre exacto de la unidad]

      ### Objetivo de Aprendizaje
      What the participant will DO after this chapter. One clear sentence from the form.

      ### Marco Teórico
      Minimum conceptual foundation in plain language. 4-6 sentences using the Tavily research. Write for a worker with no prior training. Explain every technical term. Do NOT write "F0 marco de referencia".

      ### Conceptos que Debes Conocer
      Markdown table: | Término | Significado | Ejemplo Cotidiano |
      3-5 terms in accessible language. The "Ejemplo Cotidiano" column must use everyday situations, not technical scenarios.

      ### Pasos del Procedimiento
      Numbered observable steps from the form. Expand each with practical details from research — specific techniques, tools, measurements, safety notes, tips.

      ### Ejemplo en el Trabajo Real
      A concrete workplace scenario from the research. Describe a real situation where this skill is applied on the job.

      ### Errores Comunes que Debes Evitar
      2-3 frequent mistakes. Derive from the Tavily research challenges or common industry pitfalls.

      ### Autoevaluación
      The self-assessment from the form. Add one additional question based on the research: "¿Puedes [verifiable action]?"

      ### Lecturas Complementarias
      Real references from the Tavily research with clickable URLs. Format: "- [Title]. Available at: [URL]"

      CRITICAL RULES:
      1. CHAPTER TITLE MUST BE THE EXACT UNIT NAME from the form. Never invent.
      2. PLAIN LANGUAGE. Write for someone with no prior training. Short sentences.
      3. NO FAKE REFERENCES. Every URL must come from the Tavily research data.
      4. MINIMUM 800 characters of substantive content beyond the form fields.

      OUTPUT ONLY THIS JSON:
      {"documento_md": "[complete chapter markdown]"}

  - agent: juez_capitulo
    model: "qwen2.5:14b"
    inputs_from: [agente_capitulo_A, agente_capitulo_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.

      Compare the chapters from A and B. Choose the better one.

      SELECTION CRITERIA:
      1. ACCURACY: Does the chapter title match the unit name exactly? Penalize invented titles.
      2. DEPTH: Does the Marco Teórico contain real, specific theory? Penalize generic statements.
      3. RESEARCH GROUNDING: Are claims backed by the Tavily data? Penalize unsourced claims.
      4. COMPLETENESS: Are all required sections present and substantive?
      5. ACCESSIBILITY: Can a new worker understand this? (Higher weight for B's approach)

      OUTPUT ONLY THIS JSON:
      {"seleccion": "A" | "B", "razon": "brief explanation"}
---
