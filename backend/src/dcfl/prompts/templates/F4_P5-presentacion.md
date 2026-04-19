---
id: F4_P5
name: Producto 5 - Presentación Electrónica EC0366
version: 2.0.0
tags: [EC0366, E1220, produccion, presentacion]
pipeline_steps:
  - agent: extractor_f4_p5
    inputs_from: []
    include_template: false
    task: |
      Extrae del context los siguientes datos y devuélvelos en JSON puro:
      {
        "projectName": string,
        "clientName": string,
        "tituloCurso": string,
        "modulos": [
          {
            "nombre": string,
            "objetivo": string,
            "temas": [string],
            "duracion_horas": number
          }
        ],
        "sector": string,
        "tieneContenidoP4": boolean
      }
      - tituloCurso: de F1 o F2.
      - modulos: estructura temática de F2 con nombre, objetivo y temas por módulo.
      - sector: del contexto del proyecto (F0).
      - tieneContenidoP4: true si previousData contiene F4_P4 (Documentos de Texto), false si no.
      SOLO el JSON. Sin explicaciones.

  - agent: agente_a_p5
    inputs_from: [extractor_f4_p5]
    model: "@cf/meta/llama-3.1-8b-instruct"
    include_template: false
    max_input_chars: 4000
    task: |
      Eres Diseñador Instruccional A. Con EXTRACTOR_F4_P5, genera la ESTRUCTURA COMPLETA DE
      PRESENTACIONES ELECTRÓNICAS para CADA módulo del curso. Para cada módulo, crea una tabla
      con MÍNIMO 10 diapositivas:
      Diap. | Título | Contenido propuesto | Notas del presentador
      Estructura mínima por módulo (en este orden):
      1. Portada del módulo (número, nombre, ícono)
      2. Objetivo del módulo
      3. Agenda del módulo (temas a cubrir)
      4-7. Diapositivas de contenido (una por tema principal)
      8. Ejemplo práctico del sector
      9. Actividad del módulo (instrucciones)
      10. Resumen del módulo (3 puntos clave)
      + Opcional: Recursos adicionales, Vista previa del siguiente módulo
      Las notas del presentador deben ser detalladas (mínimo 2 oraciones por diapositiva).
      Formato Markdown con tabla. Sin placeholders [X].

  - agent: agente_b_p5
    model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
    inputs_from: [extractor_f4_p5]
    include_template: false
    max_input_chars: 4000
    task: |
      Eres Diseñador Instruccional B. Con EXTRACTOR_F4_P5, genera la ESTRUCTURA DE PRESENTACIONES
      para CADA módulo desde una perspectiva diferente. Tu versión incluye:
      - Las mismas 10+ diapositivas con estructura diferente al de A.
      - Enfoque visual: descripción de infografías, diagramas y elementos gráficos sugeridos.
      - Diapositiva de "Caso de estudio" en lugar de "Ejemplo práctico".
      - Diapositiva de "Evaluación formativa rápida" (quiz de 2-3 preguntas al final del módulo).
      - Notas del presentador con preguntas para promover discusión.
      Mínimo 10 diapositivas por módulo. Sin placeholders [X]. Formato Markdown con tabla.

  - agent: juez_p5
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [agente_a_p5, agente_b_p5]
    include_template: false
    max_input_chars: 5000
    task: |
      Compara AGENTE_A_P5 y AGENTE_B_P5. Elige la presentación más completa para EC0366.
      Criterios:
      1. Mínimo 8 filas en la tabla de diapositivas por módulo
      2. Las secciones portada, agenda, objetivo y resumen están presentes en cada módulo
      3. Las notas del presentador son útiles (mínimo una oración por diapositiva)
      4. Sin placeholders [X] en campos de título o contenido
      5. Todos los módulos del extractor están cubiertos
      Devuelve SOLO este JSON:
      {
        "borrador_elegido": "A" | "B",
        "razon": string,
        "campos_faltantes": [string],
        "placeholders_detectados": number
      }
      SOLO el JSON.

  - agent: validador_p5
    inputs_from: [extractor_f4_p5, agente_a_p5, agente_b_p5, juez_p5]

  - agent: sintetizador_final_f4
    inputs_from: [extractor_f4_p5, agente_a_p5, agente_b_p5, juez_p5, validador_p5]
    include_template: true
    max_input_chars: 8000
    task: |
      Toma el borrador elegido por JUEZ_P5 y genera la PRESENTACIÓN ELECTRÓNICA final.
      REGLAS:
      - Cada módulo debe tener mínimo 8 diapositivas con portada, agenda, objetivo y resumen.
      - Elimina placeholders residuales [X].
      - Las notas del presentador deben ser suficientemente detalladas para impartir sin preparación adicional.
      - Añade tabla ESPECIFICACIONES TÉCNICAS al final del documento.
      - Responde SOLO en español. Sigue el FORMATO DE SALIDA OBLIGATORIO.
