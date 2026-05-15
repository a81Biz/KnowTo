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
      
      FIELDS:
      - "sesion_unidad_N" (where N is _modulo_actual) — the main session content
      - "sesion_diagnostica" — the diagnostic session content (if present)
      - "fecha_inicio_curso" — the course start date (REQUIRED for date anchoring)
      - "hora_inicio_sesion" — the daily session start time (e.g., "09:00", "14:00"). REQUIRED for schedule anchoring.
      - "_modulo_actual", "_nombre_sesion"
      Also check "fase3.calculo_duracion" and "productos_previos.P1" for context.
      
      DATE ANCHORING RULE: "fecha_inicio_curso" is the absolute starting date of the course.
      If present, compute the absolute date for THIS module's session by adding (modulo - 1) * estimated_days_per_session to fecha_inicio_curso.
      Assume sessions run Monday-Friday, skipping weekends. Return the computed date as "fecha_sesion" (YYYY-MM-DD).
      If "fecha_inicio_curso" is absent or unparseable, set "fecha_sesion" to null.
      
      HORA ANCHORING RULE: "hora_inicio_sesion" is the real daily start time entered by the user.
      Copy it verbatim into the output as "hora_inicio". If absent or empty, set "hora_inicio" to "09:00".
      
      OUTPUT ONLY VALID JSON:
      {
        "modulo": 1,
        "nombre": "string",
        "contenido_form": "verbatim text from form",
        "duracion_f3": "string from context",
        "fecha_inicio_curso": "YYYY-MM-DD or null",
        "fecha_sesion": "YYYY-MM-DD or null",
        "hora_inicio": "HH:MM — from hora_inicio_sesion field or 09:00 default",
        "sesion_diagnostica": "verbatim text from sesion_diagnostica field or null",
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
      
      CRITICAL RULE: The ENTIRE course duration is {duracion_f3}.
      Calculate the "total_horas" for THIS SINGLE SESSION by dividing the total course duration proportionally, or using the specific hours listed in {contenido_form}.
      DO NOT INVENT higher numbers. If the course is 3.8 hours and there are 3 modules, this session should be around 1.2 hours.
      
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
      VETO CRITERIA — Output "RECHAZADO" ONLY IF BOTH of the following are true for BOTH A and B:
      1. Both have horas_teoricas + horas_practicas ≠ total_horas (mathematical inconsistency).
      2. Both have total_horas ≤ 0 or total_horas > 10 (impossible session length — max 10h per EC0366 jornada).
      If RECHAZADO, "razon" MUST describe the specific shared deficiency.
      OUTPUT: {"seleccion": "A"|"B"|"RECHAZADO", "razon": "one-line"}

  # ═══════════════════════════════════════════════════════════════════════
  # SECCIÓN 2: ACTIVIDADES Y RECURSOS
  # ═══════════════════════════════════════════════════════════════════════
  - agent: agente_plan_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_p6]
    include_template: false
    task: |
      ROLE: Logistics Manager. TASK: List activities and items.
      
      DATE ANCHORING: Use "fecha_sesion" from the extractor as the real calendar date for this session.
      If "fecha_sesion" is not null, include it as "fecha" in the plan output.
      If null, omit "fecha" from the output.
      
      HORA ANCHORING: Use "hora_inicio" from the extractor as the real start time for the first activity.
      Schedule subsequent activities by adding cumulative durations to hora_inicio. Do NOT hardcode "09:00".
      EXAMPLE: if hora_inicio is "14:00" → first activity starts at 14:00, next at 14:15, etc.
      
      EVALUACIÓN DIAGNÓSTICA: If this is module 1 AND "sesion_diagnostica" is not null, include it as the first activity block.
      
      CRITICAL — STRING ARRAYS: "recursos" MUST be an array of plain STRINGS.
      CORRECT:   "recursos": ["Proyector", "Pizarrón", "Marcadores"]
      PROHIBITED: "recursos": [{"item": "Proyector"}, {"nombre": "Pizarrón"}]
      
      CRITICAL RULE: ABSOLUTELY NO TEMPLATE ENGINE CODE. DO NOT output tags like {hora_inicio + 60min}. YOU MUST calculate the exact string, e.g. "15:00".
      
      OUTPUT ONLY THIS JSON:
      {
        "plan": {
          "fecha": "YYYY-MM-DD or omit if null",
          "actividades": [
            {"hora": "14:00", "actividad": "Evaluación Diagnóstica — encuadre y conocimientos previos", "duracion": "60 min", "tipo": "Diagnóstica"},
            {"hora": "15:00", "actividad": "Apertura y encuadre", "duracion": "15 min", "tipo": "Teórica"},
            {"hora": "15:15", "actividad": "Explicación técnica", "duracion": "45 min", "tipo": "Teórica"}
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
      DATE ANCHORING: Include "fecha" from extractor's "fecha_sesion" if not null.
      HORA ANCHORING: Use "hora_inicio" from the extractor as the real start time. Do NOT hardcode "09:00".
      EVALUACIÓN DIAGNÓSTICA: If module 1 AND sesion_diagnostica not null, prepend it as first activity.
      CRITICAL — STRING ARRAYS: "recursos" MUST be an array of plain STRINGS (not objects).
      CRITICAL RULE: ABSOLUTELY NO TEMPLATE ENGINE CODE. DO NOT output tags like {hora_inicio}. YOU MUST calculate the exact string.
      OUTPUT ONLY THIS JSON:
      {"plan": {"fecha": "YYYY-MM-DD or omit", "actividades": [{"hora": "14:00", "actividad": "...", "duracion": "...", "tipo": "...", "responsable": "..."}], "recursos": ["Item 1", "Item 2"]}}

  - agent: juez_plan
    model: "qwen2.5:14b"
    inputs_from: [agente_plan_A, agente_plan_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. Compare PLAN.
      SELECTION: logical flow, responsible parties assigned, resources match activities.
      VETO CRITERIA — Output "RECHAZADO" ONLY IF BOTH of the following are true for BOTH A and B:
      1. Both have 0 items in the "actividades" array.
      2. Both have 0 items in the "recursos" array.
      If RECHAZADO, "razon" MUST describe the specific shared deficiency.
      OUTPUT: {"seleccion": "A"|"B"|"RECHAZADO", "razon": "one-line"}

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
      VETO CRITERIA — Output "RECHAZADO" ONLY IF BOTH of the following are true for BOTH A and B:
      1. Both have "producto" that is empty or a generic placeholder.
      2. Both have "criterio_aceptacion" that is empty or fewer than 10 characters.
      If RECHAZADO, "razon" MUST describe the specific shared deficiency.
      OUTPUT: {"seleccion": "A"|"B"|"RECHAZADO", "razon": "one-line"}

  # ═══════════════════════════════════════════════════════════════════════
  # ASSEMBLER
  # ═══════════════════════════════════════════════════════════════════════
  - agent: ensamblador_doc_p6
    model: "qwen2.5:14b"
    inputs_from: [juez_horas, juez_plan, juez_entrega]
    include_template: false
    task: "CÓDIGO - Assembly in p6-document.assembler.ts"