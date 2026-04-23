---
id: F4_P0
name: Producto 0 - Cronograma de Desarrollo EC0366
version: 3.0.0
tags: [EC0366, E1219, produccion, cronograma]
pipeline_steps:
  - agent: extractor_f4_p0
    inputs_from: []
    include_template: false
    task: |
      Extrae del context y userInputs los siguientes datos y devuélvelos en JSON puro (sin texto extra):
      {
        "projectName": string,
        "clientName": string,
        "modulos": [{ "nombre": string, "duracion_horas": number }],
        "duracionTotal": string,
        "startDate": string,
        "instructorName": string,
        "reviewerName": string
      }
      FUENTES DE DATOS:
      - projectName, clientName: del encabezado del contexto.
      - modulos: busca la tabla en "## 3. ESTRUCTURA TEMÁTICA PRELIMINAR" en el contexto. Extrae "Nombre" y "Duración (hrs)".
      - duracionTotal: busca "## 3. DURACIÓN CALCULADA" en el contexto. Extrae el valor de "DURACIÓN TOTAL EN HORAS".
      - startDate: de userInputs. Si no existe, usa "Por definir".
      - instructorName, reviewerName: de userInputs. Si no existen, usa "Por definir".
      
      REGLA: Si no encuentras módulos o duración, usa datos coherentes basados en el resto del contexto pero NUNCA devuelvas campos vacíos.
      SOLO el JSON. Sin explicaciones.

  - agent: agente_a_p0
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f4_p0]
    include_template: false
    max_input_chars: 3000
    task: |
      Eres Diseñador Instruccional A. Basado en EXTRACTOR_F4_P0, genera la tabla maestra del
      CRONOGRAMA DE DESARROLLO por fases. Las 4 fases obligatorias EC0366 son:
      1. Diseño instruccional
      2. Producción de contenidos
      3. Integración LMS
      4. Revisión y pruebas
      Para cada fase, lista las actividades con columnas: Actividad | Responsable | Duración (días) | Fecha inicio | Fecha fin | Entregable.
      Si startDate está disponible, calcula fechas reales. Si no, usa "Semana N" como referencia.
      instructorName = responsable de producción. reviewerName = responsable de revisión.
      Formato Markdown, tablas con pipes. Sin texto introductorio ni conclusiones.

  - agent: agente_b_p0
    model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
    inputs_from: [extractor_f4_p0]
    include_template: false
    max_input_chars: 3000
    task: |
      Eres Diseñador Instruccional B. Basado en EXTRACTOR_F4_P0, genera una perspectiva
      diferente e independiente del CRONOGRAMA DE DESARROLLO. Incluye:
      - Las mismas 4 fases EC0366 con enfoque en estimación de esfuerzo (horas-persona).
      - Tabla con columnas: Fase | Actividad | Responsable | Duración | Horas-persona | Entregable.
      - Sección RIESGOS Y MITIGACIÓN: 3-5 riesgos con probabilidad, impacto y acción.
      - Sección DEPENDENCIAS CRÍTICAS: qué debe completarse antes de cada fase.
      Formato Markdown. Sin texto introductorio.

  - agent: juez_p0
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [agente_a_p0, agente_b_p0]
    include_template: false
    max_input_chars: 4000
    task: |
      Compara AGENTE_A_P0 y AGENTE_B_P0. Evalúa cuál cronograma es más completo según EC0366.
      Criterios:
      1. Las 4 fases EC0366 están presentes (Diseño instruccional, Producción, Integración LMS, Revisión)
      2. Cada fase tiene actividades con responsables y fechas/semanas
      3. instructorName y reviewerName aparecen como responsables
      4. Sin placeholders [X] en campos críticos
      Devuelve SOLO este JSON:
      {
        "borrador_elegido": "A" | "B",
        "razon": string,
        "campos_faltantes": [string],
        "placeholders_detectados": number
      }
      Regla: si ambos tienen placeholders, elige el de menor conteo.
      SOLO el JSON. Sin texto adicional.

  - agent: validador_p0
    inputs_from: [extractor_f4_p0, agente_a_p0, agente_b_p0, juez_p0]

  - agent: sintetizador_final_f4
    inputs_from: [extractor_f4_p0, agente_a_p0, agente_b_p0, juez_p0, validador_p0]
    include_template: true
    max_input_chars: 6000
    task: |
      Toma el borrador elegido por JUEZ_P0 y genera el CRONOGRAMA DE DESARROLLO final.
      REGLAS:
      - Reemplaza todos los placeholders [X], [Por definir] con datos reales del EXTRACTOR_F4_P0.
      - instructorName y reviewerName deben aparecer tal como los proporcionó el usuario.
      - El documento DEBE incluir las 4 fases EC0366 con actividades, responsables, duración y entregables.
      - Añade sección RIESGOS Y MITIGACIÓN y RESUMEN EJECUTIVO al final.
      - Responde SOLO en español. Sigue el FORMATO DE SALIDA OBLIGATORIO de la plantilla.
