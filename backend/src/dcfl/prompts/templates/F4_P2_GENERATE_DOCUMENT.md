---
id: F4_P2_GENERATE_DOCUMENT
name: Compilador de Documento P2 — Presentación Electrónica EC0366
version: 1.0.0
tags: [EC0366, presentacion, electronica, markdown]
pipeline_steps:

  - agent: extractor_doc_generic
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      Extract all form data from the provided context (userInputs).
      The product type is in userInputs._producto (should be "P2").

      OUTPUT ONLY THIS JSON:
      {
        "producto": "P2",
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

      Generate a complete Presentación Electrónica document in Markdown using the extracted sections.
      Each section corresponds to one module's slide deck content.

      CRITICAL RULES:
      1. Generate the FINAL TEXT IN SPANISH.
      2. Use ## for each module/unit and ### for slide titles.
      3. Include bullet points for key content per slide.
      4. Do NOT include raw JSON or field names — only clean document text.
      5. This is a formal EC0366 instructional design document.

      OUTPUT ONLY THIS JSON:
      {"documento_md": "# Presentación Electrónica\n\n## ...\n..."}

  - agent: agente_doc_generic_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_doc_generic]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.

      Generate a highly detailed Presentación Electrónica document in Markdown.
      Include speaker notes, visual suggestions, and interaction cues for each slide.

      CRITICAL RULES:
      1. Generate the FINAL TEXT IN SPANISH.
      2. Use Markdown tables where content benefits from tabular structure.
      3. Include a "Notas del facilitador" subsection per module.
      4. Do NOT include raw JSON or field names — only clean document text.

      OUTPUT ONLY THIS JSON:
      {"documento_md": "# Presentación Electrónica\n\n## ...\n..."}

  - agent: juez_doc_generic
    model: "qwen2.5:14b"
    inputs_from: [agente_doc_generic_A, agente_doc_generic_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.

      Compare "documento_md" from A and B. Select the better Presentación Electrónica document.

      SELECTION CRITERIA:
      1. No raw JSON or field names visible.
      2. Complete slide structure per module.
      3. Better organization with headers and lists.

      OUTPUT ONLY THIS JSON:
      {"seleccion": "A", "razon": "1-line explanation"}

  - agent: ensamblador_doc_generic
    inputs_from: []
    include_template: false
    task: "CÓDIGO - El ensamblaje se realiza en document-generic.assembler.ts"
---
