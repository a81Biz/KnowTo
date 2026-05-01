---
id: F4_P5_GENERATE_DOCUMENT
name: Compilador de Documento P5 — Guías de Actividades EC0366
version: 1.0.0
tags: [EC0366, guias, actividades, markdown]
pipeline_steps:

  - agent: extractor_doc_generic
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      Extract all form data from the provided context (userInputs).
      The product type is in userInputs._producto (should be "P5").

      OUTPUT ONLY THIS JSON:
      {
        "producto": "P5",
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

      Generate a complete Guías de Actividades document in Markdown using the extracted sections.
      Each section corresponds to one activity guide for a module.

      CRITICAL RULES:
      1. Generate the FINAL TEXT IN SPANISH.
      2. Use ## for each activity and ### for sections (Objetivo, Materiales, Instrucciones, Evaluación).
      3. Write instructions as numbered steps with observable physical actions.
      4. Do NOT include raw JSON or field names — only clean document text.

      OUTPUT ONLY THIS JSON:
      {"documento_md": "# Guías de Actividades\n\n## ...\n..."}

  - agent: agente_doc_generic_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_doc_generic]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.

      Generate a highly detailed Guías de Actividades in Markdown.
      Include facilitator notes, time estimates, and rubric per activity.

      CRITICAL RULES:
      1. Generate the FINAL TEXT IN SPANISH.
      2. Use tables for rubrics (Criterio | Sí | No | Observaciones).
      3. Include a "Notas para el facilitador" section per activity.
      4. Do NOT include raw JSON or field names — only clean document text.

      OUTPUT ONLY THIS JSON:
      {"documento_md": "# Guías de Actividades\n\n## ...\n..."}

  - agent: juez_doc_generic
    model: "qwen2.5:14b"
    inputs_from: [agente_doc_generic_A, agente_doc_generic_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.

      Compare "documento_md" from A and B. Select the better Guías de Actividades.

      SELECTION CRITERIA:
      1. No raw JSON or field names visible.
      2. Clear step-by-step instructions with observable actions.
      3. Includes evaluation criteria.

      OUTPUT ONLY THIS JSON:
      {"seleccion": "A", "razon": "1-line explanation"}

  - agent: ensamblador_doc_generic
    inputs_from: []
    include_template: false
    task: "CÓDIGO - El ensamblaje se realiza en document-generic.assembler.ts"
---
