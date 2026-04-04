# KnowTo

Plataforma de certificación EC0366 (CONOCER) asistida por IA. Guía al evaluador a través de 10 pasos para generar los documentos oficiales del proceso de certificación.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | TypeScript + Vite + Tailwind CSS (Vanilla) |
| Backend | Hono + `@hono/zod-openapi` — Node.js en dev, Cloudflare Workers en prod |
| IA — producción | Workers AI — `@cf/meta/llama-3.2-3b-instruct` |
| IA — desarrollo | Ollama local — `llama3.2:3b` (configurable) |
| Base de datos | Supabase (PostgreSQL) vía stored procedures |
| Dev local | Docker Compose + Postgres + Ollama |
| Tests | Vitest (67 tests, 100 % pass) |

---

## Inicio rápido

```bash
# Levantar todos los servicios (no requiere cuenta de Cloudflare)
docker compose up -d

# Frontend  → http://localhost:5173
# Backend   → http://localhost:8787
# API Docs  → http://localhost:8787/api/docs
# Ollama    → http://localhost:11435  (puerto del contenedor; descarga llama3.2:3b la primera vez)
```

El backend tarda ~20 s en estar listo (npm install + arranque de Node.js dentro del contenedor).

**Sin Docker** (desarrollo nativo):

```bash
# Terminal 1 — backend
cd backend
npm install
npm run dev          # Node.js en :8787, lee backend/.dev.vars
# o con debugger:
npm run dev:debug    # igual + inspector Node.js en :9229

# Terminal 2 — frontend
cd frontend
npm install
npm run dev          # Vite en :5173
```

> **No se necesita cuenta de Cloudflare ni `wrangler login`** para desarrollar.
> El backend corre en Node.js puro (`server.dev.ts`). `wrangler` solo se usa para `deploy`.

---

## Por qué Node.js en desarrollo y no `wrangler dev`

`wrangler dev` usa **workerd** como runtime, que bloquea intencionalmente conexiones a IPs
privadas RFC-1918 (172.x, 192.168.x) como protección SSRF. Esto impide llamar a Ollama
dentro de Docker. La solución es correr el mismo código Hono en Node.js con
`@hono/node-server`, que no tiene esa restricción.

```
wrangler dev   →  workerd (sandbox)  →  bloquea 172.20.0.x  →  Ollama inalcanzable
npm run dev    →  Node.js puro       →  acceso total         →  Ollama funciona
```

Para producción el deploy sigue siendo `wrangler deploy` → Cloudflare Workers.

---

## Estructura del proyecto

```
knowto/
├── backend/
│   ├── src/
│   │   ├── index.ts              # App Hono — CORS dinámico + OpenAPI + rutas
│   │   ├── server.dev.ts         # Entry point de desarrollo (Node.js + @hono/node-server)
│   │   ├── register-md.cjs       # Loader .md para Node.js (equivale a [[rules]] de wrangler)
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts      # Bearer JWT: dev bypass / Supabase prod
│   │   │   └── error.middleware.ts
│   │   ├── routes/
│   │   │   ├── health.route.ts         # GET /api/health
│   │   │   └── wizard.route.ts         # /api/wizard/*
│   │   ├── services/
│   │   │   ├── ai.service.ts           # Ollama (dev) / Workers AI (prod)
│   │   │   └── supabase.service.ts     # Mocks UUID (dev) / RPC real (prod)
│   │   ├── prompts/
│   │   │   ├── index.ts                # PromptRegistry singleton
│   │   │   └── templates/              # 9 plantillas Markdown (F0–F6_2)
│   │   └── types/
│   │       ├── env.ts                  # Bindings de Cloudflare Workers
│   │       └── wizard.types.ts         # PhaseId, PromptId, ProjectContext…
│   ├── src/__tests__/             # Vitest — 67 tests
│   │   ├── middleware/auth.middleware.test.ts
│   │   ├── routes/health.e2e.test.ts
│   │   ├── routes/wizard.e2e.test.ts
│   │   ├── services/ai.service.test.ts
│   │   └── services/supabase.service.test.ts
│   ├── .dev.vars                  # Variables locales para Node.js dev (no commitear)
│   ├── wrangler.toml
│   └── vitest.config.ts
├── frontend/
│   └── src/
│       ├── main.ts               # Orquestador: auth + dashboard + wizard
│       ├── controllers/          # Un controlador por paso (step0–step9)
│       ├── stores/wizard.store.ts
│       ├── shared/
│       │   ├── endpoints.ts      # URL base resuelta en runtime desde window.location
│       │   ├── http.client.ts    # fetch wrapper con auth header automático
│       │   ├── step.base.ts      # Clase base de todos los controladores
│       │   ├── pubsub.ts
│       │   └── validationEngine.ts
│       └── types/wizard.types.ts
├── .vscode/launch.json           # Configuraciones de debug para VS Code
├── docker-compose.yml
└── DEBUG.md                      # Guía detallada de debugging
```

