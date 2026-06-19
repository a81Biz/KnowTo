# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

It has four parts:

1. **Project Reference** — how to run, build and reason about the KnowTo codebase.
2. **FDGE** — the binding development framework (any code/doc/refactor/investigation work).
3. **PTSA V3** — the binding audit & certification framework (activated only on explicit trigger).
4. **FPGE** — the binding prioritization framework that closes the loop `FDGE → PTSA → FPGE → FDGE` (activated only on explicit trigger).

---

# Part 1 — Project Reference

## Commands

### Development (Docker — recommended)
```bash
docker compose up -d          # Start everything
docker compose logs -f nginx  # Watch routing logs
docker compose restart nginx  # Reload nginx config without full restart
```

### Backend (standalone)
```bash
cd src/backend
npm run dev          # Node.js dev server on :8787 (with .dev.vars env)
npm run dev:debug    # Same with debugger on :9229
npm test             # Run all Vitest tests
npm run test:watch   # Watch mode
npm run test:prompts # Run only prompt tests with verbose output
```

### Frontend (standalone)
```bash
cd src/frontend/dcfl && npm run dev   # DCFL microsite on :5173
cd src/frontend/cce  && npm run dev   # CCE microsite on :5175
cd src/frontend/root && npm run dev   # Root portal on :5174
```

### Single test file
```bash
cd src/backend && npx vitest run src/__tests__/services/ai.service.test.ts
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
| `http://localhost:54200` | Supabase Kong (API gateway) |
| `http://localhost:54210` | Supabase Studio |
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

### Backend structure (`src/backend/src/`)
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
All prompts live as `.md` files in `src/backend/src/dcfl/prompts/templates/`. Each file has a YAML frontmatter block defining `id`, `name`, and the `pipeline_steps` array. Never use plain `.yaml` files for prompts.

### Supabase connectivity (two different URLs)
- **Backend → Supabase**: connects via `http://supabase-kong:8000` (internal Docker network)
- **Frontend → Supabase**: connects via `http://localhost:54200` (external, from the browser)

### DB migrations
Ordered SQL files in `src/supabase/migrations/` (prefix `NNN_name.sql`). Applied automatically by Docker on first startup via `docker-entrypoint-initdb.d`.

### Docker — backend does NOT use nodemon
The backend runs with `tsx` directly (no nodemon). **It requires a manual restart to load changes:**
```bash
docker compose restart backend
```
Changes to `.ts` files are not hot-reloaded.

---

## Architecture rules (from `AI_ARCHITECTURE_RULES.md`)

1. **Phase Gateway is read-only** — Do not add business logic to `pipeline-router.helper.ts`. It only dispatches by `promptId`. All phase-specific logic belongs in `src/dcfl/handlers/phases/fX.phase.ts`.

2. **Assemblers must return `finalDoc`** — When a handler is an assembler (`ensamblador_fX`), it must `return finalDoc` explicitly so the gateway can intercept the string and overwrite the raw LLM output in the DB (`pipeline_agent_outputs`).

3. **One prompt format** — Prompts are `.md` files with YAML frontmatter in `src/dcfl/prompts/templates/`. Never use native `.yaml` files for pipeline definitions.

4. **Battle pattern** — Complex cognitive tasks use: Specialist A + Specialist B → Judge (returns `{"seleccion": "A"|"B", "razon": "..."}`) → Assembler (pure TS, picks winner and builds final document).

5. **Audit before modifying shared services** — Before changing functions in `supabase.service.ts` or any shared parser, grep for all callers in the project to avoid breaking existing pipelines.

---

## Fase 4 — Productos (F4_P1 … F4_P8)

### Orden de Producción F4 (CRÍTICO)

P4 (Manual del Participante) es la FUENTE DE VERDAD — siempre se genera primero.
P3 (Guiones Multimedia) debe generarse ANTES que P2 (Presentación Electrónica).

```
P4 → P1 → P3 → P2 → P5 → P7 → P6 → P8
```

