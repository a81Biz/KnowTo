---
id: F1
name: Informe de Necesidades de Capacitación
version: 3.0.0
tags: [EC0249, necesidades, gap-analysis, SMART, Bloom]
pipeline_steps:
  - agent: extractor
    inputs_from: []
    include_template: false
    task: |
      Extrae del contexto y userInputs los siguientes datos y devuélvelos en JSON puro (sin texto extra):
      {
        "projectName": string,
        "industry": string,
        "courseTopic": string,
        "targetAudience": string,
        "brechas": string,
        "qa": [
          { "pregunta": string, "respuesta": string }
        ],
        "perfilParticipante": {
          "perfil_profesional": string,
          "nivel_educativo_minimo": string,
          "experiencia_previa": string,
          "conocimientos_previos_requeridos": string,
          "rango_de_edad_estimado": string,
          "motivacion_principal": string
        }
      }
      Instrucciones:
      - projectName, industry, courseTopic, targetAudience: tómalos del context.
      - brechas: toma el campo confirmedGaps de userInputs. Si está vacío, usa el texto de brechas de previousData.F0.
      - qa: construye los pares pregunta-respuesta de la siguiente forma:
        1. Las preguntas son las que el agente F0 generó. Búscalas en previousData.F0.content
           dentro de la sección "Preguntas para el cliente" o similar, en orden de aparición.
        2. Las respuestas están en userInputs como clientAnswer_0, clientAnswer_1, … clientAnswer_8.
        3. Para cada índice i (0 a N-1 donde N = número de preguntas encontradas):
           - pregunta: el texto de la pregunta i del F0
           - respuesta: el valor de clientAnswer_i de userInputs.
             Si clientAnswer_i no existe o está vacío → usa exactamente el texto "No especificada".
        4. Devuelve TODOS los pares encontrados (puede ser entre 5 y 9 según lo que generó F0).
           NO inventes preguntas. NO omitas ningún par.
      - perfilParticipante: infiere los 6 campos a partir de targetAudience, industry, las respuestas
        de los clientes (clientAnswer_*) y cualquier dato del contexto F0 sobre el participante.
        Si un campo no puede determinarse, usa una descripción genérica del sector. NUNCA dejes vacío.
      SOLO el JSON. Sin explicaciones. Sin texto fuera del JSON.

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
    inputs_from: [extractor, qa_tabla_builder, sintetizador_parcial, diseno_a, diseno_b, juez]
    include_template: true
    max_input_chars: 4000
    task: |
      DOMINIO OBLIGATORIO: El tema del curso es el campo "courseTopic" del JSON del extractor.
      Todo el documento debe referirse EXCLUSIVAMENTE a ese tema.
      Si DISENO_A o DISENO_B mencionan un dominio diferente, descarta ese contenido y usa
      solo lo que sea coherente con el courseTopic del extractor.

      Tienes el veredicto del JUEZ y dos propuestas de diseño (DISENO_A y DISENO_B).
      REGLAS según la decision del juez:
      - decision == "ok" (≥80%): fusiona lo mejor de ambas propuestas.
      - decision == "revisar" o "humano": usa DISENO_A como base y complementa con DISENO_B
        solo donde sea compatible con el dominio. No pidas intervención humana.
      En TODOS los casos: genera el INFORME DE NECESIDADES completo.
      Sigue el FORMATO DE SALIDA OBLIGATORIO de la plantilla al pie de la letra.
      NO dejes placeholders entre corchetes en el documento final.
      Responde SOLO en español.

      REGLA CRÍTICA PARA SECCIÓN 1 — Tabla de preguntas y respuestas:
      Debajo de "### Preguntas y respuestas del cliente" COPIA EXACTAMENTE el contenido de
      QA_TABLA_BUILDER, sin modificar ni resumir ninguna fila. Si QA_TABLA_BUILDER tiene 9
      filas, el documento final debe tener 9 filas. No agregues ni elimines filas.

      REGLA CRÍTICA PARA SECCIÓN 5 — Perfil del participante:
      Usa el campo "perfilParticipante" del JSON del extractor para llenar la tabla.
      Los 6 campos son obligatorios: perfil_profesional, nivel_educativo_minimo,
      experiencia_previa, conocimientos_previos_requeridos, rango_de_edad_estimado,
      motivacion_principal. NO uses [texto] como valor.

      REGLAS PARA SECCIÓN 3 — Declaración del Problema:
      Usa EXACTAMENTE esta estructura de dos oraciones:
      "[Colectivo del courseTopic] actualmente [situación actual problemática], lo cual genera [consecuencia medible].
      Se requiere [necesidad de capacitación sobre el courseTopic que resuelve la brecha]."
      NO uses ejemplos de otros dominios. NO uses listas. NO uses más de 2 oraciones.

      REGLAS PARA SECCIÓN 4 — Objetivos de Aprendizaje (Taxonomía de Bloom):
      Usa ÚNICAMENTE verbos de estos niveles. El verbo debe ir en **negrita** dentro del objetivo:
      - Recordar:   identificar, reconocer, listar
      - Comprender: explicar, describir, interpretar
      - Aplicar:    resolver, usar, demostrar, ejecutar
      - Analizar:   comparar, diferenciar, organizar
      - Evaluar:    criticar, justificar, validar
      - Crear:      diseñar, construir, planificar

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
