# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development (Docker — recommended)
```bash
docker compose up -d          # Start everything
docker compose logs -f nginx  # Watch routing logs
docker compose restart nginx  # Reload nginx config without full restart
```

### Backend (standalone)
```bash
cd backend
npm run dev          # Node.js dev server on :8787 (with .dev.vars env)
npm run dev:debug    # Same with debugger on :9229
npm test             # Run all Vitest tests
npm run test:watch   # Watch mode
npm run test:prompts # Run only prompt tests with verbose output
```

### Frontend (standalone)
```bash
cd frontend/dcfl && npm run dev   # DCFL microsite on :5173
cd frontend/cce  && npm run dev   # CCE microsite on :5175
cd frontend/root && npm run dev   # Root portal on :5174
```

### Single test file
```bash
cd backend && npx vitest run src/__tests__/services/ai.service.test.ts
```

### Prerequisites (one-time per machine)
Add to the OS hosts file (`C:\Windows\System32\drivers\etc\hosts` on Windows, needs admin):
```
127.0.0.1  dcfl.localhost
127.0.0.1  cce.localhost
127.0.0.1  api.localhost
```

### Local URLs
| URL | Service |
|:----|:--------|
| `http://localhost` | Root portal |
| `http://dcfl.localhost` | DCFL microsite |
| `http://cce.localhost` | CCE microsite |
| `http://api.localhost/docs` | Swagger UI (Scalar) |
| `http://api.localhost/health` | API health check |
| `http://localhost:54321` | Supabase Kong (API gateway) |
| `http://localhost:54323` | Supabase Studio |
| `http://localhost:11434` | Ollama (local LLM) |

---

## Architecture

### Multi-microsite structure

```
nginx (port 80)
├── dcfl.localhost  → frontend-dcfl (Vite :5173)
├── cce.localhost   → frontend-cce  (Vite :5175)
├── localhost       → frontend-root (Vite :5174)
└── api.localhost   → backend (Hono :8787)
                        ├── /dcfl/*  → DCFL router
                        └── /cce/*   → CCE router
```

The backend is a single Hono server (`src/index.ts`) with one router per microsite registered under its slug prefix. Each microsite has its own frontend bundle, API routes, and DB tables — all sharing the same PostgreSQL instance.

### Backend structure (`backend/src/`)
- `index.ts` — API gateway entry point; registers microsite routers; handles CORS (dynamic apex detection, no hardcoded domains)
- `core/` — Shared services, types, and middleware used by all microsites
  - `services/pipeline-orchestrator.service.ts` — Generic multi-agent pipeline runner; accepts `SiteConfig` in constructor so any microsite can reuse it
  - `services/ai.service.ts` — Unified AI service: runs multi-agent pipelines or legacy mono-prompt; wraps `ILLMProvider`
  - `services/llm.provider.ts` — `ILLMProvider` interface; switches between Ollama (dev) and Cloudflare Workers AI (prod)
  - `services/supabase.service.ts` — Core Supabase client; audit before modifying (used across the entire project)
- `dcfl/` — DCFL microsite (EC0366 — Diseño de Cursos)
  - `router.ts` — Loads `flow-map.yaml` at startup, builds `SiteConfig`, registers routes
  - `prompts/templates/` — All pipeline prompt files (`.md` with YAML frontmatter)
  - `prompts/flow-map.yaml` — Pipeline definitions for all DCFL phases
  - `handlers/phases/` — Phase-specific business logic (`f0.phase.ts` … `f4.phase.ts`)
  - `helpers/pipeline-router.helper.ts` — **Phase Gateway**: dispatches `PipelineEvent` to the correct phase handler by `promptId`
- `cce/` — CCE microsite (EC0249 — Consultoría)

### Multi-agent pipeline pattern (per phase)

```
extractor (TS code — JSON extraction, no LLM)
    ↓
agente_A (specialist, llama-3.1-8b) ─┐
                                       ├→ juez (evaluates, picks winner)
agente_B (specialist, llama-3.3-70b) ─┘
    ↓
validador (TS code — enforces invariants, no LLM)
    ↓
sintetizador_final (TS code — assembles the final document)
```

Validators and final synthesizers are pure TypeScript (no LLM) — they enforce standard-specific invariants (e.g., weights sum to 100%, minimum number of questions).

### Prompt format
All prompts live as `.md` files in `src/dcfl/prompts/templates/`. Each file has a YAML frontmatter block defining `id`, `name`, and the `pipeline_steps` array. Never use plain `.yaml` files for prompts.

### Supabase connectivity (two different URLs)
- **Backend → Supabase**: connects via `http://supabase-kong:8000` (internal Docker network)
- **Frontend → Supabase**: connects via `http://localhost:54321` (external, from the browser)

### DB migrations
Ordered SQL files in `supabase/migrations/` (prefix `NNN_name.sql`). Applied automatically by Docker on first startup via `docker-entrypoint-initdb.d`.

---

## Architecture rules (from `AI_ARCHITECTURE_RULES.md`)

1. **Phase Gateway is read-only** — Do not add business logic to `pipeline-router.helper.ts`. It only dispatches by `promptId`. All phase-specific logic belongs in `src/dcfl/handlers/phases/fX.phase.ts`.

2. **Assemblers must return `finalDoc`** — When a handler is an assembler (`ensamblador_fX`), it must `return finalDoc` explicitly so the gateway can intercept the string and overwrite the raw LLM output in the DB (`pipeline_agent_outputs`).

3. **One prompt format** — Prompts are `.md` files with YAML frontmatter in `src/dcfl/prompts/templates/`. Never use native `.yaml` files for pipeline definitions.

4. **Battle pattern** — Complex cognitive tasks use: Specialist A + Specialist B → Judge (returns `{"seleccion": "A"|"B", "razon": "..."}`) → Assembler (pure TS, picks winner and builds final document).

