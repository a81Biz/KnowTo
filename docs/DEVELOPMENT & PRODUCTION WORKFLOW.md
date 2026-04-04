# KNOWTO - DEVELOPMENT & PRODUCTION WORKFLOW
**Version:** 1.0
**Date:** 2026-04-02

---

## 1. ENTORNOS

| Entorno | URL | Propósito |
|:---|:---|:---|
| **Local** | `http://localhost:5173` (frontend) + `http://localhost:8787` (backend) | Desarrollo con Docker |
| **Development** | `https://dev.knowto.dev` | Pruebas integradas (branch `develop`) |
| **Production** | `https://knowto.dev` | Usuarios reales (branch `main`) |

---

## 2. DOCKER COMPOSE (DESARROLLO LOCAL)

```yaml
# docker-compose.yml
version: '3.8'

services:
  # ==========================================================================
  # POSTGRESQL LOCAL (para desarrollo cuando no se usa Supabase)
  # ==========================================================================
  postgres:
    image: postgres:15
    container_name: knowto-postgres
    environment:
      POSTGRES_USER: knowto
      POSTGRES_PASSWORD: knowto123
      POSTGRES_DB: knowto_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./supabase/migrations:/docker-entrypoint-initdb.d
    networks:
      - knowto-network

  # ==========================================================================
  # BACKEND (Cloudflare Worker en modo desarrollo)
  # ==========================================================================
  backend:
    image: node:20-alpine
    container_name: knowto-backend
    working_dir: /app
    command: sh -c "npm install && npm run dev"
    ports:
      - "8787:8787"
    volumes:
      - ./backend:/app
      - /app/node_modules
    environment:
      NODE_ENV: development
      SUPABASE_URL: ${SUPABASE_URL:-http://postgres:5432}
      SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:-dummy}
      SUPABASE_JWT_SECRET: ${SUPABASE_JWT_SECRET:-dummy}
    depends_on:
      - postgres
    networks:
      - knowto-network

  # ==========================================================================
  # FRONTEND (Vite dev server)
  # ==========================================================================
  frontend:
    image: node:20-alpine
    container_name: knowto-frontend
    working_dir: /app
    command: sh -c "npm install && npm run dev -- --host 0.0.0.0"
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      NODE_ENV: development
      VITE_API_URL: http://localhost:8787
      VITE_SUPABASE_URL: ${VITE_SUPABASE_URL:-http://localhost:5432}
      VITE_SUPABASE_ANON_KEY: ${VITE_SUPABASE_ANON_KEY:-dummy}
    depends_on:
      - backend
    networks:
      - knowto-network

  # ==========================================================================
  # OLLAMA (IA local - opcional para desarrollo)
  # ==========================================================================
  ollama:
    image: ollama/ollama:latest
    container_name: knowto-ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    command: >
      sh -c "ollama serve & sleep 10 && ollama pull llama3.2:3b && tail -f /dev/null"
    networks:
      - knowto-network
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]

networks:
  knowto-network:
    driver: bridge

volumes:
  postgres_data:
  ollama_data:
```

---

## 3. CONFIGURACIÓN DE ENTORNOS

### 3.1 Variables de Entorno Local (`.env`)

```bash
# Backend (.env.local)
SUPABASE_URL=http://localhost:5432
SUPABASE_SERVICE_ROLE_KEY=dummy-key-for-local
SUPABASE_JWT_SECRET=dummy-secret
OLLAMA_URL=http://ollama:11434

# Frontend (.env.local)
VITE_API_URL=http://localhost:8787
VITE_SUPABASE_URL=http://localhost:5432
VITE_SUPABASE_ANON_KEY=dummy-key
```

### 3.2 Variables de Entorno Producción (Cloudflare Pages)

```bash
# Configurar en Cloudflare Pages Dashboard
VITE_API_URL=https://knowto-backend.workers.dev
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3.3 Variables de Entorno Producción (Cloudflare Worker)

```bash
# Configurar con wrangler
wrangler secret put SUPABASE_URL --env production
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
wrangler secret put SUPABASE_JWT_SECRET --env production
```

---

## 4. ESTRUCTURA DE REPOSITORIO

```
knowto/
├── .github/
│   └── workflows/
│       ├── deploy-backend.yml
│       ├── deploy-frontend.yml
│       └── test.yml
├── backend/
│   ├── src/
│   ├── wrangler.toml
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   ├── templates/
│   ├── css/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── Dockerfile
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_auth_tables.sql
│       └── 003_stored_procedures.sql
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 5. GITHUB ACTIONS WORKFLOWS

### 5.1 Test Workflow

