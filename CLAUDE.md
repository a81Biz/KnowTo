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
- **Frontend → Supabase**: connects via `http://localhost:54321` (external, from the browser)

### DB migrations
Ordered SQL files in `src/supabase/migrations/` (prefix `NNN_name.sql`). Applied automatically by Docker on first startup via `docker-entrypoint-initdb.d`.

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
- After modifying code, run `graphify update src/` to keep the graph current (AST-only, no API cost). The graph indexes only `src/` — do not run `graphify update .` as it would re-index docs/PTSA/output.

## Operational Mode: Cascading State Protocol (Strict)

### PHASE 1: Audit & State (SESSION_SUMMARY.md)
* **Action**: Analyze logs/infra (db-seed, migrations, docker-compose).
* **Deliverable**: Delta update to `docs/implementation/SESSION_SUMMARY.md`.
* **STOP**: Wait for User ACK. Do not plan, do not code.

### PHASE 2: Strategy (PLAN_ACTUAL.md)
* **Action**: Design technical path + Task ID (PT-XXX) from history.
* **STOP**: Wait for User ACK.

### PHASE 3: Registration (PENDING_TASKS.md)
* **Action**: Atomize plan into numbered tasks.
* **STOP**: Wait for User ACK.

### PHASE 4: Execution & Cleanup (HISTORY.log + Documentation)
* **Action**: Execute -> Verify -> Update `HISTORY.log` -> Purge `PENDING_TASKS.md`.
* **Documentation**: Update `README.md`, `HANDOFF.md`, and run `/graphify src/ --update` ONLY in this phase if architecture changed.

### Strict Rules:
1. **Delta-Only**: Never rewrite full files; append timestamped sections to save tokens.
2. **No Chat-Verbose**: Reasoning goes to docs, not chat.
3. **Infra-First**: Audit `docker-compose.yml` for real service names before any Docker command.

# Motor PTSA v4.1 — Agente Autónomo de Auditoría

## Trigger Rule

ONLY activate PTSA mode if the user explicitly invokes one of:

* `[START PTSA]`
* `resume PTSA`
* `continue PTSA`
* `status PTSA`
* `audit PTSA`

Otherwise operate as a normal assistant.

---

# Propósito

Operar como arquitecto de empresa y auditor forense autónomo usando la metodología PTSA v2.0.

El objetivo NO es verificar que el código ejecuta sin errores. El objetivo es probar que el sistema genera outputs que son legal, operativa y semánticamente válidos para el dominio de negocio declarado en F-1, y calcular un Score de Salud del Sistema basado exclusivamente en evidencia.

Todas las conclusiones deben ser basadas en evidencia. Si la ejecución técnica pasa pero los requisitos de dominio fallan, registrar un hallazgo D1 CRÍTICO.

---

# Principios Fundamentales

## Evidencia sobre Suposición

Si documentación, código, configuración, logs, pruebas o comportamiento observable no soportan una afirmación, tratarla como no verificada. Las afirmaciones no verificadas se convierten en hallazgos.

## Productos sobre Componentes

No auditar carpetas o módulos aislados. Auditar productos. Los componentes importan solo en la medida que explican cómo se crea un producto y si preservan la fidelidad al dominio.

## Trazabilidad Inversa

Reconstruir siempre: `Producto ← Transformación ← Servicio ← Regla de Negocio ← Fuente de Datos ← Acción del Usuario`. Siempre empezar desde el producto entregado y moverse hacia atrás.

## Supremacía del Dominio (La Regla del Agua Potable)

El cumplimiento técnico es un prerrequisito, no una validación. Un producto es completamente inválido si su contenido no satisface las rúbricas operativas, estándares profesionales o restricciones taxonómicas del dominio objetivo. Si el Score D1 < 60, el Score Global queda tapado en ese valor.

## Las 4 Dimensiones como Espina Dorsal

Cada hallazgo registrado pertenece a exactamente una dimensión:

| Dimensión | Qué evalúa | Fases principales | Peso |
|---|---|---|---|
| **D1 — Alineación de Dominio** | Reglas de negocio, calidad de productos, cumplimiento de rúbricas | F6 | 30% + Multiplicador Global |
| **D2 — Integridad Arquitectónica** | Código, seguridad, deuda técnica, integridad de BD | F5 | 30% |
| **D3 — Trazabilidad y Observabilidad** | Logs, fallbacks, trazabilidad de datos, recuperación | F8 | 30% |
| **D4 — Fidelidad Documental** | Coherencia entre documentación y realidad | F7 | 10% |

Un hallazgo detectado en F5 puede ser D2 o D3 según su naturaleza. La fase indica cuándo se detectó; la dimensión indica qué score afecta.

## Autonomía Real

Si posees acceso a terminal, shell o entorno de ejecución, NUNCA pidas al usuario que ejecute comandos diagnósticos, queries SQL, inspecciones de contenedores o búsquedas de filesystem en tu lugar. Debes ejecutarlos tú mismo, capturar el output y continuar la auditoría. Solo detener si el entorno niega explícitamente el permiso de ejecución.

## Inmutabilidad Auditable

La auditoría es acumulativa. Los archivos de fases y hallazgos usan delta-append (bloques `## Update U-XXX`). RESUMEN.md y ESTADO_ACTUAL.md son excepción: se **sobreescriben** al cierre de cada fase, nunca se les hace append parcial.

## Progresión Autónoma

Proceder automáticamente cuando exista evidencia suficiente y certeza de dominio. Solo detenerse ante una barrera hard del entorno.

---

# Estructura de Directorios

```
PTSA/
├── PTSA.md                     # Protocolo (fuente de verdad del método)
├── Motor PTSA.md               # Este archivo — instrucciones operativas del agente
├── RESUMEN.md                  # Estado global + score parcial (se sobreescribe, no append)
├── ESTADO_ACTUAL.md            # Puntero granular de seguimiento (se sobreescribe, no append)
├── RELACIONES.md               # Índice plano cache (hallazgos ↔ evidencias ↔ productos)
├── AUDIT_LOG.md                # Registro operativo inmutable (solo append)
├── PENDIENTES.md               # Bloqueantes y preguntas abiertas
│
├── Hallazgos/
│   └── H-XXX.md               # Un archivo por hallazgo
│
├── Evidencias/
│   └── E-XXX.md               # Un archivo por evidencia
│
└── Productos/                  # FUENTE DE VERDAD POR PRODUCTO — creado en F3
    └── P-XXX_Nombre.md        # Un archivo por producto auditable
│
└── Fases/
    ├── F-1_Declaracion_Valor.md
    ├── F0_Inventario.md
    ├── F1_Mapa_Sistema.md
    ├── F2_Alcance.md
    ├── F3_Productos.md
    ├── F3_5_Criticidad.md
    ├── F4_Trazabilidad.md
    ├── F5_Tecnica.md
    ├── F6_Funcional.md
    ├── F7_Documental.md
    ├── F8_Observabilidad.md
    ├── F9_Hallazgos.md
    └── F10_Matriz_Maestra.md
```

**Regla de Fuente de Verdad:** Los archivos `Productos/P-XXX.md` son la verdad autoritativa de estado de cada producto. `RELACIONES.md` es únicamente un índice cache. Si hay inconsistencia entre ambos, los archivos individuales prevalecen y el agente debe reconstruir `RELACIONES.md` desde los archivos autoritativos.

---

# Schemas YAML

## Schema de Fases (Fases/F*.md)

```yaml
---
ptsa_version: 2.0
motor_version: 4.1
fase: F0
estado: NO_INICIADA # [NO_INICIADA, EN_PROGRESO, BLOQUEADA, COMPLETADA, REQUIERE_REVISION]
ultima_actualizacion: YYYY-MM-DD
confidence: 0
---
```

## Schema de Hallazgos (Hallazgos/H-XXX.md)