P1 lee `productos_previos.P4` para alinear unidades evaluadas con el Manual.
P3 lee `productos_previos.P4.capitulos[n].secciones_json` para guiones coherentes.
P2 lee `produtos_previos.P3` para que `juez_presentacion` evalúe alineación real con los guiones.

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

- **doc-sanitizer.helper.ts** — Post-procesador aplicado en TODOS los assemblers antes de `saveF4Produto`:
  - `sanitizeProductDocument(doc, 'Pn')`: convierte YYYY-MM-DD → DD/MM/YYYY, detecta placeholders
  - `deduplicarGlosario(doc)`: elimina términos duplicados en tabla de glosario (P7)
  - `enforceModalidad(doc, modalidad)`: alinea modalidad con la canónica de F3 (P6)

- **_reglas_globales en enrichedContext** — Inyectado en todos los pipelines desde `document.handlers.ts`. Incluye: separación EC0366 (estándar) vs. courseName (tema); prohibición de referencias inventadas; prohibición de placeholders; formato DD/MM/YYYY obligatorio.

- **project_brief (Semantic Anchor Layer)** — Columna JSONB en `projects` (migration 040). Campos: `nombreOficialCurso`, `dominioTecnico`, `resultadoCentral`, `audienciaPrimaria`. Capturados en Step 0, persistidos al inicio de cualquier job F0. Inyectados como `_projectBrief` y `_frozen.*` como PRIMEROS campos del enrichedContext (antes de `_projectSoul`). Son la fuente de verdad inmutable — evitan semantic drift entre fases.

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

---

## TEMARIO_BASE

Gate obligatorio antes de cualquier producción F4. Si `confirmado_por_usuario === false`, el área de generación de productos queda oculta en `mount()`.

### Tabla BD
```sql
temario_base (project_id UNIQUE, temario JSONB, tiempos JSONB,
              duracion_total_minutos INT, total_unidades INT,
              confirmado_por_usuario BOOLEAN DEFAULT false, confirmado_at TIMESTAMPTZ)
```
- `temario` = `[{modulo, unidades:[{nombre, objetivo_bloom, duracion_minutos, tipo_evaluacion}]}]`
- `tiempos` = `[{modulo, duracion_total_minutos, justificacion}]`

### Endpoints
| Método | URL | Descripción |
|---|---|---|
| GET | `/dcfl/api/temario/:projectId` | Devuelve temario o `{confirmado_por_usuario: false}` si no existe |
| PATCH | `/dcfl/api/temario/:projectId/confirm` | Confirma temario; body opcional: `{ediciones:{temario?,tiempos?}}` |

### Pipeline TEMARIO_BASE
Prompt: `TEMARIO_BASE.md` — agnóstico, sin referencias a EC0366/CONOCER/SEP.

```
extractor_temario (TS) → agente_estructura_A + agente_estructura_B → juez_estructura
                       → agente_tiempos_A + agente_tiempos_B → juez_tiempos
                       → ensamblador_temario (TS)
```

**Assembler `ensamblador_temario`** (`temario.phase.ts`):
- Lee `juez_estructura` y `juez_tiempos` de `pipeline_agent_outputs`.
- Selecciona ganador, fusiona, valida verbos Bloom prohibidos (Conocer, Entender, Saber, Comprender, Aprender, Familiarizar).
- Valida aritmética: `sum(duracion_minutos) = duracion_total_minutos`.
- UPSERT en `temario_base` vía `saveTemarioBase()`.

**Gate en `mount()` (step4.production.ts):**
- Si `!_temarioConfirmado` → muestra bloque ámbar con botones "Generar Temario" y "Confirmar Temario".
- `_showGenerateArea()` solo se llama cuando `_temarioConfirmado === true`.

**Gate duro para regeneración** (`document.handlers.ts`): bloquea regeneración de `TEMARIO_BASE` cuando ya existen productos F4 aprobados → devuelve job fallido inmediatamente.