---

Actúa como un diseñador instruccional certificable en EC0366. Genera ÚNICAMENTE el Producto 5 indicado.

## CONTEXTO ACUMULADO DEL PROYECTO
{{context}}

## DATOS DE ENTRADA DEL USUARIO EN ESTA FASE
{{userInputs}}

## FORMATO DE SALIDA OBLIGATORIO

# PRODUCTO 5: PRESENTACIÓN ELECTRÓNICA
**Elemento EC0366:** E1220 — Producto #4
**Proyecto:** {{projectName}}
**Candidato:** {{clientName}}
**Fecha:** {{fechaActual}}
**Folio:** EC0366-PRES-{{fechaActual}}

---

[Para cada módulo de la estructura temática de F2:]

## MÓDULO [N]: [Nombre del módulo]

| Diap. | Título | Contenido propuesto | Notas del presentador |
|:---:|:---|:---|:---|
| 1 | Portada del módulo | Número y nombre del módulo, ícono o imagen representativa | Bienvenida al módulo. Contextualizar brevemente qué aprenderá el participante. |
| 2 | Objetivo del módulo | "Al finalizar este módulo, el participante..." + objetivo específico | Motivar al alumno, conectar con sus metas profesionales. |
| 3 | Agenda del módulo | Lista de temas que se cubrirán | Dar una hoja de ruta clara. Indicar tiempo estimado por tema. |
| 4 | [Tema 1 del módulo] | Puntos clave en bullets, espacio para imagen o diagrama | Explicación detallada del concepto. Tiempo sugerido: X min. |
| 5 | [Tema 2 del módulo] | Puntos clave, ejemplo visual | Conectar con la experiencia previa del participante. |
| 6 | [Tema 3 del módulo] | Puntos clave | Dar tiempo para preguntas. |
| 7 | Ejemplo práctico | Mini-caso del sector real del proyecto | Preguntar: "¿Han vivido algo similar en su trabajo?" |
| 8 | Actividad del módulo | Instrucciones de la actividad práctica | Asignar tiempo, aclarar criterios de entrega. |
| 9 | Resumen del módulo | Los 3 conceptos más importantes en bullets | Reforzar antes del cierre. Preguntar qué se llevan. |
| 10 | Siguiente módulo | Preview breve del módulo siguiente | Mantener motivación y continuidad del aprendizaje. |

[Repetir la tabla para cada módulo]

---

## ESPECIFICACIONES TÉCNICAS DE LA PRESENTACIÓN

| Parámetro | Recomendación |
|:---|:---|
| Herramienta sugerida | PowerPoint / Google Slides / Canva |
| Formato de exportación | PDF para el LMS / PPTX para edición |
| Resolución | 1920×1080 px (16:9) |
| Tipografía | Sans-serif, mínimo 24pt para cuerpo |
| Número total de diapositivas | [N módulos × 10 diapositivas = N total] |
| Paleta de colores | Colores de la organización o sector |
