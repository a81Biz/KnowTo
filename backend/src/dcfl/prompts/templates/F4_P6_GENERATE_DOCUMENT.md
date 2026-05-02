---
id: F4_P6_GENERATE_DOCUMENT
name: Compilador de Documento P6 — Calendario General EC0366
version: 2.0.0
tags: [EC0366, calendario, programacion, markdown]
pipeline_steps:

  # ── EXTRACTOR ────────────────────────────────────────────────────────────
  - agent: extractor_doc_generic
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      Read ONLY from userInputs in the provided context. Ignore previousData entirely.
      
      SOURCE MAPPING:
      - The form fields follow the pattern "sesion_unidad_N" where N is the unit number.
      - projectName and clientName come from the context root.
      
      YOUR TASK: Map each form field to its unit number by extracting N from the key name. Preserve the EXACT text of each field value.
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {
        "producto": "P6",
        "proyecto": "[projectName from context]",
        "candidato": "[clientName from context]",
        "secciones": [
          { "campo": "sesion_unidad_1", "contenido": "[value of sesion_unidad_1]" },
          { "campo": "sesion_unidad_2", "contenido": "[value of sesion_unidad_2]" }
        ]
      }
      
      RULES:
      - Include ONLY fields whose key starts with "sesion_unidad_"
      - Preserve the exact text of each field value — do not paraphrase or summarize
      - The number of secciones must equal the number of sesion_unidad_* keys in userInputs

  # ── AGENTE A: COURSE CALENDAR COMPILER ───────────────────────────────────
  - agent: agente_doc_generic_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_doc_generic]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You are an EC0366 Course Coordinator compiling the official course calendar.
      
      SOURCE: The session schedule sections extracted from the user-confirmed form.
      
      HOW TO BUILD THE DOCUMENT:
      
      1. Generate the complete document in SPANISH.
      2. Start with a ## Resumen de Distribución Horaria summary table at the top showing all units with their hours breakdown and total.
      3. For each session/unit, create a detailed section with:
         - Session header: ## Sesión [N] — [Unit Name]
         - A summary table: Campo | Detalle with session number, duration, modality, and evaluation instrument.
         - An activity breakdown table: No. | Actividad | Tipo | Duración listing each programmed activity.
      4. Ensure all tables are properly formatted Markdown.
      
      CRITICAL RULES:
      1. HOUR VERIFICATION: Horas teóricas + Horas prácticas must equal the total hours for each session. The grand total across all sessions must be consistent. Derive hours directly from the form — do not invent or adjust.
      2. EXACT INSTRUMENT NAMES: The Evaluación column MUST state the exact Tipo de Instrumento from P1 for each unit (e.g., "Guía de Observación", "Lista de Cotejo", "Cuestionario"). Do NOT abbreviate, paraphrase, or use generic terms like "evaluación de la unidad".
      3. ACTIVITY DETAIL: The Actividades programadas must list each activity with its type (Teórica/Práctica/Evaluación) and estimated duration.
      4. NO RAW JSON OR FIELD NAMES in the output. Clean, professional course calendar.
      
      OUTPUT ONLY THIS JSON:
      {"documento_md": "# Calendario General del Curso\n\n## Resumen de Distribución Horaria\n| Unidad | Horas Teóricas | Horas Prácticas | Total |\n|---|---|---|---|\n...\n\n## Sesión 1 — ...\n..."}

  # ── AGENTE B: LOGISTICS CALENDAR COMPILER ────────────────────────────────
  - agent: agente_doc_generic_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_doc_generic]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You are an EC0366 Course Logistics Manager compiling a detailed operational calendar.
      
      SOURCE: The session schedule sections extracted from the user-confirmed form.
      
      HOW TO BUILD THE DOCUMENT:
      
      1. Generate the complete document in SPANISH.
      2. Start with a ## Distribución Horaria Total summary section with a table showing hours breakdown and grand total.
      3. For each session/unit, create:
         - Session header: ## Sesión [N] — [Unit Name]
         - A resource allocation table: Recurso | Cantidad | Responsable | Notas
         - A products/deliverables table: Producto Esperado | Tipo de Evidencia | Criterio de Aceptación
         - An activity timeline: Hora | Actividad | Duración | Modalidad
      4. Add a ## Resumen de Recursos Totales section aggregating all resources across all sessions.
      5. Add a ## Responsables section listing all responsible parties and their sessions.
      
      CRITICAL RULES:
      1. CONTENT COMPLETENESS: Your document may have a different structure than the standard template, but it MUST contain ALL factual information from the form fields. Different structure ≠ different content.
      2. RESOURCE AGGREGATION: The Resumen de Recursos Totales must compile all recursos didácticos from all sessions — no duplicates, with quantities summed where applicable.
      3. REAL PRODUCTS: The Producto Esperado must match the specific evidence names from P1 and P5. Do not use generic labels.
      4. NO RAW JSON OR FIELD NAMES in the output.
      
      OUTPUT ONLY THIS JSON:
      {"documento_md": "# Calendario General del Curso — Documento Logístico\n\n## Distribución Horaria Total\n...\n\n## Sesión 1 — ...\n..."}

  # ── JUDGE ────────────────────────────────────────────────────────────────
  - agent: juez_doc_generic
    model: "qwen2.5:14b"
    inputs_from: [agente_doc_generic_A, agente_doc_generic_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.
      
      Compare "documento_md" from A and B. Select the better Calendario General.
      
      SELECTION CRITERIA:
      1. No raw JSON or field names visible — clean, professional document.
      2. Clear tabular schedule with all required fields: session number, topic, duration, modality, activities, evaluation.
      3. Hour consistency: Do horas teóricas + horas prácticas totals match per session? Does the grand total match across all sessions?
      4. Instrument specificity: Are evaluation instruments named exactly as in P1? Penalize generic labels.
      5. Fidelity to form: ALL content comes from userInputs — no invented sessions, durations, activities, or resources.
      6. Correct session count: ALL sessions from the form input are present; none missing, none added.
      7. Operational utility: Can a coordinator use this document to manage course delivery?
      
      OUTPUT ONLY THIS JSON:
      {"seleccion": "A" | "B", "razon": "1-line explanation"}

  # ── ASSEMBLER ────────────────────────────────────────────────────────────
  - agent: ensamblador_doc_generic
    model: "qwen2.5:14b"
    inputs_from: [juez_doc_generic]
    include_template: false
    task: "CÓDIGO - Assembly in document-generic.assembler.ts"
---