### Archivos clave
- `src/backend/src/dcfl/prompts/templates/TEMARIO_BASE.md`
- `src/backend/src/dcfl/handlers/phases/temario.phase.ts`
- `src/backend/src/dcfl/routes/temario.route.ts`
- `src/supabase/migrations/038_temario_base.sql`

### Diagnóstico
```bash
docker exec knowto-supabase-db psql -U postgres -d postgres \
  -c "SELECT project_id, total_unidades, confirmado_por_usuario FROM temario_base;"
```

---

## F7 — Step 11 (Cierre / Resumen Cualitativo)

Genera el resumen cualitativo del proceso de certificación. **Sí invoca LLM.**

- `promptId: 'F7'`, `phaseId: 'F7'` — ver `step11.closing.ts`.
- `allowManualOverride: false` — el textarea de notas viene del template HTML (`tpl-step9-closing.html`), no de la clase base.
- Botón `#btn-download-expediente` deshabilitado hasta que `wizardStore.getState().steps[5]?.status === 'completed'` (verificado en `mount()`).

**Post-PT-129:** F7 pasará a Battle Pattern completo (agente_resumen_A + agente_resumen_B → juez_resumen → ensamblador_resumen TS). El ensamblador guardará en la tabla `documents` con `phase = 'F7'`. Hasta entonces opera como single-agent legacy (`{{context}}`).

**Output:** Al finalizar genera un ZIP con todos los documentos del expediente; los 8 productos F4 se obtienen de `fase4_productos` en BD.

---

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- ALWAYS read graphify-out/GRAPH_REPORT.md before reading any source files, running grep/glob searches, or answering codebase questions. The graph is your primary map of the codebase.
- IF graphify-out/wiki/index.md EXISTS, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code, run `graphify update src/` to keep the graph current (AST-only, no API cost). The graph indexes only `src/` — do not run `graphify update .` as it would re-index docs/PTSA/output.

---

# Part 2 — FDGE: Evidence-Governed Development Framework (v1.0 Production)

FDGE is the binding framework for **all development work**: implementation, bug fixing, refactoring, investigation, planning, documentation, and validation. PTSA (Part 3) is a separate, audit-only framework that activates only on explicit trigger; the two do not bypass each other.

## Authority

FDGE is the governing development framework for this repository.

The canonical, conceptual definition of FDGE lives in `docs/methodology/Framework-FDGE.md`.
The operational, copy-paste prompts that drive each state live in `docs/implementation/instrucctions.md`.
This CLAUDE.md section is the binding ruleset. The three must stay consistent;
`Framework-FDGE.md` is the source of truth for the *method*, this file for the *rules in force*.

All implementation, bug fixing, refactoring, investigation, planning, documentation, and validation activities must follow FDGE.

No alternative workflow may bypass FDGE states.

When uncertainty exists:

1. Consult FDGE documentation (`docs/methodology/Framework-FDGE.md`).
2. Consult architecture documentation.
3. Consult PRD.
4. Consult TRD.
5. Consult Graphify.
6. Consult HISTORY.log.
7. Consult HANDOFF.md.

Documentation is authoritative. Assumptions are not.

## State Model — Mapping

`Framework-FDGE.md` describes the method as fine-grained cognitive states (Estado 0–9).
This ruleset and `instrucctions.md` group them into the 7 operational STATES below.
Both views describe the same flow; this is the canonical mapping:

| Framework-FDGE.md (cognitive state) | Operational STATE (this file / instrucctions.md) |
|:---|:---|
| Estado 0 — Solicitud | *(entry — implicit)* |
| Estado 1 — Descubrimiento + Estado 2 — Comprensión Arquitectónica | **STATE 1** — Discovery & Architecture Analysis |
| Estado 3 — Clasificación + Estado 4 — Estrategia | **STATE 2** — Classification & Strategy |
| Estado 5 — Atomización | **STATE 3** — Atomic Planning |
| Estado 6 — Implementación | **STATE 4** — Implementation |
| Estado 7 — Evidencia | **STATE 5** — Evidence Generation |
| Estado 8 — Validación | **STATE 6** — Validation Gate |
| Estado 9 — Persistencia | **STATE 7** — History & Handoff |

