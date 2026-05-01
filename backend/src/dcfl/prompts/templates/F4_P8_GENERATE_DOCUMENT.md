---
id: F4_P8_GENERATE_DOCUMENT
name: Compilador de Documento P8 — Cronograma de Desarrollo EC0366
version: 1.0.0
tags: [EC0366, cronograma, desarrollo, markdown]
pipeline_steps:

  - agent: extractor_doc_generic
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      Extract all form data from the provided context (userInputs).
      The product type is in userInputs._producto (should be "P8").

      OUTPUT ONLY THIS JSON:
      {
        "producto": "P8",
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

      Generate a complete Cronograma de Desarrollo document in Markdown using the extracted sections.
      This document plans the production of all course materials.

      CRITICAL RULES:
      1. Generate the FINAL TEXT IN SPANISH.
      2. Use a Markdown table per module (Entregable | Responsable | Inicio | Entrega | Estado).
      3. Include a project summary section with total estimated hours.
      4. Do NOT include raw JSON or field names — only clean document text.

      OUTPUT ONLY THIS JSON:
      {"documento_md": "# Cronograma de Desarrollo\n\n## ...\n..."}

  - agent: agente_doc_generic_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_doc_generic]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.

      Generate a highly detailed Cronograma de Desarrollo in Markdown.
      Include production milestones, resource allocation, and quality checkpoints.

      CRITICAL RULES:
      1. Generate the FINAL TEXT IN SPANISH.
      2. Use tables (Módulo | Materiales | Horas | Recursos | Hito | Prioridad).
      3. Add a "Ruta crítica" section identifying dependencies between deliverables.
      4. Do NOT include raw JSON or field names — only clean document text.

      OUTPUT ONLY THIS JSON:
      {"documento_md": "# Cronograma de Desarrollo\n\n## ...\n..."}

  - agent: juez_doc_generic
    model: "qwen2.5:14b"
    inputs_from: [agente_doc_generic_A, agente_doc_generic_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.

      Compare "documento_md" from A and B. Select the better Cronograma de Desarrollo.

      SELECTION CRITERIA:
      1. No raw JSON or field names visible.
      2. Clear production schedule with responsibilities.
      3. Includes milestones and priority levels.

      OUTPUT ONLY THIS JSON:
      {"seleccion": "A", "razon": "1-line explanation"}

  - agent: ensamblador_doc_generic
    inputs_from: []
    include_template: false
    task: "CÓDIGO - El ensamblaje se realiza en document-generic.assembler.ts"
---
