---
id: F4_P5_GENERATE_DOCUMENT
name: Compilador de Documento P5 — Guías de Actividades EC0366
version: 2.0.0
tags: [EC0366, guias, actividades, markdown]
pipeline_steps:

  # ── EXTRACTOR ────────────────────────────────────────────────────────────
  - agent: extractor_doc_generic
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      Read ONLY from userInputs in the provided context. Ignore previousData entirely.
      
      SOURCE MAPPING:
      - The form fields follow the pattern "actividad_unidad_N" where N is the unit number.
      - projectName and clientName come from the context root.
      
      YOUR TASK: Map each form field to its unit number by extracting N from the key name. Preserve the EXACT text of each field value.
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {
        "producto": "P5",
        "proyecto": "[projectName from context]",
        "candidato": "[clientName from context]",
        "secciones": [
          { "campo": "actividad_unidad_1", "contenido": "[value of actividad_unidad_1]" },
          { "campo": "actividad_unidad_2", "contenido": "[value of actividad_unidad_2]" }
        ]
      }
      
      RULES:
      - Include ONLY fields whose key starts with "actividad_unidad_"
      - Preserve the exact text of each field value — do not paraphrase or summarize
      - The number of secciones must equal the number of actividad_unidad_* keys in userInputs

  # ── AGENTE A: ACTIVITY GUIDE COMPILER ────────────────────────────────────
  - agent: agente_doc_generic_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_doc_generic]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You are an EC0366 Activity Designer compiling the official activity guides for the course.
      
      SOURCE: The activity sections extracted from the user-confirmed form.
      
      HOW TO BUILD THE DOCUMENT:
      
      1. Generate the complete document in SPANISH.
      2. Use ## for each activity (one per unit/module).
      3. Use ### for each section within an activity: Objetivo, Materiales, Instrucciones, Evaluación.
      4. Write instructions as numbered steps — each step an observable physical action.
      5. Include a rubric or evaluation table at the end of each activity.
      6. This is a formal EC0366 instructional deliverable — ready for facilitators to print and use.
      
      CRITICAL RULES:
      1. P1 ALIGNMENT: Each activity's evaluation section MUST align with the instrument type and reactivos defined in P1 for that unit. The rubric criteria must reference the same observable actions that P1 evaluates. The activity practices what P1 measures.
      2. PHYSICAL ACTION VERBS ONLY: Every instruction step must use observable physical action verbs — Coloca, Sujeta, Mide, Corta, Traza, Aplica, Verifica, Dobla, Lija, Suelda, Ensambla, Limpia, Mezcla, Monta, Calibra, Inspecciona, Registra. FORBIDDEN mental verbs — Comprender, Saber, Conocer, Entender, Analizar, Evaluar, Reflexionar, Identificar, Reconocer, Describir. Each step describes what hands DO.
      3. COMPLETE MATERIALS LIST: List real, specific items with quantities where applicable. No vague references like "herramientas necesarias".
      4. TIME ESTIMATE: Include Tiempo estimado per activity, coherent with the unit's allocated duration from F3.
      5. NO RAW JSON OR FIELD NAMES in the output.
      
      OUTPUT ONLY THIS JSON:
      {"documento_md": "# Guías de Actividades\n\n## Actividad 1: ...\n### Objetivo\n...\n### Materiales\n- ...\n### Instrucciones\n1. ...\n2. ...\n### Evaluación\n| Criterio | Sí | No |\n|---|---|---|\n..."}

  # ── AGENTE B: FACILITATOR-READY COMPILER ─────────────────────────────────
  - agent: agente_doc_generic_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_doc_generic]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You are an EC0366 Facilitator Trainer compiling detailed activity guides with facilitation notes.
      
      SOURCE: The activity sections extracted from the user-confirmed form.
      
      HOW TO BUILD THE DOCUMENT:
      
      1. Generate the complete document in SPANISH.
      2. Use ## for each activity (one per unit).
      3. Use ### for each standard section: Objetivo, Materiales, Instrucciones, Evidencia, Rúbrica.
      4. Add a ### Notas para el facilitador section per activity with:
         - Common mistakes participants make and how to correct them.
         - Suggested debrief questions.
         - When to intervene and when to let the participant struggle.
      5. Use tables for rubrics: Criterio | Sí | No | Observaciones.
      6. Include setup instructions for the facilitator before the activity begins.
      
      CRITICAL RULES:
      1. CONTENT COMPLETENESS: Your document may have a different structure than the standard template, but it MUST contain ALL factual information from the form fields. Different structure ≠ different content.
      2. FACILITATOR VALUE: The Notas para el facilitador must provide insights beyond the participant-facing instructions — what to watch for, what typically goes wrong, when to step in.
      3. P1 CROSS-REFERENCE: In the Evaluación/Rúbrica section, explicitly reference which P1 instrument and reactivos this activity prepares the participant for.
      4. NO RAW JSON OR FIELD NAMES in the output.
      
      OUTPUT ONLY THIS JSON:
      {"documento_md": "# Guías de Actividades — Manual del Facilitador\n\n## Actividad 1: ...\n..."}

  # ── JUDGE ────────────────────────────────────────────────────────────────
  - agent: juez_doc_generic
    model: "qwen2.5:14b"
    inputs_from: [agente_doc_generic_A, agente_doc_generic_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.
      
      Compare "documento_md" from A and B. Select the better Guías de Actividades.
      
      SELECTION CRITERIA:
      1. No raw JSON or field names visible — clean, professional document.
      2. Clear step-by-step instructions with observable physical actions — no mental verbs.
      3. P1 alignment: Does the evaluation section reference the same skills and reactivos as the P1 instruments?
      4. Facilitator usefulness: Can a facilitator run this activity without additional preparation? Are materials, timing, and common mistakes covered?
      5. Fidelity to form: ALL content comes from userInputs — no invented activities, materials, or criteria.
      6. Correct activity count: ALL activities from the form input are present; none missing, none added.
      7. Production readiness: Can this document be printed and used in a classroom or workshop?
      
      OUTPUT ONLY THIS JSON:
      {"seleccion": "A" | "B", "razon": "1-line explanation"}

  # ── ASSEMBLER ────────────────────────────────────────────────────────────
  - agent: ensamblador_doc_generic
    model: "qwen2.5:14b"
    inputs_from: [juez_doc_generic]
    include_template: false
    task: "CÓDIGO - Assembly in document-generic.assembler.ts"
---