---
ptsa_version: 2.0
motor_version: 4.1
fase: F-1
estado: EN_PROGRESO
ultima_actualizacion: 2026-06-13
confidence: 85
---

# F-1 — Declaración de Valor del Sistema

## Update U-001 | Timestamp: 2026-06-13 23:10

### Sistema auditado

**Nombre:** KnowTo — Plataforma de microsites de certificación asistida por IA
**Repositorio:** `c:\DevOps\Desarrollos\KnowTo`
**Entorno activo:** Desarrollo local (Docker Compose)

---

### Propuesta de valor declarada (fuente: PROYECTO.md + README.md)

KnowTo es una plataforma de microsites de certificación que guía a instructores a través de un wizard conversacional que, fase por fase, genera los documentos técnicos requeridos por estándares de certificación mexicanos (CONOCER). La IA actúa como pipeline multi-agente (no chatbot): extrae datos del cliente, genera borradores paralelos con especialistas de distinta capacidad, los evalúa con un juez y entrega un documento final limpio.

---

### Dominio declarado

| Campo | Valor |
|:---|:---|
| **Estándar primario** | EC0366 — Diseño de Cursos de Capacitación (CONOCER México) |
| **Elementos certificables** | E1219 (Diseño instruccional F0–F3), E1220 (Producción F4), E1221 (Verificación F5–F6) |
| **Stakeholders** | Instructores que buscan certificación CONOCER |
| **Entregables** | 12 fases, 8 productos de producción EC0366, todos los documentos de diseño instruccional |
| **Estándar secundario** | EC0249 — Consultoría Empresarial (microsite CCE, en desarrollo) |

---

### Restricciones de dominio verificables (Acid Test F6)

Extraídas de EC0366 y declaradas en el sistema:

1. **E1219:** El informe de necesidades debe incluir Q&A completo del cliente + brechas + objetivos + perfil del participante
2. **E1220:** Los 8 productos deben tener estructura específica por tipo (manual participante, instrumentos de evaluación, guiones multimedia, etc.)
3. **Ponderaciones:** Las ponderaciones de instrumentos de evaluación deben sumar 100%
4. **Número mínimo de preguntas:** Los instrumentos de evaluación tienen un mínimo por tipo
5. **Fechas:** Formato DD/MM/YYYY obligatorio en todos los documentos
6. **No hay referencias inventadas:** Prohibición de URLs, autores o referencias que el LLM invente
7. **No hay placeholders:** El documento final no puede contener `{variable_no_resuelta}` ni texto tipo `[COMPLETAR]`
8. **Idioma:** Todo en español, sin Prompt Bleeding en inglés

---

### Resultado central esperado

Un instructor que usa KnowTo obtiene todos los documentos técnicos requeridos por EC0366 para solicitar su certificación ante el CONOCER, con calidad suficiente para ser aprobados por el evaluador del estándar.

---

### Arquitectura declarada

```
nginx (puerto 80)
├── dcfl.localhost  → frontend-dcfl (Vite :5173) — EC0366 ACTIVO
├── cce.localhost   → frontend-cce  (Vite :5175) — EC0249 EN DESARROLLO
├── localhost       → frontend-root (Vite :5174)
└── api.localhost   → backend (Hono :8787)
                        ├── /dcfl/* → DCFL router
                        └── /cce/*  → CCE router
```

### Pipeline multi-agente (patrón)

```
extractor (TS — JSON, sin LLM)
    ↓
agente_A (especialista, model-light) ──┐
                                        ├→ juez (evalúa, elige ganador)
agente_B (especialista, model-heavy) ──┘
    ↓
validador (TS — invariantes del dominio, sin LLM)
    ↓
sintetizador_final (TS — ensambla documento)
```

---

### Estado de desarrollo declarado vs real

| Aspecto | Declarado (PROYECTO.md) | Real (observado) |
|:---|:---|:---|
| Fases wizard | F0–F6 (12 pasos) | F0–F7 + TEMARIO (más fases no documentadas) |
| Productos F4 | 8 productos | 8 productos ✅ |
| Migraciones | 000–017 (aprox) | 000–047 + 2 fix files (48 migraciones) |
| Modelo Ollama | `llama3.2:3b` | `qwen2.5:14b` + `gemma2:27b` |
| Tests | 152 (README) | Más suites (nuevos assembler tests, EC0366 rules, etc.) |
| Estructura dirs | `backend/`, `frontend/` en raíz | `src/backend/`, `src/frontend/` (reorganización en curso) |

**Confidence F-1:** 85 (descripción de dominio clara; algunas discrepancias estado real vs documentado ya identificadas)