Grouping cognitive states into an operational STATE is permitted (it is condensing, not skipping).
Skipping any cognitive state is forbidden — see "No Phase Collapse".

## Core Principle

The agent must never optimize for speed at the expense of understanding.

The primary objective is: **Understanding → Strategy → Execution → Evidence → Validation**

Not: Request → Code

## Mandatory Expansion Rule

The user's request is never considered a complete specification.

Before planning any solution, the agent must expand the request into a complete operational, technical, and architectural understanding.

Expansion must include when applicable:

* Context
* Scope
* Business impact
* Technical impact
* Affected users
* Dependencies
* Constraints
* Risks
* Reproduction steps
* Expected behavior
* Actual behavior
* Existing evidence
* Missing evidence
* Affected components
* Potential root causes

The expanded analysis must contain substantially more detail than the original request.

## Complexity Classification

Every request must be classified before planning.

### TRIVIAL

Examples: typo correction, label update, text replacement, simple CSS adjustment, static content update.

Requirements: Discovery, minimal architecture verification, Implementation, Evidence, History/Handoff.

Strategy and atomization may be condensed.

### STANDARD

Examples: typical bug fixes, CRUD modifications, business rule changes, validation changes.

Requirements: Full FDGE workflow.

### MAJOR

Examples: new modules, new workflows, architectural changes, authentication changes, database redesign, multi-component features.

Requirements: Full FDGE workflow. Mandatory risk analysis. Mandatory regression analysis. Mandatory architecture review.

## Mandatory Knowledge Sources

Before strategy or implementation, the agent must consult all relevant sources:

* Graphify
* Architecture documentation
* PRD
* TRD
* FDGE documentation
* HISTORY.log
* HANDOFF.md
* Existing implementation
* Related source code

The agent must never design solutions without first consulting the architecture.

## Cognitive State Pipeline (Strict)

The following states are sequential. No state may be skipped.

No phase collapse is allowed. (For TRIVIAL complexity, states may be condensed into fewer
blocks with merged ACK gates — condensing is not skipping. See "No Phase Collapse" and
the "STATE 1-EXPRESS" path in `instrucctions.md`.)

### STATE 1 — Discovery & Architecture Analysis

Artifacts: DISCOVERY.md, CONTEXT_ANALYSIS.md, SESSION_SUMMARY.md

Actions:

1. Generate a new PT-XXX identifier.
2. Classify complexity.
3. Expand the request.
4. Determine: What / Where / When / How / Why (if known).
5. Document reproduction steps.
6. Document expected behavior.
7. Document actual behavior.
8. Identify affected users.
9. Identify business impact.
10. Consult Graphify.
11. Consult architecture documentation.
12. Consult PRD and TRD.
13. Identify: Components / Services / Dependencies / Data flows / Risks / Constraints.
14. Record actual operational state.

Required Confidence Assessment: Root Cause Confidence (%), Architecture Confidence (%), Solution Confidence (%).

Output: Append entries to DISCOVERY.md, CONTEXT_ANALYSIS.md, SESSION_SUMMARY.md.

STOP. Wait for explicit human ACK.

Forbidden: Solution design, code modification, task execution.

#### Investigation Gate

If any of the following conditions exist:

* Root cause unknown
* Architecture impact unknown
* Dependencies unknown
* Confidence below 70%

The task must immediately be classified as INVESTIGATION.

Implementation planning is forbidden until investigation completes.

### STATE 2 — Classification & Strategy

Artifact: PLAN_ACTUAL.md

Classify as: BUG, FEATURE, REFACTOR, INVESTIGATION.

Design the strategy. Required sections:

* Objective
* Proposed solution
* Alternatives considered
* Alternatives rejected
* Dependencies
* Risks
* Constraints
* Success criteria

Mandatory Regression Analysis — the strategy must explicitly identify:

* What may break
* Affected workflows
* Affected services
* Affected APIs
* Affected UI flows
* Data integrity risks

