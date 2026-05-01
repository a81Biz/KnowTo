---
id: F4_P6_GENERATE_DOCUMENT
name: Compilador de Documento P6 — Calendario General EC0366
version: 1.0.0
tags: [EC0366, calendario, programacion, markdown]
pipeline_steps:

  - agent: extractor_doc_generic
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      Extract all form data from the provided context (userInputs).
      The product type is in userInputs._producto (should be "P6").

      OUTPUT ONLY THIS JSON:
      {
        "producto": "P6",
        "proyecto": "[project name]",
        "candidato": "[client name]",
        "secciones": [
          { "campo": "[field name]", "contenido": "[field value]" }
        ]
      }

  - agent: agente_doc_generic_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_doc_generic]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.

      Generate a complete Calendario General document in Markdown using the extracted sections.
      Present the course schedule as a structured program per session/module.

      CRITICAL RULES:
      1. Generate the FINAL TEXT IN SPANISH.
      2. Use a Markdown table per module (Sesión | Tema | Duración | Modalidad | Evaluación).
      3. Include a summary table at the top with total hours.
      4. Do NOT include raw JSON or field names — only clean document text.

      OUTPUT ONLY THIS JSON:
      {"documento_md": "# Calendario General del Curso\n\n## ...\n..."}

  - agent: agente_doc_generic_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_doc_generic]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.

      Generate a highly detailed Calendario General in Markdown.
      Include detailed session breakdown with resources and responsible parties.

      CRITICAL RULES:
      1. Generate the FINAL TEXT IN SPANISH.
      2. Use tables (Unidad | Horas Teóricas | Horas Prácticas | Recursos | Responsable).
      3. Add a "Distribución horaria total" section with a summary.
      4. Do NOT include raw JSON or field names — only clean document text.

      OUTPUT ONLY THIS JSON:
      {"documento_md": "# Calendario General del Curso\n\n## ...\n..."}

  - agent: juez_doc_generic
    model: "qwen2.5:14b"
    inputs_from: [agente_doc_generic_A, agente_doc_generic_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.

      Compare "documento_md" from A and B. Select the better Calendario General.

      SELECTION CRITERIA:
      1. No raw JSON or field names visible.
      2. Clear tabular schedule structure.
      3. Complete information for course planning.

      OUTPUT ONLY THIS JSON:
      {"seleccion": "A", "razon": "1-line explanation"}

  - agent: ensamblador_doc_generic
    inputs_from: []
    include_template: false
    task: "CÓDIGO - El ensamblaje se realiza en document-generic.assembler.ts"
---
