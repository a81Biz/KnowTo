---
id: F4_P5_FORM_SCHEMA
name: Generador de Esquema Dinámico P5 (Guías de Actividades)
version: 1.0.0
tags: [EC0366, formulario, actividades, guias]
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

      Genera un array JSON de campos para las GUÍAS DE ACTIVIDADES.
      Para CADA unidad, "suggested_value" DEBE contener la guía estructurada (USA \n):
      Nombre de la actividad: [título descriptivo de la práctica]
      Objetivo: [qué demostrará el participante al concluir]
      Materiales necesarios: [herramientas, insumos o recursos requeridos]
      Instrucciones paso a paso: [1. acción observable... 2. acción observable...]
      Criterio de éxito: [cómo sabe el participante que lo hizo correctamente]
      Tiempo estimado: [duración en minutos]

      REGLAS CRÍTICAS:
      1. LONGITUD OBLIGATORIA: EXACTAMENTE el mismo número de elementos que las unidades.
      2. field "name" MUST be: "actividad_unidad_" + modulo
      3. ZERO HUMAN TRACE. ONLY JSON ARRAY.

      FORMATO EXACTO:
      [{"name": "actividad_unidad_1", "label": "Actividad: [Nombre real de la unidad]", "suggested_value": "Nombre de la actividad: ...\nObjetivo: ...\nMateriales necesarios: ...\nInstrucciones paso a paso: ...\nCriterio de éxito: ...\nTiempo estimado: ...", "type": "textarea"}]

  - agent: agente_form_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_f4]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.

      Genera un array JSON de campos para las GUÍAS DE ACTIVIDADES.
      Para CADA unidad, "suggested_value" DEBE contener la actividad práctica (USA \n):
      Situación problema: [escenario real que el participante debe resolver]
      Rol del participante: [quién es y qué debe hacer en la actividad]
      Pasos de ejecución: [secuencia de acciones físicas observables]
      Evidencia a entregar: [producto o desempeño que demuestra el aprendizaje]
      Rúbrica rápida: [3 criterios de evaluación sí/no verificables]

      REGLAS CRÍTICAS:
      1. LONGITUD OBLIGATORIA: EXACTAMENTE el mismo número de elementos que las unidades.
      2. field "name" MUST be: "actividad_unidad_" + modulo
      3. ZERO HUMAN TRACE. ONLY JSON ARRAY.

      FORMATO EXACTO:
      [{"name": "actividad_unidad_1", "label": "Actividad: [Nombre real de la unidad]", "suggested_value": "Situación problema: ...\nRol del participante: ...\nPasos de ejecución: ...\nEvidencia a entregar: ...\nRúbrica rápida: ...", "type": "textarea"}]

  - agent: juez_form
    model: "qwen2.5:14b"
    inputs_from: [agente_form_A, agente_form_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.
      Compara A y B. Elige el que tenga actividades más claras, ejecutables y con evidencia observable.
      {"seleccion": "A", "razon": "..."}

  - agent: ensamblador_form_schema
    model: "qwen2.5:14b"
    inputs_from: [juez_form]
    include_template: false
    task: "CÓDIGO - El ensamblaje se realiza en form-schema.assembler.ts"
---
