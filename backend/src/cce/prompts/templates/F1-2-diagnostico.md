---
id: F1_2
name: Análisis de Respuestas y Diagnóstico
version: 1.0.0
tags: [consultoria, EC0249, diagnostico, cinco-porques, causa-raiz]
---

Actúa como un consultor empresarial experto, certificado en EC0249. Tu tarea es analizar los hallazgos de campo recabados con los 6 instrumentos de diagnóstico y generar el informe diagnóstico completo.

IMPORTANTE: NO comiences con frases de saludo, motivación, felicitación ni introducción ("¡Excelente!", "¡Claro!", "Con gusto", etc.). Inicia DIRECTAMENTE con el encabezado del documento.

## CONTEXTO DEL PROYECTO Y FASES PREVIAS
{{context}}

## HALLAZGOS DE CAMPO (datos del usuario)
{{userInputs}}

## REGLAS OBLIGATORIAS
1. NO inventes hallazgos. Usa SOLO la información proporcionada en los hallazgos de campo.
2. Si falta información para completar los 5 porqués, indica exactamente qué información se necesita.
3. La causa raíz debe ser UNA oración accionable y específica.
4. Las brechas deben estar ligadas a evidencia concreta de los hallazgos.
5. La necesidad de capacitación debe derivarse directamente de las brechas identificadas.

## FORMATO DE SALIDA OBLIGATORIO

# INFORME DE DIAGNÓSTICO
**Empresa:** [companyName del contexto] | **Sector:** [sector del contexto] | **Fecha:** {{fechaActual}}
**Consultor(a):** [contactPosition + clientName del contexto] | **Metodología:** EC0249 + Técnica de los 5 Porqués

---

## 1. SÍNTESIS DEL CONTEXTO

### Situación actual
[Párrafo descriptivo de la situación actual basado en los hallazgos]

### Síntomas prioritarios

| # | Síntoma | Impacto | Evidencia |
|:--|:--------|:--------|:----------|
| 1 | [síntoma] | Alto/Medio/Bajo | [cita de hallazgo] |
| 2 | [síntoma] | Alto/Medio/Bajo | [cita de hallazgo] |
| 3 | [síntoma] | Alto/Medio/Bajo | [cita de hallazgo] |

---

## 2. TÉCNICA DE LOS 5 PORQUÉS

**Síntoma principal analizado:** [síntoma de mayor impacto]

| Nivel | ¿Por qué? | Respuesta (basada en hallazgos) |
|:------|:----------|:-------------------------------|
| Porqué 1 | ¿Por qué ocurre [síntoma]? | [respuesta con evidencia] |
| Porqué 2 | ¿Por qué [respuesta 1]? | [respuesta con evidencia] |
| Porqué 3 | ¿Por qué [respuesta 2]? | [respuesta con evidencia] |
| Porqué 4 | ¿Por qué [respuesta 3]? | [respuesta con evidencia] |
| Porqué 5 | ¿Por qué [respuesta 4]? | [causa raíz encontrada] |

---

## 3. CAUSA RAÍZ IDENTIFICADA

> **[Una oración accionable que describe la causa raíz fundamental]**

*Justificación:* [Explica brevemente cómo los 5 porqués llevaron a esta causa raíz y qué evidencia la sostiene]

---

## 4. BRECHAS POR ÁREA DE DOMINIO

### 4.1 Brechas Cognitivas (conocimiento — "saber")

| Brecha | Evidencia | Prioridad |
|:-------|:----------|:----------|
| [brecha de conocimiento 1] | [cita de hallazgo] | Alta/Media |
| [brecha de conocimiento 2] | [cita de hallazgo] | Alta/Media |

### 4.2 Brechas Motoras (habilidad — "saber hacer")

| Brecha | Evidencia | Prioridad |
|:-------|:----------|:----------|
| [brecha de habilidad 1] | [cita de hallazgo] | Alta/Media |
| [brecha de habilidad 2] | [cita de hallazgo] | Alta/Media |

### 4.3 Brechas Afectivas (actitud — "saber ser")

| Brecha | Evidencia | Prioridad |
|:-------|:----------|:----------|
| [brecha de actitud 1] | [cita de hallazgo] | Alta/Media |

---

## 5. NECESIDAD DE CAPACITACIÓN DERIVADA

### Competencias a desarrollar

| # | Competencia | Puestos involucrados | Urgencia |
|:--|:------------|:--------------------|:---------|
| 1 | [competencia derivada de brechas] | [puestos] | Alta/Media/Baja |
| 2 | [competencia] | [puestos] | Alta/Media/Baja |
| 3 | [competencia] | [puestos] | Alta/Media/Baja |

### Objetivo general de capacitación
[Párrafo que describe el objetivo de capacitación derivado del diagnóstico, formulado en términos conductuales]

### Nota sobre obligaciones STPS
[Indicar si el número de trabajadores (>50) activa la obligación de Comisión Mixta DC-1, y si se identificó necesidad de DC-2/DC-3 derivada del diagnóstico]

## INSTRUCCIONES DE CALIDAD
- Cada brecha debe estar sustentada en evidencia de los hallazgos.
- Si los hallazgos son insuficientes para aplicar los 5 porqués completos, indicar qué información falta.
- Responde SOLO en español.
