---
id: F4_P4_GENERATE_DOCUMENT
name: Compilador de Documento P4 — Manual del Participante EC0366
version: 1.0.0
tags: [EC0366, manual, participante, markdown]
pipeline_steps:

  - agent: extractor_doc_generic
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      Extract all form data from the provided context (userInputs).
      The product type is in userInputs._producto (should be "P4").

      OUTPUT ONLY THIS JSON:
      {
        "producto": "P4",
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

      Generate a complete Manual del Participante document in Markdown using the extracted sections.
      Each section corresponds to one chapter of the participant manual.

      CRITICAL RULES:
      1. Generate the FINAL TEXT IN SPANISH.
      2. Use ## for each chapter/module and ### for subsections.
      3. Include a brief introduction, key concepts, and a practice exercise per chapter.
      4. Do NOT include raw JSON or field names — only clean document text.

      OUTPUT ONLY THIS JSON:
      {"documento_md": "# Manual del Participante\n\n## ...\n..."}

  - agent: agente_doc_generic_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_doc_generic]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.

      Generate a highly detailed Manual del Participante in Markdown.
      Focus on self-study: clear explanations, examples, glossary, and self-assessment questions.

      CRITICAL RULES:
      1. Generate the FINAL TEXT IN SPANISH.
      2. Use tables for concept summaries and checklists for self-assessment.
      3. Use callout boxes (> **Nota:**) for important warnings or tips.
      4. Do NOT include raw JSON or field names — only clean document text.

      OUTPUT ONLY THIS JSON:
      {"documento_md": "# Manual del Participante\n\n## ...\n..."}

  - agent: juez_doc_generic
    model: "qwen2.5:14b"
    inputs_from: [agente_doc_generic_A, agente_doc_generic_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.

      Compare "documento_md" from A and B. Select the better Manual del Participante.

      SELECTION CRITERIA:
      1. No raw JSON or field names visible.
      2. Self-contained — reader needs no other document.
      3. Clear structure with practical exercises.

      OUTPUT ONLY THIS JSON:
      {"seleccion": "A", "razon": "1-line explanation"}

  - agent: ensamblador_doc_generic
    inputs_from: []
    include_template: false
    task: "CÓDIGO - El ensamblaje se realiza en document-generic.assembler.ts"
---
