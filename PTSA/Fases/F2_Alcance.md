---
ptsa_version: 2.0
motor_version: 4.1
fase: F2
estado: COMPLETADA
ultima_actualizacion: 2026-06-13
confidence: 90
---

# F2 — Alcance de la Auditoría

## Update U-001 | Timestamp: 2026-06-13 23:20

---

## 1. Microsite en Alcance

**Alcance primario: DCFL (EC0366)** — Es el microsite activo y con código completo.
**Fuera de alcance F6-F7:** CCE (EC0249) — Microsite secundario, en desarrollo.

---

## 2. Productos auditables identificados (pre-F3)

Los productos son los documentos que el sistema genera para el cliente. Se auditan en F3 (catálogo formal) y F6 (validación de dominio).

### Documentos del wizard EC0366 (F0–F6)

| ID | Producto | Fase | Crítico |
|:---|:---|:---:|:---:|
| P-001 | Marco de Referencia del Cliente (F0) | F0 | ALTA |
| P-002 | Informe de Necesidades de Capacitación (F1) | F1 | ALTA |
| P-003 | Especificaciones de Análisis y Diseño (F2) | F2 | ALTA |
| P-004 | Resolución de Discrepancias F1 vs F2 (F2b) | F2b | MEDIA |
| P-005 | Recomendaciones Multimedia y Parámetros (F2.5) | F2.5 | MEDIA |
| P-006 | Especificaciones Técnicas del Curso (F3) | F3 | ALTA |
| P-007 | Temario Base Canónico | TEMARIO | CRITICA |
| P-008 | Instrumentos de Evaluación (F4-P1) | F4 | CRITICA |
| P-009 | Presentación Electrónica (F4-P2) | F4 | ALTA |
| P-010 | Guiones Multimedia (F4-P3) | F4 | ALTA |
| P-011 | Manual del Participante (F4-P4) | F4 | CRITICA |
| P-012 | Guías de Actividades (F4-P5) | F4 | ALTA |
| P-013 | Guía Didáctica del Instructor / Calendario (F4-P6) | F4 | ALTA |
| P-014 | Documento de Información Complementaria / Glosario (F4-P7) | F4 | MEDIA |
| P-015 | Cronograma de Desarrollo (F4-P8) | F4 | MEDIA |
| P-016 | Checklist de Verificación (F5) | F5 | ALTA |
| P-017 | Ajustes y Evidencias (F6) | F6 | ALTA |
| P-018 | Resumen Cualitativo del Proceso (F7) | F7 | MEDIA |

---

## 3. Límites del sistema

### En alcance
- Backend DCFL completo (`src/backend/src/dcfl/`)
- Core compartido (`src/backend/src/core/`)
- Infraestructura Docker (docker-compose.yml, nginx)
- Base de datos PostgreSQL (schema real, migraciones)
- Tests del backend
- Templates de prompts
- Pipeline multi-agente y Phase Gateway

### Fuera de alcance (para esta auditoría)
- Frontend (TypeScript/Vite) — solo se audita la correcta exposición de endpoints
- CCE microsite (EC0249) — en desarrollo, scope separado
- Cloudflare Workers (prod) — solo disponible en dev

---

## 4. Criterios de validación de dominio (Acid Test F6)

Aplicables a los productos EC0366:

| Criterio | Descripción | Verificable en |
|:---|:---|:---|
| CR-001 | Ponderaciones de instrumentos suman 100% | F4-P1, `ec0366-rules.test.ts` |
| CR-002 | Número mínimo de ítems por tipo de instrumento | F4-P1, validador TS |
| CR-003 | Sin placeholders `{variable}`, `[PENDIENTE]` en docs finales | doc-sanitizer.helper.ts |
| CR-004 | Fechas en formato DD/MM/YYYY (nunca YYYY-MM-DD) | doc-sanitizer.helper.ts |
| CR-005 | Sin referencias bibliográficas inventadas | _reglas_globales |
| CR-006 | Sin Prompt Bleeding (texto en inglés) | Output real |
| CR-007 | Coherencia inter-producto (P4 → P1 → P3 → P2) | Orden de generación |
| CR-008 | Términos de acción medible en reactivos de evaluación | _reglas_globales |
| CR-009 | Idioma español consistente | Output real |
| CR-010 | Estructura de secciones requerida por EC0366 | F6 Domain Acid Test |

**Confidence F2:** 90
