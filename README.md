# KnowTo

Plataforma de microsites de certificación asistidos por IA. Arquitectura multi-microsite con un API Gateway compartido y frontends aislados por subdominio.

## Stack

| Capa | Tecnología |
|:---|:---|
| Frontend | TypeScript + Vite + Tailwind CSS (Vanilla TS, sin framework) |
| Backend | Hono + `@hono/zod-openapi` — Node.js en dev, Cloudflare Workers en prod |
| IA — producción | Workers AI — `@cf/meta/llama-3.2-3b-instruct` |
| IA — desarrollo | Ollama local — `llama3.2:3b` (configurable) |
| Base de datos | Supabase self-hosted (PostgreSQL 15 + PostgREST + Realtime + GoTrue + Kong) |
| Notificaciones async | Supabase Realtime — `postgres_changes` en tabla `pipeline_jobs` (WebSocket, sin polling) |
| Routing local | Nginx (reverse proxy, único puerto expuesto: 80) |
| Dev local | Docker Compose — Nginx + Node.js + Supabase stack completo + Ollama |
| Tests | Vitest (152 tests, 100 % pass) |

---

## Inicio rápido

### Con Docker (recomendado)

**Prerrequisito único por máquina** — añadir al archivo `hosts`:

```
# Windows: C:\Windows\System32\drivers\etc\hosts  (abrir como Administrador)
# Linux/Mac: /etc/hosts

127.0.0.1  dcfl.localhost
127.0.0.1  cce.localhost
127.0.0.1  api.localhost
```

```bash
docker compose up -d
```

| URL | Servicio |
|:---|:---|
| `http://localhost` | Directorio de microsites |
| `http://dcfl.localhost` | Microsite EC0366 (DCFL) |
| `http://cce.localhost` | Microsite EC0249 (CCE) |
| `http://api.localhost/docs` | Swagger UI (Scalar) |
| `http://api.localhost/health` | Health check del API |
| `http://localhost:54321` | Supabase Kong (API Gateway de Supabase) |
| `http://localhost:54323` | Supabase Studio (UI de administración de la BD) |
| `http://localhost:54321/rest/v1/` | PostgREST (API REST automática de la BD) |

El backend tarda ~20 s en estar listo (npm install + arranque de Node.js).
El stack de Supabase tarda ~30 s en estar completamente operativo.

### Sin Docker (desarrollo nativo)

```bash
# Terminal 1 — backend
cd backend
npm install
npm run dev          # Node.js en :8787, lee backend/.dev.vars
# o con debugger:
npm run dev:debug    # igual + inspector Node.js en :9229

# Terminal 2 — microsite dcfl
cd frontend/dcfl
npm install
npm run dev          # Vite en :5173

# Terminal 3 — (opcional) directorio raíz
cd frontend/root
npm install
npm run dev          # Vite en :5174
```

> En desarrollo nativo el frontend llama directamente a `http://localhost:8787`.
> No se necesitan entradas en el archivo `hosts`.

> **No se necesita cuenta de Cloudflare ni `wrangler login`** para desarrollar.
> El backend corre en Node.js puro (`server.dev.ts`). `wrangler` solo se usa para `deploy`.

---

## Por qué Node.js en desarrollo y no `wrangler dev`

`wrangler dev` usa **workerd** como runtime, que bloquea intencionalmente conexiones a IPs
privadas RFC-1918 (172.x, 192.168.x) como protección SSRF. Esto impide llamar a Ollama
dentro de Docker. La solución es correr el mismo código Hono en Node.js con
`@hono/node-server`, que no tiene esa restricción.

```
wrangler dev  →  workerd (sandbox)  →  bloquea 172.20.0.x  →  Ollama inalcanzable
npm run dev   →  Node.js puro       →  acceso total         →  Ollama funciona
```

En producción el deploy sigue siendo `wrangler deploy` → Cloudflare Workers.

---

## Arquitectura de microsites

```
Browser
  ├── localhost           → frontend-root     (directorio)
  ├── dcfl.localhost      → frontend-dcfl     (microsite EC0366)
  ├── cce.localhost       → frontend-cce      (microsite EC0249)
  └── api.localhost       → backend           (API Gateway)
         ↓
       Nginx (puerto 80, único expuesto)
         ↓
   Docker network (knowto-network 172.20.0.0/24)
   ├── frontend-root      :5174
   ├── frontend-dcfl      :5173
   ├── frontend-cce       :5175
   ├── backend            :8787  (también :9229 para debugger)
   ├── ollama             :11434
   │
   └── Supabase self-hosted
       ├── supabase-kong     :54321  (único punto de entrada al stack Supabase)
       ├── supabase-db       :5432   (PostgreSQL 15)
       ├── supabase-rest     :3000   (PostgREST — API REST automática)
       ├── supabase-realtime :4000   (Realtime v2 — WebSocket CDC)
       ├── supabase-auth     :9999   (GoTrue — autenticación JWT)
       ├── supabase-meta     :8080   (Supabase Meta — introspección DB)
       └── supabase-studio   :54323  (Supabase Studio — UI de administración)
```

