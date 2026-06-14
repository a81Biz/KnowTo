---
ptsa_version: 2.0
motor_version: 4.1
fase: F0
estado: COMPLETADA
ultima_actualizacion: 2026-06-13
confidence: 95
---

# F0 — Inventario del Sistema

## Update U-001 | Timestamp: 2026-06-13 23:15

---

## 1. Repositorio y Estado Git

| Campo | Valor |
|:---|:---|
| Ruta | `c:\DevOps\Desarrollos\KnowTo` |
| Rama activa | `master` |
| Commit HEAD | `4c1af3a` |
| Estado git | Reorganización estructural en curso: ~200+ archivos `D` (deleted), `src/` como `??` (untracked) |

**Cambio estructural detectado:** Todo el código fue movido de:
- `backend/` → `src/backend/`
- `frontend/` → `src/frontend/`
- `nginx/` → `src/nginx/`
- `supabase/` → `src/supabase/`

El `docker-compose.yml` ya refleja la nueva estructura. Git NO trackea el nuevo `src/` aún.

---

## 2. Stack Técnico Real

| Capa | Tecnología | Versión/Detalle |
|:---|:---|:---|
| Contenedor | Docker Compose | 13 servicios activos |
| Reverse proxy | nginx:alpine | Único puerto 80 expuesto |
| Backend | Node.js 20 + Hono | :8787 (healthy) |
| Frontend DCFL | Vite :5173 | TypeScript vanilla, sin framework |
| Frontend CCE | Vite :5175 | TypeScript vanilla, sin framework |
| Frontend Root | Vite :5174 | Directorio de microsites |
| IA (dev) | Ollama qwen2.5:14b + gemma2:27b | Actualización desde llama3.2:3b |
| BD | PostgreSQL 15 + Supabase self-hosted | knowto-supabase-db (healthy) |
| BD Gateway | Supabase Kong :54321 | (healthy) |
| BD Auth | Supabase GoTrue v2.151.0 | |
| BD Realtime | Supabase Realtime v2.28.32 | |
| BD REST | PostgREST v12.2.0 | |
| BD Meta | postgres-meta v0.84.2 | |
| BD Studio | supabase/studio:2026.04.13 | (unhealthy — bug cosmético conocido) |

---

## 3. Inventario de Módulos Backend (`src/backend/src/`)

### Core (compartido entre microsites)
| Módulo | Archivos clave |
|:---|:---|
| `core/middleware/` | `auth.middleware.ts`, `error.middleware.ts` |
| `core/parsers/` | `table.parser.ts` |
| `core/prompts/` | `registry.ts` (PromptRegistry) |
| `core/repositories/` | `base.repository.ts`, `fase0.repository.ts`, `preguntas.repository.ts` |
| `core/services/` | `ai.service.ts`, `context-extractor.service.ts`, `crawler.service.ts`, `llm.provider.ts`, `pipeline-jobs.service.ts`, `pipeline-orchestrator.service.ts`, `preguntas.service.ts`, `supabase.service.ts`, `upload.service.ts`, `web-search.service.ts` |
| `core/types/` | `env.ts`, `modules.d.ts`, `pipeline.types.ts` |
| `core/websocket/` | `manager.ts` **(nuevo — no en docs)** |

### DCFL (EC0366)
| Módulo | Archivos clave |
|:---|:---|
| `dcfl/agents/` | `query-generator.agent.ts`, `questions-generator.agent.ts`, `recommendations-generator.agent.ts` **(nuevos)** |
| `dcfl/api/` | **(nuevo — no en docs)** |
| `dcfl/constants/` | **(nuevo)** |
| `dcfl/handlers/` | `discrepancy.handlers.ts`, `document.handlers.ts`, `extract.handlers.ts`, `f0-f4 handlers`, `judges.handler.ts`, `phase.handlers.ts`, `project.handlers.ts`, `questions.handlers.ts`, `step.handlers.ts`, `test.handlers.ts` |
| `dcfl/handlers/phases/` | `f0.phase.ts`, `f1.phase.ts`, `f2.phase.ts`, `f3.phase.ts`, `f4.phase.ts`, `temario.phase.ts` **(nueva fase temario)** |
| `dcfl/handlers/phases/products/` | 8 handlers + 8 assemblers para productos F4 |
| `dcfl/helpers/` | `pipeline-router.helper.ts` + helpers específicos |
| `dcfl/prompts/templates/` | 33 templates `.md` (F0–F7, EXTRACTOR, TEMARIO_BASE, F4_P1–P8 × FORM_SCHEMA + GENERATE_DOCUMENT) |
| `dcfl/repositories/` | **(nuevo)** |
| `dcfl/schemas/` | **(nuevo — schemas Zod/OpenAPI)** |
| `dcfl/services/` | `supabase.service.ts` |
| `dcfl/types/` | tipos por microsite |

### CCE (EC0249)
| Módulo | Estado |
|:---|:---|
| `cce/` completo | Microsite secundario, en desarrollo |

