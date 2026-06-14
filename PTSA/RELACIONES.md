# RELACIONES — Índice cache de hallazgos ↔ evidencias ↔ productos
**Motor v4.1 | Cache: sobreescribir al reconstruir. Prevalecen archivos individuales.**
**Última reconstrucción:** 2026-06-14 06:30

---

## Hallazgos registrados (14 total)

| ID | Dim | Sev | Producto | Evidencias | Fase |
|:---:|:---:|:---:|:---:|:---:|:---:|
| H-001 | D4 | MEDIA | — | E-001 | F7 |
| H-002 | D4 | MEDIA | — | E-002 | F7 |
| H-003 | D4 | MEDIA | — | E-003 | F7 |
| H-004 | D4 | BAJA | — | E-004 | F7 |
| H-005 | D2 | MEDIA | P-018 | E-005 | F5 |
| H-006 | D2 | BAJA | — | E-006 | F5 |
| H-007 | D4 | BAJA | — | E-007 | F6 |
| H-008 | D1 | ALTA | P-008 | E-008, E-010 | F6 |
| H-009 | D1 | MEDIA | P-007 | E-009 | F6 |
| H-010 | D1 | MEDIA | P-007, P-008, P-011 | E-009 | F6 |
| H-011 | D3 | BAJA | — | — | F8 |
| H-012 | D2 | ALTA | P-016 | E-012 | F8 |
| H-013 | D2 | ALTA | P-016 | E-013 | F8 |
| H-014 | D2 | MEDIA | — | E-014 | F8 |

---

## Evidencias catalogadas (14 total)

| ID | Tipo | Origen | Hallazgos referenciados |
|:---:|:---:|:---|:---:|
| E-001 | documentacion | README.md | H-001 |
| E-002 | documentacion | PROYECTO.md | H-002 |
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

---

## Productos con estado final (4 auditados)

| ID | Nombre | Estado | Hallazgos |
|:---:|:---|:---:|:---:|
| P-002 | Informe de Necesidades (F1) | VALIDADO | — |
| P-007 | Temario Base Canónico | REQUIERE_REVISION | H-009, H-010 |
| P-008 | Instrumentos de Evaluación (F4-P1) | RECHAZADO_DOMINIO | H-008, H-010 |
| P-011 | Manual del Participante (F4-P4) | REQUIERE_REVISION | H-010 |

---

## Matriz de propagación de hallazgos

```
P-007 (Temario Base)
  ← H-009 (nombre módulo incoherente)
  ← H-010 (verbo prohibido "Identificar")
       ↓ propaga a:
       P-008 (Instrumentos) ← H-008 (rechazado por instrumento mixto + verbo)
       P-011 (Manual P4)    ← aprobado_con_errores (mismo verbo heredado)
```

**Causa raíz de la cadena D1:** Corrección de P-007 desencadena corrección automática de P-008 y P-011.

---

## Matriz de corrección por sprint

```
Sprint 1 (2 horas) → D2: 59 → 89
  H-013: certification-route usa is_active en vez de status
  H-012: saveArtifactVersion recibe userId, no agentName

Sprint 2 (1 día) → D1: 75 → 100  
  H-009 + H-010: Regenerar Temario Base
  H-008: Regenerar P-008 (automático post-Temario)

Sprint 3-4 (1-2 días) → mejora D2/D4
  H-005: Mocks de tests
  H-014: Actualizar wrangler
  H-001/002/003/004/007/011: Documentación
```