**Flujo de notificaciones async (pipeline de documentos):**

```
backend → INSERT/UPDATE pipeline_jobs → PostgreSQL → Supabase Realtime
                                                           ↓ WebSocket
                                              frontend ← supabase-js
                                           (subscribeToJob en step.base.ts)
```

> **Nota:** El fallback a polling fue eliminado. En desarrollo y producción se usa
> exclusivamente WebSocket (Supabase Realtime).

Cada microsite tiene su propio frontend Vite y su propio router en el backend.
Un fallo en un microsite no afecta a los demás.

**Convención de URLs:**

| Entorno | Frontend | API |
|:---|:---|:---|
| Desarrollo | `[slug].localhost` | `api.localhost/[slug]/...` |
| Producción | `[slug].[dominio]` | `api.[dominio]/[slug]/...` |

---

## Estructura del proyecto

```
knowto/
├── backend/
│   └── src/
│       ├── index.ts              # API Gateway — CORS + OpenAPI + monta routers de microsites
│       ├── server.dev.ts         # Entry point de desarrollo (Node.js + @hono/node-server)
│       ├── core/                 # ← COMPARTIDO entre todos los microsites
│       │   ├── middleware/       # auth.middleware.ts, error.middleware.ts
│       │   ├── services/         # AIService, BaseSupabaseService, ContextExtractorService,
│       │   │                     #   CrawlerService, UploadService, PipelineOrchestratorService
│       │   ├── prompts/          # PromptRegistry unificado (BD + fallback local)
│       │   └── types/            # Env, pipeline.types, modules.d.ts
│       ├── dcfl/                 # Microsite EC0366 (certificación en línea)
│       │   ├── router.ts         # Compone el router + exporta dcflSiteConfig
│       │   ├── routes/           # health.route.ts, wizard.route.ts
│       │   ├── services/         # SupabaseService (extiende BaseSupabaseService)
│       │   ├── prompts/          # flow-map.yaml + templates/ (F0–F6_2b, EXTRACTOR)
│       │   └── types/            # PromptId, ProjectContext…
│       └── cce/                  # Microsite EC0249 (consultoría empresarial)
│           ├── router.ts         # Compone el router + exporta cceSiteConfig
│           ├── routes/           # health.route.ts, wizard.route.ts
│           ├── services/         # SupabaseService (extiende BaseSupabaseService)
│           ├── prompts/          # flow-map.yaml + templates/ (F0–F6, F0_CLIENT_QUESTIONS_FORM…)
│           └── types/            # PromptId, ProjectContext…
├── backend/src/__tests__/        # Vitest — 152 tests
│   ├── middleware/auth.middleware.test.ts
│   ├── routes/health.e2e.test.ts
│   ├── routes/wizard.e2e.test.ts           # Flujo completo DCFL
│   ├── services/ai.service.test.ts
│   ├── services/supabase.service.test.ts
│   ├── prompts/prompt-registry.test.ts
│   ├── cce/routes/wizard.cce.test.ts       # Flujo completo CCE
│   ├── cce/routes/health.cce.test.ts
│   ├── cce/e2e/pipeline-orchestrator.cce.test.ts
│   └── cce/services/                       # upload, crawler, supabase (CCE)
├── frontend/
│   ├── core/src/                 # Utilidades compartidas (importadas como @core/*)
│   │   ├── auth.ts               # Google OAuth + dev bypass
│   │   ├── supabase.client.ts
│   │   ├── http.client.ts        # fetch wrapper con Bearer automático
│   │   ├── ui.ts                 # showLoading, renderMarkdown, printDocument…
│   │   ├── pubsub.ts
│   │   ├── template.loader.ts
│   │   └── validationEngine.ts
│   ├── dcfl/                     # Microsite EC0366 — app Vite independiente
│   │   ├── src/
│   │   │   ├── main.ts           # Orquestador: auth + dashboard + wizard
│   │   │   ├── controllers/      # step0–step11, step4.production, step7.adjustments
│   │   │   ├── shared/
│   │   │   │   ├── endpoints.ts  # URLs resueltas en runtime desde window.location
│   │   │   │   ├── step.base.ts  # Clase base de todos los controladores
│   │   │   │   └── step.factory.ts
│   │   │   ├── stores/wizard.store.ts
│   │   │   └── types/
│   │   ├── templates/            # HTML de cada paso del wizard
│   │   ├── microsite.json        # Metadatos del microsite (leídos por frontend-root)
│   │   └── vite.config.ts
│   ├── cce/                      # Microsite EC0249 — app Vite independiente
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── shared/endpoints.ts
│   │   │   └── types/
│   │   ├── microsite.json
│   │   └── vite.config.ts
│   └── root/                     # Directorio de microsites — app Vite independiente
│       └── src/main.ts           # Descubre microsites leyendo microsite.json de cada uno
├── nginx/
│   ├── nginx.conf                # Config global + map WebSocket
│   └── conf.d/local.conf         # Un server block por microsite
├── docs/
│   ├── ADDING-A-MICROSITE.md     # Guía completa (sección 11: patrón backend unificado)
│   ├── ARQUITECTURA-UNIFICACION.md
│   ├── DEVIATIONS.md             # Desviaciones documentadas respecto al plan original
│   └── dcfl/
│       └── PROCESO-EC0366.md     # Descripción del proceso de negocio de EC0366
├── .env.example                  # Variables de entorno documentadas
├── docker-compose.yml
└── wrangler.toml
```