Mandatory Self-Review — before presenting the strategy:

* Search for contradictions
* Search for missing dependencies
* Search for architecture conflicts
* Search for edge cases
* Evaluate alternative approaches

The selected strategy must be justified.

Output: Overwrite PLAN_ACTUAL.md.

STOP. Wait for explicit human ACK.

Forbidden: Code modification, task execution.

### STATE 3 — Atomic Planning

Artifact: PENDING_TASKS.md

Convert strategy into atomic tasks. Each task must contain: Objective, Inputs, Outputs, Validation method, Status.

Example:

```
PT-201.1
Objective:   Validate endpoint
Input:       Architecture analysis
Output:      Confirmed endpoint
Validation:  Endpoint verified
Status:      PENDING
```

Output: Overwrite PENDING_TASKS.md.

STOP. Wait for explicit human ACK.

Forbidden: Code modification.

### STATE 4 — Implementation

Execute only approved tasks. No implementation outside approved scope. No undocumented modifications.

Rule: Before this state, 0 lines of code may be modified.

Outputs (strictly tied to approved PT tasks): source code changes, infrastructure changes, configuration changes.

### STATE 5 — Evidence Generation

Artifact: docs/implementation/evidence/PT-XXX/

Rule: **Code is not evidence. Execution is evidence.** Every implementation must generate evidence.

#### Technical Evidence

Examples: unit tests, integration tests, E2E tests, build validation, logs, coverage reports, database verification, API verification.

#### Functional Evidence

Examples: browser screenshots, before/after screenshots, user flow validation, UI verification, navigation verification, workflow completion.

Output: Store all evidence under `docs/implementation/evidence/PT-XXX/`.

Implementation without evidence is incomplete.

### STATE 6 — Validation Gate

Work type determines closure path.

#### BUG

Required status: VALIDATION_PENDING

Rules: Agent may not close bugs. Agent may not mark bugs CLOSED. Human confirmation is mandatory.

Flow: Implementation → Evidence → VALIDATION_PENDING → Human Validation → CLOSED.

#### FEATURE

May be marked DONE only if: tests pass, evidence exists, documentation updated.

#### REFACTOR

May be marked DONE only if: existing behavior preserved, evidence exists, documentation updated.

#### INVESTIGATION

May be marked CLOSED after findings are documented.

### STATE 7 — History & Handoff

Artifacts: HISTORY.log, HANDOFF.md

Append to HISTORY.log: PT identifier, Type, Status, Objective, Root cause, Solution, Modified files, Evidence location.

Update HANDOFF.md: Current system state, Open bugs, Pending validations, Active investigations, Risks, Recommended next actions.

Rules: HISTORY.log is append-only. Never rewrite history. HANDOFF.md represents current state only.

## Allowed Status Values

PENDING · IN_PROGRESS · BLOCKED · DONE · VALIDATION_PENDING · CLOSED

## Absolute Constraints

### No Solution First
Never design before understanding.

### No Architecture Blindness
Never modify code before consulting Graphify, architecture, documentation.

### No Phase Collapse
Never skip FDGE states. Condensing is not collapsing. For TRIVIAL complexity, several cognitive states may be documented together in one block and their ACK gates merged (see "STATE 1-EXPRESS" in `instrucctions.md`). Every state still happens and is still recorded. Skipping a state — omitting discovery, evidence, validation, or History/Handoff — is always forbidden, regardless of complexity.

### No Memory-Driven Development
Never act from memory. Always verify.

### No Bug Auto-Close
Bugs require human validation. The agent has no authority to close bugs.

### No Missing Evidence
Every implementation must generate evidence. No exceptions.

### No Undocumented Changes
Every modification must be traceable to PT-XXX, Discovery, Strategy, Tasks, Evidence.

### No Hidden Reasoning
Strategic reasoning must be materialized in project artifacts. Important decisions must not exist exclusively in chat.

## Framework Compliance Rule

If any FDGE phase is incomplete: STOP. Report the blocking condition. Do not continue until the required phase is completed or the human explicitly authorizes continuation.

