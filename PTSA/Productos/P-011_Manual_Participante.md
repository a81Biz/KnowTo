---
producto_id: P-011
nombre: Manual del Participante (F4-P4)
criticidad: CRITICA
estado: REQUIERE_REVISION
dimension_primaria: D1
confidence: 88
domain_validation:
  semantic_drift_detected: true
  rubric_compliance_score: 70
  cross_coherence_verified: false
hallazgos_relacionados:
  - H-010
---

# P-011 — Manual del Participante (F4-P4)

## Descripción

El Manual del Participante es la fuente de verdad de los 8 productos de producción F4. Es el PRIMERO en generarse y todos los demás productos deben ser coherentes con él. Define las unidades de aprendizaje, los contenidos, los objetivos y la estructura del curso para el participante.

## Fuente de generación

- **Template:** `src/backend/src/dcfl/prompts/templates/F4_P4_GENERATE_DOCUMENT.md`
- **Handlers:** `p4-manual-participante.handler.ts`, `p4-document.assembler.ts`
- **Assembler registrado:** `'ensamblador_doc_generic': { 'F4_P4_GENERATE_DOCUMENT': handleDocumentP4Assembler }`
- **Tabla BD:** `fase4_productos` (producto='P4', validacion_estado='**aprobado_con_errores**')

## Particularidad: generación por capítulos

P4 usa una arquitectura de generación por capítulo (`F4_P4_CHAPTER.md`, `F4_P4_GENERATE_CHAPTER.md`). El manual se genera módulo a módulo y luego se ensambla.

## Cadena de trazabilidad

```
P-011 Manual del Participante
  ← p4-document.assembler.ts / handleDocumentP4Assembler
  ← pipeline_agent_outputs (por módulo/capítulo)
  ← F4_P4_GENERATE_DOCUMENT.md → F4_P4_GENERATE_CHAPTER.md (por capítulo)
  ← enrichedContext: temario_base (módulos, unidades), F3 specs
  ← Fuente: temario_base WHERE project_id=?, fase3_especificaciones WHERE project_id=?
  ← Acción usuario: completar formulario F4-P4 en wizard
  ← CAUSA RAÍZ: temario_base con objetivo "Identificar..." y nombre de módulo incoherente (P-007)
```

## Invariantes de dominio verificados en F6

- [x] Estructura presente (módulos, unidades, contenidos detectados en BD)
- [x] Sin ISO dates (fechas en formato DD/MM/YYYY — doc-sanitizer funcionó)
- [x] Sin placeholders detectados en muestra
- [ ] ❌ `validacion_estado = 'aprobado_con_errores'` — EC0366RulesEngine detectó errores pero no rechazó (umbral de tolerancia diferente a P-008)
- [ ] ❌ Objetivo de unidad hereda verbo prohibido "Identificar" de P-007 (H-010)
- [ ] Cross-coherencia con P-008 (Instrumentos): el instrumento fue rechazado — incoherencia en cadena

## Estado de validación

**Estado:** REQUIERE_REVISION

### Hallazgos que causan esta clasificación

- **H-010 (MEDIA):** El objetivo de unidad en P-011 usa verbo prohibido "Identificar el nivel actual de conocimiento" — heredado directamente del Temario Base (P-007). La EC0366RulesEngine lo detectó (`aprobado_con_errores`) pero no rechazó el manual.

### Nota de coherencia inter-producto

P-011 dice `aprobado_con_errores` mientras P-008 (Instrumentos) dice `rejected`. Los instrumentos deben ser coherentes con el Manual. La cadena de validación muestra que P-011 tenía los mismos errores de objetivo pero pasó el umbral de aprobación, mientras que el instrumento asociado fue rechazado — esto es una inconsistencia entre productos que requiere revisión humana.

**Acción requerida:** (1) Corregir P-007 Temario Base, (2) regenerar P-011 y verificar que `validacion_estado` cambia a `aprobado`.
