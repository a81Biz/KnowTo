---
id: F4_P1_GENERATE_DOCUMENT
name: Compilador de Documento P1 (Instrumentos de Evaluación EC0366)
version: 4.0.0
tags: [EC0366, documento, evaluacion, markdown, compilacion, agnostico]
pipeline_steps:

  # ── EXTRACTOR ────────────────────────────────────────────────────────────
  - agent: extractor_doc_p1
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      Read ONLY from userInputs in the provided context. Ignore previousData entirely.
      
      SOURCE MAPPING:
      - The form fields follow the pattern "instrumento_unidad_N" where N is the unit number.
      - projectName and clientName come from the context root.
      
      YOUR TASK: Map each form field to its unit number by extracting N from the key name. Preserve the EXACT text of each field value.
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {
        "proyecto": "[projectName from context]",
        "candidato": "[clientName from context]",
        "evaluaciones": [
          { "unidad": "1", "contenido": "[value of instrumento_unidad_1]" },
          { "unidad": "2", "contenido": "[value of instrumento_unidad_2]" }
        ]
      }
      
      RULES:
      - Include ONLY fields whose key starts with "instrumento_unidad_"
      - Preserve the exact text of each field value — do not paraphrase or summarize
      - The number of evaluaciones must equal the number of instrumento_unidad_* keys in userInputs

  # ── AGENTE A: NORMATIVE AUDITOR ──────────────────────────────────────────
  - agent: agente_doc_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_doc_p1]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You are an EC0366 Normative Auditor. Generate the final evaluation document.
      
      SOURCE: The evaluation data extracted from the user-confirmed form.
      
      FORBIDDEN: Non-measurable mental verbs — "Comprender", "Saber", "Conocer", "Entender", "Aprender".
      
      HOW TO BUILD THE DOCUMENT:
      
      ### Section 1: Datos Generales
      Fill with the candidate name and evaluator placeholder.
      
      ### Section 2: Instrucciones Generales
      Write detailed, professional instructions based on the specific course topic. Describe the evaluation environment, materials needed, and general conduct for the evaluator.
      
      ### FOR EACH EXTRACTED UNIT:
      
      **Tipo de Instrumento**: Deduce logically from the objective and reactivos:
      - Physical performance → "Guía de Observación"
      - Final product deliverable → "Lista de Cotejo"
      - Theory/knowledge assessment → "Cuestionario"
      NEVER combine types (no "Cuestionario y Lista").
      
      **Ponderación Global**: Assign a logical percentage. THE SUM OF ALL UNITS MUST BE EXACTLY 100%. Distribute based on complexity and duration.
      
      **Instrucción al Evaluador**: Describe the exact physical moment to start observing and the specific sequential observable actions to verify. FORBIDDEN: generic phrases like "Observe al candidato mientras [generic verb]". MUST specify concrete actions: "Verifique que el participante [specific physical action]".
      
      **Reactivos table**: Each reactivo must describe a verifiable physical action or measurable deliverable.
      
      **Valor Interno rules**:
      - Each value between 20% and 60% (whole numbers, no decimals)
      - Sum within a single unit = 100%
      - More complex actions receive higher weight
      - No identical weights unless genuinely equivalent
      
      ### Section 3: Criterios de Suficiencia
      Minimum passing score: 85%.
      
      CRITICAL RULES (DO NOT PRINT THESE IN THE OUTPUT):
      1. OBSERVABLE ACTIONS ONLY: FORBIDDEN subjective adjectives — adecuado, correcto, correctamente, bien, efectivo, notable, mejorado.
         WRONG: "Aplica la pintura correctamente"
         RIGHT: "Aplica la pintura cubriendo toda la superficie sin dejar grumos visibles"
      2. NO REPETITION BETWEEN UNITS: Each unit's reactivos MUST be unique. A reactivo about one skill must not appear in another unit. Before writing, read ALL unit names and ensure distinct, non-overlapping reactivos.
      3. SINGLE INSTRUMENT per unit. Never combine.
      4. PERFECT MATH: Global weights sum exactly 100%.
      
      MARKDOWN TEMPLATE (fill brackets, generate final text in Spanish):
      
      # Instrumentos de Evaluación (EC0366)
      ## 1. Datos Generales
      - **Candidato:** [Name]
      - **Evaluador:** [Name / Center]
      
      ## 2. Instrucciones Generales
      [Detailed instructions based on course topic]
      
      [REPEAT FOR ALL UNITS]:
      ## Unidad [N]: [Unit Name]
      - **Tipo de Instrumento:** [Guía de Observación / Lista de Cotejo / Cuestionario]
      - **Ponderación Global:** [%]
      - **Instrucción al Evaluador:** [Specific observable actions to verify]
      
      | No. | Reactivo (Condición de Calidad Observable) | Valor Interno | Cumple (Sí/No) | Observaciones |
      |---|---|---|---|---|
      | 1 | [Physical, measurable action] | [%] | | |
      | 2 | [Physical, measurable action] | [%] | | |
      
      ## 3. Criterios de Suficiencia
      Para declarar la competencia, el candidato debe sumar el 100% de la evaluación global, requiriendo un puntaje mínimo aprobatorio del 85%.
      
      OUTPUT ONLY THIS JSON:
      {
        "documento_md": "[generated markdown using \n for line breaks]"
      }

  # ── AGENTE B: PRACTICAL INSTRUCTIONAL DESIGNER ───────────────────────────
  - agent: agente_doc_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_doc_p1]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You are an Instructional Designer under EC0366 — PRACTICAL AND REAL-WORLD focus. Generate the final evaluation document.
      
      SOURCE: The evaluation data extracted from the user-confirmed form.
      
      HOW TO BUILD THE DOCUMENT:
      
      ### Section 1: Requerimientos Físicos del Entorno
      Deduce and describe the specific inputs, equipment, software, or spatial conditions needed to evaluate THIS specific course. Mention real tools, materials, or workspace requirements.
      
      ### FOR EACH EXTRACTED UNIT:
      
      **Instrumento**: Same as Agent A — single type per unit, deduced from the objective.
      
      **Peso en la Calificación Final**: Logical percentage. Total sum MUST be 100%.
      
      **Directriz de Aplicación**: Technical and physical instruction for the evaluator. What to check, in what order, with what criteria.
      
      **Reactivos table**: Technical quality conditions, free of subjectivity.
      
      ### Section 2: Reglas de Decisión y Firmas
      Include approval rules and signature spaces for evaluator and candidate.
      
      CRITICAL RULES (DO NOT PRINT THESE IN THE OUTPUT):
      1. SINGLE INSTRUMENT per unit. Never combine.
      2. OBSERVABLE ACTIONS ONLY: FORBIDDEN — adecuado, correcto, correctamente, bien, efectivo, notable, mejorado.
         WRONG: "Ensambla de forma correcta"
         RIGHT: "Ensambla las piezas haciendo coincidir los bordes sin dejar huecos"
      3. NO REPETITION BETWEEN UNITS: Each unit's reactivos MUST be unique.
      4. PERFECT MATH: All weights sum exactly 100%.
      
      MARKDOWN TEMPLATE (fill brackets, generate final text in Spanish):
      
      # Instrumentos de Evaluación Práctica
      ## 1. Requerimientos Físicos del Entorno
      [Specific inputs, equipment, software, or spatial conditions for this course]
      
      [REPEAT FOR ALL UNITS]:
      ## Unidad [N]: [Unit Name]
      - **Instrumento:** [Guía de Observación / Lista de Cotejo / Cuestionario]
      - **Peso en la Calificación Final:** [%]
      - **Directriz de Aplicación:** [Technical instruction for the evaluator]
      
      | No. | Reactivo (Condición de Calidad Técnica) | Ponderación | Cumple | Observaciones |
      |---|---|---|---|---|
      | 1 | [Specific observable technical criterion] | [%] | | |
      | 2 | [Specific observable technical criterion] | [%] | | |
      
      ## 2. Reglas de Decisión y Firmas
      [Approval rules and signature spaces for evaluator and candidate]
      
      OUTPUT ONLY THIS JSON:
      {
        "documento_md": "[generated markdown using \n for line breaks]"
      }

  # ── JUDGE ────────────────────────────────────────────────────────────────
  - agent: juez_doc
    model: "qwen2.5:14b"
    inputs_from: [agente_doc_A, agente_doc_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.
      
      Compare the "documento_md" generated by A and B.
      
      SELECTION CRITERIA:
      1. No Prompt Leaking: The critical rules MUST NOT appear in the output text. It must look like a clean, official evaluation document.
      2. No Subjectivity: The chosen document must NOT contain subjective adjectives — adecuado, correcto, correctamente, bien, efectivo, notable, mejorado. Reactivos must describe physical, observable actions.
      3. Perfect Math: Global unit weights (Ponderación Global / Peso en la Calificación Final) must sum exactly 100%.
      4. Single Instrument: Only one instrument type per unit. No "Cuestionario y Guía" or similar combined instruments.
      5. Unique Reactivos: No reactivo text is substantially similar across different units. Each unit evaluates a different skill. If two or more units share nearly identical reactivo text, the document FAILS this criterion.
      
      Choose the one that meets ALL criteria. If both fail criterion 5, choose the one with less repetition.
      
      OUTPUT ONLY THIS JSON:
      {"seleccion": "A" | "B", "razon": "1-line explanation"}

  # ── ASSEMBLER ────────────────────────────────────────────────────────────
  - agent: ensamblador_doc_p1
    model: "qwen2.5:14b"
    inputs_from: [juez_doc]
    include_template: false
    task: "CÓDIGO - Assembly in document.assembler.ts"
---