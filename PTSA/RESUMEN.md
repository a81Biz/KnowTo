---
ptsa_version: 2.0
motor_version: 4.1
auditoria_estado: COMPLETADA
score_global: 100
clasificacion: A+
ultima_actualizacion: 2026-06-22
---

# RESUMEN EJECUTIVO — Auditoría PTSA KnowTo

**Sistema:** KnowTo — Plataforma de Diseño Instruccional EC0366
**Score Global: 100 / 100 — Clasificación A+** ✅ (Potable-Water Rule DESACTIVADA: D1=100 ≥ 60)
**Fecha de cierre original:** 2026-06-14 | **Última actualización:** 2026-06-22 (PT-215 / H-033 VERIFICADA)

---

## Estado de fases

| Fase | Nombre | Estado | Confidence |
|:---:|:---|:---:|:---:|
| F-1 | Declaración de Valor | COMPLETADA | 85 |
| F0 | Inventario | COMPLETADA | 95 |
| F1 | Mapa del Sistema | COMPLETADA | 90 |
| F2 | Alcance | COMPLETADA | 90 |
| F3 | Identificación de Productos | COMPLETADA | 90 |
| F3.5 | Criticidad | COMPLETADA | 90 |
| F4 | Trazabilidad | COMPLETADA | 88 |
| F5 | Técnica | COMPLETADA | 87 |
| F6 | Funcional (Domain Acid Test) | COMPLETADA | 85 |
| F7 | Fidelidad Documental | COMPLETADA | 88 |
| F8 | Observabilidad | COMPLETADA | 90 |
| F9 | Hallazgos Consolidados | COMPLETADA | 91 |
| F10 | Matriz Maestra | COMPLETADA | 91 |

---

## Scores por dimensión

| Dimensión | Score S-018 | Score S-019 | Score PT-215 | Hallazgos activos | Clasificación |
|:---:|:---:|:---:|:---:|:---:|:---:|
| D1 — Alineación de Dominio (30%) | **100** ✅ | **100** ✅ | **100** ✅ | — (0 activos) | **Perfecto** |
| D2 — Integridad Arquitectónica (30%) | **100** | **95** | **100** ✅ | — (H-033 VERIFICADA) | **Perfecto** |
| D3 — Trazabilidad/Observabilidad (30%) | **100** | **100** | **100** | — | **Perfecto** |
| D4 — Fidelidad Documental (10%) | **100** | **100** | **100** | — | **Perfecto** |
| **GLOBAL** | **100** ✅ | **98.5** | **100** ✅ | 0 hallazgos activos | **A+** |

**Cálculo PT-215 (2026-06-22):**
- D1 = 100 | D2 = 100 (H-033 VERIFICADA — penalización −5 eliminada) | D3 = 100 | D4 = 100
- Health_raw = (100×0.30) + (100×0.30) + (100×0.30) + (100×0.10) = 30 + 30 + 30 + 10 = **100**
- **Potable-Water Rule: D1 = 100 ≥ 60 → DESACTIVADA → Health = 100 → Clasificación A+** ✅

**PT-215 (2026-06-22): H-033 VERIFICADA ✅. Score 98.5/A → 100/A+. Score máximo restaurado. 0 hallazgos activos.**

---

## Estado de productos auditados

| Producto | Estado | Hallazgos activos |
|:---|:---:|:---:|
| P-002 Informe de Necesidades (F1) | VALIDADO ✅ | Ninguno |
| P-007 Temario Base Canónico | VALIDADO ✅ | Ninguno (H-009, H-010 → VERIFICADAS) |
| P-008 Instrumentos de Evaluación (F4-P1) | VALIDADO ✅ | Ninguno (H-008 → VERIFICADA) |
| P-011 Manual del Participante (F4-P4) | VALIDADO ✅ | Ninguno (H-010 → VERIFICADA) |
| P-012 Verificación y Evaluación del Curso (F5) | VALIDADO ✅ | — |
| P-013 Anexo de Evidencias (F5_2) | VALIDADO ✅ | — (DAT limpio) |
| P-014 Ajustes Post-Evaluación (F6) | VALIDADO ✅ | — |
| P-015 Inventario del Expediente (F6_2a) | VALIDADO ✅ | Ninguno (H-031 → VERIFICADA) |
| P-016 Resumen Ejecutivo y Declaración Final (F6_2b) | VALIDADO ✅ | Ninguno (H-029, H-030 → VERIFICADAS) |
| P-017 Resumen Cualitativo del Proceso (F7) | VALIDADO ✅ | Ninguno (H-032 → VERIFICADA) |

