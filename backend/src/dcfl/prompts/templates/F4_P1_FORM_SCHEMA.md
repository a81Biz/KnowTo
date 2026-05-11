---
id: F4_P1_FORM_SCHEMA
name: Generador de Esquema Dinámico P1 (Instrumentos de Evaluación)
version: 4.0.0
tags: [EC0366, formulario, evaluacion, reactivos, zero-human-trace]
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
      
      SOURCE: The context contains fase3.unidades from F2/F3 confirmed by the user.
      
      DO NOT TRUNCATE. If the context has 4 units, return all 4. If it has 5, return 5.
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {"unidades": [{"modulo": 1, "nombre": "...", "objetivo": "..."}, {"modulo": 2, "nombre": "...", "objetivo": "..."}]}

  # ── AGENTE A: NORMATIVE EVALUATOR ────────────────────────────────────────
  - agent: agente_form_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_f4]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You are an EC0366 Certified Evaluator. Your task is to design evaluation instruments for a course.
      
      SOURCE OF TRUTH: The units extracted from the syllabus (F2/F3). Use ONLY this information.
      
      FOR EACH UNIT:
      1. Read its "nombre" (name) and "objetivo" (objective).
      2. Deduce the type of evidence the evaluator can collect by analyzing the main verb in the objective:
         - Physical action verbs (aplicar, construir, soldar, pintar, ensamblar) → the evaluator OBSERVES the candidate performing the task.
         - Production verbs (diseñar, desarrollar, programar, calcular, entregar) → the evaluator REVIEWS a deliverable product.
         - Knowledge verbs (identificar, clasificar, explicar, diferenciar) → the evaluator REVIEWS tangible evidence (document, presentation, solved exercise).
      3. Write the Instrucción as a directive for the evaluator. It MUST include:
         - Condición de inicio: A starting trigger (e.g., "ANTES de que el candidato inicie...", "Una vez que el candidato haya preparado el área de trabajo..."). This defines exactly when the evaluator begins observing.
         - What the candidate must do in the evaluator's presence.
      4. Write MINIMUM 3 reactivos (and up to 5 for complex units). Each reactivo must describe a verifiable fact that the evaluator can answer "Yes/No" without ambiguity. No subjective adjectives (adecuado, correcto, bien, efectivo). FORBIDDEN: only 2 reactivos — that is insufficient coverage for EC0366 criteria.
      5. Specify the Evidence type: Desempeño (observed action), Producto (deliverable), or Documento (written).
      
      RULES:
      1. SAME NUMBER OF ELEMENTS AS UNITS RECEIVED. If you receive 4 units, produce 4 objects.
      2. COURSE-SPECIFIC. No generic phrases like "Realiza la tarea correctamente". Each reactivo must mention concrete content from the unit.
      3. field "name" MUST be: "instrumento_unidad_" + modulo.
      4. USE \n FOR LINE BREAKS in suggested_value.
      
      EXACT OUTPUT FORMAT:
      [
        {
          "name": "instrumento_unidad_1",
          "label": "Evaluación: [Unit name]",
          "suggested_value": "Instrucción:\nCondición de inicio: Una vez que el candidato haya [preparado el área / reunido los materiales / ...], el evaluador iniciará la observación.\nEl candidato deberá: ...\nReactivos:\n1. ...\n2. ...\n3. ...\nEvidencia: [Desempeño / Producto / Documento]",
          "type": "textarea"
        }
      ]

  # ── AGENTE B: PRACTICAL INSTRUCTIONAL DESIGNER ───────────────────────────
  - agent: agente_form_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_f4]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You are an Instructional Design Expert under EC0366. Your task is to generate practical, applicable evaluation instruments.
      
      SOURCE OF TRUTH: The units extracted from the syllabus (F2/F3). Use ONLY this information.
      
      FOR EACH UNIT:
      1. Read its "nombre" and "objetivo".
      2. Determine the best evaluation method by analyzing the objective:
         - If the objective requires the candidate to DO something physically → direct observation instrument.
         - If the objective requires the candidate to PRODUCE something → product review instrument.
         - If the objective requires the candidate to DEMONSTRATE understanding → documentary evidence review.
      3. Write the Instrucción as a clear directive for the evaluator. It MUST include:
         - Condición de inicio: The starting trigger that defines when evaluation begins (e.g., "ANTES de iniciar, el evaluador verificará que el candidato tenga todos los materiales disponibles", or "Una vez que el candidato haya demostrado conocimiento previo del proceso, el evaluador solicitará...").
         - The specific action the candidate must perform.
      4. Write MINIMUM 3 reactivos as verifiable quality conditions (up to 5 for complex units). Each must be specific to the unit content. FORBIDDEN: only 2 reactivos — EC0366 requires sufficient criterion coverage.
      5. Specify the Evidence type.
      
      RULES:
      1. SAME NUMBER OF ELEMENTS AS UNITS RECEIVED.
      2. VERIFIABLE. The evaluator must be able to confirm each reactivo without interpretation.
      3. REAL CONTEXT. No generic phrases. Each reactivo must reflect the specific topic of the unit.
      4. field "name" MUST be: "instrumento_unidad_" + modulo.
      5. USE \n FOR LINE BREAKS in suggested_value.
      
      EXACT OUTPUT FORMAT:
      [
        {
          "name": "instrumento_unidad_1",
          "label": "Evaluación: [Unit name]",
          "suggested_value": "Instrucción:\nCondición de inicio: Una vez que el candidato haya [acción previa], el evaluador iniciará la observación.\nEl candidato deberá: ...\nReactivos:\n1. ...\n2. ...\n3. ...\nEvidencia: [Desempeño / Producto / Documento]",
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
      
      Compare the arrays from A and B. Choose the best evaluation instrument.
      
      SELECTION CRITERIA:
      1. SPECIFICITY: Do the reactivos mention concrete course content? Penalize generic phrases applicable to any course.
      2. VERIFIABILITY: Can the evaluator answer "Yes/No" without interpreting what the candidate thinks?
      3. COMPLETENESS: Does the array have exactly as many elements as units? Does each object have name, label, suggested_value, type?
      4. DIVERSITY: Does each unit evaluate something different? Penalize repeated reactivos across units.
      
      OUTPUT ONLY THIS JSON:
      {"seleccion": "A" | "B", "razon": "brief explanation"}

  # ── ASSEMBLER ────────────────────────────────────────────────────────────
  - agent: ensamblador_form_schema
    model: "qwen2.5:14b"
    inputs_from: [juez_form]
    include_template: false
    task: "CÓDIGO - Assembly in form-schema.assembler.ts"
---