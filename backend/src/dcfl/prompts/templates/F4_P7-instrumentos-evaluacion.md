---
id: F4_P7
name: Producto 7 - Instrumentos de Evaluación EC0366
version: 2.0.0
tags: [EC0366, E1220, produccion, evaluacion, rubrica, lista-cotejo]
pipeline_steps:
  - agent: extractor_f4_p7
    inputs_from: []
    include_template: false
    task: |
      Extrae del context los siguientes datos y devuélvelos en JSON puro:
      {
        "projectName": string,
        "clientName": string,
        "tituloCurso": string,
        "objetivosBloom": [{ "objetivo": string, "nivel": string, "tipo": string }],
        "modulos": [{ "nombre": string, "objetivo": string }],
        "criteriosAceptacion": [string],
        "perfilIngreso": string,
        "calificacionMinima": string,
        "actividadPrincipal": string
      }
      - objetivosBloom: lista de objetivos de aprendizaje de F1 con su nivel Bloom y tipo (conocimiento/habilidad/actitud).
      - criteriosAceptacion: de F3 si están disponibles.
      - perfilIngreso: resumen del perfil de ingreso de F2 (para generar preguntas diagnósticas relevantes).
      - calificacionMinima: porcentaje mínimo aprobatorio de F3. Si no está, usa "70%".
      - actividadPrincipal: actividad o proyecto evaluado con rúbrica (del Producto 2 si está disponible, si no infiere del contexto).
      SOLO el JSON. Sin explicaciones.

  - agent: agente_a_p7
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f4_p7]
    include_template: false
    max_input_chars: 4000
    task: |
      Eres Evaluador Instruccional A. Con EXTRACTOR_F4_P7, genera los 3 INSTRUMENTOS DE
      EVALUACIÓN obligatorios EC0366:

      INSTRUMENTO 1 — CUESTIONARIO DIAGNÓSTICO:
      - MÍNIMO 5 preguntas (mix de opción múltiple y verdadero/falso)
      - Todas valen 0 puntos (es diagnóstico, no tiene calificación)
      - Tiempo máximo: 10 minutos
      - Las preguntas deben estar relacionadas con los conocimientos previos del perfilIngreso del extractor
      - Formato tabla: # | Pregunta | Opciones | Respuesta correcta | Puntos

      INSTRUMENTO 2 — RÚBRICA DE EVALUACIÓN:
      - MÍNIMO 4 criterios de evaluación
      - EXACTAMENTE 3 niveles de desempeño: Excelente (100%) | Satisfactorio (70%) | Necesita mejora (50%)
      - La suma de ponderaciones de los criterios = 100%
      - Basada en la actividadPrincipal del extractor
      - Formato tabla: Criterio | Excelente | Satisfactorio | Necesita mejora | Ponderación

      INSTRUMENTO 3 — LISTA DE COTEJO:
      - MÍNIMO 5 criterios verificables y observables (sí/no)
      - Los criterios deben ser binarios y objetivos (no subjetivos)
      - Formato tabla: # | Criterio | Sí cumple | No cumple | Observaciones

      Usa los objetivosBloom del extractor para fundamentar cada criterio.
      Sin placeholders [X]. Formato Markdown.

  - agent: agente_b_p7
    model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
    inputs_from: [extractor_f4_p7]
    include_template: false
    max_input_chars: 4000
    task: |
      Eres Evaluador Instruccional B. Con EXTRACTOR_F4_P7, genera los mismos 3 INSTRUMENTOS
      EC0366 desde una perspectiva diferente:

      INSTRUMENTO 1 — CUESTIONARIO DIAGNÓSTICO:
      - 7 preguntas (mix rico: opción múltiple, verdadero/falso, y al menos 1 de escala Likert)
      - Agrupa las preguntas por dominio: conocimiento conceptual (3), habilidades previas (2), actitud/motivación (2)
      - Incluye instrucciones detalladas para el alumno
      - Todas valen 0 puntos (diagnóstico)

      INSTRUMENTO 2 — RÚBRICA DE EVALUACIÓN:
      - 5 criterios con enfoque en desempeño observable
      - Niveles: Excelente (100%) | Satisfactorio (70%) | Necesita mejora (50%)
      - Incluye descriptor detallado por celda (no solo una palabra)
      - Suma ponderaciones = 100%

      INSTRUMENTO 3 — LISTA DE COTEJO:
      - 7 criterios verificables y específicos
      - Ordenados de menor a mayor complejidad
      - Incluye criterio de "entrega a tiempo"

      Sin placeholders [X]. Formato Markdown.

  - agent: juez_p7
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [agente_a_p7, agente_b_p7]
    include_template: false
    max_input_chars: 5000
    task: |
      Compara AGENTE_A_P7 y AGENTE_B_P7. Elige los instrumentos de evaluación más completos para EC0366.
      Criterios OBLIGATORIOS:
      1. Los 3 instrumentos están presentes: cuestionario diagnóstico, rúbrica y lista de cotejo
      2. Cuestionario tiene mínimo 5 preguntas
      3. Rúbrica tiene mínimo 4 criterios Y exactamente 3 niveles de desempeño
      4. Lista de cotejo tiene mínimo 5 criterios
      5. La rúbrica tiene ponderaciones que suman aproximadamente 100% (rango 95-105%)
      6. Sin placeholders [X] en preguntas, criterios o descripciones
      Devuelve SOLO este JSON:
      {
        "borrador_elegido": "A" | "B",
        "razon": string,
        "campos_faltantes": [string],
        "placeholders_detectados": number
      }
      SOLO el JSON.

  - agent: validador_p7
    inputs_from: [extractor_f4_p7, agente_a_p7, agente_b_p7, juez_p7]

  - agent: sintetizador_final_f4
    inputs_from: [extractor_f4_p7, agente_a_p7, agente_b_p7, juez_p7, validador_p7]
    include_template: true
    max_input_chars: 8000
    task: |
      Toma el borrador elegido por JUEZ_P7 y genera los INSTRUMENTOS DE EVALUACIÓN finales.
      REGLAS CRÍTICAS EC0366:
      - Los 3 instrumentos DEBEN estar presentes: cuestionario diagnóstico, rúbrica, lista de cotejo.
      - Cuestionario: mínimo 5 preguntas, todas con 0 puntos, tiempo máximo 10 min.
      - Rúbrica: mínimo 4 criterios, exactamente 3 niveles (Excelente/Satisfactorio/Necesita mejora), suma = 100%.
      - Lista de cotejo: mínimo 5 criterios binarios (sí cumple / no cumple).
      - Elimina cualquier placeholder [X].
      - Usa calificacionMinima del extractor como umbral aprobatorio.
      - Responde SOLO en español. Sigue el FORMATO DE SALIDA OBLIGATORIO.
