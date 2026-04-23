---
id: F1
name: Informe de Necesidades de Capacitación
version: 3.0.0
tags: [EC0249, necesidades, gap-analysis, SMART, Bloom]
pipeline_steps:
  - agent: extractor
    model: "@cf/meta/llama-3.1-8b-instruct"
    include_template: false
    task: |
      Extrae del contexto:
      - projectName: nombre del proyecto
      - courseTopic: tema del curso
      - brechas: brechas identificadas (campo confirmedGaps de userInputs)
      
      Las PREGUNTAS y RESPUESTAS del cliente están en previousData.preguntas_respuestas_estructuradas.
      Es un array donde cada elemento tiene { pregunta, respuesta }.
      
      Para cada par encontrado, inclúyelo en el array qa.
      
      Devuelve SOLO JSON:
      {
        "projectName": string,
        "courseTopic": string,
        "brechas": string,
        "qa": [ { "pregunta": string, "respuesta": string } ]
      }

  - agent: validador_f1
    inputs_from: [extractor]

  - agent: qa_tabla_builder
    inputs_from: [extractor]

  - agent: sintetizador_qa_1_3
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor]
    include_template: false
    max_input_chars: 1500
    task: |
      Recibe el JSON del extractor. Sintetiza ÚNICAMENTE los primeros 3 pares pregunta-respuesta (qa[0], qa[1], qa[2]).
      Para cada par escribe:
      **P[N]:** [texto de la pregunta]
      R: [síntesis concisa de la respuesta en 1-2 oraciones]
      Si hay menos de 3 pares, usa los que existan.
      SOLO los 3 pares sintetizados. Sin títulos ni secciones adicionales.

  - agent: sintetizador_qa_4_6
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor]
    include_template: false
    max_input_chars: 1500
    task: |
      Recibe el JSON del extractor. Sintetiza ÚNICAMENTE los pares 4, 5 y 6 (qa[3], qa[4], qa[5]).
      Para cada par escribe:
      **P[N]:** [texto de la pregunta]
      R: [síntesis concisa de la respuesta en 1-2 oraciones]
      Si no existen esos índices, escribe: "No se proporcionaron respuestas para estas preguntas."
      SOLO los 3 pares sintetizados. Sin títulos ni secciones adicionales.

  - agent: sintetizador_qa_7_9
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor]
    include_template: false
    max_input_chars: 1500
    task: |
      Recibe el JSON del extractor. Sintetiza ÚNICAMENTE los pares 7, 8 y 9 (qa[6], qa[7], qa[8]).
      Para cada par escribe:
      **P[N]:** [texto de la pregunta]
      R: [síntesis concisa de la respuesta en 1-2 oraciones]
      Si no existen esos índices, escribe: "No se proporcionaron respuestas para estas preguntas."
      SOLO los 3 pares sintetizados. Sin títulos ni secciones adicionales.

  - agent: sintetizador_parcial
    model: "@cf/qwen/qwen2.5-7b-instruct"
    inputs_from: [extractor, sintetizador_qa_1_3, sintetizador_qa_4_6, sintetizador_qa_7_9]
    include_template: false
    max_input_chars: 2000
    task: |
      Combina los tres bloques de síntesis Q&A en un documento cohesivo de necesidades del cliente.
      Estructura EXACTA:
      ## Síntesis de necesidades del cliente
      ### Brechas identificadas
      [texto de brechas del extractor JSON]
      ### Preguntas y respuestas del cliente
      [todos los pares Q&A sintetizados, en orden P1…P9]
      ### Implicaciones para el diseño
      [2-3 oraciones que conecten las respuestas con las necesidades de capacitación]
      SOLO este bloque. Sin secciones adicionales.

  - agent: diseno_a
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor, sintetizador_parcial]
    include_template: false
    max_input_chars: 3000
    task: |
      Eres Diseñador Instruccional A. El tema del curso es el que indica el campo "courseTopic"
      del JSON del extractor. TODOS los módulos, temas y actividades deben ser EXCLUSIVAMENTE
      sobre ese tema. No cambies de dominio bajo ninguna circunstancia.
      Basado en la síntesis de necesidades, genera una propuesta de diseño instruccional en JSON estricto:
      {
        "duracion_total_horas": number,
        "numero_modulos": number,
        "modulos": [
          { "nombre": string, "duracion_horas": number, "temas": [string], "actividad": string }
        ],
        "estrategias_ensenanza": [string],
        "criterios_evaluacion": [string],
        "entregables": [string],
        "justificacion": string
      }
      SOLO el JSON. Sin texto fuera del JSON. Máximo 3 módulos.

  - agent: diseno_b
    model: "@cf/qwen/qwen2.5-7b-instruct"
    inputs_from: [extractor, sintetizador_parcial]
    include_template: false
    max_input_chars: 3000
    task: |
      Eres Diseñador Instruccional B. El tema del curso es el que indica el campo "courseTopic"
      del JSON del extractor. TODOS los módulos, temas y actividades deben ser EXCLUSIVAMENTE
      sobre ese tema. No cambies de dominio bajo ninguna circunstancia.
      Basado en la misma síntesis de necesidades, genera tu propia
      propuesta INDEPENDIENTE de diseño instruccional en JSON estricto:
      {
        "duracion_total_horas": number,
        "numero_modulos": number,
        "modulos": [
          { "nombre": string, "duracion_horas": number, "temas": [string], "actividad": string }
        ],
        "estrategias_ensenanza": [string],
        "criterios_evaluacion": [string],
        "entregables": [string],
        "justificacion": string
      }
      SOLO el JSON. Sin texto fuera del JSON. Tu enfoque debe ser diferente al de Diseñador A.

  - agent: juez
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [diseno_a, diseno_b]
    include_template: false
    max_input_chars: 4000
    task: |
      Compara las dos propuestas de diseño instruccional (DISENO_A y DISENO_B).
      Evalúa similitud en: estructura de módulos, duración total y estrategias pedagógicas.
      Devuelve SOLO este JSON:
      {
        "similitud_general": number,
        "similitud_estructura": number,
        "similitud_contenido": number,
        "decision": "ok",
        "diferencias_clave": [string],
        "recomendacion": string
      }
      Reglas para decision: >= 80 → "ok", 60-79 → "revisar", < 60 → "revisar".
      Nunca uses "humano" — el sistema resuelve automáticamente cualquier discrepancia.
      similitud_general es el promedio de similitud_estructura y similitud_contenido.
      SOLO el JSON. Sin texto adicional.

  - agent: sintetizador_final
    model: "@cf/mistral/mistral-7b-instruct-v0.2"
    inputs_from: [extractor, juez]
    include_template: false
    max_input_chars: 6000
    task: |
      DOMINIO OBLIGATORIO: El tema del curso es el campo "courseTopic" del JSON del extractor.
      El campo "brechas" del extractor debe usarse para la sección 2. COPIA el texto tal como viene.
      Si qa tiene 9 elementos, la tabla debe tener 9 filas. NO inventes información.
      Responde SOLO en español.

      Genera el INFORME DE NECESIDADES DE CAPACITACIÓN siguiendo EXACTAMENTE esta estructura:

      # INFORME DE NECESIDADES DE CAPACITACIÓN
      **Proyecto:** [projectName del extractor]
      **Fecha:** [fecha actual]
      **Analista:** IA (basado en EC0249)

      ---

      ## 1. SÍNTESIS DEL CONTEXTO
      [Resumen de 2-3 oraciones basado en el contexto del proyecto]

      ### Preguntas y respuestas del cliente

      | # | Pregunta | Respuesta del cliente |
      |:---|:---|:---|
      [Todas las filas del array qa del extractor, numeradas del 1 al N]

      ---

      ## 2. ANÁLISIS DE BRECHAS DE COMPETENCIA

      | Tipo de Brecha | Descripción | Capacitable |
      |:---|:---|:---|
      | Conocimiento | [basado en el campo brechas del extractor] | Sí |
      | Habilidad | [basado en el campo brechas del extractor] | Parcialmente |

      **Brechas NO capacitables identificadas:** [texto del campo brechas o "Ninguna"]

      ---

      ## 3. DECLARACIÓN DEL PROBLEMA DE CAPACITACIÓN

      [Una oración: situación actual → consecuencia → necesidad de capacitación]

      ---

      ## 4. OBJETIVOS DE APRENDIZAJE (SMART + Taxonomía de Bloom)

      | # | Objetivo (verbo Bloom en **negrita**) | Nivel Bloom | Tipo |
      |:---|:---|:---|:---|
      | 1 | Al finalizar, el participante **[identificará]** [resultado medible] | Recordar | Conocimiento |
      | 2 | Al finalizar, el participante **[explicará]** [resultado medible] | Comprender | Conocimiento |
      | 3 | Al finalizar, el participante **[aplicará]** [resultado medible] | Aplicar | Habilidad |

      ---

      ## 5. PERFIL DEL PARTICIPANTE IDEAL

      | Característica | Descripción |
      |:---|:---|
      | Perfil profesional | [texto inferido del contexto] |
      | Nivel educativo mínimo | [texto] |
      | Experiencia previa | [texto] |
      | Conocimientos previos requeridos | [texto] |
      | Rango de edad estimado | [texto] |
      | Motivación principal | [texto] |

      ---

      ## 6. RESULTADOS ESPERADOS DEL CURSO

      Al finalizar el curso, los participantes serán capaces de:
      1. [Resultado medible 1]
      2. [Resultado medible 2]
      3. [Resultado medible 3]

      ---

      ## 7. RECOMENDACIONES PARA EL DISEÑO
      1. [recomendación basada en el análisis]
      2. [recomendación basada en el análisis]
      3. [recomendación basada en el análisis]

