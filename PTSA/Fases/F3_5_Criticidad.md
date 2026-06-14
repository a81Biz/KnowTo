---
ptsa_version: 2.0
motor_version: 4.1
fase: F3_5
estado: COMPLETADA
ultima_actualizacion: 2026-06-13
confidence: 85
---

# F3.5 — Análisis de Criticidad de Productos

## Update U-001 | Timestamp: 2026-06-13 23:25

---

## Matriz de criticidad

| ID | Producto | Criticidad | Razón |
|:---|:---|:---:|:---|
| P-007 | Temario Base | CRITICA | Ancla canónica para todos los productos F4; si es incorrecto, 8 productos serán incoherentes |
| P-008 | Instrumentos de Evaluación | CRITICA | Tiene invariantes matemáticos (ponderaciones ∑=100%); directamente evaluado en certificación |
| P-011 | Manual del Participante | CRITICA | Fuente de verdad para F4; primera en generarse; coherencia del aprendizaje |
| P-002 | Informe de Necesidades | ALTA | Base de todo el diseño instruccional; si es incorrecto, todas las fases posteriores divergen |
| P-006 | Especificaciones Técnicas | ALTA | Define parámetros técnicos que deben ser coherentes en todos los productos de F4 |
| P-001 | Marco de Referencia | ALTA | Captura la identidad del cliente; error aquí = semantic drift en todo el proyecto |
| P-016 | Checklist Verificación | ALTA | Documento de entrega al CONOCER; errores visibles para el evaluador externo |
| P-017 | Ajustes y Evidencias | ALTA | Documento de cierre; incluye firmas; errores = rechazo de certificación |
| P-003 | Especificaciones F2 | ALTA | Estructura modular; define el número de módulos/unidades que debe tener el curso |
| P-009 | Presentación Electrónica | ALTA | Depende de P-010 (Guiones); coherencia crítica |
| P-010 | Guiones Multimedia | ALTA | Depende de P-011 (Manual); coherencia crítica |
| P-012 | Guías Actividades | ALTA | Debe ser coherente con los módulos y unidades definidos en P-011 |
| P-013 | Guía Instructor | ALTA | Documento operativo para el instructor |
| P-004 | Resolución Discrepancias | MEDIA | Documento de reconciliación; importante pero no entregable final |
| P-005 | Recomendaciones Multimedia | MEDIA | Input para F4; importante pero no entregable al CONOCER |
| P-014 | Glosario Técnico | MEDIA | Valor añadido; errores visibles pero no bloquean certificación |
| P-015 | Cronograma | MEDIA | Planificación; puede ajustarse sin afectar certificación |
| P-018 | Resumen Proceso | MEDIA | Documento narrativo; valor documentacional |

---

## Productos en cadena de dependencia crítica

```
P-011 (Manual Participante)
    ↓ alimenta
P-008 (Instrumentos) ← invariantes matemáticos EC0366
P-010 (Guiones)
    ↓ alimenta
P-009 (Presentación)
    ↓
P-012 (Actividades)
P-013 (Guía Instructor)
P-014 (Glosario)
P-015 (Cronograma)
```

Un error en P-011 se propaga a TODOS los productos downstream.

**Confidence F3.5:** 85
