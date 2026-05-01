---
id: F4_P4_FORM_SCHEMA
name: Generador de Esquema Dinámico P4 (Manual del Participante)
version: 1.0.0
tags: [EC0366, formulario, manual, participante]
pipeline_steps:

  - agent: extractor_f4
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      Extrae las unidades del contexto proporcionado.
      DEVUELVE SOLO JSON CON ESTA ESTRUCTURA EXACTA:
      {"unidades": [{"modulo": 1, "nombre": "...", "objetivo": "..."}]}

  - agent: agente_form_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_f4]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.

      Genera un array JSON de campos para el MANUAL DEL PARTICIPANTE.
      Para CADA unidad, "suggested_value" DEBE contener el contenido del capítulo (USA \n):
      Introducción: [párrafo de bienvenida al tema, 2-3 oraciones]
      Conceptos clave: [3-5 términos con definición breve]
      Desarrollo: [explicación del procedimiento o contenido principal]
      Ejercicio práctico: [actividad que el participante realiza solo]
      Puntos a recordar: [3 ideas esenciales de la unidad]

      REGLAS CRÍTICAS:
      1. LONGITUD OBLIGATORIA: EXACTAMENTE el mismo número de elementos que las unidades.
      2. field "name" MUST be: "manual_unidad_" + modulo
      3. ZERO HUMAN TRACE. ONLY JSON ARRAY.

      FORMATO EXACTO:
      [{"name": "manual_unidad_1", "label": "Capítulo: [Nombre real de la unidad]", "suggested_value": "Introducción: ...\nConceptos clave: ...\nDesarrollo: ...\nEjercicio práctico: ...\nPuntos a recordar: ...", "type": "textarea"}]

  - agent: agente_form_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_f4]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.

      Genera un array JSON de campos para el MANUAL DEL PARTICIPANTE.
      Para CADA unidad, "suggested_value" DEBE contener el contenido didáctico (USA \n):
      Objetivo de aprendizaje: [qué logrará el participante al terminar]
      Marco teórico: [fundamento conceptual mínimo necesario]
      Pasos del procedimiento: [1. paso observable... 2. paso observable...]
      Autoevaluación: [pregunta o criterio que el participante puede verificar solo]
      Lecturas complementarias: [recurso o referencia adicional si aplica]

      REGLAS CRÍTICAS:
      1. LONGITUD OBLIGATORIA: EXACTAMENTE el mismo número de elementos que las unidades.
      2. field "name" MUST be: "manual_unidad_" + modulo
      3. ZERO HUMAN TRACE. ONLY JSON ARRAY.

      FORMATO EXACTO:
      [{"name": "manual_unidad_1", "label": "Capítulo: [Nombre real de la unidad]", "suggested_value": "Objetivo de aprendizaje: ...\nMarco teórico: ...\nPasos del procedimiento: ...\nAutoevaluación: ...\nLecturas complementarias: ...", "type": "textarea"}]

  - agent: juez_form
    model: "qwen2.5:14b"
    inputs_from: [agente_form_A, agente_form_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.
      Compara A y B. Elige el que tenga contenido más útil y autocontenido para el participante.
      {"seleccion": "A", "razon": "..."}

  - agent: ensamblador_form_schema
    model: "qwen2.5:14b"
    inputs_from: [juez_form]
    include_template: false
    task: "CÓDIGO - El ensamblaje se realiza en form-schema.assembler.ts"
---
