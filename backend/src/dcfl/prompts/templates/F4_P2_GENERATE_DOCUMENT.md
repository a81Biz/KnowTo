---
id: F4_P2_GENERATE_DOCUMENT
name: Compilador de Documento P2 — Presentación Electrónica EC0366
version: 2.0.0
tags: [EC0366, presentacion, electronica, markdown]
pipeline_steps:

  # ── EXTRACTOR ────────────────────────────────────────────────────────────
  - agent: extractor_doc_generic
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      Read ONLY from userInputs in the provided context. Ignore previousData entirely.
      
      SOURCE MAPPING:
      - The form fields follow the pattern "presentacion_unidad_N" where N is the unit number.
      - projectName and clientName come from the context root.
      
      YOUR TASK: Map each form field to its unit number by extracting N from the key name. Preserve the EXACT text of each field value.
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {
        "producto": "P2",
        "proyecto": "[projectName from context]",
        "candidato": "[clientName from context]",
        "secciones": [
          { "campo": "presentacion_unidad_1", "contenido": "[value of presentacion_unidad_1]" },
          { "campo": "presentacion_unidad_2", "contenido": "[value of presentacion_unidad_2]" }
        ]
      }
      
      RULES:
      - Include ONLY fields whose key starts with "presentacion_unidad_"
      - Preserve the exact text of each field value — do not paraphrase or summarize
      - The number of secciones must equal the number of presentacion_unidad_* keys in userInputs

  # ── AGENTE A: STANDARD SLIDE COMPILER ────────────────────────────────────
  - agent: agente_doc_generic_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_doc_generic]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You are an EC0366 Instructional Designer compiling the official slide deck document.
      
      SOURCE: The presentation sections extracted from the user-confirmed form.
      
      HOW TO BUILD THE DOCUMENT:
      
      1. Generate the complete document in SPANISH.
      2. Use ## for each module/unit title.
      3. Use ### for each slide title within a module.
      4. Use bullet points for key content under each slide.
      5. This is a formal EC0366 instructional design deliverable — professional, clean, ready for slide production.
      
      CRITICAL RULES:
      1. SLIDE STRUCTURE FIDELITY: Each module MUST contain exactly the slides described in its input field. The module structure from the form is the source of truth. Do NOT add or remove slides.
      2. CONTENT FIDELITY: Use the EXACT slide titles and bullet points from the input field. Add speaker notes or visual suggestions ONLY where the input has gaps. Do NOT replace, summarize, or paraphrase user-confirmed content.
      3. NO RAW JSON OR FIELD NAMES in the output. Clean document text only.
      
      OUTPUT ONLY THIS JSON:
      {"documento_md": "# Presentación Electrónica\n\n## Módulo 1: ...\n### Diapositiva 1 — ...\n- ...\n..."}

  # ── AGENTE B: FACILITATOR-READY COMPILER ─────────────────────────────────
  - agent: agente_doc_generic_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_doc_generic]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You are an EC0366 Instructional Designer compiling a facilitator-ready slide document with presentation notes.
      
      SOURCE: The presentation sections extracted from the user-confirmed form.
      
      HOW TO BUILD THE DOCUMENT:
      
      1. Generate the complete document in SPANISH.
      2. Use ## for each module/unit title.
      3. Use ### for each slide title.
      4. Include speaker notes under each slide as > **Nota del facilitador:** blockquotes.
      5. Include visual suggestions where applicable (diagrams, comparisons, demonstrations).
      6. Include interaction cues like **[Pregunta al grupo]**, **[Demo en vivo]**, **[Pausa para ejercicio]**.
      7. Use Markdown tables where content benefits from tabular comparison.
      
      CRITICAL RULES:
      1. CONTENT COMPLETENESS: Your document may have a different structure than the standard template, but it MUST contain ALL factual information from the form fields. Different structure ≠ different content. Every slide title and bullet from the input must appear in your output.
      2. NO RAW JSON OR FIELD NAMES in the output.
      3. NO INVENTED CONTENT: Speaker notes and visual suggestions are additions, not replacements. The core slide content comes from the form.
      
      OUTPUT ONLY THIS JSON:
      {"documento_md": "# Presentación Electrónica — Guía del Facilitador\n\n## Módulo 1: ...\n..."}

  # ── JUDGE ────────────────────────────────────────────────────────────────
  - agent: juez_doc_generic
    model: "qwen2.5:14b"
    inputs_from: [agente_doc_generic_A, agente_doc_generic_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.
      
      Compare "documento_md" from A and B. Select the better Presentación Electrónica document.
      
      SELECTION CRITERIA:
      1. No raw JSON or field names visible — clean, professional document.
      2. Slide structure: Each module has clearly defined slides with titles and content.
      3. Fidelity to form: ALL slide titles and bullet points come from userInputs — no invented content.
      4. Correct unit count: ALL modules from the form input are present; none missing, none added.
      5. No merged or split fields: each form field corresponds to exactly one module section in the document.
      6. Production readiness: Can a slide designer directly use this document to build the deck?
      
      OUTPUT ONLY THIS JSON:
      {"seleccion": "A" | "B", "razon": "1-line explanation"}

  # ── ASSEMBLER ────────────────────────────────────────────────────────────
  - agent: ensamblador_doc_generic
    model: "qwen2.5:14b"
    inputs_from: [juez_doc_generic]
    include_template: false
    task: "CÓDIGO - Assembly in document-generic.assembler.ts"
---