---

## Backend unificado (core)

Desde abril 2026, todos los servicios compartidos residen en `backend/src/core/`. Cada microsite importa desde core en lugar de duplicar la lógica.

| Servicio | Ubicación | Propósito |
|:---|:---|:---|
| `AIService` | `core/services/ai.service.ts` | Workers AI (prod) + Ollama (dev), pipeline multi-agente |
| `PipelineOrchestratorService` | `core/services/pipeline-orchestrator.service.ts` | Ejecuta pipelines extractor → specialist → judge |
| `ContextExtractorService` | `core/services/context-extractor.service.ts` | Extrae secciones de documentos de fases previas |
| `CrawlerService` | `core/services/crawler.service.ts` | Scraping web con Cheerio |
| `UploadService` | `core/services/upload.service.ts` | Base64 → Supabase Storage |
| `BaseSupabaseService` | `core/services/supabase.service.ts` | Clase base para servicios DB de cada microsite |
| `PromptRegistry` | `core/prompts/registry.ts` | Resuelve prompts desde BD (`site_prompts`) o archivos locales |

### Patrón de extensión por microsite

Cada microsite define:
- `<site>/services/supabase.service.ts` — extiende `BaseSupabaseService`, sobrescribe nombres de RPC
- `<site>/prompts/flow-map.yaml` — define las etapas del pipeline (extractor → specialist → judge)
- `<site>/prompts/templates/*.md` — plantillas con frontmatter YAML parseado por `PromptRegistry`
- `<site>/router.ts` — carga el `flow-map.yaml` y exporta un `SiteConfig` inyectable

```typescript
// Patrón de uso en cualquier route handler de microsite:
const ai      = new AIService(c.env, getPromptRegistry(), SITE_SYSTEM_PROMPT);
const extract = new ContextExtractorService(c.env, siteSiteConfig.flow_map);
```

Ver [docs/ADDING-A-MICROSITE.md](docs/ADDING-A-MICROSITE.md) (sección 11) para la guía completa de cómo añadir un nuevo microsite siguiendo este patrón.

---

## Routing local (Nginx)

```nginx
localhost        →  frontend-root:5174
dcfl.localhost   →  frontend-dcfl:5173
cce.localhost    →  frontend-cce:5175
api.localhost    →  backend:8787
```

Todos los WebSockets de HMR (Vite) pasan por Nginx usando el header `Upgrade`.
El `Connection` se establece con un `map` para no afectar peticiones HTTP normales.

---

## Resolución dinámica de URLs

Sin dominios hardcodeados. El mismo bundle funciona en cualquier entorno.

### Frontend — `endpoints.ts` (resuelve en runtime)

```
dcfl.localhost   →  http://api.localhost/dcfl
dcfl.knowto.dev  →  https://api.knowto.dev/dcfl
dcfl.elsitio.mx  →  https://api.elsitio.mx/dcfl
```

Lógica en `frontend/dcfl/src/shared/endpoints.ts`:
- Si hay `VITE_API_BASE_URL` → úsala como override
- Si el hostname es `*.localhost` → `api.localhost/[slug]`
- Si no → `api.[apex-domain]/[slug]`

### Backend — CORS (`index.ts`, derivado del host de la petición)

```
Worker en api.knowto.dev  →  acepta Origin: *.knowto.dev
En desarrollo             →  acepta cualquier *.localhost
```

---

## Motores de IA por entorno

| Entorno | Motor | Mecanismo |
|:---|:---|:---|
| `development` | Ollama local | `fetch(OLLAMA_URL/api/generate)` — sin auth |
| `production` | Workers AI | `env.AI.run('@cf/meta/llama-3.2-3b-instruct')` — binding CF |

El modelo de Ollama es configurable con `OLLAMA_MODEL` (default: `llama3.2:3b`).

> **Tiempos esperados en dev (CPU sin GPU):** 60–180 s por documento.
> En producción con Workers AI: 5–15 s.
> Con GPU NVIDIA: descomenta `deploy.resources` en `docker-compose.yml`.