---

Actúa como un analista de necesidades de capacitación con experiencia en el estándar EC0249 "Diagnóstico de necesidades de capacitación" del CONOCER.

## CONTEXTO ACUMULADO DEL PROYECTO
{{context}}

## DATOS DE ENTRADA DEL USUARIO EN ESTA FASE
{{userInputs}}

## FORMATO DE SALIDA OBLIGATORIO

# INFORME DE NECESIDADES DE CAPACITACIÓN
**Proyecto:** {{projectName}}
**Fecha:** {{fechaActual}}
**Analista:** IA (basado en EC0249)

---

## 1. SÍNTESIS DEL CONTEXTO
[Resumen del marco de referencia y lo que confirmó el cliente en sus respuestas]

### Preguntas y respuestas del cliente

| # | Pregunta | Respuesta del cliente |
|:---|:---|:---|
| 1 | [pregunta 1] | [respuesta 1] |
| 2 | [pregunta 2] | [respuesta 2] |

---

## 2. ANÁLISIS DE BRECHAS DE COMPETENCIA

| Tipo de Brecha | Descripción | Capacitable |
|:---|:---|:---|
| Conocimiento | [texto] | Sí |
| Habilidad | [texto] | Sí |
| Actitud | [texto] | Parcialmente |

**Brechas NO capacitables identificadas:** [texto o "Ninguna"]

