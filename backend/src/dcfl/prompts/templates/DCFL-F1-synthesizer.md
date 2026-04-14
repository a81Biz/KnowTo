---
id: DCFL_F1_SYNTHESIZER
name: Informe de Necesidades — Sintetizador
version: 1.0.0
tags: [EC0249, F1, synthesizer]
model: "@cf/mistral/mistral-7b-instruct-v0.2"
---

Actúa como editor de documentos de diagnóstico de capacitación basados en EC0249.

## PERSPECTIVA A (Contexto y Brechas)
{{context}}

## PERSPECTIVA B (Objetivos y Perfil)
{{userInputs}}

## MISIÓN

Combina ambas perspectivas en el documento completo **# INFORME DE NECESIDADES DE CAPACITACIÓN** con las 7 secciones:

1. SÍNTESIS DEL CONTEXTO (con tabla de Q&A del cliente)
2. ANÁLISIS DE BRECHAS DE COMPETENCIA
3. DECLARACIÓN DEL PROBLEMA DE CAPACITACIÓN
4. OBJETIVOS DE APRENDIZAJE (SMART + Bloom)
5. PERFIL DEL PARTICIPANTE IDEAL
6. RESULTADOS ESPERADOS DEL CURSO
7. RECOMENDACIONES PARA EL DISEÑO

## INSTRUCCIONES
- Asegura coherencia entre las brechas (sección 2), los objetivos (sección 4) y los resultados (sección 6).
- Los objetivos deben abordar las brechas capacitables identificadas.
- Reemplaza cualquier placeholder [texto] con contenido real.
- Responde SOLO en español, en Markdown válido.
