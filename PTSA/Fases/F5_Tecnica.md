---
ptsa_version: 2.0
motor_version: 4.1
fase: F5
estado: COMPLETADA
ultima_actualizacion: 2026-06-13
confidence: 87
---

# F5 — Auditoría Técnica

## Update U-001 | Timestamp: 2026-06-13 23:35

---

## 1. Schema Real de la Base de Datos (verificado via psql)

### Tablas clave — columnas seleccionadas

**`fase4_productos`** (Migration 019 + 025 + 035 + 041)
| Columna | Tipo | Nullable | Notas |
|:---|:---|:---:|:---|
| id | uuid | NO | PK |
| project_id | uuid | NO | FK → projects |
| producto | varchar(10) | NO | P1–P8 |
| documento_final | text | YES | Documento ensamblado |
| borrador_a / borrador_b | text | YES | Outputs de especialistas |
| juez_decision | jsonb | YES | Selección A o B |
| validacion_estado | varchar(30) | NO | **30 chars** (migration 035 fix) |
| datos_certificacion | jsonb | YES | cert_score del EC0366RulesEngine |
| active_artifact_id | uuid | YES | FK → artifact_versions |
| version | integer | NO | Control de versiones |

**`projects`** (Migration 001 + incrementales)
| Columna | Tipo | Notable |
|:---|:---|:---|
| project_soul | text | YES | Project Soul (semantic anchor) |
| project_brief | jsonb | YES | Ancla semántica (migration 040) |

**`temario_base`** (Migration 038)
| Columna | Tipo | Notable |
|:---|:---|:---|
| temario | jsonb | NO | Estructura del temario (módulos, unidades, objetivos) |
| tiempos | jsonb | YES | Tiempos por módulo |
| confirmado_por_usuario | boolean | NO | Aprobación explícita del usuario |

**`artifact_versions`** (Migration 046) — NUEVO, no documentado
| Columna | Tipo | Notas |
|:---|:---|:---|
| product_code | varchar(10) | Ej: P1, P2 |
| version | integer | Control de versión |
| artifact | jsonb | Artefacto estructurado |
| documento_md | text | Markdown del documento |
| prompt_template_id / version | varchar | Trazabilidad de prompt |
| prompt_hash | varchar(64) | SHA256 del prompt usado |
| cert_score | jsonb | Score de certificación |
| correction_log | jsonb | Log de correcciones aplicadas |
| model | varchar(100) | Modelo LLM usado |

---

## 2. Seguridad

### Autenticación (`core/middleware/auth.middleware.ts`)

| Aspecto | Estado | Notas |
|:---|:---|:---|
| Dev bypass token | ✅ Seguro | Solo acepta `dev-local-bypass` literal; rechaza cualquier otro |
| Prod JWT | ✅ Seguro | Valida via Supabase `getUser()` |
| Bypass en producción | ✅ Imposible | `dev-local-bypass` es string literal sin firma JWT; `getUser()` lo rechazará |
| User isolation | ✅ | `userId` extraído del JWT y usado en queries |

### Variables de entorno sensibles

| Variable | En docker-compose | En .dev.vars | En git |
|:---|:---:|:---:|:---:|
| SUPABASE_SERVICE_ROLE_KEY | Hardcoded (dev key) | — | ❌ |
| JWT_SECRET | Hardcoded (dev value) | — | ❌ |
| TAVILY_API_KEY | Dev key hardcoded | — | ❌ |
| POSTGRES_PASSWORD | Default (supabase123) | — | ❌ |

**Hallazgo:** Las claves en `docker-compose.yml` son valores de desarrollo, no sensibles para producción. El deploy a producción requiere `wrangler secret put`. No hay secretos de producción en el repositorio.

---

## 3. WebSearchService / OSINT Integration (NUEVO — no documentado)

| Aspecto | Estado |
|:---|:---|
| Implementación | `core/services/web-search.service.ts` — Tavily API |
| Integración | `dcfl/helpers/osint.helper.ts` → `enrichContextWithOSINT()` |
| Llamado en | `document.handlers.ts:405` — antes de los pipelines LLM |
| Fallo silencioso | ✅ catch en línea 407 — continúa sin OSINT si falla |
| En tests | Mock presente (`p4-orchestrator.test.ts`) pero mock roto en `wizard.async.e2e.test.ts` |
| En dev local | `TAVILY_API_KEY=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` en docker-compose |
| En `.dev.vars` | ❌ No presente — tests nativos fallan silenciosamente |

---

## 4. EC0366RulesEngine — Integración al Pipeline

| Aspecto | Estado |
|:---|:---|
| Integrado en P1 assembler | ✅ |
| Integrado en P2 assembler | ✅ |
| Integrado en P3 assembler | ✅ |
| Integrado en P4 assembler | ✅ |
| Integrado en P5 assembler | ✅ |
| Integrado en P6 assembler | ✅ |
| P7/P8 assemblers | Verificar (no listados en grep) |
| Factory pattern | ✅ `CertificationEngineFactory.getEngine(estandarNorma)` |
| NullRulesEngine fallback | ✅ Cuando estandarNorma es null/unknown |
| Auto-corrección ponderaciones | ✅ Para P1 con WEIGHT_ROUNDING ≤ threshold |

---

## 5. Estados de validación observados en BD (real)

Documentados en CLAUDE.md:
- `aprobado`
- `aprobado_por_fallback`
- `revision_humana`

**Observados en BD real (no documentados):**
- `rejected` ← P1 rechazado por violaciones de dominio
- `aprobado_con_errores` ← P4 aprobado con violaciones detectadas pero no bloqueantes

→ Esto genera el **H-007** (documentación incompleta de estados).

---

## 6. p1-retry.helper.ts — Mecanismo de reintento para P1

Existe `p1-retry.helper.ts` con tests `p1-retry.test.ts`. Este mecanismo permite reintentar la generación de P1 cuando el motor de certificación detecta violaciones. Investigar en F6 si el reintento mejora el output.

---

## 7. Migraciones — Estado real

**48 migraciones** ejecutadas (000–047) + 2 fix files.
El script `docker-entrypoint-initdb.d` las aplica automáticamente al iniciar el contenedor.

Migraciones nuevas no mencionadas en CLAUDE.md:
- 037: Fix Realtime tenant JWT secret
- 038: Temario base (tabla `temario_base`)
- 039: Expediente de aprobaciones
- 040: Project Brief (Semantic Anchor Layer)
- 041: fase4_productos full unique constraint
- 042: Test run logs
- 043: Reset project function
- 044: Add missing FKs
- 045: CCM columns
- 046: Artifact versions (versioning system)
- 047: pipeline_agent_outputs prompt version

**Confidence F5:** 87