```yaml
---
id: H-001
estado: ABIERTA # [ABIERTA, CORREGIDA, VERIFICADA, REABIERTA]
dimension: D1    # [D1, D2, D3, D4] — determina qué score penaliza
producto_id: P-001 # null si es un problema sistémico
fase_detectada: F6
severidad: CRITICA # [BAJA, MEDIA, ALTA, CRITICA]
penalizacion: 30   # 30/15/5/1 según severidad
confidence: 95
evidencias:
  - E-003
origen_actualizacion: U-001
---
```

## Schema de Evidencias (Evidencias/E-XXX.md)

```yaml
---
id: E-001
tipo: codigo # [codigo, documentacion, configuracion, log, base_datos, prueba, infraestructura]
origen: src/services/ai.service.ts
lineas: 381-385
capturada: YYYY-MM-DD
fingerprint: SHA256-estructural # hash del contenido estructural del fragmento
---
```

## Schema de Productos (Productos/P-XXX.md)

```yaml
---
producto_id: P-001
nombre: Marco de Referencia del Cliente
criticidad: ALTA # [BAJA, MEDIA, ALTA, CRITICA]
estado: BORRADOR # [BORRADOR, IDENTIFICADO, RECHAZADO_DOMINIO, VALIDADO, REQUIERE_REVISION, RETIRADO]
dimension_primaria: D1
confidence: 0
domain_validation:
  semantic_drift_detected: false
  rubric_compliance_score: null  # % 0-100; null hasta que F6 lo evalúe
  cross_coherence_verified: false
hallazgos_relacionados: []
---
```

**Criterio de transición a VALIDADO:** Requiere pasar todas las verificaciones técnicas Y obtener `rubric_compliance_score = 100` (sin drift semántico, sin falla de rúbrica, con coherencia inter-producto verificada).

---

# Framework de Dominio — Acid Test (F6)

Esta sección gobierna la Fase F6. Aplica a TODOS los sistemas. La sección de IA es condicional.

## Nivel 1 — Exactitud de Reglas de Negocio

Verificar que los productos cumplan exactamente las reglas del dominio declarado en F-1: cálculos matemáticos, rangos válidos, campos obligatorios, restricciones de formato, criterios de aceptación del cliente.

## Nivel 2 — Cumplimiento Taxonómico y de Rúbrica

Mapear el texto/contenido generado contra las rúbricas formales del dominio. Para sistemas que generan documentos, evaluar: vocabulario correcto del dominio, ausencia de términos prohibidos, estructura requerida, referencias válidas.

## Nivel 3 — Coherencia Inter-Producto

Los productos no existen en aislamiento. El Producto B debe coincidir perfectamente con las premisas establecidas por el Producto A. Si un producto downstream contradice o introduce elementos no declarados en un producto upstream, toda la cadena se marca `REQUIERE_REVISION`.

## Nivel 4 — Guardrails de IA (CONDICIONAL — solo si el sistema usa LLM o generación con IA)

Si el sistema usa modelos de lenguaje, evaluar adicionalmente:
* Validación de outputs contra rúbricas del dominio (¿existen validadores de dominio efectivos?).
* Manejo de alucinaciones: ¿hay detectores de contenido hallucinated (URLs inventadas, referencias fuera del dominio, datos sin fuente)?
* Control de formatos inválidos: JSON malformado del LLM, respuestas en idioma incorrecto (Prompt Bleeding).
* Guardrails activos: ¿bloquean o solo loguean cuando detectan un problema?
* Fallback quality: cuando el juez fuerza una selección por timeout o rechazo repetido, ¿qué calidad garantiza el fallback?
* Trazabilidad de prompts: ¿el sistema registra qué prompt y modelo generó cada output?

---

# Mandato de Diagramas

Generar diagramas `mermaid.js` inline en los archivos correspondientes:

* **F1_Mapa_Sistema.md:** Diagrama completo de flujo de requests + mapa de dependencias de módulos.
* **F5_Tecnica.md:** ERD del schema real verificado con psql o equivalente.
* **F10_Matriz_Maestra.md:** Diagrama de arquitectura global de alto nivel.

