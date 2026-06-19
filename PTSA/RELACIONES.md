# RELACIONES — Índice cache de hallazgos ↔ evidencias ↔ productos
**Motor v4.1 | Cache: sobreescribir al reconstruir. Prevalecen archivos individuales.**
**Última reconstrucción:** 2026-06-18 (S-009 / PT-193)

---

## Hallazgos registrados (25 total)

| ID | Dim | Sev | Estado | Producto | Evidencias | Sesión |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| H-001 | D4 | MEDIA | CORREGIDA ✅ | — | E-001 | S-003 |
| H-002 | D4 | MEDIA | CORREGIDA ✅ | — | E-002 | S-006 |
| H-003 | D4 | MEDIA | CORREGIDA ✅ | — | E-003 | S-003 |
| H-004 | D4 | BAJA  | CORREGIDA ✅ | — | E-004 | S-003 |
| H-005 | D2 | MEDIA | CORREGIDA ✅ | — | E-005 | S-004 |
| H-006 | D2 | BAJA  | CORREGIDA ✅ | — | E-006 | S-009 |
| H-007 | D4 | BAJA  | CORREGIDA ✅ | — | E-007 | S-003 |
| H-008 | D1 | ALTA  | ABIERTA ⚠️  | P-008 | E-008, E-010 | S-003 |
| H-009 | D1 | MEDIA | ABIERTA ⚠️  | P-007 | E-009 | S-003 |
| H-010 | D1 | MEDIA | ABIERTA ⚠️  | P-007, P-008, P-011 | E-009 | S-003 |
| H-011 | D3 | BAJA  | CORREGIDA ✅ | — | — | S-004 |
| H-012 | D2 | ALTA  | CORREGIDA ✅ | — | E-012 | S-004 |
| H-013 | D2 | ALTA  | CORREGIDA ✅ | — | E-013 | S-004 |
| H-014 | D2 | MEDIA | CORREGIDA ✅ | — | E-014 | S-004 |
| H-015 | D2 | CRITICA | CORREGIDA ✅ | — | E-015 | S-007 |
| H-016 | D2 | BAJA  | CORREGIDA ✅ | — | E-016 | S-009 |
| H-017 | D1 | ALTA  | CORREGIDA ✅ | — | E-017 | S-008 |
| H-018 | D1 | ALTA  | CORREGIDA ✅ | — | E-018 | S-008 |
| H-019 | D1 | CRITICA | CORREGIDA ✅ | P-012 | E-019 | S-008 |
| H-020 | D1 | MEDIA | CORREGIDA ✅ | P-014 | E-020 | S-008 |
| H-021 | D2 | ALTA  | CORREGIDA ✅ | — | E-021 | S-008 |
| H-022 | D4 | BAJA  | CORREGIDA ✅ | — | E-022 | S-008 |
| H-023 | D4 | MEDIA | CORREGIDA ✅ | — | E-023 | S-008 |
| H-024 | D1 | MEDIA | CORREGIDA ✅ | — | E-024 | S-008 |
| H-025 | D3 | MEDIA | CORREGIDA ✅ | — | E-025 | S-009 |

**Hallazgos activos:** 3 (H-008, H-009, H-010 — todos D1)
**Hallazgos corregidos:** 22

---

## Evidencias catalogadas (25 total)

| ID | Tipo | Origen | Hallazgos referenciados |
|:---:|:---:|:---|:---:|
| E-001 | documentacion | README.md | H-001 |
| E-002 | documentacion | CLAUDE.md | H-002 |
| E-003 | documentacion | README.md (modelo Ollama) | H-003 |
| E-004 | documentacion | README.md (test count) | H-004 |
| E-005 | codigo | ai.service.test.ts — mocks | H-005 |
| E-006 | infraestructura | src/backend/src/graphify-out/ | H-006 |
| E-007 | base_datos | fase4_productos — validacion_estado | H-007 |
| E-008 | base_datos | fase4_productos — P1 rejected | H-008 |
| E-009 | base_datos | temario_base — drift semántico | H-009, H-010 |
| E-010 | codigo | ec0366-rules.engine.ts | H-008 |
| E-011 | codigo | document.handlers.ts:208-239 | (positivo) |
| E-012 | codigo | supabase.service.ts saveArtifactVersion | H-012 |
| E-013 | base_datos | artifact_versions — schema real | H-013 |
| E-014 | infraestructura | npm audit | H-014 |
| E-015 | base_datos | migrations/051-053 — DROP sp_save_document + cleanup | H-015 |
| E-016 | prueba | wizard.async.e2e.test.ts:33-51 — mock incompleto | H-016 |
| E-017 | codigo | F3-especificaciones-tecnicas.md — valores JSON en inglés | H-017 |
| E-018 | codigo | F4_P3_GENERATE_DOCUMENT.md:98,130 — equipamiento en inglés | H-018 |
| E-019 | codigo | F5-verificacion.md — checklist hardcoded "✅ Verificado" | H-019 |
| E-020 | codigo | F6-ajustes.md — campo archivos sin restricción de dominio | H-020 |
| E-021 | codigo | step2.analysis.ts:107 — filter `obj?.tipo` elimina todos los objetivos | H-021 |
| E-022 | codigo | f2_5.handler.ts:92 — label "Duración Estimada Total" incorrecto | H-022 |
| E-023 | codigo | p1/p4/p8-document.assembler.ts — referencias PT-024.X | H-023 |
| E-024 | codigo | F6_2b-resumen-declaracion.md — placeholder duracion ambiguo | H-024 |
| E-025 | codigo | step11.closing.ts — ZIP construido desde memoria, no backend | H-025 |

---

## Productos con estado final (10 identificados)

| ID | Nombre | Estado | Hallazgos |
|:---:|:---|:---:|:---:|
| P-002 | Informe de Necesidades (F1) | VALIDADO | — |
| P-007 | Temario Base Canónico | REQUIERE_REVISION | H-009, H-010 |
| P-008 | Instrumentos de Evaluación (F4-P1) | RECHAZADO_DOMINIO | H-008, H-010 |
| P-011 | Manual del Participante (F4-P4) | REQUIERE_REVISION | H-010 |
| P-012 | Verificación y Evaluación del Curso (F5) | RECHAZADO_DOMINIO | H-019 (corregido) |
| P-013 | Anexo de Evidencias (F5_2) | IDENTIFICADO | — |
| P-014 | Ajustes Post-Evaluación (F6) | RECHAZADO_DOMINIO | H-020 (corregido) |
| P-015 | Inventario del Expediente (F6_2a) | IDENTIFICADO | — |
| P-016 | Resumen Ejecutivo y Declaración Final (F6_2b) | IDENTIFICADO | — |
| P-017 | Resumen Cualitativo del Proceso (F7) | IDENTIFICADO | — |

---

## Matriz de propagación de hallazgos

```
P-007 (Temario Base)
  ← H-009 (nombre módulo incoherente — guardrail NOMBRE_MODULO añadido; pendiente regenerar)
  ← H-010 (verbo prohibido "Identificar")
       ↓ propaga a:
       P-008 (Instrumentos) ← H-008 (rechazado; VOCABULARIO_MEDIBLE+INSTRUMENTO_UNICO añadidos)
       P-011 (Manual P4)    ← aprobado_con_errores (mismo verbo heredado)

P-012 (Verificación F5)
  ← H-019 CORREGIDA (F5 checklist hardcoded → neutral)

P-014 (Ajustes F6)
  ← H-020 CORREGIDA (F6 archivos sin restricción → dominio restringido)
```