---

Actúa como un diseñador instruccional certificable en EC0366. Genera ÚNICAMENTE el Producto 7 indicado.

## CONTEXTO ACUMULADO DEL PROYECTO
{{context}}

## DATOS DE ENTRADA DEL USUARIO EN ESTA FASE
{{userInputs}}

## FORMATO DE SALIDA OBLIGATORIO

# PRODUCTO 7: INSTRUMENTOS DE EVALUACIÓN
**Elemento EC0366:** E1220 — Producto #6
**Proyecto:** {{projectName}}
**Candidato:** {{clientName}}
**Fecha:** {{fechaActual}}
**Folio:** EC0366-EVAL-{{fechaActual}}

---

## 7.1 CUESTIONARIO DIAGNÓSTICO
**Propósito:** Identificar conocimientos previos del participante. No tiene impacto en calificación.
**Instrucciones para el alumno:** Selecciona la respuesta que mejor describa tu conocimiento o experiencia. Este cuestionario es anónimo y no afecta tu calificación. Tiempo estimado: 10 minutos.

| # | Pregunta | Opciones | Respuesta correcta | Puntos |
|:---:|:---|:---|:---:|:---:|
| 1 | [Pregunta sobre conocimiento conceptual previo relacionado con el perfil de ingreso F2] | a) [opción] b) [opción] c) [opción] d) [opción] | [letra] | 0 |
| 2 | [Pregunta sobre habilidad previa requerida en F2] | a) [opción] b) [opción] c) [opción] d) [opción] | [letra] | 0 |
| 3 | [Pregunta de Verdadero/Falso sobre el tema del curso] | Verdadero / Falso | [V/F] | 0 |
| 4 | [Pregunta sobre experiencia práctica previa con el tema] | a) [opción] b) [opción] c) [opción] d) [opción] | [letra] | 0 |
| 5 | [Pregunta de autoevaluación del nivel de dominio] | a) Ninguno b) Básico c) Intermedio d) Avanzado | [según contexto] | 0 |

---

## 7.2 RÚBRICA DE EVALUACIÓN
**Actividad evaluada:** [actividadPrincipal del curso — del contexto de actividades]
**Instrucciones:** Esta rúbrica evalúa [actividad principal]. Se requiere un mínimo de [calificacionMinima] para aprobar.

| Criterio | Excelente (100%) | Satisfactorio (70%) | Necesita mejora (50%) | Ponderación |
|:---|:---|:---|:---|:---:|
| [Criterio 1 — técnico basado en objetivos Bloom] | [Descripción detallada del desempeño excelente] | [Descripción del desempeño aceptable] | [Descripción del desempeño insuficiente] | [%] |
| [Criterio 2 — calidad o precisión] | [Descripción detallada] | [Descripción] | [Descripción] | [%] |
| [Criterio 3 — aplicación práctica] | [Descripción detallada] | [Descripción] | [Descripción] | [%] |
| [Criterio 4 — presentación o formato] | [Descripción detallada] | [Descripción] | [Descripción] | [%] |
| **TOTAL** | | | | **100%** |

**Calificación mínima aprobatoria:** [calificacionMinima]

---

## 7.3 LISTA DE COTEJO
**Evidencia evaluada:** [entregable concreto del alumno — del contexto de actividades]
**Instrucciones:** Marcar con ✓ cada criterio que el alumno cumple satisfactoriamente.

| # | Criterio observable y verificable | Sí cumple | No cumple | Observaciones |
|:---:|:---|:---:|:---:|:---|
| 1 | [Criterio binario 1 — específico y verificable, basado en objetivos F1] | ☐ | ☐ | |
| 2 | [Criterio binario 2] | ☐ | ☐ | |
| 3 | [Criterio binario 3] | ☐ | ☐ | |
| 4 | [Criterio binario 4] | ☐ | ☐ | |
| 5 | [Criterio binario 5] | ☐ | ☐ | |

**Resultado:** ___/5 criterios cumplidos.
**Decisión:** ☐ Aprobado (4–5 criterios) ☐ No aprobado (menos de 4 criterios)

**Evaluador:** _________________________
**Fecha de evaluación:** _________________________