---

## Comportamiento por entorno

| Servicio | Desarrollo | Producción |
|:---|:---|:---|
| Runtime backend | Node.js (`server.dev.ts`) | Cloudflare Workers (workerd) |
| IA | Ollama Docker (`llama3.2:3b`) | Workers AI (`llama-3.2-3b-instruct`) |
| Base de datos | Supabase self-hosted (Docker) | Supabase cloud |
| Notificaciones async | Supabase Realtime self-hosted | Supabase Realtime cloud |
| Auth | Token literal `dev-local-bypass` | JWT Google OAuth via Supabase |
| CORS | Acepta `*.localhost` | Solo `*.[apex-domain]` |
| Login Cloudflare | No requerido | Requerido para `wrangler deploy` |

---

## Base de datos — Supabase self-hosted

El stack de desarrollo incluye Supabase completo ejecutándose en Docker. El backend usa
`SUPABASE_URL=http://supabase-kong:54321` y `SUPABASE_SERVICE_ROLE_KEY` para operar con
`service_role` (sin RLS). El frontend usa `VITE_SUPABASE_URL=http://localhost:54321` y la
`anon key` para suscribirse a Realtime.

### Tablas clave

| Tabla | Propósito |
|:---|:---|
| `projects` | Proyectos de consultoría/certificación |
| `steps` | Pasos del wizard guardados |
| `documents` | Documentos generados por fase |
| `pipeline_jobs` | Jobs asíncronos para pipelines de IA |
| `site_prompts` | Prompts unificados para todos los microsites (discriminados por `site_id`) |

### Servicios y puertos

| Servicio | Puerto (host) | Descripción |
|:---|:---|:---|
| Kong (API Gateway) | `54321` | Punto de entrada único; autentica JWTs |
| PostgreSQL 15 | `5432` | Base de datos; acceso directo con `psql` |
| PostgREST | `3000` (interno) | REST automático sobre tablas de `public` |
| Realtime | `4000` (interno) | WebSocket CDC — notifica cambios en `pipeline_jobs` |
| GoTrue (Auth) | `9999` (interno) | Autenticación JWT |
| Studio | `54323` | UI de administración — `http://localhost:54323` |

### Migraciones

Las migraciones se ejecutan automáticamente al crear el contenedor `supabase-db` (al hacer
`docker compose up` por primera vez, o tras un reset de volúmenes). El orden de ejecución
está dado por el nombre de archivo:

```
supabase/migrations/
├── 000_supabase_setup.sql         # Roles base (anon, authenticated, service_role), schemas
├── 001_initial_schema.sql         # Tablas core: projects, steps, prompts…
├── 008_unify_prompts_table.sql    # Unificación de site_prompts
└── 010_create_pipeline_jobs.sql   # Tabla pipeline_jobs + RLS + Realtime publication
```

### Resetear la base de datos

Necesario cuando:
- Las migraciones cambiaron y el volumen existente tiene el esquema anterior
- `supabase-db` aparece como `(unhealthy)` y no arranca
- Se quiere un estado limpio de desarrollo

**Opción A — Script incluido (Windows PowerShell):**

```powershell
.\scripts\reset-db.ps1
```

**Opción B — Manual:**

```powershell
# Windows — PowerShell
docker compose down -v
docker compose up -d
```

```bash
# Linux / Mac / Git Bash
docker compose down -v
docker compose up -d
```

> Esto borra **todos** los datos de la BD local. Los proyectos y documentos generados
> en desarrollo se pierden. Solo afecta el entorno local.

### Verificar que el stack está operativo

```bash
# Health de Kong
curl http://localhost:54321/rest/v1/ -H "apikey: <SUPABASE_ANON_KEY>"

# Listar tabla pipeline_jobs via REST
curl http://localhost:54321/rest/v1/pipeline_jobs \
  -H "apikey: <SUPABASE_SERVICE_ROLE_KEY>" \
  -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>"
# → debe devolver [] (array vacío) con status 200

# Acceso directo a PostgreSQL
docker exec -it knowto-supabase-db psql -U postgres -c "\dt"
```

Las claves para desarrollo están en `.env.example` y son los valores por defecto del stack.

### Nota sobre Studio `(unhealthy)`

Studio puede aparecer como `(unhealthy)` en `docker compose ps`. Esto es un bug cosmético en
Realtime v2 donde el healthcheck interno lanza `Protocol.UndefinedError`. Studio es
**completamente funcional** en `http://localhost:54323` a pesar del estado reportado.

---

## API REST

Documentación interactiva (Scalar): `http://api.localhost/docs`
Spec OpenAPI 3.0: `http://api.localhost/openapi.json`

### Autenticación

```
Authorization: Bearer <token>
```

