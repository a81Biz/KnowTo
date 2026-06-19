---
ptsa_version: 2.0
motor_version: 4.1
auditoria_estado: COMPLETADA
score_global: 92.5
clasificacion: A
ultima_actualizacion: 2026-06-18
---

# RESUMEN EJECUTIVO — Auditoría PTSA KnowTo

**Sistema:** KnowTo — Plataforma de Diseño Instruccional EC0366
**Score Global: 92.5 / 100 — Clasificación A (Sistema Certificable)**
**Fecha de cierre original:** 2026-06-14 | **Última actualización:** 2026-06-18 (sesión S-009 / PT-193)

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
| F6 | Funcional (Domain Acid Test) | COMPLETADA | 82 |
| F7 | Fidelidad Documental | COMPLETADA | 88 |
| F8 | Observabilidad | COMPLETADA | 90 |
| F9 | Hallazgos Consolidados | COMPLETADA | 91 |
| F10 | Matriz Maestra | COMPLETADA | 91 |

---

## Scores por dimensión

| Dimensión | Score S-007 | Score S-008 | Score S-009 | Hallazgos activos | Clasificación |
|:---:|:---:|:---:|:---:|:---:|:---:|
| D1 — Alineación de Dominio (30%) | 75 | 75 | **75** | H-008 (Alta), H-009 (Media), H-010 (Media) | Funcional |
| D2 — Integridad Arquitectónica (30%) | 98 | 98 | **100** | — | **Perfecto** |
| D3 — Trazabilidad/Observabilidad (30%) | 100 | 95 | **100** | — | **Perfecto** |
| D4 — Fidelidad Documental (10%) | 100 | 100 | **100** | — | **Perfecto** |
| **GLOBAL** | 91.9 | 90.4 | **92.5** | 3 hallazgos activos (todos D1) | **A** |

**Cálculo S-009:** (75×0.30) + (100×0.30) + (100×0.30) + (100×0.10) = 22.5 + 30.0 + 30.0 + 10.0 = **92.5**
**Regla del Agua Potable:** D1 = 75 ≥ 60 → Multiplicador NO aplica.

**Variación S-009:** +2.1 pts vs S-008. Causas: H-025 CORREGIDA (+5 D3), H-006 CORREGIDA (+1 D2), H-016 CORREGIDA (+1 D2).

---

## Estado de productos auditados

| Producto | Estado | Hallazgos activos |
|:---|:---:|:---:|
| P-002 Informe de Necesidades (F1) | VALIDADO ✅ | Ninguno |
| P-007 Temario Base Canónico | REQUIERE_REVISION ⚠️ | H-009, H-010 |
| P-008 Instrumentos de Evaluación (F4-P1) | RECHAZADO_DOMINIO ❌ | H-008, H-010 |
| P-011 Manual del Participante (F4-P4) | REQUIERE_REVISION ⚠️ | H-010 |
| P-012 Verificación y Evaluación del Curso (F5) | RECHAZADO_DOMINIO ❌ | H-019 (corregido) |
| P-013 Anexo de Evidencias (F5_2) | IDENTIFICADO 🆕 | — |
| P-014 Ajustes Post-Evaluación (F6) | RECHAZADO_DOMINIO ❌ | H-020 (corregido) |
| P-015 Inventario del Expediente (F6_2a) | IDENTIFICADO 🆕 | — |
| P-016 Resumen Ejecutivo y Declaración Final (F6_2b) | IDENTIFICADO 🆕 | — |
| P-017 Resumen Cualitativo del Proceso (F7) | IDENTIFICADO 🆕 | — |

---

## Hallazgos corregidos en sesión S-009 (PT-193, 2026-06-18)

| ID | Dim | Sev | Estado | Corrección |
|:---:|:---:|:---:|:---:|:---|
| H-025 | D3 | MEDIA | **CORREGIDA** ✅ | Nuevo endpoint GET /documents + fallback BD en _downloadExpediente (Bug 1) |
| H-016 | D2 | BAJA | **CORREGIDA** ✅ | 3 mocks añadidos a wizard.e2e.test.ts y wizard.async.e2e.test.ts |
| H-006 | D2 | BAJA | **CORREGIDA** ✅ | src/backend/src/graphify-out/ eliminado + tsconfig exclude añadido |

---

## Hallazgos corregidos en sesión S-008 (PT-192, 2026-06-18)

