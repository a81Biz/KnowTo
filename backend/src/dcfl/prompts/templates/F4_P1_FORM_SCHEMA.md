---
id: F4_P1_FORM_SCHEMA
name: Generador de Esquema Dinámico P1 (Instrumentos de Evaluación)
version: 2.7.0
tags: [EC0366, formulario, evaluacion, reactivos, zero-human-trace]
pipeline_steps:

  # ── EXTRACTOR (EL PUENTE DE DATOS) ───────────────────────────────────────
  - agent: extractor_f4
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      Extrae las unidades del contexto proporcionado.
      DEVUELVE SOLO JSON CON ESTA ESTRUCTURA EXACTA:
      {"unidades": [{"modulo": 1, "nombre": "...", "objetivo": "..."}]}

  # ── SECCIÓN 1: AGENTE A (RIGOR NORMATIVO EC0366) ────────────────────────
  - agent: agente_form_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_f4]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      Genera un array JSON de campos de formulario basándote en las "unidades" extraídas.
      
      Para CADA unidad, el campo "suggested_value" DEBE contener el instrumento desarrollado (USA SALTOS DE LÍNEA \n):
      Instrucción: [Qué debe observar el evaluador]
      Reactivos:
      1. [Acción medible 1]
      2. [Acción medible 2]
      Evidencia: [Desempeño / Producto]

      REGLAS CRÍTICAS E INQUEBRANTABLES:
      1. LONGITUD OBLIGATORIA: El array de salida DEBE tener EXACTAMENTE el mismo número de elementos que las unidades recibidas. SI HAY 4 UNIDADES, DEBES DEVOLVER 4 OBJETOS. No te detengas en el primero.
      2. PROHIBIDO "COMPRENDER": En los reactivos y la instrucción, usa solo verbos observables (Pintar, Identificar, Mezclar, Mostrar).
      3. field "name" MUST be: "instrumento_unidad_" + modulo
      4. ZERO HUMAN TRACE. ONLY JSON ARRAY.
      
      FORMATO EXACTO REQUERIDO:
      [
        {
          "name": "instrumento_unidad_1",
          "label": "Evaluación: [Nombre real de la unidad]",
          "suggested_value": "Instrucción: ...\nReactivos:\n1. ...\n2. ...\nEvidencia: ...",
          "type": "textarea"
        }
      ]

  # ── SECCIÓN 2: AGENTE B (EXPERTO PRÁCTICO) ──────────────────────────────
  - agent: agente_form_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_f4]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      Genera un array JSON de campos de formulario basándote en las "unidades" extraídas.
      
      Para CADA unidad, el campo "suggested_value" DEBE contener el instrumento práctico (USA SALTOS DE LÍNEA \n):
      Instrucción: [Instrucción práctica para el taller]
      Reactivos:
      1. [Criterio visual verificable 1]
      2. [Criterio visual verificable 2]
      Evidencia: [Desempeño / Producto físico]

      REGLAS CRÍTICAS E INQUEBRANTABLES:
      1. LONGITUD OBLIGATORIA: El array de salida DEBE tener EXACTAMENTE el mismo número de elementos que las unidades recibidas. SI HAY 4 UNIDADES, DEBES DEVOLVER 4 OBJETOS. No te detengas en el primero.
      2. PROHIBIDO "COMPRENDER": En los reactivos y la instrucción, usa solo verbos observables (Pintar, Identificar, Mezclar, Mostrar).
      3. field "name" MUST be: "instrumento_unidad_" + modulo
      4. ZERO HUMAN TRACE. ONLY JSON ARRAY.
      
      FORMATO EXACTO REQUERIDO:
      [
        {
          "name": "instrumento_unidad_1",
          "label": "Evaluación: [Nombre real de la unidad]",
          "suggested_value": "Instrucción: ...\nReactivos:\n1. ...\n2. ...\nEvidencia: ...",
          "type": "textarea"
        }
      ]

  # ── SECCIÓN 3: EL JUEZ (SELECCIÓN DIALÉCTICA) ───────────────────────────
  - agent: juez_form
    model: "qwen2.5:14b"
    inputs_from: [agente_form_A, agente_form_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.
      
      Compara el array de A y el de B. Elige el que tenga reactivos más útiles y reales.
      Devuelve ÚNICAMENTE este objeto JSON:
      {"seleccion": "A", "razon": "..."}

  # ── Ensamblador (CÓDIGO PURO) ───────────────────────────────────────────
  - agent: ensamblador_form_schema
    model: "qwen2.5:14b"
    inputs_from: [juez_form]
    include_template: false
    task: "CÓDIGO - El ensamblaje se realiza en form-schema.assembler.ts"
---