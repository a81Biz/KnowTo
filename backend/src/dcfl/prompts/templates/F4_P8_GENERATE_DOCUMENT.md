---
id: F4_P8_GENERATE_DOCUMENT
name: Generador de Cronograma de Desarrollo — Por Módulo
version: 3.0.0
tags: [EC0366, cronograma, desarrollo, json-structured]
pipeline_steps:

  # ── EXTRACTOR ────────────────────────────────────────────────────────────
  - agent: extractor_p8
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      Extract from userInputs the data for ONE single module.
      
      FIELDS: "cronograma_unidad_N" (where N is _modulo_actual), "_modulo_actual", "_nombre_modulo"
      Check "productos_previos" for context from P1-P7.
      
      OUTPUT ONLY VALID JSON:
      {
        "modulo": 1,
        "nombre": "string",
        "contenido_form": "verbatim text",
        "productos_previos": {
          "P4": "excerpts for page counts",
          "P3": "excerpts for scenes"
        }
      }

  # ═══════════════════════════════════════════════════════════════════════
  # SECCIÓN 1: HITOS Y TAREAS
  # ═══════════════════════════════════════════════════════════════════════
  - agent: agente_hitos_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_p8]
    include_template: false
    task: |
      ROLE: Project Manager. TASK: Define milestones.
      
      INPUT: {nombre}, {contenido_form}
      
      OUTPUT ONLY THIS JSON:
      {
        "hitos": [
          {"tarea": "Task name", "inicio": "Day X", "entrega": "Day Y", "responsable": "Role"},
          {"tarea": "...", "inicio": "...", "entrega": "...", "responsable": "..."}
        ]
      }

  - agent: agente_hitos_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_p8]
    include_template: false
    task: |
      SAME AS AGENT A. ADD: "dependencia" (e.g. "P3 approved").
      OUTPUT ONLY THIS JSON:
      {"hitos": [{"tarea": "...", "inicio": "...", "entrega": "...", "responsable": "...", "dependencia": "..."}]}

  - agent: juez_hitos
    model: "qwen2.5:14b"
    inputs_from: [agente_hitos_A, agente_hitos_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. Compare MILESTONES.
      SELECTION: logical order, dependencies included.
      OUTPUT: {"seleccion": "A"|"B", "razon": "one-line"}

  # ═══════════════════════════════════════════════════════════════════════
  # SECCIÓN 2: RIESGOS Y CALIDAD
  # ═══════════════════════════════════════════════════════════════════════
  - agent: agente_riesgos_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_p8]
    include_template: false
    task: |
      ROLE: Risk Manager. TASK: Identify risks and quality gates.
      
      OUTPUT ONLY THIS JSON:
      {
        "riesgos_calidad": {
          "riesgos": [
            {"riesgo": "Description", "mitigacion": "Action"}
          ],
          "compuertas_calidad": ["Gate 1", "Gate 2"]
        }
      }

  - agent: agente_riesgos_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_p8]
    include_template: false
    task: |
      SAME AS AGENT A. ADD: "impacto" (Bajo/Medio/Alto) and "probabilidad".
      OUTPUT ONLY THIS JSON:
      {"riesgos_calidad": {"riesgos": [{"riesgo": "...", "mitigacion": "...", "impacto": "...", "probabilidad": "..."}], "compuertas_calidad": [...]}}

  - agent: juez_riesgos
    model: "qwen2.5:14b"
    inputs_from: [agente_riesgos_A, agente_riesgos_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. Compare RISKS.
      SELECTION: specific to module content, realistic mitigation.
      OUTPUT: {"seleccion": "A"|"B", "razon": "one-line"}

  # ═══════════════════════════════════════════════════════════════════════
  # ASSEMBLER
  # ═══════════════════════════════════════════════════════════════════════
  - agent: ensamblador_doc_p8
    model: "qwen2.5:14b"
    inputs_from: [juez_hitos, juez_riesgos]
    include_template: false
    task: "CÓDIGO - Assembly in p8-document.assembler.ts"