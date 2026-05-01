---
id: F4_P7_FORM_SCHEMA
name: Generador de Esquema Dinámico P7 (Documento de Información General)
version: 1.0.0
tags: [EC0366, formulario, informacion, referencia]
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

      Genera un array JSON de campos para el DOCUMENTO DE INFORMACIÓN GENERAL.
      Para CADA unidad, "suggested_value" DEBE contener el contenido de referencia (USA \n):
      Tema: [nombre exacto de la unidad]
      Descripción general: [qué abarca este tema en 2-3 oraciones]
      Conceptos fundamentales: [glosario de 3-5 términos clave con definición]
      Normativa aplicable: [estándar, ley o procedimiento relacionado si aplica]
      Recursos de consulta: [referencia bibliográfica o enlace de apoyo]
      Relación con el puesto: [cómo se aplica en el trabajo real]

      REGLAS CRÍTICAS:
      1. LONGITUD OBLIGATORIA: EXACTAMENTE el mismo número de elementos que las unidades.
      2. field "name" MUST be: "informacion_unidad_" + modulo
      3. ZERO HUMAN TRACE. ONLY JSON ARRAY.

      FORMATO EXACTO:
      [{"name": "informacion_unidad_1", "label": "Información: [Nombre real de la unidad]", "suggested_value": "Tema: ...\nDescripción general: ...\nConceptos fundamentales: ...\nNormativa aplicable: ...\nRecursos de consulta: ...\nRelación con el puesto: ...", "type": "textarea"}]

  - agent: agente_form_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_f4]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.

      Genera un array JSON de campos para el DOCUMENTO DE INFORMACIÓN GENERAL.
      Para CADA unidad, "suggested_value" DEBE contener la ficha de referencia (USA \n):
      Unidad: [nombre del tema]
      ¿Qué es?: [definición accesible para el trabajador sin experiencia previa]
      ¿Para qué sirve?: [utilidad práctica en el contexto laboral]
      Ejemplo real: [caso concreto de aplicación en el puesto de trabajo]
      Errores comunes: [2-3 equivocaciones frecuentes a evitar]
      Indicador de dominio: [cómo sabe el trabajador que aprendió este tema]

      REGLAS CRÍTICAS:
      1. LONGITUD OBLIGATORIA: EXACTAMENTE el mismo número de elementos que las unidades.
      2. field "name" MUST be: "informacion_unidad_" + modulo
      3. ZERO HUMAN TRACE. ONLY JSON ARRAY.

      FORMATO EXACTO:
      [{"name": "informacion_unidad_1", "label": "Información: [Nombre real de la unidad]", "suggested_value": "Unidad: ...\n¿Qué es?: ...\n¿Para qué sirve?: ...\nEjemplo real: ...\nErrores comunes: ...\nIndicador de dominio: ...", "type": "textarea"}]

  - agent: juez_form
    model: "qwen2.5:14b"
    inputs_from: [agente_form_A, agente_form_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.
      Compara A y B. Elige el que tenga información más útil y comprensible para el participante.
      {"seleccion": "A", "razon": "..."}

  - agent: ensamblador_form_schema
    model: "qwen2.5:14b"
    inputs_from: [juez_form]
    include_template: false
    task: "CÓDIGO - El ensamblaje se realiza en form-schema.assembler.ts"
---