| ID | Dim | Sev | Estado | Corrección |
|:---:|:---:|:---:|:---:|:---|
| H-017 | D1 | ALTA | **CORREGIDA** ✅ | F3 template English → español (5 agentes, Bug 5) |
| H-018 | D1 | ALTA | **CORREGIDA** ✅ | P3 equipamiento English fallback → español con ejemplo real (Bug 7) |
| H-019 | D1 | CRÍTICA | **CORREGIDA** ✅ | F5 checklist hardcoded ✅ Verificado → ☐ Pendiente (Bug 9) |
| H-020 | D1 | MEDIA | **CORREGIDA** ✅ | F6 archivos sin restricción de dominio → ejemplos .mp4/.pptx + PROHIBIDO (Bug 10) |
| H-021 | D2 | ALTA | **CORREGIDA** ✅ | step2 filter mataba todos los objetivos F1 (obj?.tipo undefined) (Bug 3) |
| H-022 | D4 | BAJA | **CORREGIDA** ✅ | F2.5 label "Duración Total" → "Duración por Video" (Bug 4) |
| H-023 | D4 | MEDIA | **CORREGIDA** ✅ | PT-024.X referencias internas en 3 assemblers F4 (Bug 6) |
| H-024 | D1 | MEDIA | **CORREGIDA** ✅ | F6_2b template ambigüedad horas de estudio vs. minutos producción (Bug 11) |

---

## Hallazgos activos restantes (3 total — todos D1)

| ID | Dim | Sev | Estado | Descripción |
|:---:|:---:|:---:|:---:|:---|
| H-008 | D1 | ALTA | ABIERTA | P1 rechazado — instrumento mixto; VOCABULARIO_MEDIBLE añadido; pendiente regenerar y validar en BD |
| H-009 | D1 | MEDIA | ABIERTA | Nombre módulo repite curso — guardrails añadidos; pendiente regenerar y verificar en BD |
| H-010 | D1 | MEDIA | ABIERTA | Verbo "Identificar" propagado — depende de regeneración P-007/H-009 |

---

## Hallazgos corregidos en sesiones previas

| ID | Dim | Sev | Estado | Corrección |
|:---:|:---:|:---:|:---:|:---|
| H-015 | D2 | CRITICA | CORREGIDA ✅ | Migration 051: DROP sp_save_document 4-param overload (PT-167) |
| H-002 | D4 | MEDIA | CORREGIDA ✅ | CLAUDE.md documenta TEMARIO_BASE y F7 (S-006) |
| H-012 | D2 | ALTA | CORREGIDA ✅ | `generatedBy` UUID en 8 assemblers + userId injection |
| H-013 | D2 | ALTA | CORREGIDA ✅ | Migration 048 status column + 42703 fallback |
| H-005 | D2 | MEDIA | CORREGIDA ✅ | Mocks completos en ambos wizard tests |
| H-014 | D2 | MEDIA | CORREGIDA ✅ | wrangler ^3→^4.100.0 (esbuild vuln resuelta) |
| H-011 | D3 | BAJA | CORREGIDA ✅ | .dev.vars.example con TAVILY_API_KEY |
| H-001 | D4 | MEDIA | CORREGIDA ✅ | PT-094/PT-115: rutas `src/` en README y CLAUDE.md |
| H-003 | D4 | MEDIA | CORREGIDA ✅ | PT-115: modelo `qwen2.5:14b` documentado en README |
| H-004 | D4 | BAJA | CORREGIDA ✅ | PT-115: test count en README |
| H-007 | D4 | BAJA | CORREGIDA ✅ | PT-115: tabla `validacion_estado` en CLAUDE.md §F4 |

---

## Próximas acciones para Score A+

1. **D1 → +25 puntos** — Regenerar Temario Base y P-008 con guardrails activos; verificar `aprobado` en BD (ver procedimiento en HANDOFF.md)
   - H-009: Regenerar TEMARIO_BASE → verificar nombres módulos ≠ nombre del curso
   - H-010: Depende de H-009
   - H-008: Regenerar P1 → verificar `validacion_estado = 'aprobado'`
   - Si todo pasa: D1 = 100, Score Global = 100/A+
2. **P-013/P-015/P-016/P-017** — Ejecutar F5_2/F6_2a/F6_2b/F7 en proyecto real para validación D1
