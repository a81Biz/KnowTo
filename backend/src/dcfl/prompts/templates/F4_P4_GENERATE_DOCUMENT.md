---
id: F4_P4_GENERATE_DOCUMENT
name: Compilador de Documento P4 — Manual del Participante EC0366
version: 2.0.0
tags: [EC0366, manual, participante, markdown]
pipeline_steps:

  # ── EXTRACTOR ────────────────────────────────────────────────────────────
  - agent: extractor_doc_generic
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      Read ONLY from userInputs in the provided context. Ignore previousData entirely.
      
      SOURCE MAPPING:
      - The form fields follow the pattern "manual_unidad_N" where N is the unit number.
      - projectName and clientName come from the context root.
      
      YOUR TASK: Map each form field to its unit number by extracting N from the key name. Preserve the EXACT text of each field value.
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {
        "producto": "P4",
        "proyecto": "[projectName from context]",
        "candidato": "[clientName from context]",
        "secciones": [
          { "campo": "manual_unidad_1", "contenido": "[value of manual_unidad_1]" },
          { "campo": "manual_unidad_2", "contenido": "[value of manual_unidad_2]" }
        ]
      }
      
      RULES:
      - Include ONLY fields whose key starts with "manual_unidad_"
      - Preserve the exact text of each field value — do not paraphrase or summarize
      - The number of secciones must equal the number of manual_unidad_* keys in userInputs

  # ── AGENTE A: STUDY-GUIDE COMPILER ───────────────────────────────────────
  - agent: agente_doc_generic_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_doc_generic]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You are an EC0366 Technical Writer compiling the official participant manual.
      
      SOURCE: The manual chapter sections extracted from the user-confirmed form.
      
      HOW TO BUILD THE DOCUMENT:
      
      1. Generate the complete document in SPANISH.
      2. Use # for the document title, ## for each chapter/module, ### for subsections.
      3. Each chapter MUST include ALL sections from the form field:
         - Introducción → ### Introducción
         - Conceptos clave → ### Conceptos Clave (use a definition table)
         - Desarrollo → ### Desarrollo (main content with examples and common mistakes)
         - Ejercicio práctico → ### Ejercicio Práctico
         - Puntos a recordar → ### Puntos a Recordar (bullet list)
      4. This is a self-study document — a participant must be able to learn from this manual WITHOUT watching any video or attending any class.
      
      CRITICAL RULES:
      1. DEPTH REQUIREMENT: Every concept must be explained with 2-3 sentences of detail beyond what appears in slides or scripts. Include concrete examples, counter-examples, and common mistakes. This is the deep-reference document.
      2. COMPLETE SECTIONS: Include ALL sections from the form. If a section is empty in the form, write a one-sentence placeholder indicating what should go there.
      3. DEFINITION TABLES: Use Markdown tables for the Conceptos clave section — Término | Definición | Ejemplo.
      4. CALLOUTS: Use > **Nota:** blockquotes for important warnings, tips, or safety information.
      5. NO RAW JSON OR FIELD NAMES in the output. Clean, professional manual.
      6. BIBLIOGRAPHY: If the form references sources, include them in a ## Bibliografía section at the end of the manual.
      
      OUTPUT ONLY THIS JSON:
      {"documento_md": "# Manual del Participante\n\n## Capítulo 1: ...\n### Introducción\n...\n### Conceptos Clave\n| Término | Definición | Ejemplo |\n|---|---|---|\n..."}

  # ── AGENTE B: SELF-STUDY DESIGNER ────────────────────────────────────────
  - agent: agente_doc_generic_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_doc_generic]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You are an EC0366 Self-Study Instructional Designer compiling a comprehensive participant manual.
      
      SOURCE: The manual chapter sections extracted from the user-confirmed form.
      
      HOW TO BUILD THE DOCUMENT:
      
      1. Generate the complete document in SPANISH.
      2. Use # for the document title, ## for each chapter, ### for subsections.
      3. Structure each chapter for self-study with:
         - Learning objective at the top
         - Theory section with diagrams or tables
         - Numbered procedure with observable steps
         - Self-assessment checklist or rubric
         - Further reading references
      4. Include a comprehensive ## Glosario section at the end with ALL key terms from ALL chapters.
      5. Include a ## Bibliografía section with all F0 sources.
      6. Use callout boxes, comparison tables, and checklists throughout.
      
      CRITICAL RULES:
      1. CONTENT COMPLETENESS: Your document may use a different chapter structure than the standard template, but it MUST contain ALL factual information from the form fields. Different structure ≠ different content.
      2. SELF-ASSESSMENT: Every chapter must include a way for the participant to verify their own understanding — checklist, rubric, or self-test question.
      3. GLOSSARY: The final glossary must merge ALL key terms from ALL chapters. Do not limit to one unit.
      4. CROSS-REFERENCES: Where a concept in one chapter relates to another chapter, add a brief cross-reference: (→ ver Capítulo X).
      5. NO RAW JSON OR FIELD NAMES in the output.
      
      OUTPUT ONLY THIS JSON:
      {"documento_md": "# Manual del Participante — Autoestudio\n\n## Capítulo 1: ...\n..."}

  # ── JUDGE ────────────────────────────────────────────────────────────────
  - agent: juez_doc_generic
    model: "qwen2.5:14b"
    inputs_from: [agente_doc_generic_A, agente_doc_generic_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.
      
      Compare "documento_md" from A and B. Select the better Manual del Participante.
      
      SELECTION CRITERIA:
      1. No raw JSON or field names visible — clean, professional document.
      2. Self-contained: Can a participant study from this manual without any other resource? Does it provide sufficient depth?
      3. Clear chapter structure with all required sections present.
      4. Practical application: Does each chapter include exercises, checklists, or self-assessment?
      5. Fidelity to form: ALL content comes from userInputs — no invented concepts, procedures, or sources.
      6. Correct chapter count: ALL chapters from the form input are present; none missing, none added.
      7. Reference quality: Are sources cited? Is there a glossary or bibliography?
      
      OUTPUT ONLY THIS JSON:
      {"seleccion": "A" | "B", "razon": "1-line explanation"}

  # ── ASSEMBLER ────────────────────────────────────────────────────────────
  - agent: ensamblador_doc_generic
    model: "qwen2.5:14b"
    inputs_from: [juez_doc_generic]
    include_template: false
    task: "CÓDIGO - Assembly in document-generic.assembler.ts"
---