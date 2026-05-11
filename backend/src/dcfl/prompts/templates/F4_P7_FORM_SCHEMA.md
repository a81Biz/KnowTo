---
id: F4_P7_FORM_SCHEMA
name: Generador de Esquema Dinámico P7 (Ficha Técnica del Programa)
version: 3.0.0
tags: [EC0366, formulario, informacion, referencia]
pipeline_steps:

  # ── EXTRACTOR ────────────────────────────────────────────────────────────
  - agent: extractor_f4
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      YOU ARE AN EXTRACTOR, NOT AN EDITOR. Your ONLY job is to copy fields verbatim from the source.
      NEVER rewrite, rephrase, improve, or apply any verb rules to any text — copy it EXACTLY as written.
      Even if the objective says "comprenderá", "sabrá", or "conocerá" — copy it as-is. Do NOT change it.
      
      Extract ALL units and the synthesized content from all previously generated products.
      SOURCE: The context contains fase3.unidades (F2/F3) and P1-P6 data from productos_previos.
      
      MANDATORY — Extract perfil_ingreso from F2 analysis (AUTHORITATIVE SOURCE):
      Look in previousData for the F2 step (may appear as "Análisis de Alcance", "F2", or "Diseño de Alcance").
      From that step's inputData, extract the "perfil_ingreso" field (an object with keys like
      conocimientos_previos, habilidades_digitales, escolaridad_minima, etc.).
      Copy the EXACT values of each "requisito" sub-field. DO NOT rephrase.
      Build "f2_perfil_ingreso" as a dict: {clave: requisito_value}.
      IMPORTANT: "f2_perfil_ingreso" is the AUTHORITATIVE source for the participant entry profile.
      The form agents MUST use this data for the "perfil_ingreso" field — NEVER invent it.
      If the F2 data is absent, set "f2_perfil_ingreso" to null.
      
      MANDATORY — Extract P4 concept data from "productos_previos.P4.capitulos":
      For each chapter in the array, read chapter.unidad and chapter.secciones_json.
      From secciones_json, copy arrays or strings named "conceptos_clave", "glosario", or "normativa" if present.
      Build "p4_conceptos" as a dict keyed by "unidad_N" (e.g. "unidad_1", "unidad_2").
      If "productos_previos.P4" is absent or a chapter has no secciones_json, output empty objects.
      DO NOT invent terms, definitions, or standard codes — copy only what literally appears in P4.
      
      DO NOT TRUNCATE. Return every unit.
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {
        "unidades": [{"modulo": 1, "nombre": "...", "objetivo": "..."}, {"modulo": 2, "nombre": "...", "objetivo": "..."}],
        "f2_perfil_ingreso": {
          "conocimientos_previos": "exact requisito value from F2 or null",
          "habilidades_digitales": "exact requisito value from F2 or null",
          "escolaridad_minima": "exact requisito value from F2 or null",
          "disponibilidad_sugerida": "exact requisito value from F2 or null"
        },
        "p4_conceptos": {
          "unidad_1": {"conceptos_clave": ["term: definition"], "normativa": ["NOM-XXX"]},
          "unidad_2": {"conceptos_clave": [], "normativa": []}
        }
      }

  # ── AGENTE A: REFERENCE DOCUMENT WRITER ──────────────────────────────────
  - agent: agente_form_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_f4]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You are an EC0366 Technical Writer compiling the official Ficha Técnica del Programa (E1219 syllabus equivalent).
      
      SOURCE OF TRUTH: The units from the syllabus (F2/F3) and the full P1-P6 generated materials.
      
      MANDATORY FIRST ITEMS — PROGRAM-LEVEL FIELDS (always output these 3 before per-unit items):
      1. "perfil_ingreso": Describe who this course is for — required prior knowledge, experience level, job role, minimum education.
      2. "perfil_egreso": Describe what competencies the participant will have upon completion — reference the EC0366 standard units directly.
      3. "requisitos_certificacion": List the specific EC0366 certification requirements — evaluation criteria, passing score, evidence types, CONOCER submission requirements.
      
      FOR EACH UNIT (items 4 and beyond):
      1. Read its "nombre" and "objetivo".
      2. Read the corresponding P1 instrument (evaluation methods), P4 manual (key concepts), and P3 scripts (narrative context).
      3. Write a reference entry with 6 sections:
         - Tema: Exact unit name.
         - Descripción general: What this topic covers in 2-3 sentences.
         - Conceptos fundamentales: 3-5 key terms with clear definitions — drawn from P4's glossary.
         - Normativa aplicable: Real standard names and codes (NOM, NMX, ISO, AWS). NEVER invent codes. DISCLAIMER: these references require expert validation before official use.
         - Recursos de consulta: Bibliographic reference or support link from F0 or P4.
         - Relación con el puesto: How this applies in real work — from F0's industry context and P5's scenarios.
      
      RULES:
      1. OUTPUT LENGTH = 3 + number of units. (3 program fields + N unit fields)
      2. REAL NORMATIVA: Use real standard codes. DO NOT invent numbers. Add disclaimer.
      3. field "name" MUST be: "informacion_unidad_" + modulo for unit fields.
      4. USE \n FOR LINE BREAKS in suggested_value.
      
      EXACT OUTPUT FORMAT:
      [
        {
          "name": "perfil_ingreso",
          "label": "Perfil de Ingreso del Participante",
          "suggested_value": "Puesto objetivo: ...\nExperiencia previa requerida: ...\nNivel educativo mínimo: ...\nConocimientos previos: ...",
          "type": "textarea"
        },
        {
          "name": "perfil_egreso",
          "label": "Perfil de Egreso y Competencias",
          "suggested_value": "Al completar el programa, el participante será capaz de:\n- [Competencia 1 observable y verificable]\n- [Competencia 2]\nEstándar de referencia: EC0366",
          "type": "textarea"
        },
        {
          "name": "requisitos_certificacion",
          "label": "Requisitos de Certificación EC0366",
          "suggested_value": "Puntaje aprobatorio: 85%\nEvidencias requeridas: ...\nInstrumentos de evaluación: ...\nEntidad certificadora: CONOCER\nVigencia del certificado: ...",
          "type": "textarea"
        },
        {
          "name": "informacion_unidad_1",
          "label": "Información: [Unit name]",
          "suggested_value": "Tema: ...\nDescripción general: ...\nConceptos fundamentales: ...\nNormativa aplicable: ... [NOTA: requiere validación por experto en la materia]\nRecursos de consulta: ...\nRelación con el puesto: ...",
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
      
      You are an EC0366 Workplace Training Specialist writing the Ficha Técnica del Programa and accessible per-unit reference sheets.
      
      SOURCE OF TRUTH: The units from the syllabus (F2/F3) and the full P1-P6 generated materials.
      
      MANDATORY FIRST ITEMS — PROGRAM-LEVEL FIELDS (always output these 3 before per-unit items):
      1. "perfil_ingreso": Describe the target participant — prior experience, job role, required knowledge, literacy level.
      2. "perfil_egreso": What the participant will demonstrably DO after training — use observable action verbs (not "will understand"). Reference EC0366 competencies.
      3. "requisitos_certificacion": EC0366 certification path — evaluation dates, instruments, minimum scores, evidence portfolio, CONOCER submission steps.
      
      FOR EACH UNIT (items 4 and beyond):
      1. Read its "nombre" and "objetivo".
      2. Read P1-P6 for context — translate into plain, accessible language.
      3. Write a worker-friendly reference card with 6 sections:
         - Unidad: Topic name.
         - ¿Qué es?: Accessible definition — no jargon. Explain technical terms in parentheses.
         - ¿Para qué sirve?: Practical utility drawn from P5's real-world scenarios.
         - Ejemplo real: Concrete case from P5's situación problema or P3's exemplos.
         - Errores comunes: 2-3 mistakes to avoid from P4 or P5 facilitator notes.
         - Indicador de dominio: How the worker knows they learned it — simplified from P1's reactivos.
      
      RULES:
      1. OUTPUT LENGTH = 3 + number of units.
      2. PLAIN LANGUAGE: Sentence length 15-20 words max. Explain jargon.
      3. field "name" MUST be: "informacion_unidad_" + modulo for unit fields.
      4. USE \n FOR LINE BREAKS in suggested_value.
      
      EXACT OUTPUT FORMAT:
      [
        {
          "name": "perfil_ingreso",
          "label": "Perfil de Ingreso del Participante",
          "suggested_value": "Este curso está dirigido a: ...\nSe requiere experiencia previa en: ...\nNivel educativo mínimo: ...",
          "type": "textarea"
        },
        {
          "name": "perfil_egreso",
          "label": "Perfil de Egreso y Competencias",
          "suggested_value": "Al terminar el curso, el participante podrá:\n- [Acción observable 1]\n- [Acción observable 2]\nEC0366 — CONOCER",
          "type": "textarea"
        },
        {
          "name": "requisitos_certificacion",
          "label": "Requisitos de Certificación EC0366",
          "suggested_value": "Calificación mínima: 85%\nEvidencias: ...\nEvaluador: Centro de Evaluación autorizado CONOCER\nDocumentos a presentar: ...",
          "type": "textarea"
        },
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