```yaml
# .github/workflows/test.yml
name: Test

on:
  pull_request:
    branches: [main, develop]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install dependencies
        run: npm ci
        working-directory: ./backend
      - name: Run tests
        run: npm test
        working-directory: ./backend
      - name: Type check
        run: npm run type-check
        working-directory: ./backend

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install dependencies
        run: npm ci
        working-directory: ./frontend
      - name: Type check
        run: npm run type-check
        working-directory: ./frontend
      - name: Build
        run: npm run build
        working-directory: ./frontend
```

### 5.2 Deploy Backend

```yaml
# .github/workflows/deploy-backend.yml
name: Deploy Backend to Cloudflare Workers

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install dependencies
        run: npm ci
        working-directory: ./backend
      - name: Run tests
        run: npm test
        working-directory: ./backend
      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy --env production
          workingDirectory: ./backend
```

### 5.3 Deploy Frontend

```yaml
# .github/workflows/deploy-frontend.yml
name: Deploy Frontend to Cloudflare Pages

on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install dependencies
        run: npm ci
        working-directory: ./frontend
      - name: Build
        run: npm run build
        working-directory: ./frontend
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: knowto
          directory: ./frontend/dist
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

---

## 6. FLUJO DE TRABAJO DIARIO

```bash
# 1. Clonar repositorio
git clone https://github.com/your-org/knowto.git
cd knowto

# 2. Copiar variables de entorno
cp .env.example .env

# 3. Iniciar entorno local con Docker
docker-compose up -d

# 4. Verificar que todo está funcionando
# Frontend: http://localhost:5173
# Backend: http://localhost:8787
# Supabase Studio: http://localhost:3001 (si se configuró)

# 5. Desarrollar
# - Backend: editar archivos en ./backend/src/
# - Frontend: editar archivos en ./frontend/src/
# - Los cambios se recargan automáticamente (hot reload)

# 6. Ejecutar pruebas localmente
cd backend && npm test
cd frontend && npm run type-check

# 7. Commit y push
git add .
git commit -m "feat: descripción del cambio"
git push origin feature/nombre

# 8. Crear Pull Request a develop
# GitHub Actions ejecutará pruebas automáticamente

# 9. Al merge a main, despliegue automático a producción
```

---

## 7. COMANDOS ÚTILES

| Comando | Descripción |
|:---|:---|
| `docker-compose up -d` | Iniciar todos los servicios |
| `docker-compose down` | Detener todos los servicios |
| `docker-compose logs -f backend` | Ver logs del backend |
| `docker-compose logs -f frontend` | Ver logs del frontend |
| `docker-compose exec backend npm test` | Ejecutar pruebas del backend |
| `docker-compose exec frontend npm run type-check` | Verificar tipos del frontend |
| `docker-compose exec ollama ollama list` | Ver modelos de IA disponibles |
| `npm run dev` (en backend/) | Iniciar Worker local |
| `npm run dev` (en frontend/) | Iniciar Vite dev server |

---

## 8. DIAGRAMA DE FLUJO COMPLETO

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DESARROLLO LOCAL (Docker)                           │
│                                                                             │
│  $ docker-compose up                                                        │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Frontend   │  │  Backend    │  │  Postgres   │  │   Ollama    │         │
│  │  :5173      │→ │  :8787      │→ │  :5432      │  │  :11434     │         │
│  │  (Vite)     │  │  (Worker)   │  │  (PostgreSQL)│  │  (IA local) │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ git push
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GITHUB (main)                                  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         GitHub Actions                              │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │    │
│  │  │ Test        │→ │ Build       │→ │ Deploy      │                  │    │
│  │  │ (Vitest)    │  │ (Vite/tsc)  │  │ (CF Pages/  │                  │    │
│  │  │             │  │             │  │  Workers)   │                  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PRODUCCIÓN (Cloudflare)                             │
│                                                                             │
│  ┌─────────────────────────────┐    ┌─────────────────────────────────────┐ │
│  │     Cloudflare Pages        │    │       Cloudflare Workers            │ │
│  │     (Frontend)              │    │       (Backend API)                 │ │
│  │                             │    │                                     │ │
│  │  https://knowto.dev         │←──→│  https://api.knowto.dev             │ │
│  └─────────────────────────────┘    └─────────────────┬───────────────────┘ │
│                                                       │                     │
│                                                       ▼                     │
│                                    ┌──────────────────────────────────────┐ │
│                                    │            Supabase                  │ │
│                                    │  (PostgreSQL + Auth + Storage)       │ │
│                                    │                                      │ │
│                                    │  https://your-project.supabase.co    │ │
│                                    └──────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---