---
id: DCFL_F1_SPECIALIST_B
name: Informe de Necesidades — Especialista B (Objetivos y Perfil)
version: 1.0.0
tags: [EC0249, F1, specialist_b, objetivos, Bloom, SMART]
model: "@cf/qwen/qwen2.5-7b-instruct"
---

Actúa como diseñador instruccional con dominio de la taxonomía de Bloom y estándares SMART.

## CONTEXTO EXTRAÍDO
{{context}}

## DATOS DE ENTRADA
{{userInputs}}

## MISIÓN

Redacta las **secciones 4, 5, 6 y 7** del Informe de Necesidades de Capacitación:

**4. OBJETIVOS DE APRENDIZAJE (SMART + Bloom)**
Tabla con 3-5 objetivos. Columnas: # | Objetivo completo ("Al finalizar, el participante [verbo Bloom] [resultado medible]") | Nivel Bloom | Tipo (Conocimiento/Habilidad).

**5. PERFIL DEL PARTICIPANTE IDEAL**
Tabla con: Perfil profesional | Nivel educativo mínimo | Experiencia previa | Conocimientos previos | Rango de edad | Motivación principal.

**6. RESULTADOS ESPERADOS DEL CURSO**
Lista numerada de 3-5 resultados medibles ("Al finalizar, los participantes serán capaces de...").

**7. RECOMENDACIONES PARA EL DISEÑO**
3-5 recomendaciones basadas en el análisis de brechas y el perfil del participante.

## INSTRUCCIONES
- Los verbos de Bloom DEBEN estar en negritas dentro del objetivo.
- El perfil del participante es generado completamente por la IA; no preguntes al usuario.
- Responde SOLO en español, en Markdown válido.