| Entorno | Token válido |
|:---|:---|
| Desarrollo | `dev-local-bypass` (literal, sin firma) |
| Producción | JWT de Google OAuth emitido por Supabase |

### Endpoints DCFL (EC0366)

| Método | Ruta | Auth | Descripción |
|:---|:---|:---|:---|
| `GET` | `/dcfl/health` | No | Health check EC0366 |
| `POST` | `/dcfl/wizard/project` | Sí | Crear proyecto DCFL |
| `GET` | `/dcfl/wizard/project/:id` | Sí | Contexto del proyecto |
| `GET` | `/dcfl/wizard/projects` | Sí | Listar proyectos del usuario |
| `POST` | `/dcfl/wizard/step` | Sí | Guardar datos de un paso |
| `POST` | `/dcfl/wizard/extract` | Sí | Extraer contexto compacto de fases previas |
| `POST` | `/dcfl/wizard/generate-async` | Sí | Generar documento con IA (asíncrono, vía WebSocket) |
| `GET` | `/dcfl/wizard/job/:jobId` | Sí | Consultar estado de un job (fallback) |
| `POST` | `/dcfl/wizard/generate-form` | Sí | Generar esquema de formulario dinámico |

### Endpoints CCE (EC0249)

| Método | Ruta | Auth | Descripción |
|:---|:---|:---|:---|
| `GET` | `/cce/health` | No | Health check EC0249 |
| `POST` | `/cce/wizard/project` | Sí | Crear proyecto CCE |
| `GET` | `/cce/wizard/project/:id` | Sí | Contexto del proyecto |
| `GET` | `/cce/wizard/projects` | Sí | Listar proyectos del usuario |
| `POST` | `/cce/wizard/step` | Sí | Guardar datos de un paso |
| `POST` | `/cce/wizard/extract` | Sí | Extraer contexto compacto |
| `POST` | `/cce/wizard/generate` | Sí | Generar documento con IA |
| `POST` | `/cce/wizard/generate-form` | Sí | Generar formulario dinámico (F0_CLIENT_QUESTIONS_FORM) |
| `POST` | `/cce/wizard/upload` | Sí | Subir instrumento completado (PDF/JPG/PNG en base64) |
| `POST` | `/cce/wizard/ocr` | Sí | Extraer texto de imagen escaneada |

### Ejemplo rápido

```bash
# Health
curl http://api.localhost/health

# Crear proyecto (dev)
curl -X POST http://api.localhost/dcfl/wizard/project \
  -H "Authorization: Bearer dev-local-bypass" \
  -H "Content-Type: application/json" \
  -d '{"name":"Curso Seguridad Industrial","clientName":"Juan Pérez","industry":"Manufactura"}'
```

---

## Tests

```bash
# Backend — Vitest
cd backend
npm test               # 152 tests
npm run test:coverage  # con reporte de cobertura HTML

# Frontend dcfl — verificación de tipos TypeScript
cd frontend/dcfl
npm run type-check     # tsc --noEmit

# Frontend root
cd frontend/root
npm run type-check
```

| Suite | Tests | Qué cubre |
|:---|:---|:---|
| `auth.middleware.test.ts` | 8 | Bypass dev, JWT prod, tokens inválidos |
| `ai.service.test.ts` | 14 | Ollama (dev) y Workers AI (prod), pipeline multi-agente |
| `supabase.service.test.ts` | 13 | Mocks dev y llamadas RPC prod |
| `prompt-registry.test.ts` | 6 | PromptRegistry, gray-matter, renderById |
| `health.e2e.test.ts` | 7 | Health global, `/dcfl/health`, spec OpenAPI |
| `wizard.e2e.test.ts` | 32 | Flujo completo DCFL — todos los endpoints `/dcfl/wizard/*` |
| `wizard.cce.test.ts` | 3 | Flujo completo CCE — F0, F1_1, F0_CLIENT_QUESTIONS_FORM |
| `health.cce.test.ts` | 6 | Health `/cce/health`, spec OpenAPI CCE |
| `pipeline-orchestrator.cce.test.ts` | 2 | Pipeline extractor→judge con SiteConfig inyectado |
| `upload.cce.test.ts` | 7 | UploadService (dev store, UUID, MIME types) |
| `crawler.cce.test.ts` | 4 | CrawlerService (limpieza HTML, truncado, errores) |
| `ai.cce.test.ts` | 4 | CrawlerService — variantes CCE |
| `supabase.cce.test.ts` | 9 | SupabaseService CCE (getPrompt, saveStepOutput…) |
| **Total** | **152** | **100% passing** |

---

## Variables de entorno

### Backend — `backend/.dev.vars` (desarrollo nativo, no commitear)

```ini
ENVIRONMENT=development
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
# Supabase self-hosted local (puerto 54321 = Kong)
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # ver .env.example
SUPABASE_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long
```

