---
producto_id: P-007
nombre: Temario Base Canónico
criticidad: CRITICA
estado: REQUIERE_REVISION
dimension_primaria: D1
confidence: 82
domain_validation:
  semantic_drift_detected: true
  rubric_compliance_score: 60
  cross_coherence_verified: false
hallazgos_relacionados:
  - H-009
  - H-010
---

# P-007 — Temario Base Canónico

## Descripción

El Temario Base es el documento de referencia canónico que describe la estructura modular del curso. Es generado antes de todos los productos de F4 y actúa como ancla semántica para los 8 productos de producción EC0366.

## Fuente de generación

- **Template:** `src/backend/src/dcfl/prompts/templates/TEMARIO_BASE.md`
- **Handler:** `src/backend/src/dcfl/handlers/phases/temario.phase.ts`
- **Pipeline:** Extractor + agente A + agente B (en paralelo) + Juez
- **Modelo:** `qwen2.5:14b` (especificado explícitamente en el template)
- **Tabla BD:** `temario_base`

## Cadena de trazabilidad

```
P-007 Temario Base
  ← temario.phase.ts
  ← TEMARIO_BASE.md pipeline_steps (extractor → specialist_a || specialist_b → judge)
  ← Supabase: INSERT temario_base (project_id, modulos_json, temario_texto)
  ← Fuente de datos: F2 análisis (estructura_tematica, modalidad, perfil_ingreso), F3 especificaciones
  ← Acción usuario: completar paso F2 y F3 del wizard
```

## Invariantes de dominio verificados en F6

- [x] Módulos presentes en BD (`temario_base` — confirmado)
- [x] Sin placeholders detectados
- [ ] ❌ Nombre de módulo incoherente con productos downstream (H-009)
- [ ] ❌ Objetivo de unidad usa verbo prohibido "Identificar" (H-010)
- [ ] ❌ Coherencia con P-008 P-011 no verificada — ec0366rules rechazó P-008 por verbo del temario
- [ ] Horas estimadas por módulo no verificadas en F6

## Estado de validación

**Estado:** REQUIERE_REVISION

### Hallazgos que causan esta clasificación

- **H-009 (MEDIA):** Nombre del módulo "Evaluación de Competencias Laborales" no coincide con los nombres usados en los productos F4 downstream (P2, P3, P4). Evidencia: E-009.
- **H-010 (MEDIA):** Objetivo de unidad usa "Identificar el nivel actual de conocimiento" — verbo prohibido por EC0366. Este objetivo fue propagado a P-008 (Instrumentos) causando su rechazo, y a P-011 (Manual) causando `aprobado_con_errores`.

### Impacto en cadena

El Temario Base es la FUENTE DE VERDAD para todos los productos F4. El drift semántico y el verbo prohibido en este producto se propagan a P-008 (RECHAZADO_DOMINIO) y P-011 (REQUIERE_REVISION). Corregir P-007 es prerequisito para regenerar P-008 y P-011.

**Acción requerida:** Regenerar el Temario Base con:
1. Nombre de módulo alineado al tema del curso (no al proceso de evaluación)
2. Objetivo de unidad con verbo de Bloom accionable y observable