## Framework Self-Reference Rule

If uncertainty exists regarding FDGE execution, the agent must consult FDGE documentation, FDGE implementation documentation, and project architecture documentation before proceeding. The framework itself is a valid source of operational truth and may be consulted whenever ambiguity exists.

---

# Part 3 — PTSA V3: Continuous Audit & Certification Framework

PTSA is the binding **audit & certification framework** for this repository. It is independent from FDGE: FDGE governs how code is *built*; PTSA governs how generated *products* are *audited and certified*. PTSA never bypasses FDGE and FDGE never bypasses PTSA.

## Authority

The canonical, normative specification lives in `docs/methodology/PTSA/PTSA-V3-Especificacion-Oficial.md` (the exhaustive standard — definitions, schemas, algorithms, templates).
The operational agent manual lives in `PTSA/Motor-PTSA.md`; the working protocol in `PTSA/PTSA.md`.
This CLAUDE.md section is the binding ruleset (rules in force). When detail is missing here, the official specification prevails.

## Trigger Rule

**ONLY** activate PTSA mode when the user explicitly invokes one of:

* `[START PTSA]` — start audit from F-1.
* `resume PTSA` / `continue PTSA` — resume / run Delta Sync.
* `status PTSA` — report status without modifying artifacts.
* `audit PTSA` — a discrete audit operation (e.g. close a finding).

Otherwise, operate as a normal assistant. PTSA never self-activates.

## Purpose

PTSA does not verify that code runs without errors. It proves, with evidence, that the products the
system generates are **legally, operationally and semantically valid** for the business domain declared in
F-1, and computes a System Health Score based exclusively on evidence. The unit of audit is the **product**,
not the component. If technical execution passes but domain requirements fail, register a D1 finding.

## Core Principles

* **Evidence over opinion (A1)** — Unsupported claims become findings, never conclusions. No "probably / should / seems".
* **Product over implementation (A2)** — Audit products, not isolated folders/modules.
* **Inverse traceability (A3)** — Always start at the product: `Product ← Transformation ← Service ← Rule ← Data Source ← User Action`.
* **Domain supremacy / Potable-Water Rule (A4)** — Technical correctness never compensates a domain failure. If `D1 < 60`, Health is capped at D1.
* **Autonomous audit (A5)** — If you have shell/DB/log access, gather evidence yourself; never ask the user to run diagnostics for you.
* **Auditable immutability (A6)** — Findings are closed, never deleted; evidence is replaced by revisions, never overwritten.
* **Continuous certification (A7)** — Audit is permanent; every score expires (freshness).
* **Declared coverage (A8)** — No score is valid without declared coverage and freshness.

## Quality Model (5 dimensions)

Every finding belongs to **exactly one** dimension.

| Dim | Evaluates | Phase | Weight |
|:--:|:--|:--:|:--|
| **D1 — Domain Alignment** | Business rules, product quality, rubric compliance | F6 | 30% + global cap |
| **D2 — Architectural Integrity** | Code, security, tech debt, DB integrity | F5 | 30% |
| **D3 — Observability & Recovery** | Logs, traceability, fallbacks, recovery | F8 | 30% |
| **D4 — Documentary Fidelity** | Docs ↔ reality coherence | F7 | 10% |
| **D5 — Operational Reliability** | Stability, drift, reproducibility (Success/Retry/Failure/Hallucination/Drift) | F8 | modulator |

The phase indicates *when* a finding was detected; the dimension indicates *which* score it penalizes. D5 imputes its findings to D2/D3 and feeds Risk + Confidence.

## Scoring (exact formulas)

```
Score_Dn   = max(0, 100 − Σ penalty(active Dn findings))      # penalty: 30/15/5/1 = CRITICA/ALTA/MEDIA/BAJA
Health     = (D1×0.30)+(D2×0.30)+(D3×0.30)+(D4×0.10)
             IF D1 < 60: Health = min(Health, D1)              # Potable-Water Rule — state it explicitly
Risk_Score = min(100, Risk_bruto × 4)                          # Risk_bruto = Σ (Impact×Probability), each 1–16
Confidence = coverage×0.40 + freshness×0.25 + evidence_validity×0.20 + autonomy×0.15
```

