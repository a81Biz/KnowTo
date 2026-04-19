---
id: F4_P3
name: Producto 3 - Calendario General de Actividades EC0366
version: 2.0.0
tags: [EC0366, E1220, produccion, calendario]
pipeline_steps:
  - agent: extractor_f4_p3
    inputs_from: []
    include_template: false
    task: |
      Extrae del context y userInputs los siguientes datos y devuélvelos en JSON puro:
      {
        "projectName": string,
        "clientName": string,
        "startDate": string,
        "duracionTotalHoras": number,
        "duracionTotalSemanas": number,
        "modulos": [
          {
            "nombre": string,
            "duracion_horas": number,
            "actividades": [
              { "titulo": string, "ponderacion": number }
            ]
          }
        ]
      }
      - startDate: de userInputs. Si no existe, usa "Por definir".
      - duracionTotalHoras, duracionTotalSemanas: de F3.
      - modulos: de F2 con nombre y duración. Si el Producto 2 ya fue generado (previousData.F4_P2),
        extrae las actividades y ponderaciones de ahí. Si no, usa actividades genéricas por módulo.
      SOLO el JSON. Sin explicaciones.

  - agent: agente_a_p3
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f4_p3]
    include_template: false
    max_input_chars: 3500
    task: |
      Eres Diseñador Instruccional A. Con EXTRACTOR_F4_P3, genera el CALENDARIO GENERAL DE
      ACTIVIDADES en vista semanal. Por cada semana del curso, indica:
      - Semana número
      - Módulo correspondiente
      - Actividades incluidas (nombres breves)
      - Ponderación acumulada de la semana
      - Fecha de apertura (calculada desde startDate o usando Semana N)
      - Fecha de cierre
      Reglas:
      - Las fechas deben ser consecuentes (sin traslapes).
      - La suma de ponderaciones de todo el calendario = 100%.
      - La última semana debe incluir evaluación final / cierre del curso.
      - Añade tabla de TOTALES al final (semanas, horas, fechas, total actividades).
      Formato Markdown con tabla. Sin placeholders [X].

  - agent: agente_b_p3
    model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
    inputs_from: [extractor_f4_p3]
    include_template: false
    max_input_chars: 3500
    task: |
      Eres Diseñador Instruccional B. Con EXTRACTOR_F4_P3, genera el CALENDARIO GENERAL DE
      ACTIVIDADES desde una perspectiva diferente. Organiza el calendario considerando:
      - Distribución uniforme de carga de trabajo por semana.
      - Semanas de amortiguamiento antes de evaluaciones importantes.
      - Indicador de "Fase del curso" (Inicio / Desarrollo / Cierre) por semana.
      Usa las mismas columnas que A: Semana | Fase | Módulo | Actividades | Ponderación | Apertura | Cierre.
      La suma de ponderaciones = 100%. Sin traslapes. Sin placeholders [X].

  - agent: juez_p3
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [agente_a_p3, agente_b_p3]
    include_template: false
    max_input_chars: 4000
    task: |
      Compara AGENTE_A_P3 y AGENTE_B_P3. Elige el calendario más completo para EC0366.
      Criterios:
      1. Hay al menos una semana definida por cada módulo del curso
      2. La suma de ponderaciones está entre 95% y 105%
      3. Las fechas son consecuentes (sin traslapes detectables)
      4. Incluye semana de cierre/evaluación final
      5. Sin placeholders [X] en fechas o actividades
      Devuelve SOLO este JSON:
      {
        "borrador_elegido": "A" | "B",
        "razon": string,
        "campos_faltantes": [string],
        "placeholders_detectados": number
      }
      SOLO el JSON.

  - agent: validador_p3
    inputs_from: [extractor_f4_p3, agente_a_p3, agente_b_p3, juez_p3]

  - agent: sintetizador_final_f4
    inputs_from: [extractor_f4_p3, agente_a_p3, agente_b_p3, juez_p3, validador_p3]
    include_template: true
    max_input_chars: 6000
    task: |
      Toma el borrador elegido por JUEZ_P3 y genera el CALENDARIO GENERAL DE ACTIVIDADES final.
      REGLAS:
      - Las fechas deben ser reales si startDate está disponible en EXTRACTOR_F4_P3.
        Si startDate = "Por definir", usa "Semana N" como referencia.
      - Verifica que no hay traslapes entre actividades de la misma semana.
      - La suma de ponderaciones DEBE ser 100%.
      - Elimina placeholders residuales [X].
      - Responde SOLO en español. Sigue el FORMATO DE SALIDA OBLIGATORIO.
---

Actúa como un diseñador instruccional certificable en EC0366. Genera ÚNICAMENTE el Producto 3 indicado.

## CONTEXTO ACUMULADO DEL PROYECTO
{{context}}

## DATOS DE ENTRADA DEL USUARIO EN ESTA FASE
{{userInputs}}

## FORMATO DE SALIDA OBLIGATORIO

# PRODUCTO 3: CALENDARIO GENERAL DE ACTIVIDADES
**Elemento EC0366:** E1220 — Producto #2
**Proyecto:** {{projectName}}
**Candidato:** {{clientName}}
**Fecha de elaboración:** {{fechaActual}}
**Folio:** EC0366-CAL-{{fechaActual}}

---

**Fecha de inicio del curso:** [startDate de userInputs o "Por definir"]
**Duración total:** [N semanas] | [N horas totales de F3]

| Semana | Módulo | Actividades incluidas | Ponderación | Fecha de apertura | Fecha de cierre |
|:---:|:---|:---|:---:|:---|:---|
| 1 | [Módulo 1 — nombre] | [Act. 1.1, Act. 1.2 — nombres breves] | [%] | [DD/MM/AAAA o Semana 1] | [DD/MM/AAAA o Semana 2] |
| 2 | [Módulo 1 continuación / Módulo 2] | [Act. 1.3, Act. 2.1] | [%] | [fecha] | [fecha] |
| [N] | [Módulo N] | [actividades] | [%] | [fecha] | [fecha] |
| **CIERRE** | Evaluación sumativa | Evaluación final del curso | [%] | [fecha] | [fecha] |

---

## TOTALES

| Dato | Valor |
|:---|:---|
| Total de semanas | [N] |
| Total de horas del curso | [N] |
| Fecha de inicio | [startDate o "Por definir"] |
| Fecha de cierre estimada | [fecha] |
| Total de actividades | [N] |
| Suma de ponderaciones | 100% |
