---
producto_id: P-008
nombre: Instrumentos de Evaluación (F4-P1)
criticidad: CRITICA
estado: RECHAZADO_DOMINIO
dimension_primaria: D1
confidence: 95
domain_validation:
  semantic_drift_detected: true
  rubric_compliance_score: 0
  cross_coherence_verified: false
hallazgos_relacionados:
  - H-008
  - H-010
---

# P-008 — Instrumentos de Evaluación (F4-P1)

## Descripción

Documento que contiene los instrumentos de evaluación del aprendizaje del curso: reactivos, criterios de evaluación, rúbricas, etc. Es uno de los entregables principales de EC0366 E1220.

## Fuente de generación

- **Template:** `src/backend/src/dcfl/prompts/templates/F4_P1_GENERATE_DOCUMENT.md`
- **Handler:** `src/backend/src/dcfl/handlers/phases/products/p1-instrumentos.handler.ts`
- **Assembler:** `p1-document.assembler.ts` → `handleDocumentP1Assembler`
- **Registro en f4.phase.ts:** `'ensamblador_doc_p1': { 'F4_P1_GENERATE_DOCUMENT': handleDocumentP1Assembler }`
- **Tabla BD:** `fase4_productos` (producto='P1', validacion_estado='**rejected**')

## Cadena de trazabilidad

```
P-008 Instrumentos de Evaluación
  ← p1-document.assembler.ts (reads agente_A + agente_B + juez outputs)
  ← pipeline_agent_outputs WHERE job_id = ? AND agent_name IN (agente_A, agente_B, juez)
  ← F4_P1_GENERATE_DOCUMENT.md pipeline_steps
  ← enrichedContext: productos_previos.P4 (Manual Participante)
  ← Fuente: fase4_productos WHERE producto='P4' AND project_id=?
  ← Acción usuario: completar formulario F4-P1 en wizard
  ← CAUSA RAÍZ: temario_base con verbo "Identificar" y nombre de módulo incoherente (P-007)
```

## Invariantes de dominio verificados en F6

- [ ] ❌ **Instrumento mixto**: `instrumento_tipo = "Examen teórico / Lista de verificación"` viola regla "un instrumento por unidad" — EC0366 E1220
- [ ] ❌ **Verbo prohibido**: objetivo usa "Identificar" (heredado de P-007 temario_base)
- [x] EC0366RulesEngine detectó correctamente ambas violaciones
- [x] `validacion_estado = 'rejected'` en BD — el sistema rechazó el producto correctamente

## Estado de validación

**Estado:** RECHAZADO_DOMINIO

### Hallazgos que causan esta clasificación

- **H-008 (ALTA):** Instrumento mixto ("Examen teórico / Lista de verificación") + verbo prohibido "Identificar". Verificado con datos reales de BD (proyecto CENEVAL). Evidencia: E-008, E-010.
- **H-010 (MEDIA):** Propagación de verbo prohibido desde P-007 (Temario Base). El mismo objetivo con "Identificar" aparece en el Temario y fue heredado en los instrumentos.

### Nota sobre el sistema

La EC0366RulesEngine funcionó correctamente — detectó y rechazó el producto. El problema es en la **fuente de datos upstream** (P-007 Temario Base), no en el pipeline de P-008. Corregir P-007 y regenerar P-008 debería resolver las violaciones.

**Acción requerida:** (1) Corregir P-007, (2) regenerar P-008, (3) verificar que `validacion_estado` cambia a `aprobado`.
