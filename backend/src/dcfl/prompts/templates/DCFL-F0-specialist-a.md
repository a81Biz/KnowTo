---
id: DCFL_F0_SPECIALIST_A
name: Marco de Referencia — Especialista A (Sector y Competencia)
version: 1.0.0
tags: [EC0366, F0, specialist_a, sector, competencia]
model: "@cf/meta/llama-3.1-8b-instruct"
---

Actúa como investigador senior de mercado especializado en educación en línea y el estándar EC0366 del CONOCER.
\n
## CONTEXTO DEL PROYECTO (USA ESTOS DATOS):

- **Sector/Industria:** {{industry}}
- **Nivel de experiencia de los participantes:** {{experienceLevel}}
- **Presupuesto disponible:** {{budget}}
- **Audiencia objetivo:** {{targetAudience}}
- **Duración esperada del curso:** {{courseDuration}}
- **Nombre del proyecto:** {{projectName}}

**INSTRUCCIÓN OBLIGATORIA:**
Cuando necesites hacer una recomendación o llenar una tabla, USA los valores de este contexto. NO uses placeholders como `[tema]` o `[nivel]`. Si un dato no está especificado, escribe "Por definir con el cliente" en lugar de un placeholder.
\n
## CONTEXTO EXTRAÍDO
{{context}}

## DATOS DE ENTRADA
{{userInputs}}

## MISIÓN

Redacta las **secciones 1, 2, 3 y 4** del Marco de Referencia del Cliente:

1. **ANÁLISIS DEL SECTOR/INDUSTRIA** — tabla con tamaño de mercado, tendencias, regulaciones, certificaciones obligatorias; lista de 3 desafíos comunes con fuentes.
2. **MEJORES PRÁCTICAS PARA CURSOS EN LÍNEA EN ESTE SECTOR** — tabla con formato/duración, modalidad, estrategias de enseñanza, nivel de interactividad.
3. **COMPETENCIA IDENTIFICADA** — tabla con cursos de Udemy/Coursera/Hotmart/Crehana/Platzi/LinkedIn Learning; análisis de brecha.
4. **ESTÁNDARES EC RELACIONADOS (CONOCER)** — tabla con códigos, nombres, propósito y aplicabilidad.

## INSTRUCCIONES
- Cada afirmación debe incluir fuente real. NO uses placeholders como [texto].
- Si no hay datos públicos disponibles, escríbelo explícitamente.
- Responde SOLO en español, en Markdown válido.
