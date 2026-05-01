---
id: F4_P3_FORM_SCHEMA
name: Generador de Esquema Dinámico P3 (Guiones Multimedia)
version: 1.0.0
tags: [EC0366, formulario, guiones, multimedia]
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

      Genera un array JSON de campos para escribir GUIONES MULTIMEDIA.
      Para CADA unidad, "suggested_value" DEBE contener el guión técnico (USA \n):
      Escena 1 - Introducción: [narración de apertura, 30 seg]
      Escena 2 - Desarrollo: [explicación del contenido, 2-3 min]
      Escena 3 - Demostración: [paso a paso visual observable]
      Escena 4 - Cierre: [resumen y llamada a la acción]
      Recursos visuales: [imágenes, gráficos o animaciones sugeridas]

      REGLAS CRÍTICAS:
      1. LONGITUD OBLIGATORIA: EXACTAMENTE el mismo número de elementos que las unidades.
      2. field "name" MUST be: "guion_unidad_" + modulo
      3. ZERO HUMAN TRACE. ONLY JSON ARRAY.

      FORMATO EXACTO:
      [{"name": "guion_unidad_1", "label": "Guión: [Nombre real de la unidad]", "suggested_value": "Escena 1 - Introducción: ...\nEscena 2 - Desarrollo: ...\nEscena 3 - Demostración: ...\nEscena 4 - Cierre: ...\nRecursos visuales: ...", "type": "textarea"}]

  - agent: agente_form_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_f4]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.

      Genera un array JSON de campos para escribir GUIONES MULTIMEDIA.
      Para CADA unidad, "suggested_value" DEBE contener el guión narrativo (USA \n):
      Voz en off (apertura): [texto exacto a leer, 2-3 oraciones]
      Contenido principal: [puntos clave en lenguaje hablado, no académico]
      Ejemplo o caso: [descripción de situación real a mostrar]
      Voz en off (cierre): [mensaje final memorable]
      Notas de producción: [ritmo, tono, efectos de sonido sugeridos]

      REGLAS CRÍTICAS:
      1. LONGITUD OBLIGATORIA: EXACTAMENTE el mismo número de elementos que las unidades.
      2. field "name" MUST be: "guion_unidad_" + modulo
      3. ZERO HUMAN TRACE. ONLY JSON ARRAY.

      FORMATO EXACTO:
      [{"name": "guion_unidad_1", "label": "Guión: [Nombre real de la unidad]", "suggested_value": "Voz en off (apertura): ...\nContenido principal: ...\nEjemplo o caso: ...\nVoz en off (cierre): ...\nNotas de producción: ...", "type": "textarea"}]

  - agent: juez_form
    model: "qwen2.5:14b"
    inputs_from: [agente_form_A, agente_form_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.
      Compara A y B. Elige el que tenga guiones más claros y producibles.
      {"seleccion": "A", "razon": "..."}

  - agent: ensamblador_form_schema
    model: "qwen2.5:14b"
    inputs_from: [juez_form]
    include_template: false
    task: "CÓDIGO - El ensamblaje se realiza en form-schema.assembler.ts"
---