> Si usas `SUPABASE_URL` vacío o con el string `dummy`, el backend cae a modo en-memoria
> (sin persistencia). Con la URL real del Supabase local, usa la BD completa.

En Docker las variables vienen de `docker-compose.yml`; `.dev.vars` se ignora.

### Backend — `wrangler.toml` (valores por defecto / Docker)

```toml
[vars]
ENVIRONMENT   = "development"
OLLAMA_URL    = "http://ollama:11434"   # nombre de servicio Docker
OLLAMA_MODEL  = "llama3.2:3b"
```

### Backend — producción (secretos en Cloudflare Dashboard o wrangler)

```bash
wrangler secret put SUPABASE_URL              --env production
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
wrangler secret put SUPABASE_JWT_SECRET       --env production
```

`ENVIRONMENT=production` ya está en `wrangler.toml` bajo `[env.production.vars]`.

### Frontend — `.env.local` por microsite (opcional)

```ini
# frontend/dcfl/.env.local
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
# VITE_API_BASE_URL=   # solo si apuntas a una API externa (staging, etc.)
```

En Docker las variables vienen de `docker-compose.yml`.

---

## Scripts del backend

| Script | Descripción |
|:---|:---|
| `npm run dev` | Servidor Node.js en :8787, lee `.dev.vars` |
| `npm run dev:debug` | Igual + inspector Node.js en :9229 (VS Code attach) |
| `npm run dev:wrangler` | Servidor workerd (solo para verificar compatibilidad CF) |
| `npm test` | Vitest — 152 tests |
| `npm run test:watch` | Vitest en modo watch |
| `npm run test:prompts` | Solo la suite de prompts (verbose) |
| `wrangler deploy --env production` | Deploy a Cloudflare Workers |

---

## Comandos Docker

| Comando | Descripción |
|:---|:---|
| `docker compose up -d` | Arrancar todo |
| `docker compose down` | Detener y eliminar contenedores |
| `docker compose restart nginx` | Recargar config de Nginx sin reiniciar todo |
| `docker compose restart backend` | Reiniciar solo el backend |
| `docker compose logs -f backend` | Logs del backend en tiempo real |
| `docker compose logs -f frontend-dcfl` | Logs del frontend dcfl |
| `docker compose logs -f nginx` | Logs de routing |
| `docker compose up -d --scale ollama=0` | Levantar sin Ollama (sin GPU / sin modelo) |
| `docker compose logs -f ollama` | Ver progreso de descarga del modelo |

### Comandos Supabase

| Comando | Descripción |
|:---|:---|
| `docker compose logs -f supabase-db` | Logs de PostgreSQL (migraciones, errores) |
| `docker compose logs -f supabase-realtime` | Logs de Realtime (suscripciones WebSocket) |
| `docker compose logs -f supabase-rest` | Logs de PostgREST |
| `docker compose logs -f supabase-kong` | Logs del API Gateway |
| `docker exec -it knowto-supabase-db psql -U postgres` | Shell psql directo a la BD |
| `docker volume rm knowto_supabase_db_data` | Borrar volumen DB (resetear BD — ver sección anterior) |
| `.\scripts\reset-db.ps1` | Reset completo del stack (Windows) — baja, borra volúmenes, sube |

---

## Debug con VS Code

### Arquitectura de red en Docker

```
Browser (dcfl.localhost)
    ↓  HTTP/WS  →  Nginx :80
                      ↓  proxy
                 frontend-dcfl :5173   (Vite + HMR)
                 backend :8787         ← debuggable
                      ↓  fetch
                 ollama :11434
```

### Opción A — Con Docker (recomendado)

```bash
docker compose up -d
# esperar ~20s a que el backend termine de instalar dependencias
curl http://api.localhost/health   # debe devolver {"success":true,...}
```

1. `Ctrl+Shift+P` → **Debug: Select and Start Debugging**
2. Seleccionar **"Backend: Attach (Docker)"** o el compound **"Full Stack (Docker)"**
3. Poner breakpoints en `backend/src/` — se activan en la siguiente petición

> Si VS Code dice "could not connect", espera 5 s y reintenta.
> El config tiene `"restart": true` para reintentar automáticamente.

### Opción B — Sin Docker (nativo)

```bash
# Prerrequisito: Ollama corriendo en el host
ollama list   # ver modelos; si falta llama3.2:3b → ollama pull llama3.2:3b

cd backend
npm run dev:debug   # Node.js en :8787 + inspector en :9229
```

1. `Ctrl+Shift+P` → **"Backend: Launch (Host)"** — lanza y adjunta automáticamente
2. Poner breakpoints en `backend/src/`

### Configuraciones `launch.json`

