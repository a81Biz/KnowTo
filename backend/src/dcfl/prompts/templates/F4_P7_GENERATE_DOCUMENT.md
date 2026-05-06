---
id: F4_P7_GENERATE_DOCUMENT
name: Generador de Información General — Por Módulo
version: 3.0.0
tags: [EC0366, informacion, referencia, json-structured]
pipeline_steps:

  # ── EXTRACTOR ────────────────────────────────────────────────────────────
  - agent: extractor_p7
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      Extract from userInputs the data for ONE single topic.
      
      FIELDS: "informacion_unidad_N" (where N is _modulo_actual), "_modulo_actual", "_nombre_tema"
      Check "productos_previos" for context from P1-P6.
      
      OUTPUT ONLY VALID JSON:
      {
        "modulo": 1,
        "nombre": "string",
        "contenido_form": "verbatim text",
        "productos_previos": {
          "P6": "excerpts for timing/modality"
        }
      }

  # ═══════════════════════════════════════════════════════════════════════
  # SECCIÓN 1: DESCRIPCIÓN Y UTILIDAD
  # ═══════════════════════════════════════════════════════════════════════
  - agent: agente_descripcion_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_p7]
    include_template: false
    task: |
      ROLE: Training Specialist. TASK: Explain the topic.
      
      INPUT: {nombre}, {contenido_form}
      
      OUTPUT ONLY THIS JSON:
      {
        "descripcion": {
          "que_es": "Clear explanation",
          "para_que_sirve": "Practical workplace utility",
          "relacion_puesto": "How it impacts the worker's role"
        }
      }

  - agent: agente_descripcion_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_p7]
    include_template: false
    task: |
      SAME AS AGENT A. ADD: "errores_evitar" (What happens if this isn't known).
      OUTPUT ONLY THIS JSON:
      {"descripcion": {"que_es": "...", "para_que_sirve": "...", "relacion_puesto": "...", "errores_evitar": "..."}}

  - agent: juez_descripcion
    model: "qwen2.5:14b"
    inputs_from: [agente_descripcion_A, agente_descripcion_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. Compare EXPLANATIONS.
      SELECTION: accessibility, practical workplace focus.
      OUTPUT: {"seleccion": "A"|"B", "razon": "one-line"}

  # ═══════════════════════════════════════════════════════════════════════
  # SECCIÓN 2: CONCEPTOS Y NORMATIVA
  # ═══════════════════════════════════════════════════════════════════════
  - agent: agente_conceptos_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_p7]
    include_template: false
    task: |
      ROLE: Technical Auditor. TASK: Define concepts and standards.
      
      OUTPUT ONLY THIS JSON:
      {
        "tecnico": {
          "conceptos": [
            {"termino": "Key Term", "definicion": "Official definition", "ejemplo": "Workplace case"}
          ],
          "normativa": ["Standard name and code"]
        }
      }

  - agent: agente_conceptos_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_p7]
    include_template: false
    task: |
      SAME AS AGENT A. ADD: "indicador_dominio" (How to know if you master this).
      OUTPUT ONLY THIS JSON:
      {"tecnico": {"conceptos": [...], "normativa": [...], "indicador_dominio": "..."}}

  - agent: juez_conceptos
    model: "qwen2.5:14b"
    inputs_from: [agente_conceptos_A, agente_conceptos_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. Compare TECHNICAL data.
      SELECTION: term clarity, verifiable normative codes.
      OUTPUT: {"seleccion": "A"|"B", "razon": "one-line"}

  # ═══════════════════════════════════════════════════════════════════════
  # ASSEMBLER
  # ═══════════════════════════════════════════════════════════════════════
  - agent: ensamblador_doc_p7
    model: "qwen2.5:14b"
    inputs_from: [juez_descripcion, juez_conceptos]
    include_template: false
    task: "CÓDIGO - Assembly in p7-document.assembler.ts"