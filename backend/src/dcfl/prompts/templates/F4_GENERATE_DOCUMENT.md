---
id: F4_GENERATE_DOCUMENT
name: Compilador de Documento Genérico EC0366 (P2-P8)
version: 1.0.0
tags: [EC0366, documento, generico, markdown]
pipeline_steps:

  # ── EXTRACTOR ────────────────────────────────────────────────────────────
  - agent: extractor_doc_generic
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      Extract all form data from the provided context (userInputs).
      The field names describe the document sections. The product type is in userInputs._producto.

      OUTPUT ONLY THIS JSON:
      {
        "producto": "[product code from _producto, e.g. P2]",
        "proyecto": "[project name]",
        "candidato": "[client name]",
        "secciones": [
          { "campo": "[field name]", "contenido": "[field value]" }
        ]
      }

  # ── AGENTE A (REDACTOR FORMAL) ───────────────────────────────────────────
  - agent: agente_doc_generic_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_doc_generic]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.

      Generate a complete, professional Markdown document using the extracted sections.
      Transform each "campo"/"contenido" pair into a well-structured document section.

      CRITICAL RULES:
      1. Generate the FINAL TEXT IN SPANISH.
      2. Use clear Markdown headers (##, ###) for each section.
      3. Do NOT include raw JSON or field names in the output — only clean document text.
      4. Be exhaustive and professional: this document is for official certification (EC0366).

      OUTPUT ONLY THIS JSON:
      {"documento_md": "# [Document Title]\n\n## ...\n..."}

  # ── AGENTE B (REDACTOR DETALLADO) ───────────────────────────────────────
  - agent: agente_doc_generic_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_doc_generic]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.

      Generate a complete, highly detailed Markdown document using the extracted sections.
      Focus on practical applicability: add context, examples, and clear instructions for each section.

      CRITICAL RULES:
      1. Generate the FINAL TEXT IN SPANISH.
      2. Use Markdown tables where the content benefits from tabular structure.
      3. Do NOT include raw JSON or field names in the output — only clean document text.
      4. Be exhaustive: the reader should not need to consult any other document.

      OUTPUT ONLY THIS JSON:
      {"documento_md": "# [Document Title]\n\n## ...\n..."}

  # ── JUEZ ─────────────────────────────────────────────────────────────────
  - agent: juez_doc_generic
    model: "qwen2.5:14b"
    inputs_from: [agente_doc_generic_A, agente_doc_generic_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.

      Compare "documento_md" from A and B.

      SELECTION CRITERIA:
      1. No raw JSON or field names visible in the document.
      2. More complete and detailed content.
      3. Better structure (headers, tables where appropriate).

      OUTPUT ONLY THIS JSON:
      {"seleccion": "A", "razon": "1-line explanation"}

  # ── ENSAMBLADOR (CÓDIGO PURO) ─────────────────────────────────────────────
  - agent: ensamblador_doc_generic
    inputs_from: []
    include_template: false
    task: "CÓDIGO - El ensamblaje se realiza en document-generic.assembler.ts"
---