Classification: **A** Health ≥ 90 · **B** 75–89 · **C** 60–74 · **F** < 60. `freshness = UNKNOWN` caps at C; D5-red (`health_unstable`) caps at B. Full matrices, thresholds and worked examples: Part III of the official specification.

## Phases (15)

```
F-1 Declaración de Valor → F0 Inventario → F1 Mapa del Sistema → F2 Alcance →
F3 Productos → F3.5 Criticidad → F4 Trazabilidad (CENTRAL MILESTONE) →
{ F5 Técnica · F6 Domain Acid Test · F7 Documental · F8 Observabilidad } →
F9 Consolidación → F10 Matriz Ejecutiva → F11 Certificación Continua → F12 Gobernanza de Dominio
```

* **F4 is the central milestone** — F5/F6/F7/F8 cannot start until F4 is 100% complete for every identified product.
* **F3** must create `PTSA/Productos/P-XXX.md` (BORRADOR) per product, or F3 cannot close.
* **F5** verifies the REAL DB schema via shell (not migrations) + ERD. **F8** reads live logs (never assumes logging works).
* **F6 (Domain Acid Test)** evaluates the REAL semantic output of each product against F-1 rules/rubric — not unit tests. Levels: (1) business rules, (2) taxonomy/rubric → `rubric_compliance_score`, (3) inter-product coherence, (4) AI guardrails (only if it uses an LLM).
* **F11/F12** (new in V3) govern freshness, `audit_due`, delta sync (`audit-scope.yaml`), CI checkpoints (D2/D3/D5), and versioned evolution of domain rules (Domain Rules as Code).

## Operating Rules (binding)

* **Autonomy is real** — with shell/DB/log access, run diagnostics yourself; capture output; continue.
* **Materialize reasoning** — every conclusion lives in a `PTSA/` artifact, not only in chat.
* **Evidence before conclusion** — capture `E-XXX.md` (with origin, lines, structural fingerprint) first.
* **Verify in the real source** — derive states/scores from direct observation (DB/output/logs), never inference or memory.
* **Never auto-close BUG/DOMAIN findings** — take them to CORREGIDA/VERIFICADA/VALIDATION_PENDING and stop; human validates and closes.
* **Never overwrite** findings or evidence (use revisions/append); **never duplicate rows** in RESUMEN.md.
* **A product reaches VALIDADO** only with post-fix evidence observed in the real source (e.g. `validacion_estado='aprobado'` in DB), never by inference.

## State management of audit files

`RESUMEN.md` and `ESTADO_ACTUAL.md` → overwrite fully on each phase/sync close. `AUDIT_LOG.md` → append-only. `Fases/F*.md` → delta-append `## Update U-XXX` + timestamp. `Hallazgos/H-XXX.md` → frontmatter updatable, body append (`## Revisión`). `Productos/P-XXX.md` → frontmatter overwritable on state change, body append. `RELACIONES.md` → cache, rebuilt by overwrite (individual files prevail). `score-history.json` → append one record per emission.

## Halt conditions

Stop and report a blocking state ONLY if: (1) the environment explicitly denies shell/execution permissions; (2) access credentials/parameters cannot be resolved from local files; (3) the user issued an explicit manual breakpoint. On halt: record blockers in `PENDIENTES.md`, set `BLOQUEADA`, append to `AUDIT_LOG.md`, show a hard-stop report.

For the full operating manual (loop, per-phase mandates, official prompts) see `PTSA/Motor-PTSA.md`. For the complete normative standard see `docs/methodology/PTSA/PTSA-V3-Especificacion-Oficial.md`.

---

# Part 4 — FPGE: Priorización Gobernada por Evidencia

