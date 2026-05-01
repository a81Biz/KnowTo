---
id: F4_P2_FORM_SCHEMA
name: Generador de Esquema Dinámico P2 (Presentación Electrónica)
version: 1.0.0
tags: [EC0366, formulario, presentacion, diapositivas]
pipeline_steps:

  # ── EXTRACTOR ────────────────────────────────────────────────────────────────
  - agent: extractor_f4
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      Extrae las unidades del contexto proporcionado.
      DEVUELVE SOLO JSON CON ESTA ESTRUCTURA EXACTA:
      {"unidades": [{"modulo": 1, "nombre": "...", "objetivo": "..."}]}

  # ── AGENTE A (DISEÑADOR DE PRESENTACIONES) ───────────────────────────────────
  - agent: agente_form_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_f4]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.

      Genera un array JSON de campos de formulario para diseñar una PRESENTACIÓN ELECTRÓNICA.
      Para CADA unidad, el campo "suggested_value" DEBE contener la estructura de diapositivas (USA SALTOS DE LÍNEA \n):
      Diapositiva 1 - Título: [título de apertura]
      Diapositiva 2 - Contenido: [puntos clave de la unidad]
      Diapositiva 3 - Actividad: [ejercicio o dinámica visual]
      Diapositiva 4 - Cierre: [síntesis y puntos a recordar]

      REGLAS CRÍTICAS:
      1. LONGITUD OBLIGATORIA: EXACTAMENTE el mismo número de elementos que las unidades recibidas.
      2. field "name" MUST be: "presentacion_unidad_" + modulo
      3. ZERO HUMAN TRACE. ONLY JSON ARRAY.

      FORMATO EXACTO:
      [{"name": "presentacion_unidad_1", "label": "Presentación: [Nombre real de la unidad]", "suggested_value": "Diapositiva 1 - Título: ...\nDiapositiva 2 - Contenido: ...\nDiapositiva 3 - Actividad: ...\nDiapositiva 4 - Cierre: ...", "type": "textarea"}]

  # ── AGENTE B (NARRATIVA VISUAL) ──────────────────────────────────────────────
  - agent: agente_form_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_f4]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.

      Genera un array JSON de campos de formulario para diseñar una PRESENTACIÓN ELECTRÓNICA.
      Para CADA unidad, el campo "suggested_value" DEBE contener la narrativa visual (USA SALTOS DE LÍNEA \n):
      Apertura: [gancho visual o pregunta detonadora]
      Desarrollo: [3-5 puntos visuales con verbo de acción]
      Ejemplo visual: [caso, imagen o demostración sugerida]
      Cierre: [mensaje clave de la unidad en una frase]

      REGLAS CRÍTICAS:
      1. LONGITUD OBLIGATORIA: EXACTAMENTE el mismo número de elementos que las unidades recibidas.
      2. field "name" MUST be: "presentacion_unidad_" + modulo
      3. ZERO HUMAN TRACE. ONLY JSON ARRAY.

      FORMATO EXACTO:
      [{"name": "presentacion_unidad_1", "label": "Presentación: [Nombre real de la unidad]", "suggested_value": "Apertura: ...\nDesarrollo: ...\nEjemplo visual: ...\nCierre: ...", "type": "textarea"}]

  # ── JUEZ ─────────────────────────────────────────────────────────────────────
  - agent: juez_form
    model: "qwen2.5:14b"
    inputs_from: [agente_form_A, agente_form_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.

      Compara el array de A y el de B. Elige el que tenga contenido más claro y aplicable para diseñar diapositivas.
      Devuelve ÚNICAMENTE este objeto JSON:
      {"seleccion": "A", "razon": "..."}

  # ── ENSAMBLADOR (CÓDIGO PURO) ─────────────────────────────────────────────────
  - agent: ensamblador_form_schema
    model: "qwen2.5:14b"
    inputs_from: [juez_form]
    include_template: false
    task: "CÓDIGO - El ensamblaje se realiza en form-schema.assembler.ts"
---