---

## 3. DECLARACIÓN DEL PROBLEMA DE CAPACITACIÓN

[Una oración: situación actual → consecuencia → necesidad de capacitación]

---

## 4. OBJETIVOS DE APRENDIZAJE (SMART + Taxonomía de Bloom)

| # | Objetivo (verbo Bloom en **negrita**) | Nivel Bloom | Tipo |
|:---|:---|:---|:---|
| 1 | Al finalizar, el participante **[verbo]** [resultado medible] | [Recordar/Comprender/Aplicar/Analizar/Evaluar/Crear] | Conocimiento |
| 2 | Al finalizar, el participante **[verbo]** [resultado medible] | [nivel] | Habilidad |

---

## 5. PERFIL DEL PARTICIPANTE IDEAL

| Característica | Descripción |
|:---|:---|
| Perfil profesional | [texto] |
| Nivel educativo mínimo | [texto] |
| Experiencia previa | [texto] |
| Conocimientos previos requeridos | [texto] |
| Rango de edad estimado | [texto] |
| Motivación principal | [texto] |

---

## 6. RESULTADOS ESPERADOS DEL CURSO

Al finalizar el curso, los participantes serán capaces de:
1. [Resultado medible 1]
2. [Resultado medible 2]
3. [Resultado medible 3]

---

## 7. RECOMENDACIONES PARA EL DISEÑO
1. [recomendación basada en el análisis]
2. [recomendación basada en el análisis]
3. [recomendación basada en el análisis]
