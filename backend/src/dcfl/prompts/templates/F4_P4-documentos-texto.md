---
id: F4_P4
name: Producto 4 - Documentos de Texto EC0366
version: 2.0.0
tags: [EC0366, E1220, produccion, contenido-textual]
pipeline_steps:
  - agent: extractor_f4_p4
    inputs_from: []
    include_template: false
    task: |
      Extrae del context los siguientes datos y devuélvelos en JSON puro:
      {
        "projectName": string,
        "clientName": string,
        "sector": string,
        "industria": string,
        "tituloCurso": string,
        "modulos": [
          {
            "nombre": string,
            "temas_principales": [string],
            "objetivo": string
          }
        ],
        "objetivosBloom": [string],
        "nivelParticipante": string
      }
      - sector, industria: del contexto del proyecto (F0).
      - tituloCurso: de F1 o F2.
      - modulos: estructura temática de F2 — nombre del módulo, temas principales y objetivo.
      - objetivosBloom: objetivos de aprendizaje de F1 (listados).
      - nivelParticipante: escolaridad/nivel del perfil de ingreso de F2.
      SOLO el JSON. Sin explicaciones.

  - agent: agente_a_p4
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f4_p4]
    include_template: false
    max_input_chars: 4000
    task: |
      Eres Redactor de Contenido Instruccional A. Con EXTRACTOR_F4_P4, genera los DOCUMENTOS DE
      TEXTO para los 2 primeros módulos del curso. Para CADA módulo desarrolla:
      - Introducción (2-3 párrafos): qué es el tema, por qué es relevante para el sector indicado,
        cómo se relaciona con el objetivo del curso.
      - Desarrollo con 3 subtemas (explicación detallada + ejemplo práctico del sector).
      - Conceptos clave (mínimo 3 términos con definición aplicada al sector).
      - Ejemplo práctico aplicado: mini-caso del sector real del proyecto (3-5 párrafos).
      - Puntos para recordar: 3-5 puntos clave del tema.
      El contenido debe tener MÍNIMO 600 palabras por módulo.
      Usa lenguaje apropiado para el nivelParticipante del extractor.
      Formato Markdown con encabezados ###. Sin placeholders [X].

  - agent: agente_b_p4
    model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
    inputs_from: [extractor_f4_p4]
    include_template: false
    max_input_chars: 4000
    task: |
      Eres Redactor de Contenido Instruccional B. Con EXTRACTOR_F4_P4, genera los DOCUMENTOS DE
      TEXTO para los MISMOS módulos que A pero con enfoque diferente:
      - Mayor énfasis en casos de uso reales y estadísticas del sector.
      - Incluye preguntas de reflexión al final de cada subtema.
      - Añade sección "¿Sabías que...?" con dato relevante del sector.
      - Incluye referencias o fuentes (reales o representativas del sector).
      - MÍNIMO 700 palabras por módulo.
      Usa lenguaje técnico pero accesible para el nivelParticipante del extractor.
      Formato Markdown con encabezados ###. Sin placeholders [X].

  - agent: juez_p4
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [agente_a_p4, agente_b_p4]
    include_template: false
    max_input_chars: 5000
    task: |
      Compara AGENTE_A_P4 y AGENTE_B_P4. Elige el documento de texto más completo para EC0366.
      Criterios:
      1. Mínimo 500 palabras por módulo desarrollado
      2. Incluye introducción, desarrollo, conceptos clave, ejemplo práctico y puntos de recordatorio
      3. El contenido está alineado al sector/industria del proyecto (no genérico)
      4. Sin placeholders [X] ni contenido inventado fuera del dominio
      5. Usa lenguaje apropiado para el perfil del participante
      Devuelve SOLO este JSON:
      {
        "borrador_elegido": "A" | "B",
        "razon": string,
        "campos_faltantes": [string],
        "placeholders_detectados": number
      }
      SOLO el JSON.

  - agent: validador_p4
    inputs_from: [extractor_f4_p4, agente_a_p4, agente_b_p4, juez_p4]

  - agent: sintetizador_final_f4
    inputs_from: [extractor_f4_p4, agente_a_p4, agente_b_p4, juez_p4, validador_p4]
    include_template: true
    max_input_chars: 8000
    task: |
      Toma el borrador elegido por JUEZ_P4 y genera los DOCUMENTOS DE TEXTO finales.
      REGLAS:
      - El contenido debe estar alineado con el sector/industria real del EXTRACTOR_F4_P4.
      - Elimina cualquier placeholder [X] o contenido genérico.
      - Verifica que cada módulo tiene mínimo 500 palabras.
      - Los ejemplos prácticos deben ser del sector/industria específico del proyecto.
      - Responde SOLO en español. Sigue el FORMATO DE SALIDA OBLIGATORIO.
---

Actúa como un diseñador instruccional certificable en EC0366. Genera ÚNICAMENTE el Producto 4 indicado.

## CONTEXTO ACUMULADO DEL PROYECTO
{{context}}

## DATOS DE ENTRADA DEL USUARIO EN ESTA FASE
{{userInputs}}

## FORMATO DE SALIDA OBLIGATORIO

# PRODUCTO 4: DOCUMENTOS DE TEXTO
**Elemento EC0366:** E1220 — Producto #3
**Proyecto:** {{projectName}}
**Candidato:** {{clientName}}
**Fecha:** {{fechaActual}}
**Folio:** EC0366-DOC-{{fechaActual}}

---

[Para cada módulo principal del curso (mínimo 2):]

## MÓDULO [N]: [Nombre del módulo — de la estructura temática de F2]

### Introducción
[2–3 párrafos de introducción: qué es el tema, por qué es relevante para el sector indicado, cómo se relaciona con el objetivo del curso.]

### Desarrollo

#### [Subtema N.1]
[Explicación detallada con ejemplos del sector.]

> **Pregunta de reflexión:** ¿Cómo se aplica este concepto en tu contexto laboral actual?

#### [Subtema N.2]
[Explicación detallada con ejemplos del sector.]

#### [Subtema N.3]
[Explicación detallada con ejemplos del sector.]

### Conceptos clave
- **[Término 1]:** [definición precisa aplicada al sector]
- **[Término 2]:** [definición]
- **[Término 3]:** [definición]

### Ejemplo práctico aplicado
[Caso de uso real del sector/industria del cliente. Relatado como mini-caso de 3-5 párrafos. Debe ser concreto y específico del dominio del curso.]

### Puntos para recordar
1. [Punto clave 1 — resumen del concepto más importante]
2. [Punto clave 2]
3. [Punto clave 3]

---

[Repetir la estructura para cada módulo principal]
