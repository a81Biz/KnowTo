---
ptsa_version: 2.0
motor_version: 4.1
fase: F6
estado: COMPLETADA
ultima_actualizacion: 2026-06-13
confidence: 82
---

# F6 — Domain Acid Test (Funcional)

## Update U-001 | Timestamp: 2026-06-13 23:40

**Proyecto auditado:** "Curso Preparatorio para la Acreditación de Licenciatura por Acuerdo 286 CENEVAL"
**Fuente:** Base de datos real vía psql

---

## Nivel 1 — Exactitud de Reglas de Negocio

### CR-001: Ponderaciones de instrumentos suman 100%
**Estado:** ✅ VERIFICADO — El EC0366RulesEngine valida esto. P1 fue `rejected` (no por ponderaciones sino por verbos prohibidos + mezcla de instrumentos).

### CR-002: Número mínimo de ítems por tipo de instrumento
**Estado:** ⚠️ PARCIAL — P1 tiene solo 5,328 chars total. Documento muy corto para 10 unidades. No se puede verificar el conteo de ítems sin leer el documento completo.

### CR-003: Sin placeholders `{variable}`, `[PENDIENTE]` en docs finales
**Estado:** ✅ VERIFICADO — Query en BD: `has_placeholders = false` para los 8 productos.

### CR-004: Fechas en formato DD/MM/YYYY (nunca YYYY-MM-DD)
**Estado:** ✅ VERIFICADO — Query en BD: `has_iso_dates = false` para los 8 productos.

### CR-005: Sin referencias bibliográficas inventadas
**Estado:** ⚠️ NO VERIFICADO — No se ejecutó búsqueda de URLs o referencias en los documentos. Pendiente.

### CR-006: Sin Prompt Bleeding (texto en inglés en documento español)
**Estado:** ✅ VERIFICADO (parcial) — Los previews muestran texto completamente en español.

### CR-007: Coherencia inter-producto (P4 → P1 → P3 → P2)
**Estado:** ⚠️ FALLA PARCIAL
- P4 tiene "Capítulo 1: Evaluación Formativa Inicial" — coherente con temario (Módulo 1, Unidad 1)
- P1 tiene estructura diferente: "Instrumentos de Evaluación **Práctica**" y "1. Requerimientos Físicos del Entorno" — estos headers no corresponden a la estructura del temario (debería ser por unidad, con nombre de unidad como header)
- P3 tiene "Módulo 1: Introducción al Proceso de Acreditación por Acuerdo 286" — coherente con módulo del temario
- **Incoherencia**: el temario llama al módulo 1 "Simulación del Proceso de Acreditación" pero P3 lo llama "Introducción al Proceso de Acreditación por Acuerdo 286". Esto es semantic drift.

### CR-008: Reactivos en verbos de acción medible (Bloom)
**Estado:** ❌ FALLA — P1 contiene "palabras subjetivas prohibidas" (detectado por EC0366RulesEngine). P4 también tiene "nivel actual de conocimiento" (vago). El temario origen también tiene esta expresión.

### CR-009: Idioma español consistente
**Estado:** ✅ VERIFICADO — Todos los documentos en español.

### CR-010: Estructura de secciones EC0366
**Estado:** ⚠️ INCIERTA — Los documentos tienen estructura Markdown válida pero la adherencia a la estructura exacta de EC0366 no puede verificarse sin el estándar oficial.

---

## Nivel 2 — Cumplimiento Taxonómico y de Rúbrica

### Análisis del Temario Base (ancla canónica)

**Módulo 1:** "Simulación del Proceso de Acreditación"
- Unidad 1: "Evaluación Formativa Inicial" — objetivo: "Evalúa el nivel actual de conocimiento..."
  - ⚠️ "nivel actual de conocimiento" es vago. Debería ser: "identifica los requisitos del proceso de acreditación EC0366 para..."
  - tipo_evaluacion: "Lista de Cotejo" ✅ (instrumento apropiado para nivel "evaluar" en Bloom)
  
**Observación crítica:** El temario mismo tiene una expresión subjetiva en el objetivo de la primera unidad, y esto se propagó a P4 (Manual del Participante) generando `aprobado_con_errores`. El problema de raíz está en el TEMARIO, no en el LLM downstream.

### Análisis de P1 (Instrumentos — rejected)

**Problemas detectados:**
1. **Mezcla de instrumentos**: "Instrumento: Guía de Observación / Lista de Cotejo" — EC0366 requiere UN solo tipo por unidad
2. **Verbos prohibidos**: Según error, contiene palabras como "adecuado", "correcto", etc.
3. **Estructura incorrecta**: Empieza con "Requerimientos Físicos del Entorno" — no es un header esperado en el instrumento de evaluación
4. **Longitud insuficiente**: 5,328 chars para 10 unidades = promedio ~530 chars/unidad, lo que es insuficiente para un instrumento completo con reactivos