FPGE is the binding **prioritization framework** that closes the loop `FDGE (build) → PTSA (audit) → FPGE (prioritize) → FDGE (build next)`. It answers the question the other two leave ungoverned: **what should we build next, and why?** It does not decide *how* to build (FDGE) or *whether* a product is valid (PTSA) — it decides which work, justified by evidence, enters the next development cycle.

## Authority

The canonical method lives in `docs/methodology/Framework-FPGE.md`; the operational implementation in `docs/methodology/FPGE-Implementation.md`. This CLAUDE.md section is the binding ruleset (rules in force). When detail is missing here, the framework documents prevail.

## Trigger Rule

**ONLY** activate FPGE mode when the user explicitly invokes one of:

* `[START FPGE]` / `roadmap FPGE` / `prioritize FPGE` — full run: read evidence, synthesize, prioritize, emit `ROADMAP.md`, then stop.
* `promote FPGE R-XXX` — promote an approved roadmap item to FDGE STATE 1 with a new PT-XXX.
* `status FPGE` — report the current roadmap without recomputing.

Otherwise, operate as a normal assistant. FPGE never self-activates.

## Core Principles

* **Evidence-governed prioritization** — every proposed item must cite its origin evidence (`H-XXX`, a `HISTORY.log` entry, a `HANDOFF.md` recommendation, a `score-history.json` trend). No evidence → not a candidate.
* **Framework independence (no merge)** — FPGE is **read-only** over FDGE and PTSA artifacts; it writes only its own `ROADMAP.md` and `ROADMAP_HISTORY.log`. It never modifies FDGE or PTSA files.
* **Inherited domain supremacy** — D1 (domain) items outrank D2/D3/D4 at equal priority (Potable-Water Rule, via a 1.5× domain multiplier).
* **Human gate** — FPGE *proposes*; the human *disposes*. It never starts FDGE itself nor auto-converts findings to tasks. Promotion of `R-XXX → PT-XXX` is a human decision (consistent with FDGE's ACK discipline and PTSA's no-auto-close).
* **Reproducibility** — same evidence ⇒ same priority order (deterministic algorithm).
* **Freshness gate** — if PTSA `score_freshness` is STALE/UNKNOWN, recommend a PTSA delta sync *before* trusting the order.

## Inputs (read-only) and output

Reads — PTSA: `RESUMEN.md`, active `Hallazgos/H-XXX.md`, `Productos/P-XXX.md`, `PENDIENTES.md`, `score-history.json`. FDGE: `HISTORY.log`, `HANDOFF.md`, in-flight `PLAN_ACTUAL.md`/`PENDING_TASKS.md`. Optional: graphify, git history.

Writes — only `docs/implementation/ROADMAP.md` (overwritten each run) and `docs/implementation/ROADMAP_HISTORY.log` (append-only).

## Prioritization (reproducible)

```
Priority(item) = (EvidenceWeight × ScoreImpact × Urgency × DomainMultiplier) / Effort
```
EvidenceWeight = originating finding's PTSA risk (Impact×Probability, 1–16) · ScoreImpact = expected Health gain · Urgency = 1.0 (+0.5 if `audit_due` overdue, +0.5 if the dimension is STALE/regressing) · DomainMultiplier = 1.5 for D1 else 1.0 · Effort = 1/2/4 (S/M/L). Tie-breakers: higher Priority → D1 before D2/D3/D4 → higher risk-of-not-doing → lower id. The roadmap must surface the **Top-3 by impact** and the **Top-3 quick wins**.

## Closing the loop

A full run ends by emitting `ROADMAP.md` (all items `PROPUESTO`) and stopping. The human marks items `APROBADO`/`DIFERIDO`/`DESCARTADO`; each `APROBADO` is promoted (`promote FPGE R-XXX`) to a new `PT-XXX` handed to **FDGE STATE 1**, using the item's origin evidence as initial context. FDGE runs its normal cycle; PTSA re-audits the result on its next delta sync; the next FPGE run sees the new state and re-orders. For the full method, algorithm detail and the three-way contract with FDGE/PTSA see `docs/methodology/Framework-FPGE.md`.
