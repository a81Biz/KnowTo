---
id: F0
name: Marco de Referencia del Cliente
version: 5.0.0
tags: [certificacion, EC0366, diagnostico, investigacion]
pipeline_steps:
  - agent: extractor
    inputs_from: []
    include_template: false
    task: "Extrae del contexto: projectName, industry, courseTopic, targetAudience, experienceLevel. Devuelve solo esos 5 datos en formato JSON. Nada más."

  - agent: seccion_1
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor]
    include_template: false
    task: |
      Genera ÚNICAMENTE este bloque con el encabezado y las dos tablas exactas:
      ## 1. ANÁLISIS DEL SECTOR/INDUSTRIA
      | Aspecto | Hallazgo | Fuente |
      |:---|:---|:---|
      | Tamaño del mercado | [texto] | [referencia] |
      | Tendencias principales | [texto] | [referencia] |
      | Regulaciones aplicables | [texto] | [referencia] |
      | Certificaciones obligatorias | [texto] | [referencia] |
      ### Desafíos comunes (dolores del sector)
      | Desafío / Dolor | Fuente |
      |:---|:---|
      | [texto] | [referencia] |
      | [texto] | [referencia] |
      | [texto] | [referencia] |
      Rellena con datos reales del sector indicado en el extractor.
      TODAS las filas de la tabla principal DEBEN tener 3 columnas: Aspecto | Hallazgo | Fuente.
      NUNCA dejes la columna Fuente vacía. NO pongas filas con "Sector", "Course Topic" ni "Audiencia".

  - agent: seccion_2
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor]
    include_template: false
    task: |
      Genera ÚNICAMENTE este bloque con el encabezado y la tabla exacta:
      ## 2. MEJORES PRÁCTICAS PARA CURSOS EN LÍNEA EN ESTE SECTOR
      | Práctica | Descripción | Fuente |
      |:---|:---|:---|
      | Formato/duración típica | [texto] | [referencia] |
      | Modalidad predominante | [texto] | [referencia] |
      | Estrategias de enseñanza | [texto] | [referencia] |
      | Nivel de interactividad esperado | [texto] | [referencia] |
      Rellena con datos reales del sector indicado en el extractor.
      En la columna Fuente usa referencias con formato [N] (ej: [1], [2], [3]). Cada fila DEBE tener su [N].
      El título DEBE ser exactamente `## 2. MEJORES PRÁCTICAS PARA CURSOS EN LÍNEA EN ESTE SECTOR`.
      NO uses "Sección 2" ni ninguna otra variante. NO dejes la columna Fuente vacía.

  - agent: seccion_3
    model: "@cf/qwen/qwen2.5-7b-instruct"
    inputs_from: [extractor]
    include_template: false
    task: |
      Genera ÚNICAMENTE este bloque con el encabezado, la tabla y el análisis:
      ## 3. COMPETENCIA IDENTIFICADA
      | Curso | Plataforma | Precio | Alumnos | Duración | Enfoque | Oportunidad |
      |:---|:---|:---|:---|:---|:---|:---|
      | [nombre real] | [plataforma] | [$] | [N] | [hrs] | [texto] | [texto] |
      | [nombre real] | [plataforma] | [$] | [N] | [hrs] | [texto] | [texto] |
      **Análisis de brecha:** [texto sin pipes]
      Rellena con 2 o más competidores reales del sector y curso indicados en el extractor.
      El título DEBE ser exactamente `## 3. COMPETENCIA IDENTIFICADA`. NO uses mayúsculas ni "SECCIÓN".
      La línea **Análisis de brecha:** NO debe tener pipes. Máximo 900 caracteres.

  - agent: seccion_4
    model: "@cf/qwen/qwen2.5-7b-instruct"
    inputs_from: [extractor]
    include_template: false
    task: |
      Genera ÚNICAMENTE este bloque con el encabezado y la tabla exacta:
      ## 4. ESTÁNDARES EC RELACIONADOS (CONOCER)
      | Código | Nombre | Propósito | Aplicabilidad |
      |:---|:---|:---|:---|
      | [ECxxxx] | [nombre] | [texto] | [sí/no/parcial] |
      | [ECxxxx] | [nombre] | [texto] | [sí/no/parcial] |
      Rellena con estándares reales del sector indicado en el extractor.
      En la columna Aplicabilidad usa solo: sí / no / parcial. NO uses "Total", "Parcial" con mayúscula.
      El título DEBE ser exactamente `## 4. ESTÁNDARES EC RELACIONADOS (CONOCER)`. NO uses "### Sección 4".

  - agent: seccion_5_gaps
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor]
    include_template: false
    task: |
      Genera ÚNICAMENTE este bloque con el encabezado de sección y los dos sub-encabezados:
      ## 5. ANÁLISIS DE GAPS INICIALES
      ### Gap vs mejores prácticas
      [1-2 líneas concretas basadas en el sector del extractor]
      ### Gap vs competencia
      [1-2 líneas concretas basadas en el sector del extractor]
      ---
      El título DEBE ser exactamente `## 5. ANÁLISIS DE GAPS INICIALES`.
      Tu output DEBE terminar con la línea `---` (tres guiones solos).
      NO incluyas preguntas. NO uses tablas. Máximo 400 caracteres.

  - agent: seccion_5_preguntas
    model: "@cf/mistral/mistral-7b-instruct-v0.2"
    inputs_from: [extractor]
    max_input_chars: 800
    include_template: false
    task: |
      Genera EXACTAMENTE 9 preguntas para el cliente. Ni 8, ni 10: EXACTAMENTE 9.
      Una pregunta por línea, sin números, sin guiones, sin formato adicional.
      Las preguntas deben cubrir: perfil de ingreso, problemas reales del sector, materiales existentes,
      tiempo disponible, evaluación, brechas de conocimiento, recursos tecnológicos, motivación, entregable.
      Usa el sector y curso del extractor para hacer las preguntas relevantes.
      Antes de responder, cuenta mentalmente que tienes exactamente 9 preguntas.
      Ejemplo de formato correcto (este es el formato, no el contenido):
      ¿Cuál es el nivel educativo mínimo de los participantes?
      ¿Qué errores concretos cometen en su trabajo actualmente?
      ¿Qué materiales de capacitación existen que podamos reutilizar?
      ¿Cuántas horas semanales pueden dedicar al curso?
      ¿Qué herramientas digitales usan cotidianamente?
      ¿Cuál es el mayor obstáculo para aplicar lo aprendido?
      ¿Qué tan familiarizados están con plataformas en línea?
      ¿Qué resultado concreto debe demostrar el participante al terminar?
      ¿Quién toma la decisión de inscripción: el participante o su empresa?
      SOLO escribe las preguntas. Sin títulos, sin secciones, sin explicaciones adicionales.

  - agent: validador_f0
    inputs_from: [seccion_5_preguntas]

  - agent: seccion_6
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor]
    include_template: false
    task: |
      Genera ÚNICAMENTE este bloque con el encabezado y la lista numerada:
      ## 6. RECOMENDACIONES INICIALES
      1. [recomendación concreta]
      2. [recomendación concreta]
      3. [recomendación concreta]
      Usa los datos del extractor para hacer recomendaciones relevantes al sector y curso.
      NO uses tablas. NO uses guiones ni viñetas. Solo lista numerada. Máximo 400 caracteres.
      Tu respuesta DEBE terminar después de la recomendación 3. NO agregues Sección 1, 2, 3 ni ninguna otra sección.

  - agent: seccion_7
    model: "@cf/qwen/qwen2.5-7b-instruct"
    inputs_from: [extractor]
    include_template: false
    task: |
      Genera ÚNICAMENTE este bloque con el encabezado y la lista de referencias.
      Las referencias [1] a [5] deben corresponder a fuentes reales que respalden:
      [1] → fuente sobre tamaño o regulaciones del sector (para Sección 1)
      [2] → fuente sobre mejores prácticas en cursos en línea (para Sección 2)
      [3] → fuente sobre un competidor o plataforma de cursos (para Sección 3)
      [4] → fuente sobre estándares EC / CONOCER (para Sección 4)
      [5] → fuente sobre diseño instruccional o EC0366 (para Sección 5)
      ## 7. REFERENCIAS
      [1] Autor, Año. Título. Editorial/URL.
      [2] Autor, Año. Título. Editorial/URL.
      [3] Autor, Año. Título. Editorial/URL.
      [4] Autor, Año. Título. Editorial/URL.
      [5] Autor, Año. Título. Editorial/URL.
      NO uses negritas ni asteriscos en los números. Formato EXACTO [N] sin paréntesis. Mínimo 5 referencias.
      Tu respuesta DEBE terminar después de [5]. NO agregues Sección 1, 2, 3 ni ningún contenido adicional.

  - agent: ensamblador
    inputs_from: [seccion_1, seccion_2, seccion_3, seccion_4, seccion_5_gaps, seccion_5_preguntas, seccion_6, seccion_7]

