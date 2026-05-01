---
id: F4_P8_FORM_SCHEMA
name: Generador de Esquema Dinámico P8 (Cronograma de Desarrollo)
version: 1.0.0
tags: [EC0366, formulario, cronograma, desarrollo]
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

      Genera un array JSON de campos para el CRONOGRAMA DE DESARROLLO del curso.
      Para CADA unidad, "suggested_value" DEBE contener la tarea de desarrollo (USA \n):
      Entregable: [nombre del material a producir para esta unidad]
      Responsable: [quién elabora el material — diseñador, experto, coordinador]
      Fecha inicio: [semana o mes de inicio del desarrollo]
      Fecha entrega: [plazo de entrega del material listo para revisión]
      Revisión y ajustes: [tiempo estimado para correcciones]
      Estado: [Pendiente / En proceso / Completado]

      REGLAS CRÍTICAS:
      1. LONGITUD OBLIGATORIA: EXACTAMENTE el mismo número de elementos que las unidades.
      2. field "name" MUST be: "cronograma_unidad_" + modulo
      3. ZERO HUMAN TRACE. ONLY JSON ARRAY.

      FORMATO EXACTO:
      [{"name": "cronograma_unidad_1", "label": "Desarrollo: [Nombre real de la unidad]", "suggested_value": "Entregable: ...\nResponsable: ...\nFecha inicio: ...\nFecha entrega: ...\nRevisión y ajustes: ...\nEstado: Pendiente", "type": "textarea"}]

  - agent: agente_form_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_f4]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.

      Genera un array JSON de campos para el CRONOGRAMA DE DESARROLLO del curso.
      Para CADA unidad, "suggested_value" DEBE contener el plan de producción (USA \n):
      Módulo: [nombre de la unidad]
      Materiales a desarrollar: [lista de recursos — video, manual, diapositivas, etc.]
      Horas de producción estimadas: [tiempo total de diseño y producción]
      Recursos necesarios: [equipo, software, expertos de contenido]
      Hito de validación: [criterio que indica que el material está listo]
      Prioridad: [Alta / Media / Baja según el orden del curso]

      REGLAS CRÍTICAS:
      1. LONGITUD OBLIGATORIA: EXACTAMENTE el mismo número de elementos que las unidades.
      2. field "name" MUST be: "cronograma_unidad_" + modulo
      3. ZERO HUMAN TRACE. ONLY JSON ARRAY.

      FORMATO EXACTO:
      [{"name": "cronograma_unidad_1", "label": "Desarrollo: [Nombre real de la unidad]", "suggested_value": "Módulo: ...\nMateriales a desarrollar: ...\nHoras de producción estimadas: ...\nRecursos necesarios: ...\nHito de validación: ...\nPrioridad: ...", "type": "textarea"}]

  - agent: juez_form
    model: "qwen2.5:14b"
    inputs_from: [agente_form_A, agente_form_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.
      Compara A y B. Elige el que tenga información más útil para planificar la producción del curso.
      {"seleccion": "A", "razon": "..."}

  - agent: ensamblador_form_schema
    model: "qwen2.5:14b"
    inputs_from: [juez_form]
    include_template: false
    task: "CÓDIGO - El ensamblaje se realiza en form-schema.assembler.ts"
---
