---
id: F4_P3_GENERATE_DOCUMENT
name: Compilador de Documento P3 — Guiones Multimedia EC0366
version: 2.0.0
tags: [EC0366, guiones, multimedia, markdown]
pipeline_steps:

  # ── EXTRACTOR ────────────────────────────────────────────────────────────
  - agent: extractor_doc_generic
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      Read ONLY from userInputs in the provided context. Ignore previousData entirely.
      
      SOURCE MAPPING:
      - The form fields follow the pattern "guion_unidad_N" where N is the unit number.
      - projectName and clientName come from the context root.
      
      YOUR TASK: Map each form field to its unit number by extracting N from the key name. Preserve the EXACT text of each field value.
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {
        "producto": "P3",
        "proyecto": "[projectName from context]",
        "candidato": "[clientName from context]",
        "secciones": [
          { "campo": "guion_unidad_1", "contenido": "[value of guion_unidad_1]" },
          { "campo": "guion_unidad_2", "contenido": "[value of guion_unidad_2]" }
        ]
      }
      
      RULES:
      - Include ONLY fields whose key starts with "guion_unidad_"
      - Preserve the exact text of each field value — do not paraphrase or summarize
      - The number of secciones must equal the number of guion_unidad_* keys in userInputs

  # ── AGENTE A: STANDARD SCRIPT COMPILER ───────────────────────────────────
  - agent: agente_doc_generic_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_doc_generic]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You are an EC0366 Multimedia Producer compiling the official script document for video production.
      
      SOURCE: The script sections extracted from the user-confirmed form.
      
      HOW TO BUILD THE DOCUMENT:
      
      1. Generate the complete document in SPANISH.
      2. Use ## for each module/unit title.
      3. Use ### for each scene (Escena 1, Escena 2, etc.).
      4. Place all spoken narration in blockquotes: > **Narrador:** "exact text here"
      5. Include estimated duration per scene in brackets: [XX seg] or [X min YY seg].
      6. This is a formal EC0366 production document — ready to hand to a video team.
      
      CRITICAL RULES:
      1. EXACT NARRATOR TEXT: Every blockquote MUST reproduce the EXACT text from the form field. DO NOT rewrite, paraphrase, or summarize. The audio script in the form is the approved version — treat it as final.
      2. SCENE DURATION: Include estimated duration per scene. Sum within a module should be coherent with the module's allocated time.
      3. NO RAW JSON OR FIELD NAMES in the output. Clean production document only.
      
      OUTPUT ONLY THIS JSON:
      {"documento_md": "# Guiones Multimedia\n\n## Módulo 1: ...\n### Escena 1 — Introducción [XX seg]\n> **Narrador:** \"...\"\n..."}

  # ── AGENTE B: TECHNICAL PRODUCER COMPILER ────────────────────────────────
  - agent: agente_doc_generic_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_doc_generic]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You are an EC0366 Multimedia Producer compiling a technical production script with full audio/video direction.
      
      SOURCE: The script sections extracted from the user-confirmed form.
      
      HOW TO BUILD THE DOCUMENT:
      
      1. Generate the complete document in SPANISH.
      2. Use ## for each module/unit title.
      3. Use ### for each scene.
      4. Use two-column Markdown tables for scenes that benefit from Audio | Video separation:
         | Audio | Video |
         |---|---|
         | Narrador: "..." | Visual: slide reference, animation, or demonstration |
      5. Include estimated duration per scene in brackets.
      6. Add **Notas de producción:** subsection per module with rhythm, tone, sound effects, and B-roll suggestions.
      
      CRITICAL RULES:
      1. CONTENT COMPLETENESS: Your document may use tables instead of blockquotes, but it MUST contain ALL narration text and production notes from the form fields. Different structure ≠ different content.
      2. VISUAL DIRECTION: Every narrated segment must have a corresponding visual direction — what appears on screen while the narrator speaks.
      3. NO RAW JSON OR FIELD NAMES in the output.
      
      OUTPUT ONLY THIS JSON:
      {"documento_md": "# Guiones Multimedia — Documento de Producción\n\n## Módulo 1: ...\n..."}

  # ── JUDGE ────────────────────────────────────────────────────────────────
  - agent: juez_doc_generic
    model: "qwen2.5:14b"
    inputs_from: [agente_doc_generic_A, agente_doc_generic_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.
      
      Compare "documento_md" from A and B. Select the better Guiones Multimedia document.
      
      SELECTION CRITERIA:
      1. No raw JSON or field names visible — clean production document.
      2. Clear scene structure with narrator text easily identifiable (blockquotes or table format).
      3. Production readiness: Can a video team use this document to record and edit? Penalize missing durations or vague visual directions.
      4. Fidelity to form: ALL narration text comes from userInputs — no invented dialogue or paraphrased content.
      5. Correct unit count: ALL modules from the form input are present; none missing, none added.
      6. Audio/Visual sync: Does each spoken segment have a corresponding visual reference?
      
      OUTPUT ONLY THIS JSON:
      {"seleccion": "A" | "B", "razon": "1-line explanation"}

  # ── ASSEMBLER ────────────────────────────────────────────────────────────
  - agent: ensamblador_doc_generic
    model: "qwen2.5:14b"
    inputs_from: [juez_doc_generic]
    include_template: false
    task: "CÓDIGO - Assembly in document-generic.assembler.ts"
---