5. **Audit before modifying shared services** — Before changing functions in `supabase.service.ts` or any shared parser, grep for all callers in the project to avoid breaking existing pipelines.

---

## Fase 4 — Productos (F4_P1 … F4_P8)

### Flujo de datos F4

Cada producto F4 corre como un job independiente por módulo/unidad. El frontend lanza N jobs (uno por unidad) y al completar todos llama `_loadProductsFromBD` para mostrar el documento ensamblado.

```
Frontend (step4.production.ts)
  └─ por cada unidad: POST /dcfl/wizard/generate (jobId único)
       └─ ai.service.ts: detecta agente ensamblador → llama _handleAssemblyAgent (retorna '')
            └─ onAgentOutput callback → dispatchAgentEvent (pipeline-router.helper.ts)
                 └─ handleF4Events (f4.phase.ts) → handler específico del assembler
                      └─ lee outputs de agentes A/B/juez desde pipeline_agent_outputs
                           └─ guarda documento ensamblado en fase4_productos
                                └─ retorna documentoFinal (string)
  └─ al terminar todos los jobs: _loadProductsFromBD → muestra documento
```

### Registro de assemblers (f4.phase.ts — productHandlers)

El nombre del agente en el template YAML **debe coincidir exactamente** con la clave en `productHandlers`. Este fue el bug original de P5-P8.

| Template prompt | agent name en YAML | Handler registrado |
|---|---|---|
| F4_P1_GENERATE_DOCUMENT | `ensamblador_doc_p1` | `handleDocumentP1Assembler` |
| F4_P2_GENERATE_DOCUMENT | `ensamblador_doc_p2` | `handleDocumentP2Assembler` |
| F4_P3_GENERATE_DOCUMENT | `ensamblador_doc_p3` | `handleDocumentP3Assembler` |
| F4_P4_GENERATE_DOCUMENT | `ensamblador_doc_generic` | `handleDocumentP4Assembler` |
| F4_P5_GENERATE_DOCUMENT | `ensamblador_doc_p5` | `handleDocumentP5Assembler` |
| F4_P6_GENERATE_DOCUMENT | `ensamblador_doc_p6` | `handleDocumentP6Assembler` |
| F4_P7_GENERATE_DOCUMENT | `ensamblador_doc_p7` | `handleDocumentP7Assembler` |
| F4_P8_GENERATE_DOCUMENT | `ensamblador_doc_p8` | `handleDocumentP8Assembler` |

### Reglas críticas de los assemblers F4

- **JSON.parse del juez siempre en try-catch** — El LLM a veces produce `{seleccion: "A"}` con claves sin comillas, lo que es JSON inválido. Patrón correcto:
  ```typescript
  let decision: { seleccion?: string } = { seleccion: 'A' };
  try { if (juezMatch) decision = JSON.parse(juezMatch[0]); } catch {}
  ```
  Si se escribe `const decision = juezMatch ? JSON.parse(juezMatch[0]) : { seleccion: 'A' }` **sin try-catch**, el assembler explota silenciosamente y el producto no se guarda.

- **extractAny siempre con try-catch** — Mismo problema: el output de los especialistas puede contener `{variable_no_resuelta}` que el regex matchea pero JSON.parse no puede parsear.

- **pipeline-router.helper.ts re-guarda el resultado** — El `dispatchAgentEvent` para F4 (branch C) debe hacer `saveAgentOutput(jobId, agentName, result)` con el string devuelto por el assembler. Sin esto, `pipeline_agent_outputs.output` queda vacío para el agente ensamblador y el job puede parecer completado con contenido vacío.

- **Acumulación por módulos en BD** — Los assemblers P5-P8 leen el registro anterior de `fase4_productos` (campo `datos_producto.partes`), agregan el módulo actual y reescriben el documento final completo. `saveF4Produto` hace DELETE del registro 'aprobado' existente antes del INSERT.

- **validacion_estado VARCHAR(30)** — Migration 035 amplió la columna de 20 a 30 chars para soportar `'aprobado_por_fallback'` (21 chars) usado en fallbacks de p1 y document-generic assemblers.

### Cómo diagnosticar problemas F4

```bash
# Ver si el assembler corrió y qué guardó
docker exec knowto-supabase-db psql -U postgres -d postgres \
  -c "SELECT producto, validacion_estado, created_at FROM fase4_productos ORDER BY created_at DESC LIMIT 10;"

# Ver outputs de todos los agentes de un job
docker exec knowto-supabase-db psql -U postgres -d postgres \
  -c "SELECT agent_name, LEFT(output,100) FROM pipeline_agent_outputs WHERE job_id='<UUID>' ORDER BY created_at;"

# Ver logs del assembler en tiempo real
docker logs knowto-backend 2>&1 | grep -E "p5-assembler|p6-assembler|p7-assembler|p8-assembler|assembler.*falló"
```

**Señal de bug**: `[PIPELINE] assembler ensamblador_doc_pN falló: Expected property name or '}' in JSON at position 1` → JSON.parse sin try-catch en el assembler.

**Señal de bug**: assembler no aparece en logs pero el job completa → el nombre del agente en el template no coincide con `productHandlers` en `f4.phase.ts`.

### Docker — backend NO usa nodemon

El backend corre con `tsx` directamente (no nodemon). **Requiere reinicio manual** para cargar cambios:
```bash
docker compose restart backend
```
Los cambios en archivos `.ts` no se recargan automáticamente.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- ALWAYS read graphify-out/GRAPH_REPORT.md before reading any source files, running grep/glob searches, or answering codebase questions. The graph is your primary map of the codebase.
- IF graphify-out/wiki/index.md EXISTS, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
