---
id: F4_P2
name: Producto 2 - Guías de Actividades por Módulo EC0366
version: 2.0.0
tags: [EC0366, E1220, produccion, guias-actividades]
pipeline_steps:
  - agent: extractor_f4_p2
    inputs_from: []
    include_template: false
    task: |
      Extrae del context los siguientes datos y devuélvelos en JSON puro:
      {
        "projectName": string,
        "clientName": string,
        "modulos": [
          {
            "nombre": string,
            "objetivo": string,
            "duracion_horas": number,
            "temas": [string],
            "actividades_sugeridas": [string]
          }
        ],
        "criteriosAceptacion": [string],
        "actividadesTipos": [string],
        "reporteoActividades": [string]
      }
      - modulos: estructura temática de F2. Para cada módulo incluye nombre, objetivo, horas y temas.
      - actividades_sugeridas: de F2.5 si están disponibles en el contexto. Si no, deja [].
      - criteriosAceptacion: de F3 si están disponibles. Si no, deja [].
      - actividadesTipos, reporteoActividades: tipos de actividades recomendados de F2.5 o F2.
      SOLO el JSON. Sin explicaciones.

  - agent: agente_a_p2
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f4_p2]
    include_template: false
    max_input_chars: 4000
    task: |
      Eres Diseñador Instruccional A. Con EXTRACTOR_F4_P2, genera las GUÍAS DE ACTIVIDADES
      para CADA módulo listado. Por módulo, crea una tabla de actividades con columnas:
      Título de actividad | Instrucciones paso a paso | Materiales/recursos | Participación | Medio de entrega | Período | Ponderación | Criterios de evaluación
      Reglas:
      - Cada módulo debe tener MÍNIMO 3 actividades.
      - La suma de ponderaciones de TODAS las actividades de TODOS los módulos debe ser exactamente 100%.
      - Distribuye las ponderaciones proporcionalmente según la duración del módulo.
      - Los criterios de evaluación deben ser observables y medibles (no subjetivos).
      - Usa los actividades_sugeridas del extractor cuando estén disponibles.
      - Incluye tabla RESUMEN DE PONDERACIÓN GLOBAL al final.
      Formato Markdown. Sin placeholders genéricos. Sin texto introductorio.

  - agent: agente_b_p2
    model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
    inputs_from: [extractor_f4_p2]
    include_template: false
    max_input_chars: 4000
    task: |
      Eres Diseñador Instruccional B. Con EXTRACTOR_F4_P2, genera las GUÍAS DE ACTIVIDADES
      para CADA módulo con enfoque diferente al de A: mayor énfasis en actividades colaborativas,
      proyectos integradores y evaluación auténtica. Por módulo, crea la tabla con las mismas columnas.
      Reglas CRÍTICAS:
      - MÍNIMO 3 actividades por módulo.
      - La suma TOTAL de ponderaciones de todos los módulos = 100% exacto.
      - Al menos una actividad por módulo debe ser grupal/colaborativa.
      - Al menos una actividad por módulo debe ser de aplicación práctica (no solo lecturas).
      - Incluye tabla RESUMEN DE PONDERACIÓN GLOBAL al final.
      Formato Markdown. Sin placeholders. Sin texto introductorio.

  - agent: juez_p2
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [agente_a_p2, agente_b_p2]
    include_template: false
    max_input_chars: 5000
    task: |
      Compara AGENTE_A_P2 y AGENTE_B_P2. Elige el que mejor cumpla EC0366.
      Criterios:
      1. Cada módulo tiene mínimo 3 actividades
      2. La suma de ponderaciones está cerca de 100% (rango 95-105%)
      3. Los criterios de evaluación son observables y medibles
      4. Sin placeholders [X] en campos críticos
      5. Incluye tabla RESUMEN DE PONDERACIÓN GLOBAL
      Devuelve SOLO este JSON:
      {
        "borrador_elegido": "A" | "B",
        "razon": string,
        "campos_faltantes": [string],
        "placeholders_detectados": number
      }
      SOLO el JSON.

  - agent: validador_p2
    inputs_from: [extractor_f4_p2, agente_a_p2, agente_b_p2, juez_p2]

  - agent: sintetizador_final_f4
    inputs_from: [extractor_f4_p2, agente_a_p2, agente_b_p2, juez_p2, validador_p2]
    include_template: true
    max_input_chars: 7000
    task: |
      Toma el borrador elegido por JUEZ_P2 y genera las GUÍAS DE ACTIVIDADES POR MÓDULO final.
      Si VALIDADOR_P2 detectó que la suma de ponderaciones no es 100%, ya fue corregida automáticamente.
      REGLAS:
      - Verifica que la suma total de ponderaciones sea exactamente 100%.
      - Cada módulo tiene mínimo 3 actividades con criterios de evaluación específicos.
      - Elimina cualquier placeholder residual [X].
      - Incluye la tabla RESUMEN DE PONDERACIÓN GLOBAL al final.
      - Responde SOLO en español. Sigue el FORMATO DE SALIDA OBLIGATORIO.
---

Actúa como un diseñador instruccional certificable en EC0366. Genera ÚNICAMENTE el Producto 2 indicado.

## CONTEXTO ACUMULADO DEL PROYECTO
{{context}}

## DATOS DE ENTRADA DEL USUARIO EN ESTA FASE
{{userInputs}}

## FORMATO DE SALIDA OBLIGATORIO

# PRODUCTO 2: GUÍAS DE ACTIVIDADES POR MÓDULO
**Elemento EC0366:** E1220 — Producto #1
**Proyecto:** {{projectName}}
**Candidato:** {{clientName}}
**Fecha:** {{fechaActual}}
**Folio:** EC0366-GUIAS-{{fechaActual}}

---

[Para cada módulo de la estructura temática de F2:]

## MÓDULO [N]: [Nombre del módulo]
**Objetivo específico:** [objetivo del módulo de F2]
**Duración:** [horas estimadas de F2]

| Título de actividad | Instrucciones paso a paso | Materiales/recursos | Participación | Medio de entrega | Período | Ponderación | Criterios de evaluación |
|:---|:---|:---|:---:|:---|:---|:---:|:---|
| [Act. N.1: nombre descriptivo] | [pasos detallados numerados] | [recursos: video, lectura, herramienta] | Individual | Buzón/Quiz/Foro | [días N-M] | [%] | [criterio observable y medible] |
| [Act. N.2: nombre descriptivo] | [pasos detallados] | [recursos] | Grupal | Foro/Proyecto | [días] | [%] | [criterio] |
| [Act. N.3: nombre descriptivo] | [pasos] | [recursos] | Individual | Examen/Entrega | [días] | [%] | [criterio] |

[Repetir la tabla para cada módulo]

---

## RESUMEN DE PONDERACIÓN GLOBAL

| Módulo | Ponderación total | Actividades |
|:---|:---:|:---:|
| [Módulo 1] | [%] | [N] |
| [Módulo 2] | [%] | [N] |
| **TOTAL** | **100%** | **[N total]** |
