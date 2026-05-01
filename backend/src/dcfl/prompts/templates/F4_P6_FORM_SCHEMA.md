---
id: F4_P6_FORM_SCHEMA
name: Generador de Esquema Dinámico P6 (Calendario General)
version: 1.0.0
tags: [EC0366, formulario, calendario, cronograma]
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

      Genera un array JSON de campos para el CALENDARIO GENERAL del curso.
      Para CADA unidad, "suggested_value" DEBE contener la programación de sesión (USA \n):
      Sesión: [número de sesión]
      Tema principal: [nombre de la unidad a cubrir]
      Duración: [horas estimadas para esta unidad]
      Modalidad: [Presencial / En línea / Mixto]
      Actividades programadas: [lista de actividades de aprendizaje]
      Evaluación: [instrumento o evidencia a recolectar en esta sesión]

      REGLAS CRÍTICAS:
      1. LONGITUD OBLIGATORIA: EXACTAMENTE el mismo número de elementos que las unidades.
      2. field "name" MUST be: "sesion_unidad_" + modulo
      3. ZERO HUMAN TRACE. ONLY JSON ARRAY.

      FORMATO EXACTO:
      [{"name": "sesion_unidad_1", "label": "Sesión: [Nombre real de la unidad]", "suggested_value": "Sesión: ...\nTema principal: ...\nDuración: ...\nModalidad: ...\nActividades programadas: ...\nEvaluación: ...", "type": "textarea"}]

  - agent: agente_form_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_f4]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.

      Genera un array JSON de campos para el CALENDARIO GENERAL del curso.
      Para CADA unidad, "suggested_value" DEBE contener la carta descriptiva de sesión (USA \n):
      Unidad: [nombre del módulo]
      Horas teóricas: [horas de contenido conceptual]
      Horas prácticas: [horas de práctica o taller]
      Recursos didácticos: [materiales, equipo o plataforma requeridos]
      Productos esperados: [evidencia que entrega el participante al final]
      Responsable: [instructor / facilitador / coordinador]

      REGLAS CRÍTICAS:
      1. LONGITUD OBLIGATORIA: EXACTAMENTE el mismo número de elementos que las unidades.
      2. field "name" MUST be: "sesion_unidad_" + modulo
      3. ZERO HUMAN TRACE. ONLY JSON ARRAY.

      FORMATO EXACTO:
      [{"name": "sesion_unidad_1", "label": "Sesión: [Nombre real de la unidad]", "suggested_value": "Unidad: ...\nHoras teóricas: ...\nHoras prácticas: ...\nRecursos didácticos: ...\nProductos esperados: ...\nResponsable: ...", "type": "textarea"}]

  - agent: juez_form
    model: "qwen2.5:14b"
    inputs_from: [agente_form_A, agente_form_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.
      Compara A y B. Elige el que tenga información más completa para programar el calendario del curso.
      {"seleccion": "A", "razon": "..."}

  - agent: ensamblador_form_schema
    model: "qwen2.5:14b"
    inputs_from: [juez_form]
    include_template: false
    task: "CÓDIGO - El ensamblaje se realiza en form-schema.assembler.ts"
---
