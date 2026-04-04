# KnowTo

Plataforma de certificación EC0366 (CONOCER) asistida por IA. Guía al evaluador a través de 10 pasos para generar los documentos oficiales del proceso de certificación.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | TypeScript + Vite + Tailwind CSS (Vanilla) |
| Backend | Cloudflare Workers + Hono + `@hono/zod-openapi` |
| IA | Workers AI — `@cf/meta/llama-3.2-3b-instruct` |
| Base de datos | Supabase (PostgreSQL) vía stored procedures |
| Dev local | Docker Compose + Postgres + Ollama (opcional) |
| Tests | Vitest (60 tests, 100 % pass) |

---

## Inicio rápido

```bash
# 1. Variables de entorno (solo necesarias en producción)
cp .env.example .env

# 2. Levantar todos los servicios
docker compose up -d

# Frontend  → http://localhost:5173
# Backend   → http://localhost:8787
# API Docs  → http://localhost:8787/api/docs
```

**Sin Docker** (desarrollo nativo):

```bash
# Backend
cd backend
npm install
npx wrangler dev         # http://localhost:8787

# Frontend (otra terminal)
cd frontend
npm install
npm run dev              # http://localhost:5173
```

---

## Estructura del proyecto

```
knowto/
├── backend/                   # Cloudflare Worker
│   ├── src/
│   │   ├── index.ts           # Entry point — app Hono + OpenAPI
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts     # Bearer JWT (dev bypass / Supabase prod)
│   │   │   └── error.middleware.ts
│   │   ├── routes/
│   │   │   ├── health.route.ts        # GET /api/health
│   │   │   └── wizard.route.ts        # /api/wizard/*
│   │   ├── services/
│   │   │   ├── ai.service.ts          # Workers AI — generación de documentos
│   │   │   └── supabase.service.ts    # Persistencia (mock en dev, real en prod)
│   │   ├── prompts/
│   │   │   ├── index.ts               # PromptRegistry singleton
│   │   │   └── templates/             # 9 plantillas Markdown (F0–F6_2)
│   │   └── types/
│   │       ├── env.ts                 # Bindings de Cloudflare Workers
│   │       └── wizard.types.ts        # PhaseId, PromptId, ProjectContext...
│   ├── src/__tests__/                 # Vitest — 60 tests
│   │   ├── middleware/auth.middleware.test.ts
│   │   ├── routes/health.e2e.test.ts
│   │   ├── routes/wizard.e2e.test.ts
│   │   └── services/supabase.service.test.ts
│   ├── wrangler.toml
│   └── vitest.config.ts
├── frontend/                  # SPA Vanilla TS
│   └── src/
│       ├── main.ts            # Orquestador: auth + dashboard + wizard
│       ├── controllers/       # Un controlador por paso del wizard (step0–step9)
│       ├── stores/wizard.store.ts
│       ├── shared/
│       │   ├── endpoints.ts   # SSOT de URLs de la API
│       │   ├── pubsub.ts
│       │   ├── step.base.ts
│       │   └── validationEngine.ts
│       └── types/wizard.types.ts
└── docker-compose.yml
```

---

## API REST

Base URL: `http://localhost:8787`

Documentación interactiva (Scalar): `GET /api/docs`  
Spec OpenAPI 3.0: `GET /api/openapi.json`

### Autenticación

Todos los endpoints de `/api/wizard/*` requieren header:

```
Authorization: Bearer <token>
```

| Entorno | Token válido |
|---|---|
| Desarrollo | `dev-local-bypass` (literal) |
| Producción | JWT de Google OAuth emitido por Supabase |

### Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/health` | Health check (sin auth) |
| `GET` | `/api/openapi.json` | Spec OpenAPI |
| `GET` | `/api/docs` | Swagger UI (Scalar) |
| `POST` | `/api/wizard/project` | Crear proyecto |
| `GET` | `/api/wizard/project/:projectId` | Contexto del proyecto |
| `GET` | `/api/wizard/projects` | Listar proyectos del usuario |
| `POST` | `/api/wizard/step` | Guardar datos de un paso |
| `POST` | `/api/wizard/generate` | Generar documento con IA |

### Ejemplo — crear proyecto

```bash
curl -X POST http://localhost:8787/api/wizard/project \
  -H "Authorization: Bearer dev-local-bypass" \
  -H "Content-Type: application/json" \
  -d '{"name":"Curso de Seguridad Industrial","clientName":"Juan Pérez","industry":"Manufactura"}'
```

```json
{
  "success": true,
  "data": { "projectId": "uuid-generado" },
  "timestamp": "2026-04-04T..."
}
```

---

## Fases del proceso EC0366

El wizard guía al evaluador por 10 pasos que generan los documentos oficiales:

| Paso | ID | Documento |
|---|---|---|
| 0 | F0 | Datos del cliente |
| 1 | F1 | Análisis de necesidades |
| 2 | F2 | Especificaciones de análisis |
| 3 | F3 | Especificaciones técnicas |
| 4 | F4 | Producción de instrumentos |
| 5 | F5 / F5.2 | Lista de verificación / Evidencias |
| 6 | F6 / F6.2 | Ajustes / Firmas |
| 7–9 | — | Pago y cierre |

Cada documento es generado por `AIService` usando el prompt correspondiente de `backend/src/prompts/templates/`.

---

## Servicios en modo desarrollo

`SupabaseService` detecta automáticamente el entorno:

- **Dev** (`ENVIRONMENT !== 'production'`): todos los métodos devuelven UUIDs aleatorios, sin conexión a BD.
- **Prod**: llama a los stored procedures `sp_create_project`, `sp_save_step`, `sp_save_document`, etc.

El token `dev-local-bypass` solo es aceptado en desarrollo. En producción el middleware lo rechaza con 401 antes de llegar a Supabase.

---

## Tests

```bash
cd backend
npm test              # Ejecuta los 60 tests
npm run test:coverage # Con reporte de cobertura
```

| Suite | Tests |
|---|---|
| `auth.middleware.test.ts` | Bypass dev, JWT prod, tokens inválidos |
| `supabase.service.test.ts` | Modo dev (mock) y prod (RPC) |
| `health.e2e.test.ts` | Health check y spec OpenAPI |
| `wizard.e2e.test.ts` | Todos los endpoints del wizard |

---

## Variables de entorno

En desarrollo Docker las vars están fijadas en `docker-compose.yml`. Para desarrollo nativo con wrangler crea `backend/.dev.vars`:

```ini
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...
ENVIRONMENT=development
```

Para producción, configura los secretos en Cloudflare:

```bash
wrangler secret put SUPABASE_URL --env production
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
wrangler secret put SUPABASE_JWT_SECRET --env production
```

---

## Comandos útiles

| Comando | Descripción |
|---|---|
| `docker compose up -d` | Iniciar todos los servicios |
| `docker compose down` | Detener servicios |
| `docker compose logs -f backend` | Logs del backend |
| `docker compose logs -f frontend` | Logs del frontend |
| `docker compose up -d --scale ollama=0` | Levantar sin Ollama (sin GPU) |
| `cd backend && npm test` | Ejecutar tests |
| `cd backend && npx wrangler deploy --env production` | Deploy a Cloudflare |