---

## 4. Base de Datos — Schema real (29 tablas)

Obtenido via `psql` directo al contenedor:

| Tabla | Propósito | ¿En README? |
|:---|:---|:---:|
| `projects` | Proyectos por cliente | ✅ |
| `wizard_steps` | Inputs del usuario por paso | ✅ |
| `documents` | Documentos generados | ✅ |
| `pipeline_jobs` | Jobs de IA asincrónos | ✅ |
| `pipeline_agent_outputs` | Output por agente (checkpointing) | — |
| `preguntas_fase` | Preguntas generadas por IA | — |
| `respuestas_preguntas_fase` | Respuestas del cliente | ❌ |
| `fase1_informe_necesidades` | Q&A F1 + perfil participante | — |
| `fase2_analisis_alcance` | Módulos, modalidad, plataforma | — |
| `fase2_5_recomendaciones` | Recomendaciones multimedia | — |
| `fase2_resolucion_discrepancias` | Resolución F1 vs F2 | — |
| `fase3_especificaciones` | Especificaciones técnicas | — |
| `fase4_productos` | 8 productos EC0366 | ✅ |
| `producto_form_schemas` | Schemas de formulario F4 | — |
| `f2_jueces_decisiones` | Decisiones de juez F2 | ❌ |
| `fase0_componentes` | Componentes estructurados F0 | ❌ |
| `fase0_jueces_decisiones` | Decisiones de juez F0 | ❌ |
| `temario_base` | Temario canónico (ancla F4) | ❌ |
| `site_prompts` | Prompts unificados por microsite | ✅ |
| `extracted_contexts` | Contextos extraídos | — |
| `profiles` | Perfiles de usuario | — |
| `expediente_aprobaciones` | Aprobaciones por fase | ❌ |
| `artifact_versions` | Versiones de artefactos | ❌ |
| `test_run_logs` | Logs del test runner F4 | ❌ |
| `cce_*` (4 tablas) | Tablas del microsite CCE | — |
| `schema_migrations` | Control de migraciones | — |

**Total migrationesreales:** 48 archivos (000–047) + 2 fix files  
**README menciona:** Solo hasta migration 010

---

## 5. Tests

| Métrica | README | Real |
|:---|:---|:---|
| Test files | ~13 suites | **29 suites** |
| Tests pasando | 152 | **270** |
| Duración | — | 3.55s |

Nuevas suites detectadas (no en README):
- `assemblers/p5-p8-assembler.test.ts` (x4)
- `assemblers/temario-assembler.test.ts`
- `helpers/assembler-utils.test.ts`, `doc-sanitizer-h8.test.ts`, `ec0366-rules.test.ts`
- `helpers/p1-retry.test.ts`, `p4-chapter.test.ts`, `p4-orchestrator.test.ts`
- `helpers/step-complete-h1.test.ts`
- `routes/certification.e2e.test.ts`
- `services/artifact-version.test.ts`

**Errores en stderr durante tests (tests pasan pero hay errores no verificados):**
- `TypeError: supabase.getProjectSoul is not a function` (document.handlers.ts:209)
- `TypeError: supabase.getFase0Estructurado is not a function` (document.handlers.ts:231)
- `enrichContextWithOSINT falló: Cannot read properties of null (reading 'from')`
- `[WebSearchService] TAVILY_API_KEY no configurada`

**Nota:** Los métodos existen en producción (`dcfl/services/supabase.service.ts` y `core/services/supabase.service.ts`). El error es en el mock de tests que no implementa estos métodos.

---

## 6. Wizard — Fases reales vs documentadas

| Fase | Documentada | Estado real |
|:---|:---:|:---:|
| F0 Marco de Referencia | ✅ | ✅ |
| F1 Informe Necesidades | ✅ | ✅ |
| F2 Análisis/Estructuración | ✅ | ✅ |
| F2b Discrepancias | ✅ | ✅ |
| F2.5 Recomendaciones | ✅ | ✅ |
| F3 Especificaciones | ✅ | ✅ |
| TEMARIO_BASE | ❌ | ✅ Existe (`temario.phase.ts`, tabla `temario_base`) |
| F4 Producción (8 productos) | ✅ | ✅ |
| F5 Verificación | ✅ | ✅ |
| F6 Ajustes | ✅ | ✅ |
| F7 Resumen Proceso | ❌ | ✅ Existe (`F7-resumen-proceso.md`) |

---

## 7. Prompts Templates

**33 templates `.md`** en `src/backend/src/dcfl/prompts/templates/`:
- F0 a F7 (incluyendo F7 no documentado)
- EXTRACTOR.md
- TEMARIO_BASE.md
- F4_P1–P8: cada uno con FORM_SCHEMA + GENERATE_DOCUMENT (algunos con templates adicionales)
- F4_P3_ORCHESTRATOR.md (orchestrador específico)
- F4_P4_CHAPTER.md + F4_P4_GENERATE_CHAPTER.md

**Confidence F0:** 95
