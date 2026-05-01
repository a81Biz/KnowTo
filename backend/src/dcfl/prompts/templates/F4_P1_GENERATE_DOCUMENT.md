---
id: F4_P1_GENERATE_DOCUMENT
name: Compilador de Documento P1 (Instrumentos de Evaluación EC0366)
version: 3.3.0
tags: [EC0366, documento, evaluacion, markdown, compilacion, agnostico]
pipeline_steps:

  # ── EXTRACTOR ────────────────────────────────────────────────────────────
  - agent: extractor_doc_p1
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      Extract the P1 form data from the provided context.
      
      OUTPUT ONLY A JSON OBJECT WITH THIS EXACT STRUCTURE:
      {
        "proyecto": "Project Name",
        "candidato": "Candidate Name",
        "evaluaciones": [
          {
            "unidad": "1",
            "contenido": "[The complete text saved in the form]"
          }
        ]
      }

  # ── SECCIÓN 1: AGENTE A (AUDITOR NORMATIVO - PLANTILLA ESTRICTA) ─────────
  - agent: agente_doc_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_doc_p1]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      Generate the final evaluation document. IT IS STRICTLY FORBIDDEN to use non-measurable mental verbs like "Comprender" (Understand), "Saber" (Know), "Conocer" (Know). 
      
      CRITICAL RULES (DO NOT INCLUDE OR PRINT THESE IN THE FINAL MARKDOWN):
      1. SINGLE INSTRUMENT: Select and write ONLY ONE instrument type per unit. Do NOT combine them (e.g., Never use 'Cuestionario y Lista').
      2. OBSERVABLE ACTIONS ONLY: It is STRICTLY FORBIDDEN to use subjective adjectives such as 'adecuado' (adequate), 'correcto' (correct), 'bien' (good), 'efectivo' (effective), 'notable' (notable), or 'mejorado' (improved). 
         - WRONG: "Aplica la pintura correctamente" (Subjective).
         - RIGHT: "Aplica la pintura cubriendo toda la superficie sin dejar grumos visibles" (Observable physical action).
      
      YOU MUST USE EXACTLY THIS MARKDOWN TEMPLATE AND FILL IN THE BRACKETS ADAPTING THEM TO THE COURSE TOPIC (GENERATE THE FINAL TEXT IN SPANISH):
      
      # Instrumentos de Evaluación (EC0366)
      ## 1. Datos Generales
      - **Candidato:** [Nombre]
      - **Evaluador:** [Nombre / Centro]
      
      ## 2. Instrucciones Generales
      [Redacta instrucciones detalladas y profesionales basadas en la temática específica del curso]
      
      [REPEAT THIS FOR ALL EXTRACTED UNITS]:
      ## Unidad [Número]: [Nombre de la Unidad]
      - **Tipo de Instrumento:** [Deduce logically: For physical performance use 'Guía de Observación'; for a final product use 'Lista de Cotejo'; for theory use 'Cuestionario'].
      - **Ponderación Global:** [Assign a logical percentage. THE SUM OF ALL UNITS MUST BE EXACTLY 100%].
      - **Instrucción al Evaluador:** [Redacta qué debe observar, revisar o preguntar exactamente, sin subjetividades].
      
      | No. | Reactivo (Condición de Calidad Observable) | Valor Interno | Cumple (Sí/No) | Observaciones |
      |---|---|---|---|---|
      | 1 | [Acción operativa, física y medible de la materia] | [Ej. 50%] | | |
      | 2 | [Acción operativa, física y medible de la materia] | [Ej. 50%] | | |
      
      ## 3. Criterios de Suficiencia
      Para declarar la competencia, el candidato debe sumar el 100% de la evaluación global, requiriendo un puntaje mínimo aprobatorio del 85%.
      
      OUTPUT ONLY THIS JSON OBJECT:
      {
        "documento_md": "[Paste the generated markdown here, using \n for line breaks]"
      }

  # ── SECCIÓN 2: AGENTE B (DISEÑADOR INSTRUCCIONAL - ENTORNO REAL) ────────
  - agent: agente_doc_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_doc_p1]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      Generate the final document focused on real-world applicability.
      
      CRITICAL RULES (DO NOT INCLUDE OR PRINT THESE IN THE FINAL MARKDOWN):
      1. SINGLE INSTRUMENT: Select and write ONLY ONE instrument type per unit. Do NOT combine them.
      2. OBSERVABLE ACTIONS ONLY: It is STRICTLY FORBIDDEN to use subjective adjectives such as 'adecuado' (adequate), 'correcto' (correct), 'bien' (good), 'efectivo' (effective), 'notable' (notable), or 'mejorado' (improved). 
         - WRONG: "Ensambla de forma correcta" (Subjective).
         - RIGHT: "Ensambla las piezas haciendo coincidir los bordes sin dejar huecos" (Observable physical action).
      
      YOU MUST USE EXACTLY THIS MARKDOWN TEMPLATE AND FILL IN THE BRACKETS ADAPTING THEM TO THE COURSE TOPIC (GENERATE THE FINAL TEXT IN SPANISH):
      
      # Instrumentos de Evaluación Práctica
      ## 1. Requerimientos Físicos del Entorno
      [Deduce y describe los insumos, equipo, software o condiciones espaciales necesarias para evaluar este curso específico]
      
      [REPEAT THIS FOR ALL EXTRACTED UNITS]:
      ## Unidad [Número]: [Nombre de la Unidad]
      - **Instrumento:** [Guía de Observación / Lista de Cotejo / Cuestionario]
      - **Peso en la Calificación Final:** [Logical percentage. Total sum MUST be 100%].
      - **Directriz de Aplicación:** [Instrucción técnica y física al evaluador].
      
      | No. | Reactivo (Condición de Calidad Técnica) | Ponderación | Cumple | Observaciones |
      |---|---|---|---|---|
      | 1 | [Criterio técnico u observable específico de la materia, libre de subjetividades] | [Ej. 40%] | | |
      | 2 | [Criterio técnico u observable específico de la materia, libre de subjetividades] | [Ej. 60%] | | |
      
      ## 2. Reglas de Decisión y Firmas
      [Reglas de aprobación y espacios para firma del evaluador y candidato]
      
      OUTPUT ONLY THIS JSON OBJECT:
      {
        "documento_md": "[Paste the generated markdown here, using \n for line breaks]"
      }

  # ── SECCIÓN 3: EL JUEZ (VERIFICADOR DE EXCELENCIA) ───────────────────────
  - agent: juez_doc
    model: "qwen2.5:14b"
    inputs_from: [agente_doc_A, agente_doc_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.
      
      Compare the "documento_md" generated by A and B.
      
      MANDATORY SELECTION CRITERIA:
      1. No Prompt Leaking: The critical rules MUST NOT be printed in the text. It should look like a clean, official document.
      2. No Subjectivity: The chosen document must NOT use words like "adecuado", "correcto", "bien", or "efectivo" in the items. They must be physical, observable actions.
      3. Perfect Math: Global unit weights must sum up to exactly 100%.
      4. Single Instrument: Only one instrument per unit (No "Cuestionario y Guía").
      
      Choose the one that meets ALL criteria.
      
      OUTPUT ONLY THIS EXACT JSON OBJECT:
      {"seleccion": "A" | "B", "razon": "1-line explanation"}

  # ── Ensamblador (CÓDIGO PURO) ────────────────────────────────────────────
  - agent: ensamblador_doc_p1
    model: "qwen2.5:14b"
    inputs_from: [juez_doc]
    include_template: false
    task: "CÓDIGO - El ensamblaje se realiza en document.assembler.ts"
---