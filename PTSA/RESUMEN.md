---
ptsa_version: 2.0
motor_version: 4.1
auditoria_estado: COMPLETADA
score_global: 78.2
clasificacion: B
ultima_actualizacion: 2026-06-14
---

# RESUMEN EJECUTIVO — Auditoría PTSA KnowTo

**Sistema:** KnowTo — Plataforma de Diseño Instruccional EC0366
**Score Global: 78.2 / 100 — Clasificación B (Sistema Funcional con Deuda Técnica)**
**Fecha de cierre:** 2026-06-14

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

| Dimensión | Score | Hallazgos activos | Clasificación |
|:---:|:---:|:---:|:---:|
| D1 — Alineación de Dominio (30%) | **75** | H-008 (Alta), H-009 (Media), H-010 (Media) | Funcional |
| D2 — Integridad Arquitectónica (30%) | **59** | H-012 (Alta), H-013 (Alta), H-005 (Media), H-014 (Media), H-006 (Baja) | **RIESGO** |
| D3 — Trazabilidad/Observabilidad (30%) | **99** | H-011 (Baja) | Excelente |
| D4 — Fidelidad Documental (10%) | **83** | H-001/002/003 (Media×3), H-004/007 (Baja×2) | Bueno |
| **GLOBAL** | **78.2** | 14 hallazgos totales | **B** |

**Regla del Agua Potable:** D1 = 75 ≥ 60 → Multiplicador NO aplica.

---

## Estado de productos auditados

| Producto | Estado | Hallazgos |
|:---|:---:|:---:|
| P-002 Informe de Necesidades (F1) | VALIDADO ✅ | Ninguno |
| P-007 Temario Base Canónico | REQUIERE_REVISION ⚠️ | H-009, H-010 |
| P-008 Instrumentos de Evaluación (F4-P1) | RECHAZADO_DOMINIO ❌ | H-008, H-010 |
| P-011 Manual del Participante (F4-P4) | REQUIERE_REVISION ⚠️ | H-010 |

---

## Top 3 acciones de mayor impacto

1. **H-013** — Corregir `certification-route`: cambiar `status` por `is_active`. 30 min → D2: +15
2. **H-012** — Corregir `saveArtifactVersion`: pasar `userId` UUID, no nombre de agente. 60 min → D2: +15
3. **H-009 + H-010** — Regenerar Temario Base con nombre y verbo correctos → desencadena corrección en cascada de P-008 y P-011 → D1: +25

**Score proyectado post-correcciones Sprint 1+2: 88.2 / 100 — Clasificación A**

---

## Inventario de hallazgos

| ID | Dim | Sev | Estado | Descripción |
|:---:|:---:|:---:|:---:|:---|
| H-001 | D4 | MEDIA | ABIERTA | README/CLAUDE.md rutas pre-reorganización |
| H-002 | D4 | MEDIA | ABIERTA | TEMARIO_BASE y F7 no documentados |
| H-003 | D4 | MEDIA | ABIERTA | Modelo Ollama obsoleto en README |
| H-004 | D4 | BAJA | ABIERTA | Test count desactualizado |
| H-005 | D2 | MEDIA | ABIERTA | Mocks sin `getProjectSoul`/`getProjectBrief` |
| H-006 | D2 | BAJA | ABIERTA | `graphify-out/` en árbol de fuentes |
| H-007 | D4 | BAJA | ABIERTA | Estados validacion_estado incompletos |
| H-008 | D1 | ALTA | ABIERTA | P1 rechazado — instrumento mixto + verbo prohibido |
| H-009 | D1 | MEDIA | ABIERTA | Nombre módulo incoherente en Temario |
| H-010 | D1 | MEDIA | ABIERTA | Verbo prohibido "Identificar" propagado |
| H-011 | D3 | BAJA | ABIERTA | TAVILY_API_KEY ausente en dev |
| H-012 | D2 | ALTA | ABIERTA | saveArtifactVersion — UUID inválido (CCM roto) |
| H-013 | D2 | ALTA | ABIERTA | artifact_versions.status — columna inexistente (HTTP 500) |
| H-014 | D2 | MEDIA | ABIERTA | 9 vulns npm (1 crítica esbuild) |
