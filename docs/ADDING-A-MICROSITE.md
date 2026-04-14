# Cómo añadir un nuevo microsite a KnowTo

Esta guía explica paso a paso cómo incorporar un nuevo microsite a la plataforma.
Al terminar tendrás un sitio completamente aislado, accesible en `[slug].localhost`
en desarrollo y en `[slug].[dominio]` en producción, con su propia sección en la API.

Usaremos `foo` como slug de ejemplo a lo largo de la guía. Sustitúyelo por el tuyo.

---

## Índice

1. [Estructura de la arquitectura](#1-estructura-de-la-arquitectura)
2. [Paso 1 — Backend: crear el router del microsite](#2-paso-1--backend-crear-el-router-del-microsite)
3. [Paso 2 — Backend: registrar en el API Gateway](#3-paso-2--backend-registrar-en-el-api-gateway)
4. [Paso 3 — Frontend: crear la app Vite](#4-paso-3--frontend-crear-la-app-vite)
5. [Paso 4 — Frontend: registrar en el directorio raíz](#5-paso-4--frontend-registrar-en-el-directorio-raíz)
6. [Paso 5 — Nginx: añadir el bloque de subdominio](#6-paso-5--nginx-añadir-el-bloque-de-subdominio)
7. [Paso 6 — Docker Compose: añadir el servicio frontend](#7-paso-6--docker-compose-añadir-el-servicio-frontend)
8. [Paso 7 — Hosts: registrar el dominio local](#8-paso-7--hosts-registrar-el-dominio-local)
9. [Arrancar y verificar](#9-arrancar-y-verificar)
10. [Producción](#10-producción)

---

## 1. Estructura de la arquitectura

```
KnowTo/
├── backend/
│   └── src/
│       ├── core/           ← middleware y tipos compartidos
│       ├── dcfl/           ← microsite EC0366 (ejemplo de referencia)
│       └── [foo]/          ← tu nuevo microsite (lo crearemos aquí)
│           ├── routes/
│           ├── services/
│           ├── types/
│           └── router.ts
├── frontend/
│   ├── core/src/           ← utilidades compartidas (@core)
│   ├── dcfl/               ← microsite EC0366 (ejemplo de referencia)
│   └── [foo]/              ← tu nuevo frontend (lo crearemos aquí)
├── nginx/
│   └── conf.d/
│       └── local.conf      ← un bloque server por microsite
└── docker-compose.yml
```

**Convención de URLs:**

| Entorno     | Frontend           | API                      |
|-------------|---------------------|--------------------------|
| Desarrollo  | `foo.localhost`     | `api.localhost/foo/...`  |
| Producción  | `foo.[dominio]`     | `api.[dominio]/foo/...`  |

---

## 2. Paso 1 — Backend: crear el router del microsite

Crea la carpeta `backend/src/foo/` con al menos un router y una ruta de health.

### 2.1 Health route

```typescript
// backend/src/foo/routes/health.route.ts
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Env } from '../../core/types/env';

const health = new OpenAPIHono<{ Bindings: Env }>();

health.openapi(
  createRoute({
    method: 'get',
    path: '/',
    tags: ['foo'],
    summary: 'Health check del microsite Foo',
    responses: {
      200: {
        description: 'Servicio disponible',
        content: { 'application/json': { schema: z.object({ status: z.string() }) } },
      },
    },
  }),
  (c) => c.json({ status: 'ok' }),
);

export { health };
```

### 2.2 Router del microsite

```typescript
// backend/src/foo/router.ts
import { OpenAPIHono } from '@hono/zod-openapi';
import { health } from './routes/health.route';
import type { Env } from '../core/types/env';

export function createFooRouter() {
  const router = new OpenAPIHono<{ Bindings: Env }>();
  router.route('/health', health);
  // router.route('/other', other);  // añade más rutas aquí
  return router;
}
```

Agrega las rutas de negocio que necesites siguiendo el mismo patrón que `backend/src/dcfl/routes/`.

---

## 3. Paso 2 — Backend: registrar en el API Gateway

Abre `backend/src/index.ts` y añade dos líneas:

```typescript
// 1. Importar el router (junto a los demás imports de microsites)
import { createFooRouter } from './foo/router';

// 2. Montar bajo el slug (en la sección de rutas de microsites)
app.route('/foo', createFooRouter());
```

Busca el comentario `// ── Microsites ──` en el archivo para ubicar el lugar correcto.
Todas las rutas del microsite quedarán bajo `api.localhost/foo/*`.

El tag `'foo'` que usaste en las rutas aparecerá automáticamente como sección
en la documentación Swagger en `http://api.localhost/docs`.

---

## 4. Paso 3 — Frontend: crear la app Vite

### 4.1 Estructura mínima

```
frontend/foo/
├── src/
│   ├── main.ts
│   └── shared/
│       └── endpoints.ts
├── index.html
├── microsite.json
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### 4.2 `package.json`

```json
{
  "name": "@knowto/frontend-foo",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "vite": "^5.0.11"
  }
}
```

### 4.3 `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      // Importa utilidades compartidas con: import { ... } from '@core/ui'
      '@core': resolve(__dirname, '../core/src'),
    },
  },
  server: {
    port: 5175,          // elige un puerto libre (5173=dcfl, 5174=root, 5175=foo, ...)
    host: '0.0.0.0',
    hmr: mode === 'development'
      ? { host: 'foo.localhost', protocol: 'ws', port: 80 }
      : undefined,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
}));
```

> **Puerto**: cada microsite necesita un puerto distinto. Elige el siguiente disponible
> y úsalo en este archivo, en `docker-compose.yml` y en `nginx/conf.d/local.conf`.

### 4.4 `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "paths": {
      "@core/*": ["../core/src/*"]
    }
  },
  "include": ["src"]
}
```

### 4.5 `src/shared/endpoints.ts`

Este archivo resuelve la URL de la API en tiempo de ejecución sin configuración adicional.

```typescript
// src/shared/endpoints.ts
const MICROSITE_SLUG = 'foo';

function resolveApiBase(): string {
  const envOverride = import.meta.env['VITE_API_BASE_URL'] as string | undefined;
  if (envOverride) return `${envOverride}/${MICROSITE_SLUG}`;

  const { hostname, protocol } = window.location;

  // Desarrollo: el frontend está en foo.localhost, la API en api.localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost')) {
    return `${protocol}//api.localhost/${MICROSITE_SLUG}`;
  }

  // Producción: el frontend está en foo.dominio.com, la API en api.dominio.com
  const parts = hostname.split('.');
  const apex = parts.length > 1 ? parts.slice(1).join('.') : hostname;
  return `${protocol}//api.${apex}/${MICROSITE_SLUG}`;
}

const API_BASE = resolveApiBase();

export const ENDPOINTS = {
  health: `${API_BASE}/health`,
  // Añade aquí los endpoints del microsite:
  // myResource: `${API_BASE}/my-resource`,
};
```

### 4.6 `microsite.json`

Este archivo lo lee el sitio raíz (`localhost`) para mostrar el microsite en el directorio.

```json
{
  "slug": "foo",
  "name": "Nombre del microsite",
  "description": "Descripción breve que se muestra en el directorio de microsites.",
  "localDomain": "foo.localhost",
  "prodDomain": "foo.sitio",
  "icon": "rocket_launch",
  "accentColor": "#1a4a7a",
  "status": "active",
  "tags": ["tag1", "tag2"]
}
```

- `icon`: nombre de un icono de [Material Symbols](https://fonts.google.com/icons).
- `accentColor`: color hexadecimal para el card del directorio.
- `status`: `"active"` | `"beta"` | `"coming_soon"`.

### 4.7 `index.html`

Copia `frontend/dcfl/index.html` y ajusta el `<title>` y la descripción `<meta>`.

---

## 5. Paso 4 — Frontend: registrar en el directorio raíz

Abre `frontend/root/src/main.ts` y añade el slug al array:

```typescript
const MICROSITE_SLUGS = [
  'dcfl',
  'foo',   // ← añade esta línea
];
```

El sitio raíz descubrirá automáticamente el microsite leyendo su `microsite.json`.

---

## 6. Paso 5 — Nginx: añadir el bloque de subdominio

Abre `nginx/conf.d/local.conf` y añade un bloque `server` al final:

```nginx
# ─────────────────────────────────────────────────────────────────────────────
# FOO — foo.localhost
# ─────────────────────────────────────────────────────────────────────────────
server {
  listen 80;
  server_name foo.localhost;

  location / {
    proxy_pass http://frontend-foo:5175;   # nombre del servicio Docker y puerto
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header Upgrade           $http_upgrade;
    proxy_set_header Connection        "upgrade";
    proxy_read_timeout 86400;            # mantiene el WebSocket de HMR abierto
  }
}
```

---

## 7. Paso 6 — Docker Compose: añadir el servicio frontend

Abre `docker-compose.yml` y añade el servicio justo después del último frontend:

```yaml
  # ---------------------------------------------------------------------------
  # FRONTEND FOO — Microsite Foo
  # ---------------------------------------------------------------------------
  frontend-foo:
    image: node:20-alpine
    container_name: knowto-frontend-foo
    working_dir: /frontend/foo
    command: sh -c "npm install && npm run dev -- --host 0.0.0.0 --port 5175"
    expose:
      - "5175"
    volumes:
      - ./frontend:/frontend
      - frontend_foo_node_modules:/frontend/foo/node_modules
    environment:
      NODE_ENV: development
      VITE_SUPABASE_URL: ${VITE_SUPABASE_URL:-http://localhost:54321}
      VITE_SUPABASE_ANON_KEY: ${VITE_SUPABASE_ANON_KEY:-dummy-key}
    depends_on:
      - backend
    networks:
      knowto-network:
        ipv4_address: 172.20.0.60   # siguiente IP libre en la subred 172.20.0.0/24
    restart: unless-stopped
```

Añade también el volumen al bloque `volumes:` al final del archivo:

```yaml
volumes:
  postgres_data:
  ollama_data:
  backend_node_modules:
  frontend_dcfl_node_modules:
  frontend_root_node_modules:
  frontend_foo_node_modules:   # ← añade esta línea
```

Y añade `frontend-foo` a la lista `depends_on` del servicio `nginx`:

```yaml
  nginx:
    depends_on:
      - backend
      - frontend-dcfl
      - frontend-root
      - frontend-foo    # ← añade esta línea
```

---

## 8. Paso 7 — Hosts: registrar el dominio local

En cada máquina de desarrollo hay que añadir el dominio al archivo de hosts **una sola vez**.

**Windows** (requiere abrir el editor como Administrador):
```
C:\Windows\System32\drivers\etc\hosts
```

**Linux / Mac:**
```
/etc/hosts
```

Añade la línea:
```
127.0.0.1  foo.localhost
```

---

## 9. Arrancar y verificar

```bash
# Reconstruir y arrancar todos los servicios
docker compose up -d

# Ver logs del frontend nuevo (esperar a que aparezca "ready in X ms")
docker compose logs -f frontend-foo

# Verificar que Nginx enruta correctamente
docker compose logs -f nginx
```

Abre en el navegador:

| URL | Qué debe mostrar |
|-----|------------------|
| `http://foo.localhost` | Frontend del microsite |
| `http://api.localhost/foo/health` | `{"status":"ok"}` |
| `http://api.localhost/docs` | Sección `foo` en Swagger |
| `http://localhost` | Card del nuevo microsite en el directorio |

---

## 10. Producción

### DNS

Añade en tu proveedor de DNS un registro `CNAME` o `A` para el nuevo subdominio:

```
foo.[dominio]  →  IP del servidor (igual que los demás subdominios)
```

### Cloudflare Workers (backend)

El backend es un único Worker que atiende todos los microsites. No hay nada que
desplegar de nuevo; las rutas `/foo/*` ya estarán disponibles en el Worker cuando
hagas el siguiente deploy:

```bash
cd backend
npx wrangler deploy
```

### Frontend en producción

Construye el frontend del microsite y despliega el directorio `dist/`:

```bash
cd frontend/foo
npm install
npm run build
# dist/ → sube a Cloudflare Pages, Vercel, S3, etc.
```

Configura en la plataforma de hosting:
- **Build command**: `npm run build`
- **Output directory**: `dist`
- **Environment variables**: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`

> La variable `VITE_API_BASE_URL` **no es necesaria** en producción. El frontend
> infiere la URL de la API a partir del dominio donde está desplegado
> (`foo.[dominio]` → `api.[dominio]/foo`).

---

---

## 11. Backend unificado — servicios core (v2.0+)

> Desde la unificación FASE 0–7 (abril 2026), todos los servicios de IA, extracción de contexto,
> crawling, uploads y el orquestador de pipelines residen en `backend/src/core/`.
> **Nunca los dupliques en tu microsite.**

### 11.1 Estructura backend de un microsite (post-unificación)

```
backend/src/<site>/
├── prompts/
│   ├── templates/          # .md con YAML frontmatter
│   ├── flow-map.yaml       # Definición de pipelines multi-agente
│   └── index.ts            # PromptRegistry + PROMPT_MAP
├── routes/
│   └── wizard.route.ts     # Handlers (usan servicios de core)
├── services/
│   └── supabase.service.ts # Extiende BaseSupabaseService
├── types/
│   └── wizard.types.ts     # PromptId union, tipos site-específicos
└── router.ts               # Hono router + export SiteConfig
```

### 11.2 PromptRegistry

```typescript
// src/<site>/prompts/index.ts
import { PromptRegistry as CorePromptRegistry } from '../../core/prompts/registry';
import type { PromptId } from '../types/wizard.types';
import F0 from './templates/F0-*.md';

export const SITE_PROMPT_MAP: Record<PromptId, string> = { F0 /*, ...*/ };

const coreRegistry = new CorePromptRegistry({ siteId: '<site>', localMap: SITE_PROMPT_MAP });
export const getPromptRegistry = (): CorePromptRegistry => coreRegistry;
```

Cada `.md` debe llevar frontmatter YAML:

```markdown
---
id: F0
agent_type: specialist
model: claude-sonnet-4-6
---
Tu prompt aquí. Usa {{variable}} para interpolación.
```

### 11.3 SiteConfig y flow-map

```typescript
// src/<site>/router.ts
import { readFileSync } from 'fs';
import { resolve } from 'path';
import yaml from 'js-yaml';
import type { SiteConfig } from '../core/types/pipeline.types';

const flowMapRaw = readFileSync(resolve(__dirname, 'prompts/flow-map.yaml'), 'utf-8');

export const siteSiteConfig: SiteConfig = {
  site_id: '<site>',
  flow_map: yaml.load(flowMapRaw) as SiteConfig['flow_map'],
};
```

El `flow-map.yaml` define las etapas multi-agente (extractor → specialist → judge):

```yaml
version: "2.0.0"
pipelines:
  F0:
    description: "Marco de referencia"
    stages:
      - id: extractor_web
        agent: extractor
        prompt_id: EXTRACTOR
        inputs: [crawlerData]
        output_guard: sector_raw
        next: specialist
      - id: specialist
        agent: specialist
        prompt_id: F0
        inputs: [sector_raw]
        output_guard: resultado
        next: judge
      - id: judge
        agent: judge
        prompt_id: JUDGE_F0
        inputs: [resultado]
        output_guard: resultado_final
        max_retries: 2
        fallthrough_on_error: true
```

### 11.4 Extender BaseSupabaseService

```typescript
// src/<site>/services/supabase.service.ts
import { BaseSupabaseService } from '../../core/services/supabase.service';

export class SupabaseService extends BaseSupabaseService {
  protected override readonly SP_CREATE_PROJECT = 'sp_<site>_create_project';
  protected override readonly SP_SAVE_STEP      = 'sp_<site>_save_step';
  protected override readonly SP_SAVE_DOCUMENT  = 'sp_<site>_save_document';
  protected override readonly SP_GET_CONTEXT    = 'sp_<site>_get_project_context';
  protected override readonly SP_LIST_PROJECTS  = 'sp_<site>_list_user_projects';

  async createProject(params: { userId: string; name: string }) {
    return this.client.rpc(this.SP_CREATE_PROJECT, params);
  }
}
```

### 11.5 Handlers con servicios de core

```typescript
// src/<site>/routes/wizard.route.ts
import { AIService }               from '../../core/services/ai.service';
import { ContextExtractorService } from '../../core/services/context-extractor.service';
import { getPromptRegistry }       from '../prompts';
import { siteSiteConfig }          from '../router';

const SYSTEM_PROMPT = `Eres un experto en <dominio>...`;

// Dentro de un handler:
const ai      = new AIService(c.env, getPromptRegistry(), SYSTEM_PROMPT);
const extract = new ContextExtractorService(c.env, siteSiteConfig.flow_map as Record<string, unknown>);
```

### 11.6 Servicios core disponibles — no duplicar

| Necesidad | Importar desde |
|:---|:---|
| Generación IA / runAgent | `core/services/ai.service` → `AIService` |
| Extracción de contexto | `core/services/context-extractor.service` → `ContextExtractorService` |
| Scraping web | `core/services/crawler.service` → `CrawlerService` |
| Upload de archivos | `core/services/upload.service` → `UploadService` |
| Orquestador de pipeline | `core/services/pipeline-orchestrator.service` → `PipelineOrchestratorService` |
| Prompt registry | `core/prompts/registry` → `PromptRegistry` |
| Base DB | `core/services/supabase.service` → `BaseSupabaseService` |
| Tipos compartidos | `core/types/pipeline.types`, `core/types/env` |

---

## Resumen de archivos modificados y creados

| Acción | Archivo |
|--------|---------|
| Crear | `backend/src/foo/routes/health.route.ts` |
| Crear | `backend/src/foo/router.ts` |
| **Editar** | `backend/src/index.ts` — importar y montar el router |
| Crear | `frontend/foo/` — app Vite completa |
| Crear | `frontend/foo/microsite.json` |
| **Editar** | `frontend/root/src/main.ts` — añadir slug al array |
| **Editar** | `nginx/conf.d/local.conf` — bloque server |
| **Editar** | `docker-compose.yml` — servicio + volumen + depends_on |
| **Editar** | `/etc/hosts` (o equivalente) — `127.0.0.1 foo.localhost` |
