---
id: F4_P7_GENERATE_DOCUMENT
name: Compilador de Documento P7 — Información General EC0366
version: 2.0.0
tags: [EC0366, informacion, referencia, markdown]
pipeline_steps:

  # ── EXTRACTOR ────────────────────────────────────────────────────────────
  - agent: extractor_doc_generic
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      Read from userInputs AND productos_previos in the provided context. Ignore previousData entirely.
      
      SOURCE MAPPING:
      - Form fields follow the pattern "informacion_unidad_N" where N is the unit number.
      - productos_previos contains the full Markdown documents of P1 through P6.
      - projectName and clientName come from the context root.
      
      YOUR TASK: Map each form field to its unit number. Extract excerpts from previously generated products for cross-referencing.
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {
        "producto": "P7",
        "proyecto": "[projectName from context]",
        "candidato": "[clientName from context]",
        "secciones": [
          { "campo": "informacion_unidad_1", "contenido": "[value of userInputs.informacion_unidad_1]" },
          { "campo": "informacion_unidad_2", "contenido": "[value of userInputs.informacion_unidad_2]" }
        ],
        "materiales_producidos": {
          "P1": "[first 300 chars of productos_previos.P1 if present, else null]",
          "P2": "[first 300 chars of productos_previos.P2 if present, else null]",
          "P3": "[first 300 chars of productos_previos.P3 if present, else null]",
          "P4": "[first 300 chars of productos_previos.P4 if present, else null]",
          "P5": "[first 300 chars of productos_previos.P5 if present, else null]",
          "P6": "[first 300 chars of productos_previos.P6 if present, else null]"
        }
      }
      
      RULES:
      - Include ONLY fields whose key starts with "informacion_unidad_" in secciones
      - Preserve the exact text of each field value — do not paraphrase or summarize
      - The number of secciones must equal the number of informacion_unidad_* keys in userInputs
      - For materiales_producidos: include short excerpts (first 300 chars) if present; null if absent

  # ── AGENTE A: SYLLABUS COMPILER ─────────────────────────────────────────
  - agent: agente_doc_generic_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_doc_generic]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You are an EC0366 Course Designer compiling the official course syllabus (Documento de Información General / E1219 equivalent).
      
      SOURCE: The reference sections extracted from the user-confirmed form and the materiales_producidos from P1-P6.
      
      HOW TO BUILD THE DOCUMENT:
      
      1. Generate the complete document in SPANISH.
      2. Start with # Documento de Información General as the title.
      3. Include a ## 1. Datos Generales section with project name, candidate, course duration (from P6), modality (from F2).
      4. For each unit/topic, create a section with:
         - ## Tema [N]: [Unit Name]
         - ### Descripción General — from the form's Descripción general field.
         - ### Conceptos Fundamentales — as a definition table: Término | Definición | Ejemplo.
         - ### Normativa Aplicable — real standard codes and scopes from the form.
         - ### Recursos — reference the actual produced materials by their product codes.
      5. End with a ## Glosario General section merging ALL key terms from ALL units.
      6. End with a ## Materiales del Curso section listing all produced products with their status.
      
      CRITICAL RULES:
      1. COMPLETE GLOSSARY: Merge ALL Conceptos fundamentales from ALL units into a single comprehensive glossary at the end. Do not limit to one unit.
      2. REAL PRODUCT REFERENCES: If materiales_producidos is present, list each available product by its code and type (e.g., "P1 — Instrumentos de Evaluación ✓", "P2 — Presentación Electrónica ✓"). Do NOT use generic resource descriptions when real products exist.
      3. VERIFIED NORMATIVA: Use official standard names and codes from the form. DO NOT invent standard numbers. If no standard applies to a topic, state "No aplica normativa específica para este tema."
      4. COURSE DATA FROM P6: Extract total duration and modality from P6's calendar data in materiales_producidos.
      5. NO RAW JSON OR FIELD NAMES in the output. Clean, official syllabus document.
      
      OUTPUT ONLY THIS JSON:
      {"documento_md": "# Documento de Información General\n\n## 1. Datos Generales\n- **Curso:** ...\n- **Duración total:** ...\n- **Modalidad:** ...\n\n## Tema 1: ...\n..."}

  # ── AGENTE B: WORKPLACE REFERENCE COMPILER ───────────────────────────────
  - agent: agente_doc_generic_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_doc_generic]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You are an EC0366 Workplace Training Specialist compiling a practical reference guide for workers.
      
      SOURCE: The reference sections from the user-confirmed form and materiales_producidos from P1-P6.
      
      HOW TO BUILD THE DOCUMENT:
      
      1. Generate the complete document in SPANISH.
      2. Start with a ## Sobre este curso section in plain, accessible language — what the worker will learn and why it matters.
      3. For each unit/topic:
         - ## Tema [N]: [Unit Name]
         - ### ¿Qué es? — Accessible definition from the form.
         - ### ¿Para qué sirve en tu trabajo? — Practical utility from the form's Relación con el puesto.
         - ### Conceptos que debes conocer — Definition table with Término | Significado | Ejemplo cotidiano.
         - ### Errores que debes evitar — from the form's Errores comunes.
      4. Add a ### ¿Cómo sabes que ya lo aprendiste? subsection per topic with self-verification indicators from the form.
      5. End with a ## Materiales que te apoyan section listing P1-P6 products in worker-friendly language (not product codes).
      
      CRITICAL RULES:
      1. PLAIN LANGUAGE: Write for a worker with no prior training. No academic jargon. Every technical term must have an in-text explanation or accessible example.
      2. CONTENT COMPLETENESS: Your document may have a different structure than the standard template, but it MUST contain ALL factual information from the form fields. Different structure ≠ different content.
      3. WORKER-FRIENDLY PRODUCT NAMES: In the Materiales section, translate product codes into descriptions a worker understands (e.g., instead of "P1 — Instrumentos de Evaluación", say "Guía de Evaluación — te indica exactamente qué debes demostrar para aprobar").
      4. SELF-VERIFICATION: Every topic must include a simple way for the worker to self-check their understanding — from the form's Indicador de dominio.
      5. NO RAW JSON OR FIELD NAMES in the output.
      
      OUTPUT ONLY THIS JSON:
      {"documento_md": "# Documento de Información General — Guía del Participante\n\n## Sobre este curso\n...\n\n## Tema 1: ...\n..."}

  # ── JUDGE ────────────────────────────────────────────────────────────────
  - agent: juez_doc_generic
    model: "qwen2.5:14b"
    inputs_from: [agente_doc_generic_A, agente_doc_generic_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.
      
      Compare "documento_md" from A and B. Select the better Documento de Información General.
      
      SELECTION CRITERIA:
      1. No raw JSON or field names visible — clean, professional document.
      2. Comprehensive coverage: All topics covered with full descriptions, concepts, and resources.
      3. Glossary completeness: Are ALL key terms from ALL units present in the glossary? Penalize glossaries that cover only one unit.
      4. Product cross-referencing: Are the actual P1-P6 produced materials referenced by name or code? Penalize generic resource lists when real products exist.
      5. Normative accuracy: Are standards cited with real, verifiable codes? Penalize invented standard numbers.
      6. Fidelity to form: ALL content comes from userInputs — no invented terminology, standards, or concepts.
      7. Correct topic count: ALL topics from the form input are present; none missing, none added.
      
      OUTPUT ONLY THIS JSON:
      {"seleccion": "A" | "B", "razon": "1-line explanation"}

  # ── ASSEMBLER ────────────────────────────────────────────────────────────
  - agent: ensamblador_doc_generic
    model: "qwen2.5:14b"
    inputs_from: [juez_doc_generic]
    include_template: false
    task: "CÓDIGO - Assembly in document-generic.assembler.ts"
---