| Nombre | Descripción |
|:---|:---|
| `Backend: Attach (Docker)` | Adjunta al proceso Node.js del contenedor |
| `Backend: Launch (Host)` | Lanza `server.dev.ts` directamente en el host |
| `Frontend: Chrome` | Abre Chrome con source maps del frontend |
| `Full Stack (Docker)` | Compound: backend Docker + Chrome |
| `Full Stack (Host)` | Compound: backend host + Chrome |

---

## Script de prueba funcional

Abre las DevTools en `http://dcfl.localhost` (Docker) o `http://localhost:5173` (nativo)
y pega este script en la consola:

```javascript
// KnowTo — prueba funcional de la API
// Ajusta API según tu entorno:
//   Docker:  'http://api.localhost'
//   Nativo:  'http://localhost:8787'

const API  = 'http://api.localhost';
const AUTH = { Authorization: 'Bearer dev-local-bypass', 'Content-Type': 'application/json' };

async function check(label, fn) {
  try {
    const r = await fn();
    console.log(`✅ ${label}`, r);
    return r;
  } catch (e) {
    console.error(`❌ ${label}`, e.message ?? e);
    return null;
  }
}

(async () => {
  console.group('KnowTo API — prueba funcional');

  // 1. Health
  const health = await check('GET /health', async () => {
    return (await fetch(`${API}/health`)).json();
  });
  if (!health?.success) { console.groupEnd(); return; }

  // 2. Crear proyecto
  const proj = await check('POST /dcfl/wizard/project', async () => {
    return (await fetch(`${API}/dcfl/wizard/project`, {
      method: 'POST', headers: AUTH,
      body: JSON.stringify({ name: 'Curso Test', clientName: 'Ana García', industry: 'Manufactura' })
    })).json();
  });
  if (!proj?.data?.projectId) { console.groupEnd(); return; }
  const projectId = proj.data.projectId;

  // 3. Guardar paso
  const step = await check('POST /dcfl/wizard/step', async () => {
    return (await fetch(`${API}/dcfl/wizard/step`, {
      method: 'POST', headers: AUTH,
      body: JSON.stringify({ projectId, stepNumber: 0, inputData: { courseTopic: 'Seguridad' } })
    })).json();
  });
  const stepId = step?.data?.stepId;

  // 4. Generar documento — puede tardar 60-180s en CPU
  console.log('⏳ Generando documento con Ollama (puede tardar ~60s en CPU)...');
  const gen = await check('POST /dcfl/wizard/generate-async', async () => {
    return (await fetch(`${API}/dcfl/wizard/generate-async`, {
      method: 'POST', headers: AUTH,
      body: JSON.stringify({
        projectId, stepId,
        phaseId: 'F0', promptId: 'F0',
        context: { projectName: 'Curso Test', clientName: 'Ana García', industry: 'Manufactura' },
        userInputs: { courseTopic: 'Seguridad industrial' }
      })
    })).json();
  });

  if (gen?.data?.jobId) {
    console.log(`📋 Job encolado: ${gen.data.jobId}`);
    console.log('✅ WebSocket recibirá la notificación cuando el documento esté listo');
  }

  console.groupEnd();
  console.log('✅ Prueba completa.');
})();
```

---

## Test de productos F4 (EC0366)

Genera los 8 productos automáticamente a partir de un proyecto con fases 0-3 completas. No requiere interacción manual con el wizard.

### Ciclo por producto

```
Para cada producto en orden (P1 → P4 → P3 → P2 → P5 → P6 → P7 → P8):
  1. Genera el form schema  (F4_PN_FORM_SCHEMA)  — si ya existe lo reutiliza
  2. Usa suggested_value de cada campo como entradas del formulario
     (si el usuario ya llenó el formulario manualmente, usa esos valores)
  3. Genera el documento    (F4_PN_GENERATE_DOCUMENT)
     — P1, P4: un solo job con todos los campos
     — P2, P3, P5, P6, P7, P8: un job por módulo
  4. Espera que el job complete antes de pasar al siguiente producto
```

### Obtener el projectId

```bash
docker exec knowto-supabase-db psql -U postgres -d postgres \
  -c "SELECT id, name FROM projects ORDER BY created_at DESC LIMIT 5;"
```

### 1. Limpiar datos generados

```bash
# Por endpoint:
curl -X DELETE http://api.localhost/dcfl/test/reset/<PROJECT_ID>

# O con SQL directo:
docker exec knowto-supabase-db psql -U postgres -d postgres -c "
  DELETE FROM fase4_productos       WHERE project_id = '<PROJECT_ID>';
  DELETE FROM producto_form_schemas WHERE project_id = '<PROJECT_ID>';
  DELETE FROM pipeline_jobs         WHERE project_id = '<PROJECT_ID>' AND phase_id = 'F4';"
```

### 2. Reiniciar backend (necesario tras cambios de código)

```bash
docker compose restart backend
```

### 3. Lanzar el test run

```bash
curl -X POST http://api.localhost/dcfl/test/run-all \
  -H "Content-Type: application/json" \
  -d '{ "projectId": "<PROJECT_ID>" }'
```

