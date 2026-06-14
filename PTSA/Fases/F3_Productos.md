---
ptsa_version: 2.0
motor_version: 4.1
fase: F3
estado: COMPLETADA
ultima_actualizacion: 2026-06-13
confidence: 88
---

# F3 — Identificación y Catálogo de Productos

## Update U-001 | Timestamp: 2026-06-13 23:25

---

## Criterio de identificación

Un producto auditable es cualquier documento que:
1. El sistema genera como output para el usuario/cliente
2. Tiene su propia tabla de persistencia en BD, o es el resultado final de un pipeline
3. Tiene criterios de aceptación específicos del dominio EC0366

---

## Catálogo de productos (18 productos identificados)

| ID | Nombre | Criticidad | Estado inicial | Tabla BD |
|:---|:---|:---:|:---:|:---|
| P-001 | Marco de Referencia del Cliente | ALTA | BORRADOR | `documents` / `fase0_componentes` |
| P-002 | Informe de Necesidades de Capacitación | ALTA | BORRADOR | `fase1_informe_necesidades` |
| P-003 | Especificaciones de Análisis y Diseño | ALTA | BORRADOR | `fase2_analisis_alcance` |
| P-004 | Resolución de Discrepancias F1 vs F2 | MEDIA | BORRADOR | `fase2_resolucion_discrepancias` |
| P-005 | Recomendaciones Multimedia y Parámetros | MEDIA | BORRADOR | `fase2_5_recomendaciones` |
| P-006 | Especificaciones Técnicas del Curso (F3) | ALTA | BORRADOR | `fase3_especificaciones` |
| P-007 | Temario Base Canónico | CRITICA | BORRADOR | `temario_base` |
| P-008 | Instrumentos de Evaluación (F4-P1) | CRITICA | BORRADOR | `fase4_productos` (producto='P1') |
| P-009 | Presentación Electrónica (F4-P2) | ALTA | BORRADOR | `fase4_productos` (producto='P2') |
| P-010 | Guiones Multimedia (F4-P3) | ALTA | BORRADOR | `fase4_productos` (producto='P3') |
| P-011 | Manual del Participante (F4-P4) | CRITICA | BORRADOR | `fase4_productos` (producto='P4') |
| P-012 | Guías de Actividades (F4-P5) | ALTA | BORRADOR | `fase4_productos` (producto='P5') |
| P-013 | Guía Didáctica / Calendario General (F4-P6) | ALTA | BORRADOR | `fase4_productos` (producto='P6') |
| P-014 | Glosario Técnico (F4-P7) | MEDIA | BORRADOR | `fase4_productos` (producto='P7') |
| P-015 | Cronograma de Desarrollo (F4-P8) | MEDIA | BORRADOR | `fase4_productos` (producto='P8') |
| P-016 | Checklist de Verificación (F5) | ALTA | BORRADOR | `documents` |
| P-017 | Ajustes, Evidencias e Inventario de Firmas (F6) | ALTA | BORRADOR | `documents` |
| P-018 | Resumen Cualitativo del Proceso (F7) | MEDIA | BORRADOR | `documents` |

---

## Productos críticos para EC0366 E1220 (Producción)

P-007 (Temario Base), P-008 (Instrumentos), P-011 (Manual Participante) son CRÍTICOS porque:
- P-007 es la fuente de verdad que alimenta todos los demás productos F4
- P-011 (Manual Participante) se genera PRIMERO y es la fuente de verdad para los demás
- P-008 (Instrumentos) tiene invariantes matemáticas estrictas (ponderaciones)

---

## Nota: archivos P-XXX.md

Se crean archivos individuales en `PTSA/Productos/` para los 6 productos más críticos.
Los demás se auditan como grupo en F6.

**Confidence F3:** 88
