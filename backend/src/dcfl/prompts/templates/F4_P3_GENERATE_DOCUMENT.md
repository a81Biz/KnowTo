---
id: F4_P3_GENERATE_DOCUMENT
name: Compilador de Documento P3 — Guiones Multimedia EC0366
version: 1.0.0
tags: [EC0366, guiones, multimedia, markdown]
pipeline_steps:

  - agent: extractor_doc_generic
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      Extract all form data from the provided context (userInputs).
      The product type is in userInputs._producto (should be "P3").

      OUTPUT ONLY THIS JSON:
      {
        "producto": "P3",
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

      Generate a complete Guiones Multimedia document in Markdown using the extracted sections.
      Each section corresponds to one module's multimedia script.

      CRITICAL RULES:
      1. Generate the FINAL TEXT IN SPANISH.
      2. Use ## for each module and ### for scenes (Escena 1, Escena 2, etc.).
      3. Include narrator text in blockquotes (> narración...).
      4. Do NOT include raw JSON or field names — only clean document text.

      OUTPUT ONLY THIS JSON:
      {"documento_md": "# Guiones Multimedia\n\n## ...\n..."}

  - agent: agente_doc_generic_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_doc_generic]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.

      Generate a highly detailed Guiones Multimedia document in Markdown.
      Include technical production notes, timings, and visual direction per scene.

      CRITICAL RULES:
      1. Generate the FINAL TEXT IN SPANISH.
      2. Use a two-column table format (Audio | Video) per scene where appropriate.
      3. Include estimated duration per scene in brackets [XX seg].
      4. Do NOT include raw JSON or field names — only clean document text.

      OUTPUT ONLY THIS JSON:
      {"documento_md": "# Guiones Multimedia\n\n## ...\n..."}

  - agent: juez_doc_generic
    model: "qwen2.5:14b"
    inputs_from: [agente_doc_generic_A, agente_doc_generic_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.

      Compare "documento_md" from A and B. Select the better Guiones Multimedia document.

      SELECTION CRITERIA:
      1. No raw JSON or field names visible.
      2. Clear scene structure with narrator text.
      3. Production-ready format.

      OUTPUT ONLY THIS JSON:
      {"seleccion": "A", "razon": "1-line explanation"}

  - agent: ensamblador_doc_generic
    inputs_from: []
    include_template: false
    task: "CÓDIGO - El ensamblaje se realiza en document-generic.assembler.ts"
---