---

## Debug con VS Code

Ver [DEBUG.md](DEBUG.md) para la guía completa. Resumen:

### Con Docker (recomendado)

1. `docker compose up -d`
2. En VS Code: `Ctrl+Shift+P` → **Debug: Select and Start Debugging**
3. Seleccionar **"Backend: Attach (Docker)"** o el compound **"Full Stack (Docker)"**
4. Poner breakpoints en `backend/src/` — se activan en la siguiente petición

### Sin Docker

1. `cd backend && npm run dev:debug` (lanza con `--inspect=0.0.0.0:9229`)
2. En VS Code: seleccionar **"Backend: Launch (Host)"** — lanza y adjunta automáticamente

### Configuraciones disponibles en `launch.json`

| Nombre | Descripción |
|---|---|
| `Backend: Attach (Docker)` | Adjunta al proceso Node.js del contenedor |
| `Backend: Launch (Host)` | Lanza `server.dev.ts` directamente en el host |
| `Frontend: Chrome` | Abre Chrome con source maps del frontend |
| `Full Stack (Docker)` | Compound: backend Docker + Chrome |
| `Full Stack (Host)` | Compound: backend host + Chrome |

---

## Resolución dinámica de URLs

Sin dominios hardcodeados. El mismo bundle funciona en cualquier dominio.

### Frontend (`endpoints.ts`) — resuelve en runtime

```
localhost:5173   →  http://localhost:8787
knowto.dev       →  https://api.knowto.dev
knowto.mx        →  https://api.knowto.mx
elsitio.com.mx   →  https://api.elsitio.com.mx
```

### Backend (`index.ts`) — CORS derivado del host de la petición

```
Worker en api.knowto.dev   →  acepta Origin: knowto.dev, www.knowto.dev
Worker en localhost:8787   →  acepta cualquier localhost (cualquier puerto)
```

---

## Motores de IA por entorno

| Entorno | Motor | Cómo |
|---|---|---|
| `development` | Ollama local | `fetch(OLLAMA_URL/api/generate)` — sin auth |
| `production` | Workers AI | `env.AI.run('@cf/meta/llama-3.2-3b-instruct')` — binding Cloudflare |

El modelo de Ollama es configurable con `OLLAMA_MODEL` (default: `llama3.2:3b`).

> **Tiempos esperados en dev (CPU sin GPU):** generar un documento tarda 60–180 s.
> En producción con Workers AI: 5–15 s. Si tienes GPU NVIDIA, descomenta
> la sección `deploy.resources` en `docker-compose.yml`.

---

## API REST

Documentación interactiva (Scalar): `GET /api/docs`
Spec OpenAPI 3.0: `GET /api/openapi.json`

### Autenticación

| Entorno | Token válido |
|---|---|
| Desarrollo | `dev-local-bypass` (literal, sin firma) |
| Producción | JWT de Google OAuth emitido por Supabase |

```
Authorization: Bearer <token>
```

### Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/health` | Health check (sin auth) |
| `GET` | `/api/openapi.json` | Spec OpenAPI 3.0 |
| `GET` | `/api/docs` | Documentación interactiva (Scalar) |
| `POST` | `/api/wizard/project` | Crear proyecto |
| `GET` | `/api/wizard/project/:projectId` | Contexto del proyecto |
| `GET` | `/api/wizard/projects` | Listar proyectos del usuario |
| `POST` | `/api/wizard/step` | Guardar datos de un paso |
| `POST` | `/api/wizard/generate` | Generar documento con IA |

### Ejemplo rápido

