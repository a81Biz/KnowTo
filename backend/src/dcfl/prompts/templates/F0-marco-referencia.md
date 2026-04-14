---
id: F0
name: Marco de Referencia del Cliente
version: 2.0.0
tags: [certificacion, EC0366, diagnostico, investigacion]
pipeline_steps:
  - agent: extractor
    task: "Extrae del contexto del cliente: nombre del proyecto, sector/industria, tema del curso, audiencia objetivo e información existente relevante para la investigación."
  - agent: specialist_a
    model: "@cf/meta/llama-3.1-8b-instruct"
    task: "Redacta las secciones 1 a 4: análisis del sector, mejores prácticas para cursos en línea en este sector, competencia identificada y estándares EC relacionados del CONOCER. Usa el formato de tabla de la plantilla."
  - agent: specialist_b
    model: "@cf/qwen/qwen2.5-7b-instruct"
    task: "Redacta la sección 5 (Análisis de Gaps) con tres subsecciones OBLIGATORIAS en este orden: '### Gap vs mejores prácticas', '### Gap vs competencia', y tras un separador ---, '### Preguntas para el cliente (máximo 10)'. Genera MÍNIMO 5 preguntas de diagnóstico instruccional con formato: **[N]. [Texto]** / - **Objetivo:** / - **Justificación:** / - **Bibliografía:**. Redacta también la sección 6 (Recomendaciones)."
  - agent: synthesizer
    model: "@cf/mistral/mistral-7b-instruct-v0.2"
    task: "Combina las perspectivas A y B en un documento unificado con TODAS las secciones 1-7. CRÍTICO: La sección 5 DEBE contener '### Preguntas para el cliente (máximo 10)' con al menos 5 preguntas numeradas. Si la Perspectiva B las incluye, cópialas EXACTAMENTE. No elimines ni resumas las preguntas."
  - agent: judge
    rules:
      - "Verifica que las 7 secciones numeradas (1. ANÁLISIS DEL SECTOR, 2. MEJORES PRÁCTICAS, 3. COMPETENCIA, 4. ESTÁNDARES EC, 5. ANÁLISIS DE GAPS, 6. RECOMENDACIONES, 7. REFERENCIAS) estén presentes y completas."
      - "CRÍTICO: La sección '### Preguntas para el cliente (máximo 10)' DEBE existir dentro de la sección 5, después de un separador ---. Si no existe o tiene menos de 3 preguntas, AGRÉGALA ahora con al menos 5 preguntas de diagnóstico instruccional siguiendo el formato: **[N]. [Texto]** / - **Objetivo:** [qué decisión de diseño permite] / - **Justificación:** [por qué es necesaria] / - **Bibliografía:** [autor, año]."
      - "Confirma que cada celda de tabla contiene datos reales, no placeholders como [texto] o [referencia]."
      - "Reemplaza cualquier placeholder restante [X], [nombre], [texto] con el valor encontrado o con 'No se encontró información pública disponible'."
      - "Devuelve el documento completo en Markdown válido."
---

Actúa como un investigador de mercado y consultor especializado en educación en línea, con experiencia en el estándar EC0366 "Desarrollo de cursos de formación en línea" del CONOCER.

## CONTEXTO DEL PROYECTO
{{context}}

## DATOS DE ENTRADA ADICIONALES
{{userInputs}}

## PROCESO QUE DEBES SEGUIR

Sigue estos 6 pasos en orden antes de generar la respuesta:

**PASO 1 - Investigación del sector/industria:** Analiza el sector declarado. Identifica tamaño de mercado, tendencias principales (últimos 2-3 años), regulaciones aplicables y desafíos comunes del sector.

**PASO 2 - Mejores prácticas:** Identifica qué formatos, duraciones, modalidades y estrategias instruccionales funcionan mejor en este sector específico.

**PASO 3 - Mapeo de competencia:** Identifica cursos similares en Udemy, Coursera, Hotmart, Crehana, Platzi, LinkedIn Learning. Documenta nombre, plataforma, precio, alumnos y enfoque de cada uno.

**PASO 4 - Estándares EC relacionados:** Busca en el catálogo del CONOCER si hay Estándares de Competencia relacionados con el tema del proyecto.

**PASO 5 - Análisis de gaps:** Identifica brechas entre lo que el cliente propone y las mejores prácticas o la competencia.

**PASO 6 - Genera el documento final** en el formato obligatorio indicado abajo.

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
| Certificaciones obligatorias | [texto o "Ninguna identificada"] | [referencia] |

### Desafíos comunes (dolores del sector)
1. [Dolor 1] - Fuente: [referencia]
2. [Dolor 2] - Fuente: [referencia]
3. [Dolor 3] - Fuente: [referencia]

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
| [nombre] | [plataforma] | [$] | [N] | [hrs] | [texto] | [lo que no cubre] |

**Análisis de brecha:** [Qué hacen bien / qué oportunidad existe]

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

CRITERIO OBLIGATORIO: Cada pregunta debe ser respondida por el CLIENTE (quien contrata el curso) y su respuesta debe servir directamente para DISEÑAR O MEJORAR el curso. NO son preguntas filosóficas ni de contenido; son preguntas de diagnóstico instruccional.

Ejemplos válidos:
- "¿Cuál es el nivel previo de experiencia que tienen los participantes en [tema]?" → permite calibrar dificultad y ritmo.
- "¿Qué errores o problemas concretos cometen hoy los participantes en su trabajo?" → alimenta objetivos conductuales.
- "¿Dispones de materiales existentes (manuales, presentaciones) que podamos reutilizar?" → define el alcance de producción.

Ejemplos INVÁLIDOS (NO uses este tipo):
- "¿Qué quieres transmitir con este curso?" (demasiado vago, no diseña nada)
- "¿Cuál es tu filosofía de enseñanza?" (no operativa)

Formato por pregunta:
**[N]. [Texto de la pregunta]**
- **Objetivo:** [qué decisión de diseño permite tomar]
- **Justificación:** [por qué es necesaria para el diseño instruccional]
- **Bibliografía:** [autor, año — p.ej. Dick & Carey, 2015; Kirkpatrick, 2006]

---

## 6. RECOMENDACIONES INICIALES
1. [Recomendación basada en investigación]
2. [Recomendación basada en investigación]

---

## 7. REFERENCIAS
[Lista de fuentes utilizadas]

## INSTRUCCIONES DE CALIDAD
- NO inventes datos. Si no hay información pública, indícalo explícitamente.
- TODA afirmación debe tener fuente.
- Mantén un tono profesional y objetivo.
- Responde SOLO en español.
- Las "Preguntas para el cliente" en la sección 5 son EXCLUSIVAMENTE preguntas de diagnóstico instruccional — cada respuesta del cliente debe traducirse en una decisión concreta de diseño del curso. NUNCA hagas preguntas sobre el significado, la filosofía o el propósito artístico del curso.
- **Reemplaza TODO placeholder `[X]`, `[nombre]`, `[plataforma]`, `[$]`, `[N]`, `[texto]`, `[referencia]` con valores reales encontrados en tu investigación. Si no encuentras un dato concreto, escribe "No se encontró información pública disponible".**
- **NO dejes ningún placeholder sin reemplazar en el documento final.**
