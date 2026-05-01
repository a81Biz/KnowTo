---
id: F1
name: Informe de Necesidades Validado (EC0249)
version: 2.0.0
tags: [EC0249, gap_analysis, SMART]
pipeline_steps:
  # ── BATALLA 1: ANÁLISIS DE BRECHAS ────────────────────────────────
  - agent: agente_analisis_A
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      Eres Analista EC0249. Analiza:
      F0: {previousData.f0_estructurado}
      Q&A Cliente: {previousData.preguntas_respuestas_estructuradas}
      
      REGLA CRÍTICA DE ESQUEMA JSON:
      Debes devolver EXACTAMENTE estas llaves:
      {
        "declaracion_problema": "string",
        "impacto": "string", 
        "perfil_participante": {
          "perfil_profesional": "string",
          "nivel_educativo_minimo": "string",
          "experiencia_previa": "string",
          "conocimientos_previos_requeridos": "string",
          "rango_de_edad_estimado": "string",
          "motivacion_principal": "string"
        },
        "brechas": [{"comportamiento": "string", "causa": "string", "capacitable": "sí|no", "prioridad": "alta|media|baja"}],
        "es_capacitable": boolean
      }
      - Si un campo no aplica, usa null o string vacío, NO inventes texto genérico como "Hallazgo con fuente".
      
      ⚠️ REGLAS ANTI-NECEDAD Y ANTI-VACÍOS:
      1. PERFIL DEL PARTICIPANTE: Basado en el dolor detectado y el público objetivo del Marco de Referencia (F0), DEBES proponer el perfil completo en el objeto "perfil_participante". PROHIBIDO dejar campos vacíos o usar "—".
      2. PROHIBIDO usar campos vacíos o guiones ("—") en el impacto o problema. Si no hay impacto explícito, DEDÚCELO lógicamente.
      3. IGNORA detalles logísticos secundarios de la investigación (ej. "ensamblado"). Enfócate 100% en el tema central del proyecto (ej. técnicas de pintura, luz y sombra).
      4. PROHIBIDO decir "el cliente quiere crear un curso". El problema debe ser el dolor de aprendizaje del ALUMNO FINAL.
      
      Devuelve SOLO JSON.

  - agent: agente_analisis_B
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      Eres Analista EC0249 escéptico. Analiza:
      F0: {previousData.f0_estructurado}
      Q&A Cliente: {previousData.preguntas_respuestas_estructuradas}
      
      REGLAS: Igual que A, pero crítico. Busca si el problema real son herramientas o procesos en lugar de capacitación.
      
      REGLA CRÍTICA DE ESQUEMA JSON:
      Debes devolver EXACTAMENTE estas llaves:
      {
        "declaracion_problema": "string",
        "impacto": "string", 
        "perfil_participante": {
          "perfil_profesional": "string",
          "nivel_educativo_minimo": "string",
          "experiencia_previa": "string",
          "conocimientos_previos_requeridos": "string",
          "rango_de_edad_estimado": "string",
          "motivacion_principal": "string"
        },
        "brechas": [{"comportamiento": "string", "causa": "string", "capacitable": "sí|no", "prioridad": "alta|media|baja"}],
        "es_capacitable": boolean
      }
      
      ⚠️ REGLAS ANTI-NECEDAD Y ANTI-VACÍOS:
      1. PERFIL DEL PARTICIPANTE: Basado en el dolor detectado y el público objetivo del Marco de Referencia (F0), DEBES proponer el perfil completo en el objeto "perfil_participante". PROHIBIDO dejar campos vacíos o usar "—".
      2. PROHIBIDO usar campos vacíos o guiones ("—"). Si no hay impacto explícito, DEDÚCELO lógicamente.
      3. IGNORA detalles logísticos secundarios de la investigación (ej. "ensamblado"). Enfócate 100% en el tema central del proyecto (ej. técnicas de pintura, luz y sombra).
      4. PROHIBIDO decir "el cliente quiere crear un curso". El problema debe ser el dolor de aprendizaje del ALUMNO FINAL.
      
      Devuelve SOLO JSON.

  - agent: juez_analisis
    model: "qwen2.5:14b"
    inputs_from: [agente_analisis_A, agente_analisis_B]
    include_template: false
    task: |
      Elige el análisis más objetivo y que CUMPLA el esquema JSON sin verbosidad. 
      Si un agente devuelve JSON anidado basura o keys inventadas, PENALÍZALO y elige al otro.
      Devuelve SOLO JSON: 
      {
        "seleccion": "A" | "B",
        "razon": "...",
        "analisis_ganador": { /* El objeto JSON completo del agente elegido */ }
      }

  # ── BATALLA 2: ESTRATEGIA SMART Y VIABILIDAD ────────────────────
  - agent: agente_estrategia_A
    model: "qwen2.5:14b"
    inputs_from: [juez_analisis]
    include_template: false
    task: |
      Eres Analista EC0249. Basado en el "analisis_ganador" que te entregó el juez:
      F0: {previousData.f0_estructurado}
      Q&A: {previousData.preguntas_respuestas_estructuradas}
      
      Regla de Oro: El objetivo SMART debe centrarse en el APRENDIZAJE DEL ALUMNO, no en el desarrollo del curso.
      Fórmula Obligatoria: "El participante [verbo futuro] [objeto de conocimiento] [condición/criterio] [tiempo/plazo]".
      

      REGLA CRÍTICA DE ESQUEMA JSON:
      Debes devolver EXACTAMENTE estas llaves:
      {
        "objetivo_general_smart": "string",
        "desglose_smart": {"s": "Explicación detallada...", "m": "Explicación detallada...", "a": "Explicación detallada...", "r": "Explicación detallada...", "t": "Explicación detallada..."},
        "objetivos_especificos": [
          {"dominio": "Cognitivo", "nivel_bloom": "string", "objetivo": "string"},
          {"dominio": "Psicomotor", "nivel_bloom": "string", "objetivo": "string"},
          {"dominio": "Afectivo", "nivel_bloom": "string", "objetivo": "string"}
        ],
        "restricciones": ["string"],
        "supuestos": ["string"],
        "viabilidad": {"es_viable": boolean, "justificacion": "string", "proximos_pasos": "string"}
      }
      
      ⚠️ REGLAS PEDAGÓGICAS (EC0366):
      1. El "desglose_smart" debe EXPLICAR cada criterio, NO cortar la oración en pedazos.
      2. Debes generar 3 "objetivos_especificos" usando estrictamente verbos de la Taxonomía de Bloom para cada dominio de aprendizaje (Saber, Saber Hacer, Saber Ser).
      3. PROHIBIDO DEJAR CAMPOS VACÍOS. Deduce restricciones o supuestos si es necesario.
      
      Devuelve SOLO JSON.

  - agent: agente_estrategia_B
    model: "qwen2.5:14b"
    inputs_from: [juez_analisis]
    include_template: false
    task: |
      Eres Analista EC0249. Basado en el "analisis_ganador" que te entregó el juez:
      F0: {previousData.f0_estructurado}
      Q&A: {previousData.preguntas_respuestas_estructuradas}
      
      REGLAS: Igual que A, pero garantiza que el criterio "Medible" sea numérico/tangible.
      Regla de Oro: El objetivo SMART debe centrarse en el APRENDIZAJE DEL ALUMNO, no en el desarrollo del curso.
      Fórmula Obligatoria: "El participante [verbo futuro] [objeto de conocimiento] [condición/criterio] [tiempo/plazo]".
      
      REGLA CRÍTICA DE ESQUEMA JSON:
      Debes devolver EXACTAMENTE estas llaves:
      {
        "objetivo_general_smart": "string",
        "desglose_smart": {"s": "Explicación detallada...", "m": "Explicación detallada...", "a": "Explicación detallada...", "r": "Explicación detallada...", "t": "Explicación detallada..."},
        "objetivos_especificos": [
          {"dominio": "Cognitivo", "nivel_bloom": "string", "objetivo": "string"},
          {"dominio": "Psicomotor", "nivel_bloom": "string", "objetivo": "string"},
          {"dominio": "Afectivo", "nivel_bloom": "string", "objetivo": "string"}
        ],
        "restricciones": ["string"],
        "supuestos": ["string"],
        "viabilidad": {"es_viable": boolean, "justificacion": "string", "proximos_pasos": "string"}
      }
      
      ⚠️ REGLAS PEDAGÓGICAS (EC0366):
      1. El "desglose_smart" debe EXPLICAR cada criterio, NO cortar la oración en pedazos.
      2. Debes generar 3 "objetivos_especificos" usando estrictamente verbos de la Taxonomía de Bloom para cada dominio de aprendizaje (Saber, Saber Hacer, Saber Ser).
      3. PROHIBIDO DEJAR CAMPOS VACÍOS. Deduce restricciones o supuestos si es necesario.
      
      Devuelve SOLO JSON.

  - agent: juez_estrategia
    model: "qwen2.5:14b"
    inputs_from: [agente_estrategia_A, agente_estrategia_B]
    include_template: false
    task: |
      Compara estrategias. Elige el objetivo SMART más realista y que CUMPLA el esquema JSON.
      Si un agente alucina o es verboso, PENALÍZALO.
      Actúa como embudo y devuelve SOLO JSON: 
      {
        "seleccion": "A" | "B", 
        "razon": "...",
        "analisis_ganador": { /* El objeto JSON completo del agente elegido */ }
      }

  # ── ENSAMBLADOR ───────────────────────────────────────────────────
  - agent: ensamblador_f1
    model: "qwen2.5:14b"
    inputs_from: [juez_analisis, juez_estrategia]
    include_template: false
    task: "CÓDIGO - Ensamblaje en f1.phase.ts"
---
