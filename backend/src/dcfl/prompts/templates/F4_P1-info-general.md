---
id: F4_P1
name: Producto 1 - Documento de Información General EC0366
version: 2.0.0
tags: [EC0366, E1219, produccion, informacion-general]
pipeline_steps:
  - agent: extractor_f4_p1
    inputs_from: []
    include_template: false
    task: |
      Extrae del context los siguientes datos y devuélvelos en JSON puro:
      {
        "projectName": string,
        "clientName": string,
        "tituloCurso": string,
        "objetivoGeneral": string,
        "objetivosParticulares": { "cognitivo": string, "psicomotriz": string, "afectivo": string },
        "perfilIngreso": string,
        "perfilEgreso": string,
        "modalidad": string,
        "plataforma": string,
        "scormVersion": string,
        "duracionTotal": string,
        "arquitecturaEvaluacion": string,
        "nivelesInteractividad": string,
        "industria": string
      }
      - tituloCurso: del contexto de F1 o F2.
      - objetivoGeneral: objetivo principal de F1.
      - objetivosParticulares: de F1 — uno cognitivo (conocimiento), uno psicomotriz (habilidad), uno afectivo (actitud).
        Si solo hay objetivos generales, infiere los tres dominios a partir de ellos.
      - perfilIngreso/Egreso: de F2.
      - plataforma, scormVersion, duracionTotal, arquitecturaEvaluacion: de F3.
      - nivelesInteractividad: nivel de interactividad SCORM de F2 (Nivel 1/2/3/4).
      SOLO el JSON. Sin explicaciones.

  - agent: agente_a_p1
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f4_p1]
    include_template: false
    max_input_chars: 3500
    task: |
      Eres Diseñador Instruccional A. Con EXTRACTOR_F4_P1, redacta el DOCUMENTO DE INFORMACIÓN
      GENERAL completo del curso. Debe incluir TODAS las secciones EC0366:
      1.1 Título del curso — usar tituloCurso exacto
      1.2 Objetivo general — con verbos Bloom cognitivo, psicomotriz y afectivo
      1.3 Objetivos particulares — 3 dominios (cognitivo / psicomotriz / afectivo)
      1.4 Perfil de ingreso — escolaridad, conocimientos previos, habilidades, equipo, conectividad
      1.5 Perfil de egreso — 3 competencias medibles al concluir el curso
      1.6 Introducción al curso — 2-3 párrafos: relevancia, problema que resuelve, estructura
      1.7 Guía visual de navegación — cómo navegar en la plataforma indicada
      1.8 Metodología de trabajo — cómo se enseña, cómo trabaja el participante, cómo se logra el aprendizaje
      1.9 Requisitos tecnológicos — tabla con hardware, software, conectividad, dispositivos
      1.10 Forma de evaluación — tabla con tipos (diagnóstica 0%, formativa %, sumativa %)
      1.11 Duración del curso — horas totales, semanas, distribución semanal
      Formato Markdown con encabezados ##. Sin placeholders genéricos [X]. Usa datos reales del extractor.

  - agent: agente_b_p1
    model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
    inputs_from: [extractor_f4_p1]
    include_template: false
    max_input_chars: 3500
    task: |
      Eres Diseñador Instruccional B. Con EXTRACTOR_F4_P1, redacta el DOCUMENTO DE INFORMACIÓN
      GENERAL del curso desde una perspectiva diferente a A. Incluye las mismas 11 secciones EC0366
      pero con mayor énfasis en:
      - Conectar cada objetivo con los niveles de la taxonomía de Bloom explícitamente
      - Describir la metodología con ejemplos concretos de actividades del curso
      - Detallar los requisitos técnicos con especificaciones precisas (versiones de software, velocidad mínima de internet)
      - Explicar la forma de evaluación con criterios de calificación mínima aprobatoria
      Los tres dominios de Bloom (cognitivo, psicomotriz, afectivo) DEBEN estar presentes en 1.2 y 1.3.
      Formato Markdown con encabezados ##. Sin placeholders [X]. Usa datos reales del extractor.

  - agent: juez_p1
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [agente_a_p1, agente_b_p1]
    include_template: false
    max_input_chars: 5000
    task: |
      Compara AGENTE_A_P1 y AGENTE_B_P1. Evalúa cuál es más completo para EC0366.
      Criterios:
      1. Los 3 dominios de Bloom están explícitos: cognitivo, psicomotriz, afectivo
      2. Las 11 secciones (1.1 a 1.11) están presentes
      3. No hay placeholders [X] ni texto genérico como "[texto]"
      4. El perfil de ingreso tiene al menos 4 categorías (escolaridad, conocimientos, habilidades, equipo)
      Devuelve SOLO este JSON:
      {
        "borrador_elegido": "A" | "B",
        "razon": string,
        "campos_faltantes": [string],
        "placeholders_detectados": number
      }
      SOLO el JSON.

  - agent: validador_p1
    inputs_from: [extractor_f4_p1, agente_a_p1, agente_b_p1, juez_p1]

  - agent: sintetizador_final_f4
    inputs_from: [extractor_f4_p1, agente_a_p1, agente_b_p1, juez_p1, validador_p1]
    include_template: true
    max_input_chars: 7000
    task: |
      Toma el borrador elegido por JUEZ_P1 y genera el DOCUMENTO DE INFORMACIÓN GENERAL final.
      REGLAS CRÍTICAS:
      - Los 3 dominios de Bloom (cognitivo, psicomotriz, afectivo) DEBEN estar presentes y etiquetados.
      - Todas las 11 secciones (1.1 a 1.11) deben estar completas.
      - Reemplaza cualquier placeholder [X] con datos del EXTRACTOR_F4_P1.
      - Usa el tituloCurso, plataforma, duracionTotal exactamente como vienen del extractor.
      - Responde SOLO en español. Sigue el FORMATO DE SALIDA OBLIGATORIO.
