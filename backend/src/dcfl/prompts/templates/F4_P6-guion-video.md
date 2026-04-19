---
id: F4_P6
name: Producto 6 - Guiones de Material Multimedia EC0366
version: 2.0.0
tags: [EC0366, E1220, produccion, multimedia, guion-video]
pipeline_steps:
  - agent: extractor_f4_p6
    inputs_from: []
    include_template: false
    task: |
      Extrae del context y userInputs los siguientes datos y devuélvelos en JSON puro:
      {
        "projectName": string,
        "clientName": string,
        "tituloCurso": string,
        "instructorName": string,
        "numVideos": number,
        "duracionVideo": number,
        "estiloVideo": string,
        "modulos": [
          { "nombre": string, "objetivo": string, "tema_principal": string }
        ],
        "plataforma": string,
        "sector": string
      }
      - numVideos: de F2.5 (total_videos). Si no está disponible, usa número de módulos + 1.
      - duracionVideo: de F2.5 (duracion_promedio_minutos). Si no está, usa 6.
      - estiloVideo: de F2.5 (estilo de producción recomendado). Si no está, usa "Screencast con narración".
      - instructorName: de userInputs. Si no existe, usa "Instructor del curso".
      - modulos: de F2 — nombre, objetivo y tema principal de cada módulo.
      - plataforma: de F3 (LMS). sector: de F0.
      SOLO el JSON. Sin explicaciones.

  - agent: agente_a_p6
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f4_p6]
    include_template: false
    max_input_chars: 4000
    task: |
      Eres Guionista Instruccional A. Con EXTRACTOR_F4_P6, genera los GUIONES DE VIDEO para
      el CURSO. Genera OBLIGATORIAMENTE:
      1. VIDEO DE INTRODUCCIÓN AL CURSO (siempre, duración 2-3 min)
      2. VIDEO DEL MÓDULO 1 (tema principal del primer módulo, duración = duracionVideo del extractor)
      Si numVideos > 2, agrega video para el módulo 2.
      Por cada video, genera la tabla completa:
      Tiempo | Vista/Plano | Acción en pantalla | Diálogo / Narración
      El diálogo debe estar escrito tal como se dice (no en puntos). Usa instructorName del extractor.
      Las acciones en pantalla deben ser detalladas para que el candidato pueda grabar sin ambigüedad.
      Al final de cada guión: sección RECURSOS TÉCNICOS (software, resolución, micrófono, fondo).
      Formato Markdown. Sin placeholders [X].

  - agent: agente_b_p6
    model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
    inputs_from: [extractor_f4_p6]
    include_template: false
    max_input_chars: 4000
    task: |
      Eres Guionista Instruccional B. Con EXTRACTOR_F4_P6, genera los MISMOS GUIONES DE VIDEO
      (video de introducción + módulo 1, y módulo 2 si numVideos > 2) pero con estilo diferente:
      - Introducción más dinámica: el instructor presenta el problema antes de presentarse.
      - Más interacción en pantalla (screencast con anotaciones, zoom en conceptos clave).
      - Incluye segmento "Actividad del video" (instrucción al final de cada video para que el participante haga algo).
      - Usa timecodes más detallados (cada 15-30 segundos).
      El diálogo debe estar escrito tal como se dice. Sin placeholders [X].
      Incluye RECURSOS TÉCNICOS al final de cada guión.

  - agent: juez_p6
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [agente_a_p6, agente_b_p6]
    include_template: false
    max_input_chars: 5000
    task: |
      Compara AGENTE_A_P6 y AGENTE_B_P6. Elige los guiones más completos para EC0366.
      Criterios:
      1. El video de introducción está presente (con sección ## VIDEO 1 o ## VIDEO DE INTRODUCCIÓN)
      2. Al menos un video de módulo está presente
      3. El diálogo está escrito de forma continua (no en bullets/puntos)
      4. Las acciones en pantalla son concretas y ejecutables
      5. Sin placeholders [X] en diálogo o acciones
      Devuelve SOLO este JSON:
      {
        "borrador_elegido": "A" | "B",
        "razon": string,
        "campos_faltantes": [string],
        "placeholders_detectados": number
      }
      SOLO el JSON.

  - agent: validador_p6
    inputs_from: [extractor_f4_p6, agente_a_p6, agente_b_p6, juez_p6]

  - agent: sintetizador_final_f4
    inputs_from: [extractor_f4_p6, agente_a_p6, agente_b_p6, juez_p6, validador_p6]
    include_template: true
    max_input_chars: 8000
    task: |
      Toma el borrador elegido por JUEZ_P6 y genera los GUIONES DE MATERIAL MULTIMEDIA finales.
      REGLAS:
      - El video de introducción y al menos un video de módulo DEBEN estar presentes.
      - El diálogo debe estar escrito tal como se habla (no en puntos).
      - Elimina placeholders residuales [X].
      - Usa instructorName del extractor en el diálogo de bienvenida.
      - Incluye tabla RESUMEN DE VIDEOS AL FINAL.
      - Responde SOLO en español. Sigue el FORMATO DE SALIDA OBLIGATORIO.
---

Actúa como un diseñador instruccional certificable en EC0366. Genera ÚNICAMENTE el Producto 6 indicado.

## CONTEXTO ACUMULADO DEL PROYECTO
{{context}}

## DATOS DE ENTRADA DEL USUARIO EN ESTA FASE
{{userInputs}}

## FORMATO DE SALIDA OBLIGATORIO

# PRODUCTO 6: GUIONES DE MATERIAL MULTIMEDIA
**Elemento EC0366:** E1220 — Producto #5
**Proyecto:** {{projectName}}
**Candidato:** {{clientName}}
**Fecha:** {{fechaActual}}
**Folio:** EC0366-VIDEO-{{fechaActual}}

---

## VIDEO 1: Introducción al Curso — [Título del curso]
**Duración estimada:** [2-3] minutos
**Objetivo:** Que el participante comprenda qué aprenderá, cómo está estructurado el curso y qué necesita para empezar.
**Tipo de producción:** [estiloVideo del extractor]

| Tiempo | Vista/Plano | Acción en pantalla | Diálogo / Narración |
|:---|:---|:---|:---|
| 0:00 – 0:10 | Pantalla de título | Animación del logo y título del curso | [Música de introducción — sin narración] |
| 0:10 – 0:30 | Plano medio | Instructor frente a cámara | "Bienvenido/a a [título del curso]. Mi nombre es [instructorName] y seré tu guía en este proceso de aprendizaje." |
| 0:30 – 1:00 | Pantalla con bullets | Lista de lo que aprenderá el alumno | "En este curso aprenderás a: [objetivo 1 de Bloom], [objetivo 2], [objetivo 3]." |
| 1:00 – 1:30 | Screencast del LMS | Navegación por la plataforma | "El curso está organizado en [N] módulos. Aquí puedes ver cómo navegar en la plataforma [nombre LMS]..." |
| 1:30 – 2:00 | Plano medio / cierre | Instructor o pantalla de cierre | "¡Comencemos! El primer módulo ya está disponible. Te espero adentro." |

**Recursos técnicos:**
- Software de grabación: Loom / Camtasia / OBS
- Resolución: 1920×1080 (Full HD)
- Micrófono externo recomendado
- Fondo: neutro o de marca

---

## VIDEO 2: [Tema principal del Módulo 1]
**Duración estimada:** [duracionVideo] minutos
**Objetivo:** [Objetivo específico del tema — del contexto F2]
**Tipo de producción:** [estiloVideo del extractor]

| Tiempo | Vista/Plano | Acción en pantalla | Diálogo / Narración |
|:---|:---|:---|:---|
| 0:00 – 0:20 | Pantalla de título | Número de módulo y tema | "En este video veremos [tema principal del Módulo 1]. Al terminar podrás [verbo Bloom + resultado medible]." |
| 0:20 – 1:30 | Screencast / Diapositiva | Explicación del concepto principal | "[Narración del concepto con ejemplos del sector del proyecto]" |
| 1:30 – 3:00 | Demostración práctica | Ejemplo paso a paso | "[Narración guiando cada paso: 'Ahora vemos...', 'Observa que...']" |
| 3:00 – 3:30 | Diapositiva resumen | Los 3 puntos clave del video | "Recuerda los puntos clave: [punto 1], [punto 2], [punto 3]." |
| 3:30 – [duracionVideo]:00 | Pantalla de actividad | Instrucción de la actividad | "Tu actividad para este tema es: [instrucción breve]. La encontrarás en la plataforma." |

**Recursos técnicos:**
- Software: Loom / Camtasia / OBS
- Resolución: 1920×1080
- Música instrumental suave de fondo (opcional)

---

## RESUMEN DE VIDEOS DEL CURSO

| # | Título del video | Tipo | Módulo | Duración estimada |
|:---:|:---|:---|:---|:---:|
| 1 | Introducción al curso | Bienvenida | General | 2-3 min |
| 2 | [Tema principal Módulo 1] | Microlearning | Módulo 1 | [duracionVideo] min |
| [N] | [Tema adicional] | Microlearning | [módulo] | [duracionVideo] min |
| **Total** | | | | **[N × duracionVideo] min aprox.** |
