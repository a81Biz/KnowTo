---
id: F1
name: Informe de Necesidades Validado (EC0249)
version: 3.0.0
tags: [EC0249, gap_analysis, SMART]
pipeline_steps:

  # ── BATALLA 1: ANÁLISIS DE BRECHAS ────────────────────────────────
  - agent: agente_analisis_A
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      You are a Needs Analysis Specialist certified under EC0249.
      
      SOURCE MAPPING:
      - F0 structured data: {previousData.f0_estructurado}
      - Client Q&A: {previousData.preguntas_respuestas_estructuradas}
      
      YOUR TASK: Analyze the gap between the client's current state and desired state.
      
      HOW TO ANALYZE:
      1. "declaracion_problema": Identify the learning problem of the FINAL STUDENT, not the course creator. FORBIDDEN: "el cliente quiere crear un curso".
      2. "impacto": What business or performance metric is affected. If no explicit impact, deduce it logically from the industry context in F0.
      3. "perfil_participante": Build the full learner profile from the target audience in F0 and the Q&A. ALL fields required. FORBIDDEN: empty strings or "—".
      4. "brechas": For each gap found in the Q&A, extract:
         - comportamiento: the current behavior observed
         - causa: root cause of the gap
         - capacitable: "sí" if training can fix it, "no" if it's a tool/process issue
         - prioridad: "alta" if directly linked to the problem statement, "media" or "baja" otherwise
      5. "es_capacitable": true if at least one gap is capacitable, false otherwise.
      6. IGNORE secondary logistical details from research. Focus 100% on the core course topic.
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {
        "declaracion_problema": "",
        "impacto": "",
        "perfil_participante": {
          "perfil_profesional": "",
          "nivel_educativo_minimo": "",
          "experiencia_previa": "",
          "conocimientos_previos_requeridos": "",
          "rango_de_edad_estimado": "",
          "motivacion_principal": ""
        },
        "brechas": [{"comportamiento": "", "causa": "", "capacitable": "sí|no", "prioridad": "alta|media|baja"}],
        "es_capacitable": true
      }

  - agent: agente_analisis_B
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      You are a Needs Analysis Specialist certified under EC0249 — SKEPTICAL perspective.
      
      SOURCE MAPPING:
      - F0 structured data: {previousData.f0_estructurado}
      - Client Q&A: {previousData.preguntas_respuestas_estructuradas}
      
      YOUR TASK: Same analysis as Agent A, but challenge assumptions. Ask: is this truly a training problem, or is it a tool/process/management issue?
      
      HOW TO ANALYZE:
      1. "declaracion_problema": Identify the learning problem of the FINAL STUDENT. FORBIDDEN: "el cliente quiere crear un curso".
      2. "impacto": What metric is affected. Deduce if not explicit.
      3. "perfil_participante": Full learner profile from F0 + Q&A. ALL fields required. FORBIDDEN: empty strings or "—".
      4. "brechas": For each gap, be critical — mark "no" for capacitable if the root cause is not solvable by training.
      5. "es_capacitable": true only if at least one gap is genuinely capacitable.
      6. IGNORE secondary logistical details. Focus 100% on the core course topic.
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {
        "declaracion_problema": "",
        "impacto": "",
        "perfil_participante": {
          "perfil_profesional": "",
          "nivel_educativo_minimo": "",
          "experiencia_previa": "",
          "conocimientos_previos_requeridos": "",
          "rango_de_edad_estimado": "",
          "motivacion_principal": ""
        },
        "brechas": [{"comportamiento": "", "causa": "", "capacitable": "sí|no", "prioridad": "alta|media|baja"}],
        "es_capacitable": true
      }

  - agent: juez_analisis
    model: "qwen2.5:14b"
    inputs_from: [agente_analisis_A, agente_analisis_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.
      
      Compare both analysis outputs.
      
      SELECTION CRITERIA:
      1. Completeness: All fields in perfil_participante are filled — no empty strings, no "—".
      2. Accuracy: The declaracion_problema describes a LEARNING problem, not a course creation desire.
      3. Honesty: es_capacitable reflects whether gaps are truly solvable by training.
      4. Schema compliance: Exact JSON structure, no extra keys, no nesting garbage.
      
      If an agent returns broken JSON or invented keys, PENALIZE it.
      
      OUTPUT ONLY THIS JSON:
      {
        "seleccion": "A" | "B",
        "razon": "brief explanation",
        "analisis_ganador": { /* full JSON object from chosen agent */ }
      }

  # ── BATALLA 2: ESTRATEGIA SMART Y VIABILIDAD ────────────────────
  - agent: agente_estrategia_A
    model: "qwen2.5:14b"
    inputs_from: [juez_analisis]
    include_template: false
    task: |
      You are an Instructional Strategy Specialist certified under EC0366.
      
      SOURCE MAPPING:
      - analysis_ganador from juez_analisis (the winning gap analysis)
      - F0 structured data: {previousData.f0_estructurado}
      - Client Q&A: {previousData.preguntas_respuestas_estructuradas}
      
      YOUR TASK: Build a SMART strategy based on the validated gap analysis.
      
      HOW TO BUILD:
      1. "objetivo_general_smart": Use the EXACT formula: "El participante [future-tense verb] [knowledge object] [condition/criterion] [time/deadline]". Center it on STUDENT LEARNING, not course development.
      2. "desglose_smart": EXPLAIN each SMART criterion in 1-2 sentences. DO NOT cut the objective into pieces — explain WHY each letter is met.
      3. "objetivos_especificos": Generate exactly 3, one per learning domain, using Bloom's Taxonomy verbs:
         - Cognitivo: knowledge/comprehension level
         - Psicomotor: application/execution level
         - Afectivo: attitude/value level
      4. "restricciones": Real constraints from F0 context (budget, time, technology).
      5. "supuestos": Assumptions that must hold true for the strategy to work.
      6. "viabilidad": Is this achievable with the given constraints?
      
      FORBIDDEN: empty fields. Deduce if necessary.
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {
        "objetivo_general_smart": "",
        "desglose_smart": {"s": "", "m": "", "a": "", "r": "", "t": ""},
        "objetivos_especificos": [
          {"dominio": "Cognitivo", "nivel_bloom": "", "objetivo": ""},
          {"dominio": "Psicomotor", "nivel_bloom": "", "objetivo": ""},
          {"dominio": "Afectivo", "nivel_bloom": "", "objetivo": ""}
        ],
        "restricciones": [""],
        "supuestos": [""],
        "viabilidad": {"es_viable": true, "justificacion": "", "proximos_pasos": ""}
      }

  - agent: agente_estrategia_B
    model: "qwen2.5:14b"
    inputs_from: [juez_analisis]
    include_template: false
    task: |
      You are an Instructional Strategy Specialist certified under EC0366 — MEASURABILITY focus.
      
      SOURCE MAPPING: Same as Agent A.
      
      YOUR TASK: Same as Agent A, but guarantee every "M" criterion has NUMERIC or TANGIBLE indicators.
      
      HOW TO BUILD:
      1. "objetivo_general_smart": Same EXACT formula. Center on STUDENT LEARNING.
      2. "desglose_smart": The "m" field MUST include a numeric metric (e.g., "≥80% score", "within 2mm tolerance", "with zero critical errors").
      3. "objetivos_especificos": Exactly 3, one per domain. Bloom verbs required.
      4-6. Same as Agent A.
      
      FORBIDDEN: empty fields.
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {
        "objetivo_general_smart": "",
        "desglose_smart": {"s": "", "m": "", "a": "", "r": "", "t": ""},
        "objetivos_especificos": [
          {"dominio": "Cognitivo", "nivel_bloom": "", "objetivo": ""},
          {"dominio": "Psicomotor", "nivel_bloom": "", "objetivo": ""},
          {"dominio": "Afectivo", "nivel_bloom": "", "objetivo": ""}
        ],
        "restricciones": [""],
        "supuestos": [""],
        "viabilidad": {"es_viable": true, "justificacion": "", "proximos_pasos": ""}
      }

  - agent: juez_estrategia
    model: "qwen2.5:14b"
    inputs_from: [agente_estrategia_A, agente_estrategia_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.
      
      Compare both strategy outputs.
      
      SELECTION CRITERIA:
      1. SMART compliance: The objetivo_general follows the formula exactly. The "m" criterion is measurable.
      2. Completeness: All fields filled — no empty strings.
      3. Bloom's Taxonomy: Each objetivo_especifico uses the correct domain and level.
      4. Schema compliance: Exact JSON structure, no extra keys.
      
      If an agent returns broken JSON or verbosity, PENALIZE it.
      
      OUTPUT ONLY THIS JSON:
      {
        "seleccion": "A" | "B",
        "razon": "brief explanation",
        "analisis_ganador": { /* full JSON object from chosen agent */ }
      }

  # ── ENSAMBLADOR ───────────────────────────────────────────────────
  - agent: ensamblador_f1
    model: "qwen2.5:14b"
    inputs_from: [juez_analisis, juez_estrategia]
    include_template: false
    task: "CÓDIGO - Ensamblaje en f1.phase.ts"
---