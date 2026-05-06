---
id: F4_P6_GENERATE_DOCUMENT
name: Generador de Calendario General — Por Módulo
version: 3.0.0
tags: [EC0366, calendario, programacion, json-structured]
pipeline_steps:

  # ── EXTRACTOR ────────────────────────────────────────────────────────────
  - agent: extractor_p6
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      Extract from userInputs the data for ONE single session/unit.
      
      FIELDS: "sesion_unidad_N" (where N is _modulo_actual), "_modulo_actual", "_nombre_sesion"
      Also check "fase3.calculo_duracion" and "productos_previos.P1" for context.
      
      OUTPUT ONLY VALID JSON:
      {
        "modulo": 1,
        "nombre": "string",
        "contenido_form": "verbatim text from form",
        "duracion_f3": "string from context",
        "instrumentos_p1": [
          {"unidad": 1, "tipo": "Guía de Observación"}
        ]
      }

  # ═══════════════════════════════════════════════════════════════════════
  # SECCIÓN 1: DISTRIBUCIÓN HORARIA
  # ═══════════════════════════════════════════════════════════════════════
  - agent: agente_horas_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_p6]
    include_template: false
    task: |
      ROLE: Course Coordinator. TASK: Calculate session timing.
      
      INPUT: {nombre}, {contenido_form}, {duracion_f3}
      
      OUTPUT ONLY THIS JSON:
      {
        "horario": {
          "horas_teoricas": 1.5,
          "horas_practicas": 2.5,
          "total_horas": 4.0,
          "modalidad": "Presencial/Virtual"
        }
      }

  - agent: agente_horas_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_p6]
    include_template: false
    task: |
      SAME AS AGENT A. ADD: "distribucion_minutos" (Apertura: 20, Desarrollo: 200, Cierre: 20).
      OUTPUT ONLY THIS JSON:
      {"horario": {"horas_teoricas": 1.5, "horas_practicas": 2.5, "total_horas": 4.0, "modalidad": "...", "distribucion_minutos": {"apertura": 20, "desarrollo": 200, "cierre": 20}}}

  - agent: juez_horas
    model: "qwen2.5:14b"
    inputs_from: [agente_horas_A, agente_horas_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. Compare TIMING.
      SELECTION: mathematical consistency (T+P=Total), alignment to F3.
      OUTPUT: {"seleccion": "A"|"B", "razon": "one-line"}

  # ═══════════════════════════════════════════════════════════════════════
  # SECCIÓN 2: ACTIVIDADES Y RECURSOS
  # ═══════════════════════════════════════════════════════════════════════
  - agent: agente_plan_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_p6]
    include_template: false
    task: |
      ROLE: Logistics Manager. TASK: List activities and items.
      
      OUTPUT ONLY THIS JSON:
      {
        "plan": {
          "actividades": [
            {"hora": "09:00", "actividad": "Apertura y encuadre", "duracion": "15 min", "tipo": "Teórica"},
            {"hora": "09:15", "actividad": "Explicación técnica", "duracion": "45 min", "tipo": "Teórica"}
          ],
          "recursos": ["Item 1", "Item 2"]
        }
      }

  - agent: agente_plan_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_p6]
    include_template: false
    task: |
      SAME AS AGENT A. ADD for each activity: "responsable" (Facilitador/Participante).
      OUTPUT ONLY THIS JSON:
      {"plan": {"actividades": [{"hora": "...", "actividad": "...", "duracion": "...", "tipo": "...", "responsable": "..."}], "recursos": [...]}}

  - agent: juez_plan
    model: "qwen2.5:14b"
    inputs_from: [agente_plan_A, agente_plan_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. Compare PLAN.
      SELECTION: logical flow, responsible parties assigned, resources match activities.
      OUTPUT: {"seleccion": "A"|"B", "razon": "one-line"}

  # ═══════════════════════════════════════════════════════════════════════
  # SECCIÓN 3: ENTREGABLES Y EVALUACIÓN
  # ═══════════════════════════════════════════════════════════════════════
  - agent: agente_entrega_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_p6]
    include_template: false
    task: |
      ROLE: Quality Auditor. TASK: Define deliverables.
      
      OUTPUT ONLY THIS JSON:
      {
        "entregables": {
          "producto": "Name of evidence",
          "instrumento": "Exact name from P1",
          "criterio_aceptacion": "Brief description"
        }
      }

  - agent: agente_entrega_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_p6]
    include_template: false
    task: |
      SAME AS AGENT A. ADD: "fecha_entrega" (Same day/Next day).
      OUTPUT ONLY THIS JSON:
      {"entregables": {"producto": "...", "instrumento": "...", "criterio_aceptacion": "...", "fecha_entrega": "..."}}

  - agent: juez_entrega
    model: "qwen2.5:14b"
    inputs_from: [agente_entrega_A, agente_entrega_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. Compare DELIVERABLES.
      SELECTION: alignment to P1, clear acceptance criteria.
      OUTPUT: {"seleccion": "A"|"B", "razon": "one-line"}

  # ═══════════════════════════════════════════════════════════════════════
  # ASSEMBLER
  # ═══════════════════════════════════════════════════════════════════════
  - agent: ensamblador_doc_p6
    model: "qwen2.5:14b"
    inputs_from: [juez_horas, juez_plan, juez_entrega]
    include_template: false
    task: "CÓDIGO - Assembly in p6-document.assembler.ts"