---

Actúa como investigador de mercado especializado en EC0366.

## CONTEXTO DEL PROYECTO
{{context}}

## DATOS DE ENTRADA ADICIONALES
{{userInputs}}

## FORMATO DE SALIDA OBLIGATORIO

# MARCO DE REFERENCIA DEL CLIENTE
**Proyecto:** {{projectName}}
**Fecha de investigación:** {{fechaActual}}
**Investigador:** IA (fuentes documentadas)

---

## 1. ANÁLISIS DEL SECTOR/INDUSTRIA

| Aspecto | Hallazgo | Fuente |
|:---|:---|:---|
| Tamaño del mercado | [texto] | [referencia] |
| Tendencias principales | [texto] | [referencia] |
| Regulaciones aplicables | [texto] | [referencia] |
| Certificaciones obligatorias | [texto] | [referencia] |

### Desafíos comunes (dolores del sector)

| Desafío / Dolor | Fuente |
|:---|:---|
| [texto] | [referencia] |
| [texto] | [referencia] |
| [texto] | [referencia] |

---

## 2. MEJORES PRÁCTICAS PARA CURSOS EN LÍNEA EN ESTE SECTOR

| Práctica | Descripción | Fuente |
|:---|:---|:---|
| Formato/duración típica | [texto] | [referencia] |
| Modalidad predominante | [texto] | [referencia] |
| Estrategias de enseñanza | [texto] | [referencia] |
| Nivel de interactividad esperado | [texto] | [referencia] |

---

## 3. COMPETENCIA IDENTIFICADA

| Curso | Plataforma | Precio | Alumnos | Duración | Enfoque | Oportunidad |
|:---|:---|:---|:---|:---|:---|:---|
| [nombre] | [plataforma] | [$] | [N] | [hrs] | [texto] | [texto] |

**Análisis de brecha:** [texto]

---

## 4. ESTÁNDARES EC RELACIONADOS (CONOCER)

| Código | Nombre | Propósito | Aplicabilidad |
|:---|:---|:---|:---|
| [ECxxxx] | [nombre] | [texto] | [sí/no/parcial] |

---

## 5. ANÁLISIS DE GAPS INICIALES

### Gap vs mejores prácticas
[texto]

### Gap vs competencia
[texto]

---

### Preguntas para el cliente (máximo 10)

1. [pregunta]
- **Objetivo:** [texto]
- **Justificación:** [texto]
- **Bibliografía:** [autor, año]

---

## 6. RECOMENDACIONES INICIALES

1. [recomendación]
2. [recomendación]

---

## 7. REFERENCIAS

[1] [fuente]
[2] [fuente]