---
id: F4_P7_GENERATE_DOCUMENT
name: Compilador de Documento P7 — Información General EC0366
version: 1.0.0
tags: [EC0366, informacion, referencia, markdown]
pipeline_steps:

  - agent: extractor_doc_generic
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      Extract all form data from the provided context (userInputs).
      The product type is in userInputs._producto (should be "P7").

      OUTPUT ONLY THIS JSON:
      {
        "producto": "P7",
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

      Generate a complete Documento de Información General in Markdown using the extracted sections.
      This document is a reference guide covering all course topics.

      CRITICAL RULES:
      1. Generate the FINAL TEXT IN SPANISH.
      2. Use ## for each topic/module and ### for subsections (Descripción, Conceptos, Normativa, Recursos).
      3. Include a glossary section at the end.
      4. Do NOT include raw JSON or field names — only clean document text.

      OUTPUT ONLY THIS JSON:
      {"documento_md": "# Documento de Información General\n\n## ...\n..."}

  - agent: agente_doc_generic_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_doc_generic]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.

      Generate a highly detailed Documento de Información General in Markdown.
      Focus on practical workplace application with real examples per topic.

      CRITICAL RULES:
      1. Generate the FINAL TEXT IN SPANISH.
      2. Use tables for concept definitions (Término | Definición | Ejemplo).
      3. Include "Aplicación en el puesto" and "Errores comunes" subsections per topic.
      4. Do NOT include raw JSON or field names — only clean document text.

      OUTPUT ONLY THIS JSON:
      {"documento_md": "# Documento de Información General\n\n## ...\n..."}

  - agent: juez_doc_generic
    model: "qwen2.5:14b"
    inputs_from: [agente_doc_generic_A, agente_doc_generic_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.

      Compare "documento_md" from A and B. Select the better Documento de Información General.

      SELECTION CRITERIA:
      1. No raw JSON or field names visible.
      2. Comprehensive reference content per topic.
      3. Practical workplace application included.

      OUTPUT ONLY THIS JSON:
      {"seleccion": "A", "razon": "1-line explanation"}

  - agent: ensamblador_doc_generic
    inputs_from: []
    include_template: false
    task: "CÓDIGO - El ensamblaje se realiza en document-generic.assembler.ts"
---
