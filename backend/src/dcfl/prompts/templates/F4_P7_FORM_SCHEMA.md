---
id: F4_P7_FORM_SCHEMA
name: Generador de Esquema Dinámico P7 (Documento de Información General)
version: 2.0.0
tags: [EC0366, formulario, informacion, referencia]
pipeline_steps:

  # ── EXTRACTOR ────────────────────────────────────────────────────────────
  - agent: extractor_f4
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      Extract ALL units and the synthesized content from all previously generated products.
      
      SOURCE: The context contains fase3.unidades (F2/F3) and P1-P6 data from productos_previos.
      
      DO NOT TRUNCATE. Return every unit.
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {"unidades": [{"modulo": 1, "nombre": "...", "objetivo": "..."}, {"modulo": 2, "nombre": "...", "objetivo": "..."}]}

  # ── AGENTE A: REFERENCE DOCUMENT WRITER ──────────────────────────────────
  - agent: agente_form_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_f4]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You are an EC0366 Technical Writer compiling the official course information document (E1219 syllabus equivalent).
      
      SOURCE OF TRUTH: The units from the syllabus (F2/F3) and the full P1-P6 generated materials.
      
      FOR EACH UNIT:
      1. Read its "nombre" and "objetivo".
      2. Read the corresponding P1 instrument (evaluation methods), P4 manual (key concepts), and P3 scripts (narrative context).
      3. Write a reference entry with 6 sections:
         - Tema: Exact unit name.
         - Descripción general: What this topic covers in 2-3 sentences.
         - Conceptos fundamentales: 3-5 key terms with clear definitions — drawn from P4's glossary.
         - Normativa aplicable: The real standard, law, or procedure this relates to — use official names and codes (NOM, NMX, ISO, AWS). DO NOT invent codes.
         - Recursos de consulta: Bibliographic reference or support link from F0 or P4.
         - Relación con el puesto: How this applies in real work — drawn from F0's industry context and P5's scenarios.
      
      RULES:
      1. SAME NUMBER OF ELEMENTS AS UNITS RECEIVED.
      2. P1-P6 BARRIIDO: Use the generated products as source material. Conceptos come from P4. Evaluación context from P1. Real-world application from P5's scenarios. Durations from P6's calendar.
      3. REAL NORMATIVA: Normativa aplicable must cite real, verifiable standards with their official codes. Do NOT invent standard numbers.
      4. field "name" MUST be: "informacion_unidad_" + modulo.
      5. USE \n FOR LINE BREAKS in suggested_value.
      
      EXACT OUTPUT FORMAT:
      [
        {
          "name": "informacion_unidad_1",
          "label": "Información: [Unit name]",
          "suggested_value": "Tema: ...\nDescripción general: ...\nConceptos fundamentales: ...\nNormativa aplicable: ...\nRecursos de consulta: ...\nRelación con el puesto: ...",
          "type": "textarea"
        }
      ]

  # ── AGENTE B: WORKER-FRIENDLY WRITER ─────────────────────────────────────
  - agent: agente_form_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_f4]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You are an EC0366 Workplace Training Specialist writing accessible reference sheets for workers with no prior experience.
      
      SOURCE OF TRUTH: The units from the syllabus (F2/F3) and the full P1-P6 generated materials.
      
      FOR EACH UNIT:
      1. Read its "nombre" and "objetivo".
      2. Read P1-P6 for context — but translate everything into plain, accessible language.
      3. Write a worker-friendly reference card with 6 sections:
         - Unidad: Topic name.
         - ¿Qué es?: Accessible definition for a worker with no prior experience — no jargon.
         - ¿Para qué sirve?: Practical utility in the work context — drawn from P5's real-world scenarios.
         - Ejemplo real: Concrete application case from the workplace — from P5's situación problema or P3's ejemplos.
         - Errores comunes: 2-3 frequent mistakes to avoid — from P5's facilitator notes or P4's common mistakes.
         - Indicador de dominio: How the worker knows they learned this — simple, self-verifiable, from P1's reactivos simplified into plain language.
      
      RULES:
      1. SAME NUMBER OF ELEMENTS AS UNITS RECEIVED.
      2. PLAIN LANGUAGE: Write for someone with no prior training. If a term is technical, explain it in parentheses. Sentence length: 15-20 words max.
      3. P1-P6 GROUNDING: Every field must be traceable to a specific P1-P6 product. Ejemplo real from P5. Errores comunes from P4 or P5 facilitator notes. Indicador from P1.
      4. field "name" MUST be: "informacion_unidad_" + modulo.
      5. USE \n FOR LINE BREAKS in suggested_value.
      
      EXACT OUTPUT FORMAT:
      [
        {
          "name": "informacion_unidad_1",
          "label": "Información: [Unit name]",
          "suggested_value": "Unidad: ...\n¿Qué es?: ...\n¿Para qué sirve?: ...\nEjemplo real: ...\nErrores comunes: ...\nIndicador de dominio: ...",
          "type": "textarea"
        }
      ]

  # ── JUDGE ────────────────────────────────────────────────────────────────
  - agent: juez_form
    model: "qwen2.5:14b"
    inputs_from: [agente_form_A, agente_form_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.
      
      Compare the arrays from A and B. Choose the best reference document content.
      
      SELECTION CRITERIA:
      1. P1-P6 SYNTHESIS: Does the content draw from multiple generated products (P1 instruments, P4 concepts, P5 scenarios, P6 durations)? Penalize entries that read like isolated unit descriptions.
      2. ACCESSIBILITY: Can a new worker understand this without prior training? Penalize jargon-heavy entries without explanation.
      3. NORMATIVE ACCURACY: Are standards cited with real, verifiable codes? Penalize invented standard numbers.
      4. COMPLETENESS: Does the array have exactly as many elements as units? All 6 sections filled?
      5. PRACTICAL UTILITY: Can a worker read this and understand why this topic matters for their job?
      
      OUTPUT ONLY THIS JSON:
      {"seleccion": "A" | "B", "razon": "brief explanation"}

  # ── ASSEMBLER ────────────────────────────────────────────────────────────
  - agent: ensamblador_form_schema
    model: "qwen2.5:14b"
    inputs_from: [juez_form]
    include_template: false
    task: "CÓDIGO - Assembly in form-schema.assembler.ts"
---