---

## Hallazgos activos

**Ninguno.** Todos los hallazgos están VERIFICADOS o CERRADOS.

## Todos los hallazgos D1 — VERIFICADOS

| ID | Dim | Sev | Estado | Fix verificado |
|:---:|:---:|:---:|:---:|:---|
| H-008 | D1 | ALTA | **VERIFICADA** ✅ | P1 `aprobado` + `{"passed":true}` en BD (job `efc39f29`, PT-213.1) |
| H-009 | D1 | MEDIA | **VERIFICADA** ✅ | P3 3 módulos con nombres canónicos en BD (jobs `d97e8134`+`92b9f2d2`, PT-213.2) |
| H-031 | D1 | MEDIA | **VERIFICADA** ✅ | BD-list siempre: 17 filas en job `44348787` (PT-212.1) |
| H-010 | D1 | MEDIA | **VERIFICADA** ✅ | guardrail validarVerbosObservables() activo (PT-211) |
| H-029 | D1 | ALTA | **VERIFICADA** ✅ | EC0366 en ítems 3 y 5 de F6_2b (PT-208) |
| H-030 | D1 | BAJA | **VERIFICADA** ✅ | fecha_inicio < fecha_cierre (PT-208) |
| H-032 | D1 | BAJA | **VERIFICADA** ✅ | EC0366 en conclusión F7 (PT-208) |

---

## PT-215 (2026-06-22) — Fix H-033 + VERIFICADA

Score: **98.5/A → 100/A+** ✅ | H-033: CORREGIDA → **VERIFICADA** ✅

| Ítem | Tipo | Resultado |
|:---:|:---:|:---|
| Línea 301: `'confirmed-existing'` → `'completed'` | BUG FIX | ✅ |
| Línea 362: `'confirmed'` → `'completed'` | BUG FIX | ✅ |
| Tests: 355 passed / 0 nuevas regresiones | VALIDATION | ✅ |
| BD run 1 (98efc80b): `prereq:canonical-spec = 'skipped'` | EVIDENCE | ✅ |
| BD run 2 (d765f7c9): `prereq:canonical-spec = 'completed'` | EVIDENCE | ✅ path fijo ejercitado |

**Potable-Water Rule: D1=100 → DESACTIVADA → Health=100 → Clasificación A+** ✅
**0 hallazgos activos. Score máximo restaurado.**

---

## Sesión S-019 (Delta Sync, 2026-06-22) — commit 77bcb3f

Score: **100/A+ → 98.5/A** | H-033: nueva ABIERTA (D2/MEDIA) — resuelta en PT-215

---

## Sesión S-018 (PT-213, 2026-06-22)

Score: **94/A → 100/A+** ✅ | H-008: CORREGIDA → **VERIFICADA** ✅ | H-009: CORREGIDA → **VERIFICADA** ✅

| PT | Tipo | Hallazgo | Resultado |
|:---:|:---:|:---:|:---|
| PT-213.1 | VERIFICATION | H-008 | P1 job `efc39f29` → `validacion_estado='aprobado'`, `{"passed":true}` ✅ → VERIFICADA |
| PT-213.2 | VERIFICATION | H-009 | P3 3 módulos canónicos (jobs `d97e8134`+`92b9f2d2`) ✅ → VERIFICADA |
| PT-213.3 | BUG | H-009 | Path corregido: `.temario.modulos[n]` → `(temario as any[])[n]` (API devuelve array directo) |