```bash
# Health
curl http://localhost:8787/api/health

# Crear proyecto
curl -X POST http://localhost:8787/api/wizard/project \
  -H "Authorization: Bearer dev-local-bypass" \
  -H "Content-Type: application/json" \
  -d '{"name":"Curso Seguridad Industrial","clientName":"Juan Pérez","industry":"Manufactura"}'
```

---

## Fases del proceso EC0366

| Paso | ID | Documento |
|---|---|---|
| 0 | F0 | Marco de referencia del cliente |
| 1 | F1 | Informe de necesidades |
| 2 | F2 | Especificaciones de análisis |
| 3 | F3 | Especificaciones técnicas |
| 4 | F4 | Producción de instrumentos |
| 5 | F5 / F5.2 | Lista de verificación / Evidencias |
| 6 | F6 / F6.2 | Ajustes / Firmas |
| 7–9 | — | Pago y cierre |

---

## Comportamiento por entorno

| Servicio | Desarrollo | Producción |
|---|---|---|
| **Runtime backend** | Node.js (`server.dev.ts`) | Cloudflare Workers (workerd) |
| **IA** | Ollama Docker (`llama3.2:3b`) | Workers AI (`llama-3.2-3b-instruct`) |
| **Base de datos** | Mocks en memoria (UUIDs) | Supabase — stored procedures RPC |
| **Auth** | Token literal `dev-local-bypass` | JWT Google OAuth via Supabase |
| **CORS** | Acepta cualquier `localhost` | Solo `{dominio}` y `www.{dominio}` |
| **Login Cloudflare** | No requerido | Requerido para `wrangler deploy` |

---

## Tests

```bash
cd backend
npm test              # 67 tests
npm run test:coverage # Con reporte de cobertura HTML
```

| Suite | Qué cubre |
|---|---|
| `auth.middleware.test.ts` | Bypass dev, JWT prod, tokens inválidos |
| `ai.service.test.ts` | Ollama (dev) y Workers AI (prod) — backends separados |
| `supabase.service.test.ts` | Mocks dev y llamadas RPC prod |
| `health.e2e.test.ts` | Health check y spec OpenAPI |
| `wizard.e2e.test.ts` | Todos los endpoints del wizard |

---

## Variables de entorno

### Backend — `backend/.dev.vars` (desarrollo nativo, no commitear)

```ini
ENVIRONMENT=development
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b        # Cambiar al modelo que tengas: ollama list
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=dummy-service-role-key
SUPABASE_JWT_SECRET=dummy-jwt-secret
```

En Docker las variables vienen de `docker-compose.yml`; `.dev.vars` se ignora.

### Backend — `wrangler.toml` (valores para Docker / defaults)

```toml
[vars]
ENVIRONMENT   = "development"
OLLAMA_URL    = "http://ollama:11434"   # nombre de servicio Docker
OLLAMA_MODEL  = "llama3.2:3b"
```

### Backend — producción (secretos en Cloudflare)

```bash
wrangler secret put SUPABASE_URL --env production
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
wrangler secret put SUPABASE_JWT_SECRET --env production
```

`ENVIRONMENT=production` ya está en `wrangler.toml` bajo `[env.production.vars]`.

### Frontend — `frontend/.env.development`

```ini
VITE_DEV_API_PORT=8787          # Puerto del backend local
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=dummy-key-for-local
```

`frontend/.env.production` no necesita dominio — la URL se resuelve en runtime.

---

## Scripts del backend

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor Node.js en :8787, lee `.dev.vars` |
| `npm run dev:debug` | Igual + inspector Node.js en :9229 (VS Code) |
| `npm run dev:wrangler` | Servidor wrangler/workerd (solo para test de compatibilidad CF) |
| `npm test` | Vitest — 67 tests |
| `npm run test:watch` | Vitest en modo watch |
| `wrangler deploy --env production` | Deploy a Cloudflare Workers |

---

## Comandos Docker

| Comando | Descripción |
|---|---|
| `docker compose up -d` | Iniciar todos los servicios |
| `docker compose down` | Detener y eliminar contenedores |
| `docker compose restart backend` | Reiniciar solo el backend |
| `docker compose up -d --scale ollama=0` | Levantar sin Ollama (sin GPU / sin modelo) |
| `docker compose logs -f backend` | Logs del backend en tiempo real |
| `docker compose logs -f ollama` | Logs de Ollama (ver progreso de descarga del modelo) |