---

Actúa como un diseñador instruccional certificable en EC0366. Genera ÚNICAMENTE el Producto 0 indicado.

## CONTEXTO ACUMULADO DEL PROYECTO
{{context}}

## DATOS DE ENTRADA DEL USUARIO EN ESTA FASE
{{userInputs}}

## FORMATO DE SALIDA OBLIGATORIO

# PRODUCTO 0: CRONOGRAMA DE DESARROLLO
**Elemento EC0366:** E1219 — Producto #1
**Proyecto:** {{projectName}}
**Candidato:** {{clientName}}
**Fecha de elaboración:** {{fechaActual}}
**Folio:** EC0366-CRON-{{fechaActual}}

---

## FASE 1: Diseño instruccional

| Actividad | Responsable | Duración (días) | Fecha inicio | Fecha fin | Entregable |
|:---|:---|:---:|:---|:---|:---|
| [Actividad de diseño 1] | [instructorName] | [N] | [fecha] | [fecha] | [entregable] |
| [Actividad de diseño 2] | [instructorName] | [N] | [fecha] | [fecha] | [entregable] |

## FASE 2: Producción de contenidos

| Actividad | Responsable | Duración (días) | Fecha inicio | Fecha fin | Entregable |
|:---|:---|:---:|:---|:---|:---|
| [Actividad producción 1] | [instructorName] | [N] | [fecha] | [fecha] | [entregable] |
| [Actividad producción 2] | [instructorName] | [N] | [fecha] | [fecha] | [entregable] |

## FASE 3: Integración LMS

| Actividad | Responsable | Duración (días) | Fecha inicio | Fecha fin | Entregable |
|:---|:---|:---:|:---|:---|:---|
| [Actividad integración 1] | [instructorName] | [N] | [fecha] | [fecha] | [entregable] |
| [Actividad integración 2] | [instructorName] | [N] | [fecha] | [fecha] | [entregable] |

## FASE 4: Revisión y pruebas

| Actividad | Responsable | Duración (días) | Fecha inicio | Fecha fin | Entregable |
|:---|:---|:---:|:---|:---|:---|
| [Actividad revisión 1] | [reviewerName] | [N] | [fecha] | [fecha] | [entregable] |
| [Actividad revisión 2] | [reviewerName] | [N] | [fecha] | [fecha] | [entregable] |

---

## RIESGOS Y PLAN DE MITIGACIÓN

| Riesgo | Probabilidad | Impacto | Mitigación |
|:---|:---:|:---:|:---|
| [Riesgo 1] | [Alta/Media/Baja] | [Alto/Medio/Bajo] | [acción de mitigación] |
| [Riesgo 2] | [Alta/Media/Baja] | [Alto/Medio/Bajo] | [acción de mitigación] |

---

## RESUMEN EJECUTIVO

| Dato | Valor |
|:---|:---|
| Duración total del proyecto | [N semanas / N días hábiles] |
| Fecha de inicio | [startDate o "Por definir"] |
| Fecha estimada de entrega | [fecha calculada] |
| Instructor / Desarrollador | [instructorName] |
| Revisor | [reviewerName] |
| Total de módulos | [N módulos de F2] |
| Duración total del curso | [duracionTotal de F3] |