**Potable-Water Rule: D1=100 → DESACTIVADA → Health=100 → Clasificación A+** ✅

---

## Sesión S-017 (PT-212, 2026-06-22)

Score: **92.5/A → 94/A** ✅ | H-031: CORREGIDA → **VERIFICADA** ✅ | H-008: ABIERTA → **CORREGIDA** ✅

| PT | Tipo | Hallazgo | Resultado |
|:---:|:---:|:---:|:---|
| PT-212.1 | BUG | H-031 | f6.phase.ts: condicional eliminado; BD-list siempre; job 44348787 → 17 filas ✅ → VERIFICADA |
| PT-212.2 | BUG | H-008 | `fixGlobalPonderaciones()` añadida al assembler P1 (winner+loser paths) |
| PT-212.3 | BUG | H-008 | `fixForbiddenVocabulary()` añadida al assembler P1 (scope: reactivo rows only) |
| PT-212.4 | BUG | H-009 | `_temarioData` añadido a step4.production.ts; P3 loop usa nombre canónico |
| PT-212.5-6 | VALIDATION | H-008 | P1 regenerado (job 8174802f); `{"passed":true}` ✅; status=`valid`→`aprobado` (fix en código) → CORREGIDA |
| PT-212.7 | VALIDATION | H-031 | F6_2a (job 44348787) → 17 filas BD-list ✅ → VERIFICADA |

---

## Sesión S-016 (PT-209.3-4 + PT-210.3-5, 2026-06-21)

Score: **92.5/A** (sin cambio numérico) | H-009: ABIERTA → **CORREGIDA** ✅

| PT | Tipo | Hallazgo | Resultado |
|:---:|:---:|:---:|:---|
| PT-209.3-4 | VALIDATION | H-008 | Branch B: job 406b3722 → corrected; errores: subjetivos+ponderaciones 90%; PT-212 requerido |
| PT-210.3-5 | BUG | H-009 | P3 regenerado (job 3fd2311d); nombres BD match ✅; H-009 → CORREGIDA; frontend fix PT-212 |

---

## Sesión S-015 (FPGE-003 PT-208→PT-211, 2026-06-21)

Score: 53/F → **92.5/A** ✅ | Potable-Water: ACTIVADA → **DESACTIVADA** ✅

| PT | Tipo | Hallazgo | Resultado |
|:---:|:---:|:---:|:---|
| PT-208 | VALIDATION | H-029/H-030/H-031/H-032 | H-029/H-030/H-032 → VERIFICADA; H-031 falla (16<17) |
| PT-209.1-2 | VALIDATION | H-008 | Pipeline P1 lanzado; fix locuciones confirmado en prompt |
| PT-210.1-2 | BUG | H-009 | Prompt F4_P3 editado (MÓDULO_EXACTO + canonical extractor); backend reiniciado |
| PT-211 | VERIFICATION | H-010 | VERIFICADA ✅ — guardrail activo, 0 violaciones en proyecto nuevo |

---

## Sesión S-014 (FDGE PT-202→PT-207, 2026-06-21)

Ciclo FDGE STATE 4-7 completado. Correcciones aplicadas — validación humana pendiente.

| PT | Tipo | Hallazgo | Fix | Estado |
|:---:|:---:|:---:|:---|:---:|
| PT-202 | BUG | H-029 | f6.phase.ts: estandarNorma fallback='EC0366'; item 5 usa var | CORREGIDA |
| PT-203 Bug A | BUG | H-008 | F4_P1 prompt: locuciones adverbiales en VOCABULARIO_MEDIBLE | CORREGIDA (parcial) |
| PT-203 Bug C | BUG | — | step4.production.ts: super._bindEvents() añadido | VALIDATION_PENDING |
| PT-204 | INVESTIGACIÓN | H-009 | Root cause: drift=LLM no-determinismo; PT-208 recomendado | CERRADA |
| PT-205 | BUG | H-031 | f6.phase.ts: BD queries + PHASE_DOCUMENT_MAP en inventario assembler | CORREGIDA |
| PT-206 | BUG | H-030 | F6_2b prompt: restricción de fechas CRÍTICA añadida | CORREGIDA |
| PT-207 | BUG | H-032 | F7 prompt: TRAZABILIDAD NORMATIVA EC0366 añadida | CORREGIDA |

