---
id: F4_P0
name: Producto 0 - Cronograma de Desarrollo EC0366
version: 2.0.0
tags: [EC0366, E1219, produccion, cronograma]
pipeline_steps:
  - agent: extractor
    task: "Extrae: nombre del proyecto, clientName, estructura temática de F2, duración total de F3, tipos de multimedia de F3, startDate/instructorName/reviewerName de userInputs si existen."
  - agent: specialist_a
    model: "@cf/meta/llama-3.1-8b-instruct"
    task: "Redacta la tabla maestra del cronograma por fases (Diseño instruccional, Producción, Integración LMS, Revisión) con: actividad, responsable, duración, fechas inicio/fin y entregable. Calcula fechas desde startDate o 'Semana 1'."
  - agent: specialist_b
    model: "@cf/qwen/qwen2.5-7b-instruct"
    task: "Redacta: asignación de recursos por fase, estimación de esfuerzo total en horas-persona, 3-5 riesgos con plan de mitigación, dependencias críticas y criterios de aceptación por entregable."
  - agent: synthesizer
    model: "@cf/mistral/mistral-7b-instruct-v0.2"
    task: "Combina A y B en el Producto 0 completo: encabezado, tabla del cronograma, hitos clave, recursos, riesgos y criterios de aceptación."
  - agent: judge
    rules:
      - "La tabla del cronograma tiene columnas: Fase | Actividad | Responsable | Duración | Fecha inicio | Fecha fin | Entregable."
      - "instructorName y reviewerName deben aparecer tal como los proporcionó el usuario."
      - "Reemplaza cualquier placeholder [X] con datos reales o '[Por definir]'."
      - "Devuelve el documento completo en Markdown válido."
---

Actúa como un diseñador instruccional certificable en EC0366. Genera ÚNICAMENTE el Producto 0 indicado.

## CONTEXTO ACUMULADO DEL PROYECTO
{{context}}

## DATOS DE ENTRADA DEL USUARIO EN ESTA FASE
{{userInputs}}

## INSTRUCCIÓN
Genera SOLO el CRONOGRAMA DE DESARROLLO (Producto 0 / E1219 - producto #1). No generes ningún otro producto.

Usa los datos del contexto: nombre del proyecto, clientName, estructura temática de F2, especificaciones técnicas de F3.
Si el usuario proporcionó `startDate` en userInputs, úsala como fecha de inicio del cronograma.
Si proporcionó `instructorName`, úsalo como nombre del desarrollador.
Si proporcionó `reviewerName`, úsalo como revisor.

## FORMATO DE SALIDA OBLIGATORIO

# PRODUCTO 0: CRONOGRAMA DE DESARROLLO
**Elemento EC0366:** E1219 — Producto #1
**Proyecto:** {{projectName}}
**Candidato:** {{clientName}}
**Fecha de elaboración:** {{fechaActual}}
**Folio:** EC0366-CRON-[año][4 dígitos]

---

**Curso:** [título del curso del contexto]
**Desarrollador:** [instructorName o clientName]
**Objetivo general:** [del contexto F2/F1]
**Fecha de inicio:** [startDate de userInputs o fecha actual]

| # | Actividad | Duración estimada | Fecha inicio | Fecha fin | Responsable |
|:---|:---|:---|:---|:---|:---|
| 1 | Elaborar estructura temática del curso | [N días] | [fecha] | [fecha] | [nombre] |
| 2 | Desarrollar documento de información general | [N días] | [fecha] | [fecha] | [nombre] |
| 3 | Diseñar guías de actividades por módulo | [N días] | [fecha] | [fecha] | [nombre] |
| 4 | Elaborar calendario general de actividades | [N días] | [fecha] | [fecha] | [nombre] |
| 5 | Desarrollar documentos de texto (contenido) | [N días] | [fecha] | [fecha] | [nombre] |
| 6 | Crear presentación electrónica | [N días] | [fecha] | [fecha] | [nombre] |
| 7 | Producir material multimedia (guión de video) | [N días] | [fecha] | [fecha] | [nombre] |
| 8 | Diseñar instrumentos de evaluación | [N días] | [fecha] | [fecha] | [nombre] |
| 9 | Configurar curso en plataforma LMS | [N días] | [fecha] | [fecha] | [nombre] |
| 10 | Verificar funcionamiento técnico y publicar | [N días] | [fecha] | [fecha] | [nombre] |
| **TOTAL** | | **[N días totales]** | [fecha inicio] | [fecha fin] | |

**Firmas:**

| Rol | Nombre | Firma | Fecha |
|:---|:---|:---|:---|
| Elaboró | [instructorName o clientName] | _________________ | [fecha] |
| Revisó | [reviewerName o "Por designar"] | _________________ | [fecha] |

## INSTRUCCIONES DE CALIDAD
- Las fechas deben ser consecuentes (una actividad termina antes de que empiece la siguiente).
- Estima duraciones realistas según la complejidad del curso definida en el contexto.
- Responde SOLO en español. Genera únicamente este producto, sin preámbulos.