Retorna `202` inmediatamente. La generación corre en background (2-6 horas con Ollama local).

### 4. Monitorear

```bash
# Logs del test runner
docker logs knowto-backend -f 2>&1 | grep TEST-RUN

# Estado de productos en BD
docker exec knowto-supabase-db psql -U postgres -d postgres -c "
  SELECT producto, validacion_estado, created_at
  FROM fase4_productos
  WHERE project_id = '<PROJECT_ID>'
  ORDER BY producto, created_at DESC;"

# Jobs y errores
docker exec knowto-supabase-db psql -U postgres -d postgres -c "
  SELECT prompt_id, status, LEFT(error, 100)
  FROM pipeline_jobs
  WHERE project_id = '<PROJECT_ID>' AND phase_id = 'F4'
  ORDER BY created_at DESC LIMIT 30;"
```

Ver [docs/TEST-F4-PRODUCTS.md](docs/TEST-F4-PRODUCTS.md) para diagnóstico detallado.

---

## Verificar conectividad Ollama

```bash
# Modelos disponibles
curl http://localhost:11434/api/tags

# Prueba rápida de generación
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3.2:3b","prompt":"Di hola en español","stream":false}'
```

---

## Tiempos esperados (CPU, sin GPU)

| Operación | Tiempo |
|:---|:---|
| Health check | < 50 ms |
| Crear / listar proyecto | < 100 ms |
| Generar documento (Ollama CPU) | 60–180 s |
| Generar documento (Workers AI prod) | 5–15 s |

---

## Problemas comunes

| Error | Causa | Solución |
|:---|:---|:---|
| `ENOENT /app/api/package.json` | `working_dir` incorrecto en docker-compose | El `package.json` está en `backend/`, el `working_dir` debe ser `/app` |
| `ENOTFOUND dcfl.localhost` (en logs del contenedor) | `hmr.host` resuelve dentro del contenedor donde no existe | Usar `hmr.clientPort` en vez de `hmr.host` en `vite.config.ts` |
| Recargas infinitas en el navegador | Windows Docker genera eventos inotify espurios | `server.watch: { usePolling: true, interval: 1000 }` en `vite.config.ts` |
| `Network connection lost` | workerd bloqueando IPs privadas | Usar `npm run dev` (Node.js), no `npm run dev:wrangler` |
| `AI generation failed: model not found` | Modelo no descargado | `ollama pull llama3.2:3b` o editar `OLLAMA_MODEL` en `.dev.vars` |
| `Cannot attach: port 9229 not open` | Backend aún arrancando | Esperar 15 s y reintentar; `"restart": true` en `launch.json` reintenta solo |
| `EADDRINUSE 8787` | Otra instancia corriendo | `pkill -f server.dev` o reiniciar Docker |
| `Unauthorized` | Token incorrecto | Usar exactamente `Bearer dev-local-bypass` |
| `502 Bad Gateway` en Nginx | Contenedor del microsite aún arrancando | Esperar ~30 s o ver `docker compose logs -f frontend-dcfl` |
| `supabase-db (unhealthy)` al arrancar | Migración falló (p.ej. rol no existe) | Revisar `docker compose logs supabase-db`; resetear volumen si es necesario |
| `role "anon" does not exist` en migración | `000_supabase_setup.sql` no se ejecutó | Verificar que el archivo existe en `supabase/migrations/`; resetear volumen |
| `PGRST301: JWSInvalidSignature` | JWT firmado con secret diferente al configurado | Asegúrate de que `JWT_SECRET` en `.env` coincide con el usado para generar `SUPABASE_ANON_KEY` |
| `permission denied for table pipeline_jobs` | `service_role` carece de GRANT a nivel de tabla | Ejecutar `GRANT ALL ON TABLE pipeline_jobs TO service_role;` en psql, o resetear la BD |
| `Bad key size` en Realtime | `DB_ENC_KEY` no tiene exactamente 16 bytes (AES-128) | El valor en `docker-compose.yml` debe ser exactamente 16 caracteres |
| Studio `(unhealthy)` en `docker compose ps` | Bug cosmético en Realtime v2.28.x (`Protocol.UndefinedError`) | Ignorar — Studio funciona en `http://localhost:54323`; no afecta WebSocket |
| Realtime no notifica cambios | `pipeline_jobs` no está en publicación `supabase_realtime` | La publicación se crea al conectar el primer suscriptor; si persiste, revisar RLS policies |
| WebSocket no conecta | Kong no tiene configuración CORS para WebSocket | Verificar `kong.yml` con `protocols: [ws, wss, http, https]` |

---

## Añadir un microsite nuevo

Ver [docs/ADDING-A-MICROSITE.md](docs/ADDING-A-MICROSITE.md) para la guía completa.