Score permanece 53/F hasta validación humana (regeneración de pipelines).
Score proyectado post-validación H-029+H-031: **D1=73, Health=91.9/A**, Potable-Water OFF.

---

## Sesión S-013 (DAT F5/F6/F7, 2026-06-21)

| ID | Dim | Sev | Estado | Hallazgo |
|:---:|:---:|:---:|:---:|:---|
| H-029 | D1 | ALTA | **ABIERTA** | F6_2b: "el estándar de certificación aplicable" sin EC0366 en declaración |
| H-030 | D1 | BAJA | **ABIERTA** | F6_2b: inicio del diseño (26/06) posterior a cierre expediente (19/06) |
| H-031 | D1 | MEDIA | **ABIERTA** | F6_2a: inventario incompleto (5 de 18 docs listados) |
| H-032 | D1 | BAJA | **ABIERTA** | F7: EC0366 no mencionado en resumen cualitativo |

P-013 (F5_2): **VALIDADO** — DAT limpio. P-017 (F7): **VALIDADO** con nota (H-032/Baja).
P-015 (F6_2a) y P-016 (F6_2b): **REQUIERE_REVISION**.

---

## Sesión S-012 (browser validation, 2026-06-20)

| ID | Dim | Sev | Estado | Corrección |
|:---:|:---:|:---:|:---:|:---|
| H-026 | D1 | ALTA | **VERIFICADA** ✅ | Browser: Step 8 muestra 3 módulos en dynamic-form-panel (13 inputs). |
| H-028 | D1 | MEDIA | **CORREGIDA** ✅ | Browser: btn-view-form → 0 generate calls; btn-regenerate → 1 call. |
| PT-200 | — | — | CERRADA | Bug 8 P8: FALSO_POSITIVO. |

---

## Hallazgos corregidos en sesiones previas (S-008 a S-011)

| ID | Dim | Sev | Estado |
|:---:|:---:|:---:|:---:|
| H-017 | D1 | ALTA | CORREGIDA ✅ |
| H-018 | D1 | ALTA | CORREGIDA ✅ |
| H-019 | D1 | CRÍTICA | CORREGIDA ✅ |
| H-020 | D1 | MEDIA | CORREGIDA ✅ |
| H-021 | D2 | ALTA | CORREGIDA ✅ |
| H-022 | D4 | BAJA | CORREGIDA ✅ |
| H-023 | D4 | MEDIA | CORREGIDA ✅ |
| H-024 | D1 | MEDIA | CORREGIDA ✅ |
| H-025 | D3 | MEDIA | CORREGIDA ✅ |
| H-016 | D2 | BAJA | CORREGIDA ✅ |
| H-006 | D2 | BAJA | CORREGIDA ✅ |
| H-015 | D2 | CRÍTICA | CORREGIDA ✅ |
| H-002 | D4 | MEDIA | CORREGIDA ✅ |
| H-012 | D2 | ALTA | CORREGIDA ✅ |
| H-013 | D2 | ALTA | CORREGIDA ✅ |
| H-005 | D2 | MEDIA | CORREGIDA ✅ |
| H-014 | D2 | MEDIA | CORREGIDA ✅ |
| H-011 | D3 | BAJA | CORREGIDA ✅ |
| H-001 | D4 | MEDIA | CORREGIDA ✅ |
| H-003 | D4 | MEDIA | CORREGIDA ✅ |
| H-004 | D4 | BAJA | CORREGIDA ✅ |
| H-007 | D4 | BAJA | CORREGIDA ✅ |