---

Actúa como un diseñador instruccional certificable en EC0366. Genera ÚNICAMENTE el Producto 1 indicado.

## CONTEXTO ACUMULADO DEL PROYECTO
{{context}}

## DATOS DE ENTRADA DEL USUARIO EN ESTA FASE
{{userInputs}}

## FORMATO DE SALIDA OBLIGATORIO

# PRODUCTO 1: DOCUMENTO DE INFORMACIÓN GENERAL
**Elemento EC0366:** E1219 — Producto #2
**Proyecto:** {{projectName}}
**Candidato:** {{clientName}}
**Fecha:** {{fechaActual}}
**Folio:** EC0366-INFO-{{fechaActual}}

---

## 1.1 Título del curso
[Título completo y descriptivo extraído del contexto]

## 1.2 Objetivo general del curso
El participante, al terminar el curso, **[verbo cognitivo Bloom]** [conocimiento/habilidad principal], **[verbo psicomotor]** [habilidad práctica], y **[verbo afectivo]** [actitud/valor], con la finalidad de [beneficio concreto y medible extraído de F1].

## 1.3 Objetivos particulares
- **Cognitivo:** [verbo Bloom cognitivo] [qué conocimiento] a través de [medio instruccional]
- **Psicomotriz:** [verbo Bloom psicomotriz] [qué habilidad práctica] mediante [actividad práctica]
- **Afectivo:** [verbo Bloom afectivo] [qué actitud o valor] durante [actividad o momento del curso]

## 1.4 Perfil de ingreso

| Característica | Requisito |
|:---|:---|
| Escolaridad mínima | [del perfil de ingreso F2] |
| Conocimientos previos | [del perfil de ingreso F2] |
| Habilidades digitales | [del perfil de ingreso F2] |
| Equipo requerido | [del perfil de ingreso F2] |
| Conectividad | [del perfil de ingreso F2] |

## 1.5 Perfil de egreso
Al terminar el curso, el participante será capaz de:
1. [Competencia 1 — del contexto F1, medible y observable]
2. [Competencia 2 — del contexto F1]
3. [Competencia 3 — del contexto F1]

## 1.6 Introducción al curso
[2–3 párrafos que contextualizan el curso: relevancia del tema para el sector indicado, qué problema resuelve, cómo está estructurado. Basarse en el sector/industria del proyecto.]

## 1.7 Guía visual de navegación
[Descripción de cómo está organizado el curso: progresión de módulos, cómo acceder a actividades, iconografía. Adaptar al LMS indicado en F3.]

## 1.8 Metodología de trabajo
**A. Cómo se va a enseñar:** [técnicas instruccionales según nivel de interactividad de F2]
**B. Cómo se trabaja con el participante:** [rol del instructor según modalidad de F2]
**C. Cómo se logra el aprendizaje:** [práctica, demostración, retroalimentación según actividades de F2_5]

## 1.9 Requisitos tecnológicos

| Requisito | Especificación |
|:---|:---|
| Hardware | [del perfil de ingreso F2] |
| Software | [del perfil de ingreso F2] |
| Conectividad | [del perfil de ingreso F2] |
| Dispositivos soportados | [PC / tablet / móvil — del contexto F3] |
| Versión SCORM | [de F3] |

## 1.10 Forma de evaluación

| Tipo | Peso | Descripción |
|:---|:---|:---|
| Diagnóstica | 0% | Cuestionario de conocimientos previos — sin impacto en calificación |
| Formativa | [%] | [del contexto F3 — actividades y tareas con retroalimentación] |
| Sumativa | [%] | [del contexto F3 — proyecto final o evaluación integradora] |
| **Calificación mínima aprobatoria** | **[%]** | [del contexto F3] |

## 1.11 Duración del curso

| Dato | Valor |
|:---|:---|
| Horas totales | [de F3] |
| Número de semanas | [calculado] |
| Distribución semanal | [N horas/semana aproximadas] |
| Modalidad | [de F2 — asíncrona/síncrona/blended] |