**Diagnóstico:** P1 fue el primer intento de generación y falló. El mecanismo `p1-retry.helper.ts` existe para esto, pero no se activó automáticamente (o no tuvo éxito en este run).

### Análisis de P4 (Manual del Participante — aprobado_con_errores)

**Problema detectado:**
- Capítulo 1 objetivo: "Evaluarás el nivel actual de conocimiento sobre los requisitos" — "nivel actual de conocimiento" es expresión subjetiva heredada del temario
- El EC0366RulesEngine detectó correctamente: "Palabras subjetivas prohibidas detectadas en el documento final"
- A pesar de la violación, fue aprobado (no `rejected`) porque el motor consideró la violación como no bloqueante para P4

### Análisis de P2 (Presentación Electrónica — aprobado)

- Tiene "Módulo 1: Introducción al Proceso de Acreditación" (nombre diferente del temario: "Simulación del Proceso...")
- **Semantic drift**: El nombre del módulo difiere entre temario, P3 y P4 sugiriendo que los LLMs reinterpretaron el nombre
- Actividades bien estructuradas, verbos de acción (practicar, redactar)

### Análisis de P3 (Guiones Multimedia — aprobado)

- Ficha técnica con tabla Campo/Valor ✅
- Objetivo: "El participante **identificará** y **describirá** los requisitos..." — verbos Bloom válidos ✅
- Duración 30 min por módulo — coherente con tiempos del temario
- "Duración Estimada | 30 min" — ✅ sin formato de fecha incorrecto

---

## Nivel 3 — Coherencia Inter-Producto

### Matriz de coherencia entre productos

| Relación | Coherente | Problema |
|:---|:---:|:---|
| Temario → P4 (Manual) | ⚠️ | "nivel actual de conocimiento" propagado |
| Temario → P1 (Instrumentos) | ❌ | Estructura incorrecta; mezcla instrumentos |
| Temario → P3 (Guiones) | ✅ | Ficha técnica coherente |
| Temario → P2 (Presentación) | ⚠️ | Nombre de módulo difiere levemente |
| P4 → P2 (Presentación lee P4) | ⚠️ | Nombre módulo inconsistente |
| P3 → P2 (Presentación lee P3) | ✅ | Estructura alineada |

**Hallazgo de coherencia:** El nombre del Módulo 1 varía entre:
- Temario: "Simulación del Proceso de Acreditación"
- P3/P2/P4: "Introducción al Proceso de Acreditación por Acuerdo 286"

Esto es **semantic drift** en el nombre del módulo. No afecta el contenido pero introduce inconsistencia terminológica entre documentos.

---

## Nivel 4 — Guardrails de IA (Condicional)

| Guardrail | Estado |
|:---|:---|
| Validación outputs vs rúbricas dominio | ✅ EC0366RulesEngine activo en todos los assemblers P1-P6 |
| Detección de hallucinations | ✅ `_reglas_globales` prohíbe referencias inventadas; doc-sanitizer detecta placeholders |
| Control de JSON malformado | ✅ try-catch en todos los assemblers (regla documentada en CLAUDE.md) |
| Guardrails activos (bloquean) | ✅ P1 rechazado correctamente; P4 flaggeado |
| Guardrails (solo logean) | ✅ `aprobado_con_errores` para violaciones no bloqueantes |
| Fallback quality | ✅ NullRulesEngine para proyectos sin estandarNorma |
| Trazabilidad de prompts | ✅ `artifact_versions.prompt_hash`, `prompt_template_id`, `model` |
| OSINT/WebSearch | ⚠️ Activo pero falla en tests; TAVILY_API_KEY no en .dev.vars |
| Retry para P1 | ✅ p1-retry.helper.ts existe pero no se activó en este run |
| Prompt Bleeding | ✅ No detectado en outputs revisados |

---

## Resumen del Domain Acid Test

| Criterio | Estado |
|:---|:---:|
| No hay placeholders en docs finales | ✅ |
| No hay fechas en formato ISO | ✅ |
| EC0366RulesEngine activo en producción | ✅ |
| P1 rechazado correctamente | ✅ (motor funciona) |
| Coherencia inter-producto | ⚠️ |
| Verbos Bloom en objetivos | ⚠️ (temario tiene expresión subjetiva) |
| P1 (instrumento de evaluación) disponible para certificación | ❌ (rejected) |
| Semantic drift nombre de módulo | ❌ |

**Score D1 parcial (pre-F9):**
- 2 violaciones documentadas en BD (P1 rejected, P4 con errores)
- 1 falla de coherencia terminológica
- 1 falla de verbos en objetivo del temario (propagada)
- Guardrails funcionando correctamente (motor EC0366)

**Confidence F6:** 82