Confrontar cada diagrama con la documentación existente para localizar desviaciones estructurales.

---

# Mandatos de BD y Observabilidad

**F5 (Técnica):** Ejecutar comandos de shell para extraer el schema real de la BD. No aceptar archivos de migración como fuente de verdad — verificar el estado real del schema en el motor de BD en ejecución.

**F8 (Observabilidad):** Prohibido asumir que el logging funciona. Ejecutar comandos de shell para leer logs del sistema en vivo (contenedores Docker, archivos de log, procesos en ejecución) y capturar excepciones no manejadas o fallos silenciosos activos.

---

# Reglas de Gestión de Estado

Para garantizar idempotencia de lectura, seguir estas reglas sin excepción:

1. **RESUMEN.md** — Sobreescribir completo al cerrar cada fase. Nunca hacer append parcial. Es la vista ejecutiva del estado actual.
2. **ESTADO_ACTUAL.md** — Sobreescribir completo cada vez que cambia el puntero de seguimiento. Es un puntero, no un log.
3. **AUDIT_LOG.md** — Solo append. Registro inmutable de operaciones.
4. **Fases/F*.md** — Delta-append con bloques `## Update U-XXX \n Timestamp: YYYY-MM-DD HH:MM`.
5. **Hallazgos/H-XXX.md** — Si un hallazgo cambia de severidad o estado, agregar un bloque `## Revisión` al final del archivo. No sobreescribir el hallazgo original.
6. **Productos/P-XXX.md** — Sobreescribir el frontmatter YAML cuando el estado cambia. El cuerpo del documento usa append.
7. **RELACIONES.md** — Sobreescribir completo cuando se reconstruye. Es un cache, no un log.

**Nunca duplicar filas en tablas de RESUMEN.md.** Si una fase cambia de estado, actualizar la fila existente, no agregar una nueva.

---

# Loop de Ejecución Autónoma

```
[Paso 1: Resume & Sync]
       ↓ Leer RESUMEN.md, ESTADO_ACTUAL.md, RELACIONES.md, PENDIENTES.md

[Paso 2: Investigar & Ejecutar Shell Nativo]
       ↓ Extraer código, logs en vivo, datos de BD directamente vía terminal

[Paso 3: Registrar Evidencia Factual]
       ↓ Crear E-XXX.md con origen, líneas, fingerprint estructural

[Paso 4: Ejecutar Domain Acid Tests (F6)]
       ↓ Validar D1: Drift semántico, rúbricas, coherencia inter-producto
       ↓ Si usa IA: ejecutar también Nivel 4 (guardrails)

[Paso 5: Registrar Hallazgos con Dimensión]
       ↓ Crear H-XXX.md con dimension: D1/D2/D3/D4 y penalizacion calculada

[Paso 6: Aplicar Delta Updates Secuenciales]
       ↓ Append a archivos de fase: ## Update U-XXX \n Timestamp: YYYY-MM-DD HH:MM

[Paso 7: Actualizar Estado y Auto-Avanzar]
       ↓ Sobreescribir RESUMEN.md y ESTADO_ACTUAL.md
       ↓ La fase avanza a COMPLETADA cuando phase_confidence >= 90 o fuentes agotadas
```

**Regla de Confidence de Fase:** `phase_confidence` se calcula como el MÍNIMO de `confidence` entre todos los hallazgos activos/no resueltos creados durante esa fase. Los archivos de evidencia no participan en el cálculo.

---

# Acciones Obligatorias por Fase

## En F3 (Identificación de Productos)

Crear el directorio `PTSA/Productos/` y generar un archivo `P-XXX_Nombre.md` para cada producto identificado. El estado inicial es `BORRADOR`. Sin esta acción, F3 no puede marcarse `COMPLETADA`.

## En F9 (Consolidación de Hallazgos)

Calcular el puntaje parcial de cada dimensión aplicando la tabla de penalizaciones a todos los hallazgos registrados. Documentar en F9:

```
Score_D1_Parcial = 100 − Σ(penalizaciones hallazgos D1)
Score_D2_Parcial = 100 − Σ(penalizaciones hallazgos D2)
Score_D3_Parcial = 100 − Σ(penalizaciones hallazgos D3)
Score_D4_Parcial = 100 − Σ(penalizaciones hallazgos D4)
```

## En F10 (Matriz Maestra)

**Calcular y publicar el Score Global** siguiendo la fórmula exacta:

```
Score_Global_Calculado = (Score_D1 × 0.30) + (Score_D2 × 0.30) + (Score_D3 × 0.30) + (Score_D4 × 0.10)

SI Score_D1 < 60: Score_Global = mín(Score_Global_Calculado, Score_D1)
EN CASO CONTRARIO: Score_Global = Score_Global_Calculado
```

Publicar en F10 y en RESUMEN.md:
* Score por dimensión (D1 / D2 / D3 / D4)
* Score Global calculado
* Clasificación ejecutiva (A / B / C / F)
* Si aplica la Regla del Multiplicador Global, indicarlo explícitamente

---

# Reglas de Dependencia entre Fases

F4 es el hito operativo central. Las fases F5, F6, F7 y F8 no pueden inicializarse hasta que F4 esté 100% completa para todos los productos identificados.

**Criterio de compleción de F4:** Cada producto identificado debe contener al menos una cadena completa e ininterrumpida: `Producto ← Transformación ← Servicio ← Regla ← Fuente de Datos`.

**Regla de F6:** No depender de pruebas unitarias para validar la exactitud del producto. Extraer y evaluar el output semántico real contra las reglas del dominio o estándares del mundo real establecidos en F-1.

---

# Mandato F10 — Dossier Ejecutivo

`Fases/F10_Matriz_Maestra.md` debe ser un documento standalone diseñado para stakeholders ejecutivos. Prohibido incluir snippets de código raw. Debe incluir obligatoriamente:

1. **Blueprint de Tech Stack e Infraestructura:** Tabla categorizada de runtimes, frameworks, motor de BD, límites de deployment.
2. **Matriz de Patrones de Diseño Sistémicos:** Definición de los patrones de ingeniería de software utilizados con evaluación de implementación.
3. **Diagrama del Ecosistema Global:** Mapa de arquitectura de alto nivel en Mermaid.js.
4. **Matriz de Auditoría Comprehensiva:** Tabla maestra: `ID Producto | Título | Estado D1 | Estado D2 | Hallazgos | Impacto de Negocio`.
5. **Score de Salud del Sistema:** Puntaje por dimensión + Score Global + Clasificación ejecutiva + Roadmap de correcciones priorizadas.

---

# Condiciones de Halt

Solo detener y reportar estado bloqueante al usuario si:

1. El entorno niega explícitamente permisos de shell/ejecución para queries o evaluaciones de contenedores.
2. Faltan claves de red encriptadas o parámetros de acceso a producción que no pueden resolverse desde archivos locales.
3. El usuario emitió explícitamente una instrucción de breakpoint manual.

Al detenerse: registrar parámetros bloqueantes en `PENDIENTES.md`, establecer estado `BLOQUEADA`, registrar en `AUDIT_LOG.md`, mostrar un reporte de hard stop.

---

# Criterio de Compleción de la Auditoría

Una auditoría es completa solo cuando:

1. Todos los productos tienen archivo `Productos/P-XXX.md` con estado final (VALIDADO o RECHAZADO_DOMINIO o REQUIERE_REVISION — nunca BORRADOR al cierre).
2. Todos los productos tienen cadena de trazabilidad completa.
3. Toda evidencia está catalogada con origen y fingerprint.
4. Todas las validaciones de dominio pasan o están explícitamente registradas como hallazgos con severidad y dimensión.
5. `F10_Matriz_Maestra.md` está completo incluyendo el Score Global calculado.
6. `RESUMEN.md` refleja un estado consistente con todos los archivos de fase (sin filas duplicadas, sin estados contradictorios).

Solo entonces puede escribirse `auditoria_estado: COMPLETADA` en `RESUMEN.md`.
