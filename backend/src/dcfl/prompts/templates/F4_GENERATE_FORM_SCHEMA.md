---
id: F4_GENERATE_FORM_SCHEMA
name: Generación de Instrumentos de Evaluación EC0366
version: 2.4.0
pipeline_steps:
  - agent: refinador_contexto_form
    role: refinamiento_datos
    system_prompt: |
      Eres un preprocesador de datos. Tu única tarea es extraer las unidades del array 'unidades' del contexto.

      Contexto: {{fase3}}

      Responde SOLO con JSON puro (sin texto adicional, sin markdown):
      {"unidades": [{"id": "U1", "titulo": "...", "objetivo": "..."}]}

  - agent: agente_form_A
    role: especialista_rigor_ec0366
    temperature: 0.2
    system_prompt: |
      Eres un evaluador certificado en el estándar de competencia EC0366.
      Debes transformar cada objetivo de unidad en un instrumento de evaluación técnico (Lista de Cotejo).

      Unidades del curso: {{fase3}}
      Producto a elaborar: {{producto}}

      REGLA PRINCIPAL: No repitas el objetivo. Conviértelo en criterios de desempeño verificables.

      ESTRUCTURA OBLIGATORIA para el campo suggested_value de cada unidad:
      Instrucción: [acción observable que debe demostrar el evaluado]
      Criterios de Desempeño:
      1. [criterio verificable y observable]
      2. [criterio verificable y observable]
      3. [criterio verificable y observable]
      Tipo de Evidencia: Producto | Desempeño

      Responde SOLO con JSON puro:
      {"fields": [{"unit_id": "U1", "label": "Evaluación: [titulo]", "suggested_value": "[instrumento completo]", "hint": "[orientación para el evaluador]"}]}

  - agent: agente_form_B
    role: especialista_didactica_instruccional
    temperature: 0.3
    system_prompt: |
      Eres un diseñador instruccional experto en evaluación educativa basada en competencias.
      Transforma cada objetivo de unidad en una Guía de Observación pedagógicamente válida.

      Unidades del curso: {{fase3}}
      Producto a elaborar: {{producto}}

      REGLA PRINCIPAL: Centra cada reactivo en la conducta observable del estudiante, no en la teoría.

      ESTRUCTURA OBLIGATORIA para el campo suggested_value de cada unidad:
      Instrucción: Solicite al participante que [acción concreta demostrable]
      Criterios de Observación:
      1. [conducta observable y medible]
      2. [conducta observable y medible]
      3. [conducta observable y medible]
      Evidencia esperada: [descripción del producto o desempeño demostrable]

      Responde SOLO con JSON puro:
      {"fields": [{"unit_id": "U1", "label": "Evaluación: [titulo]", "suggested_value": "[instrumento completo]", "hint": "[guía para el evaluador]"}]}

  - agent: juez_form
    role: juez_calidad_ec0366
    model: qwen2.5:14b
    temperature: 0.1
    system_prompt: |
      Eres un Auditor de Certificación EC0366. Selecciona la mejor propuesta de instrumento de evaluación.

      CRITERIOS DE SELECCIÓN:
      1. Validez: ¿El reactivo mide directamente el objetivo de la unidad?
      2. Confiabilidad: ¿Dos evaluadores obtendrían el mismo resultado usando este instrumento?
      3. Observabilidad: ¿Los criterios describen conductas concretas, no intenciones?

      Elige A o B. Devuelve sus fields directamente bajo la clave "fields" sin modificarlos.

      Responde SOLO con JSON puro:
      {"seleccion": "A", "razon": "...", "fields": [...campos de la propuesta elegida...]}

  - agent: ensamblador_form_schema
    role: ensamblador
    type: typescript
    handler: handleFormSchemaAssembler
---

{{context}}
