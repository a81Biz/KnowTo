#!/usr/bin/env bash
# =============================================================================
# KNOWTO - Setup Script
# Genera la estructura completa del proyecto desde cero
# Uso: chmod +x setup-knowto.sh && ./setup-knowto.sh
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[KNOWTO]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC}   $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC}   $1"; }

ROOT="knowto"

log "Creando proyecto KNOWTO..."
mkdir -p "$ROOT"
cd "$ROOT"

# =============================================================================
# SECCIÓN 1: ESTRUCTURA DE DIRECTORIOS
# =============================================================================
log "Creando estructura de directorios..."

mkdir -p \
  backend/src/middleware \
  backend/src/routes \
  backend/src/services \
  backend/src/prompts/templates \
  backend/src/prompts/variables \
  backend/src/prompts/schemas \
  backend/src/types \
  backend/src/__tests__ \
  frontend/src/controllers \
  frontend/src/shared \
  frontend/src/stores \
  frontend/src/types \
  frontend/templates \
  frontend/css \
  frontend/public \
  supabase/migrations \
  .github/workflows

info "Directorios creados."

# =============================================================================
# SECCIÓN 2: RAÍZ DEL PROYECTO
# =============================================================================
log "Generando archivos raíz..."

# .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
.wrangler/
.env
.env.local
*.log
.DS_Store
EOF

# .env.example
cat > .env.example << 'EOF'
# =============================================
# BACKEND - Cloudflare Worker (backend/.dev.vars)
# =============================================
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret
OLLAMA_URL=http://localhost:11434

# =============================================
# FRONTEND - Vite (frontend/.env.local)
# =============================================
VITE_API_URL=http://localhost:8787
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
EOF

# docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
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
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U knowto -d knowto_dev"]
      interval: 10s
      timeout: 5s
      retries: 5

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
      SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:-dummy-key}
      SUPABASE_JWT_SECRET: ${SUPABASE_JWT_SECRET:-dummy-secret}
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - knowto-network

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
      VITE_SUPABASE_URL: ${VITE_SUPABASE_URL:-http://localhost:54321}
      VITE_SUPABASE_ANON_KEY: ${VITE_SUPABASE_ANON_KEY:-dummy-key}
    depends_on:
      - backend
    networks:
      - knowto-network

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

networks:
  knowto-network:
    driver: bridge

volumes:
  postgres_data:
  ollama_data:
EOF

# README.md
cat > README.md << 'EOF'
# KNOWTO

Plataforma de certificación EC0366 asistida por IA.

## Stack

- **Frontend**: TypeScript + Vite + Tailwind CSS (Vanilla JS)
- **Backend**: Cloudflare Workers + Hono + Workers AI
- **Base de datos**: Supabase (PostgreSQL)
- **Dev local**: Docker Compose + Ollama

## Inicio rápido

```bash
cp .env.example .env
docker-compose up -d
# Frontend: http://localhost:5173
# Backend:  http://localhost:8787
```

## Comandos útiles

| Comando | Descripción |
|---|---|
| `docker-compose up -d` | Iniciar todos los servicios |
| `docker-compose down` | Detener servicios |
| `docker-compose logs -f backend` | Logs del backend |
| `docker-compose logs -f frontend` | Logs del frontend |
EOF

info "Archivos raíz generados."

# =============================================================================
# SECCIÓN 3: SUPABASE MIGRATIONS
# =============================================================================
log "Generando migraciones de Supabase..."

cat > supabase/migrations/001_initial_schema.sql << 'EOF'
-- =============================================================================
-- KNOWTO - Migration 001: Initial Schema
-- =============================================================================

-- Habilitar extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- TABLA: profiles (extiende auth.users de Supabase)
-- =============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLA: projects
-- =============================================================================
CREATE TABLE IF NOT EXISTS projects (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  client_name   TEXT NOT NULL,
  industry      TEXT,
  email         TEXT,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  current_step  INTEGER NOT NULL DEFAULT 0 CHECK (current_step BETWEEN 0 AND 9),
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLA: wizard_steps
-- =============================================================================
CREATE TABLE IF NOT EXISTS wizard_steps (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  step_number   INTEGER NOT NULL CHECK (step_number BETWEEN 0 AND 9),
  phase_id      TEXT NOT NULL,
  input_data    JSONB NOT NULL DEFAULT '{}',
  output_text   TEXT,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, step_number)
);

-- =============================================================================
-- TABLA: documents
-- =============================================================================
CREATE TABLE IF NOT EXISTS documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  step_id       UUID REFERENCES wizard_steps(id),
  phase_id      TEXT NOT NULL,
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,
  format        TEXT NOT NULL DEFAULT 'markdown' CHECK (format IN ('markdown', 'html', 'pdf')),
  version       INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- ÍNDICES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_wizard_steps_project_id ON wizard_steps(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_phase_id ON documents(phase_id);

-- =============================================================================
-- TRIGGERS: updated_at automático
-- =============================================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_projects
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_wizard_steps
  BEFORE UPDATE ON wizard_steps
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_documents
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
EOF

cat > supabase/migrations/002_auth_tables.sql << 'EOF'
-- =============================================================================
-- KNOWTO - Migration 002: Auth & RLS Policies
-- =============================================================================

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE wizard_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Profiles: solo el propio usuario puede leer/editar
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Projects: solo el dueño puede acceder
CREATE POLICY "Users can manage own projects"
  ON projects FOR ALL USING (auth.uid() = user_id);

-- Wizard steps: a través de project ownership
CREATE POLICY "Users can manage own wizard steps"
  ON wizard_steps FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = wizard_steps.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Documents: a través de project ownership
CREATE POLICY "Users can manage own documents"
  ON documents FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = documents.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Auto-crear profile al registrarse
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
EOF

cat > supabase/migrations/003_stored_procedures.sql << 'EOF'
-- =============================================================================
-- KNOWTO - Migration 003: Stored Procedures
-- =============================================================================

-- =============================================================================
-- sp_create_project: Crea un proyecto e inicializa sus wizard_steps
-- =============================================================================
CREATE OR REPLACE FUNCTION sp_create_project(
  p_user_id     UUID,
  p_name        TEXT,
  p_client_name TEXT,
  p_industry    TEXT DEFAULT NULL,
  p_email       TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_project_id UUID;
  v_step       INTEGER;
  v_phases     TEXT[] := ARRAY['F0','F1','F2','F3','F4','F5.1','F5.2','F6.1','F6.2','CLOSE'];
BEGIN
  -- Crear el proyecto
  INSERT INTO projects (user_id, name, client_name, industry, email)
  VALUES (p_user_id, p_name, p_client_name, p_industry, p_email)
  RETURNING id INTO v_project_id;

  -- Inicializar los 10 wizard_steps
  FOR v_step IN 0..9 LOOP
    INSERT INTO wizard_steps (project_id, step_number, phase_id)
    VALUES (v_project_id, v_step, v_phases[v_step + 1]);
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'project_id', v_project_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- sp_save_step: Guarda datos de entrada de un paso del wizard
-- =============================================================================
CREATE OR REPLACE FUNCTION sp_save_step(
  p_project_id UUID,
  p_step_number INTEGER,
  p_input_data  JSONB
)
RETURNS JSON AS $$
DECLARE
  v_step_id UUID;
BEGIN
  UPDATE wizard_steps
  SET input_data = p_input_data, status = 'processing', updated_at = NOW()
  WHERE project_id = p_project_id AND step_number = p_step_number
  RETURNING id INTO v_step_id;

  IF v_step_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Step not found');
  END IF;

  -- Avanzar current_step del proyecto si corresponde
  UPDATE projects
  SET current_step = GREATEST(current_step, p_step_number)
  WHERE id = p_project_id;

  RETURN json_build_object('success', true, 'step_id', v_step_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- sp_save_document: Guarda el documento generado por IA para un paso
-- =============================================================================
CREATE OR REPLACE FUNCTION sp_save_document(
  p_project_id UUID,
  p_step_id    UUID,
  p_phase_id   TEXT,
  p_title      TEXT,
  p_content    TEXT
)
RETURNS JSON AS $$
DECLARE
  v_doc_id UUID;
BEGIN
  -- Upsert: si ya existe para ese step, actualiza
  INSERT INTO documents (project_id, step_id, phase_id, title, content)
  VALUES (p_project_id, p_step_id, p_phase_id, p_title, p_content)
  ON CONFLICT (step_id)
  DO UPDATE SET content = EXCLUDED.content, title = EXCLUDED.title,
    version = documents.version + 1, updated_at = NOW()
  RETURNING id INTO v_doc_id;

  -- Marcar el step como completado
  UPDATE wizard_steps
  SET status = 'completed', output_text = p_content, updated_at = NOW()
  WHERE id = p_step_id;

  RETURN json_build_object('success', true, 'document_id', v_doc_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- sp_get_project_context: Devuelve todo el contexto acumulado de un proyecto
-- =============================================================================
CREATE OR REPLACE FUNCTION sp_get_project_context(p_project_id UUID)
RETURNS JSON AS $$
DECLARE
  v_project  projects%ROWTYPE;
  v_steps    JSON;
  v_docs     JSON;
BEGIN
  SELECT * INTO v_project FROM projects WHERE id = p_project_id;

  SELECT json_agg(ws ORDER BY ws.step_number) INTO v_steps
  FROM wizard_steps ws WHERE ws.project_id = p_project_id;

  SELECT json_agg(d ORDER BY d.created_at) INTO v_docs
  FROM documents d WHERE d.project_id = p_project_id;

  RETURN json_build_object(
    'project',   row_to_json(v_project),
    'steps',     COALESCE(v_steps, '[]'::json),
    'documents', COALESCE(v_docs, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- sp_mark_step_error: Marca un step como fallido
-- =============================================================================
CREATE OR REPLACE FUNCTION sp_mark_step_error(
  p_step_id     UUID,
  p_error_msg   TEXT
)
RETURNS JSON AS $$
BEGIN
  UPDATE wizard_steps
  SET status = 'error', error_message = p_error_msg, updated_at = NOW()
  WHERE id = p_step_id;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- VISTAS
-- =============================================================================
CREATE OR REPLACE VIEW vw_project_progress AS
SELECT
  p.id AS project_id,
  p.name,
  p.client_name,
  p.current_step,
  p.status,
  COUNT(ws.id) FILTER (WHERE ws.status = 'completed') AS completed_steps,
  COUNT(ws.id) AS total_steps,
  ROUND(
    COUNT(ws.id) FILTER (WHERE ws.status = 'completed')::NUMERIC
    / COUNT(ws.id)::NUMERIC * 100, 1
  ) AS progress_pct,
  p.created_at,
  p.updated_at
FROM projects p
LEFT JOIN wizard_steps ws ON ws.project_id = p.id
GROUP BY p.id;
EOF

info "Migraciones SQL generadas."

# =============================================================================
# SECCIÓN 4: BACKEND
# =============================================================================
log "Generando backend..."

# package.json
cat > backend/package.json << 'EOF'
{
  "name": "knowto-backend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev src/index.ts --port 8787",
    "build": "tsc",
    "deploy": "wrangler deploy",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "hono": "^4.1.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20240222.0",
    "@types/node": "^20.11.0",
    "typescript": "^5.3.3",
    "vitest": "^1.2.0",
    "wrangler": "^3.28.4"
  }
}
EOF

# tsconfig.json
cat > backend/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "strict": true,
    "noImplicitAny": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "types": ["@cloudflare/workers-types"],
    "outDir": "./dist",
    "rootDir": "./src",
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

# wrangler.toml
cat > backend/wrangler.toml << 'EOF'
name = "knowto-backend"
main = "src/index.ts"
compatibility_date = "2024-03-15"
compatibility_flags = ["nodejs_compat"]

[ai]
binding = "AI"

[vars]
ENVIRONMENT = "development"

[[d1_databases]]
# Descomenta si usas D1 en lugar de Supabase
# binding = "DB"
# database_name = "knowto-db"
# database_id = "your-database-id"

[env.production]
name = "knowto-backend-production"

[env.production.vars]
ENVIRONMENT = "production"
EOF

# src/types/env.ts
cat > backend/src/types/env.ts << 'EOF'
// src/types/env.ts
// Tipado del entorno de Cloudflare Workers

export interface Env {
  AI: Ai;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_JWT_SECRET: string;
  ENVIRONMENT: string;
  OLLAMA_URL?: string;
}
EOF

# src/types/wizard.types.ts
cat > backend/src/types/wizard.types.ts << 'EOF'
// src/types/wizard.types.ts

export type PhaseId = 'F0' | 'F1' | 'F2' | 'F3' | 'F4' | 'F5.1' | 'F5.2' | 'F6.1' | 'F6.2' | 'CLOSE';
export type PromptId = 'F0' | 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F5_2' | 'F6' | 'F6_2';

export interface ProjectContext {
  projectName: string;
  clientName: string;
  industry?: string;
  email?: string;
  previousData?: Record<string, unknown>;
}

export interface GenerateDocumentRequest {
  projectId: string;
  stepId: string;
  phaseId: PhaseId;
  promptId: PromptId;
  context: ProjectContext;
  userInputs: Record<string, unknown>;
}

export interface GenerateDocumentResponse {
  success: boolean;
  documentId?: string;
  content?: string;
  error?: string;
}

export interface StepData {
  stepNumber: number;
  phaseId: PhaseId;
  inputData: Record<string, unknown>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
EOF

# src/prompts/index.ts
cat > backend/src/prompts/index.ts << 'EOF'
// src/prompts/index.ts
// Prompt Registry: carga y gestión de prompts externalizados desde archivos .md

import type { PromptId } from '../types/wizard.types';

// Importar todos los prompts como texto estático (compatible con Workers)
// En Workers, usamos importaciones estáticas ya que no hay acceso a fs
import F0 from './templates/F0-marco-referencia.md';
import F1 from './templates/F1-informe-necesidades.md';
import F2 from './templates/F2-especificaciones-analisis.md';
import F3 from './templates/F3-especificaciones-tecnicas.md';
import F4 from './templates/F4-produccion.md';
import F5 from './templates/F5-verificacion.md';
import F5_2 from './templates/F5_2-evidencias.md';
import F6 from './templates/F6-ajustes.md';
import F6_2 from './templates/F6_2-firmas.md';

interface PromptMetadata {
  id: string;
  name: string;
  version: string;
  tags: string[];
}

interface PromptEntry {
  metadata: PromptMetadata;
  content: string;
}

const PROMPT_MAP: Record<PromptId, string> = {
  F0,
  F1,
  F2,
  F3,
  F4,
  F5,
  F5_2,
  F6,
  F6_2,
};

class PromptRegistry {
  private cache: Map<PromptId, PromptEntry> = new Map();

  private parse(raw: string): PromptEntry {
    const frontmatterMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!frontmatterMatch) {
      return {
        metadata: { id: 'unknown', name: 'Unknown', version: '1.0.0', tags: [] },
        content: raw,
      };
    }
    const [, frontmatter, content] = frontmatterMatch;
    const metadata: PromptMetadata = { id: 'unknown', name: '', version: '1.0.0', tags: [] };

    for (const line of frontmatter.split('\n')) {
      const [key, ...rest] = line.split(':');
      const value = rest.join(':').trim();
      if (key === 'id') metadata.id = value;
      if (key === 'name') metadata.name = value;
      if (key === 'version') metadata.version = value;
      if (key === 'tags') {
        metadata.tags = value
          .replace(/[\[\]]/g, '')
          .split(',')
          .map((t) => t.trim());
      }
    }

    return { metadata, content: content.trim() };
  }

  get(id: PromptId): PromptEntry {
    if (this.cache.has(id)) return this.cache.get(id)!;

    const raw = PROMPT_MAP[id];
    if (!raw) throw new Error(`Prompt not found: ${id}`);

    const entry = this.parse(raw);
    this.cache.set(id, entry);
    return entry;
  }

  render(id: PromptId, variables: Record<string, string>): string {
    const entry = this.get(id);
    let rendered = entry.content;

    for (const [key, value] of Object.entries(variables)) {
      rendered = rendered.replaceAll(`{{${key}}}`, value);
    }

    return rendered;
  }
}

// Singleton
const registry = new PromptRegistry();
export const getPromptRegistry = () => registry;
export type { PromptEntry };
EOF

# src/prompts/templates/F0-marco-referencia.md
cat > backend/src/prompts/templates/F0-marco-referencia.md << 'EOF'
---
id: F0
name: Marco de Referencia del Cliente
version: 1.0.0
tags: [certificacion, EC0366, diagnostico, investigacion]
---

Actúa como un investigador de mercado y consultor especializado en educación en línea, con experiencia en el estándar EC0366 "Desarrollo de cursos de formación en línea" del CONOCER.

## CONTEXTO DEL PROYECTO
{{context}}

## DATOS DE ENTRADA ADICIONALES
{{userInputs}}

## PROCESO QUE DEBES SEGUIR

Sigue estos 6 pasos en orden antes de generar la respuesta:

**PASO 1 - Investigación del sector/industria:** Analiza el sector declarado. Identifica tamaño de mercado, tendencias principales (últimos 2-3 años), regulaciones aplicables y desafíos comunes del sector.

**PASO 2 - Mejores prácticas:** Identifica qué formatos, duraciones, modalidades y estrategias instruccionales funcionan mejor en este sector específico.

**PASO 3 - Mapeo de competencia:** Identifica cursos similares en Udemy, Coursera, Hotmart, Crehana, Platzi, LinkedIn Learning. Documenta nombre, plataforma, precio, alumnos y enfoque de cada uno.

**PASO 4 - Estándares EC relacionados:** Busca en el catálogo del CONOCER si hay Estándares de Competencia relacionados con el tema del proyecto.

**PASO 5 - Análisis de gaps:** Identifica brechas entre lo que el cliente propone y las mejores prácticas o la competencia.

**PASO 6 - Genera el documento final** en el formato obligatorio indicado abajo.

## FORMATO DE SALIDA OBLIGATORIO

# MARCO DE REFERENCIA DEL CLIENTE
**Proyecto:** [nombre del proyecto]
**Fecha de investigación:** [fecha actual]
**Investigador:** IA (fuentes documentadas)

---

## 1. ANÁLISIS DEL SECTOR/INDUSTRIA

| Aspecto | Hallazgo | Fuente |
|:---|:---|:---|
| Tamaño del mercado | [texto] | [referencia] |
| Tendencias principales | [texto] | [referencia] |
| Regulaciones aplicables | [texto] | [referencia] |
| Certificaciones obligatorias | [texto o "Ninguna identificada"] | [referencia] |

### Desafíos comunes (dolores del sector)
1. [Dolor 1] - Fuente: [referencia]
2. [Dolor 2] - Fuente: [referencia]
3. [Dolor 3] - Fuente: [referencia]

---

## 2. MEJORES PRÁCTICAS PARA CURSOS EN LÍNEA EN ESTE SECTOR

| Práctica | Descripción | Fuente |
|:---|:---|:---|
| Formato/duración típica | [texto] | [referencia] |
| Modalidad predominante | [texto] | [referencia] |
| Estrategias de enseñanza | [texto] | [referencia] |
| Nivel de interactividad esperado | [texto] | [referencia] |

---

## 3. COMPETENCIA IDENTIFICADA

| Curso | Plataforma | Precio | Alumnos | Duración | Enfoque | Oportunidad |
|:---|:---|:---|:---|:---|:---|:---|
| [nombre] | [plataforma] | [$] | [N] | [hrs] | [texto] | [lo que no cubre] |

**Análisis de brecha:** [Qué hacen bien / qué oportunidad existe]

---

## 4. ESTÁNDARES EC RELACIONADOS (CONOCER)

| Código | Nombre | Propósito | Aplicabilidad |
|:---|:---|:---|:---|
| [ECxxxx] | [nombre] | [texto] | [sí/no/parcial] |

---

## 5. ANÁLISIS DE GAPS INICIALES

### Gap vs mejores prácticas
[texto]

### Gap vs competencia
[texto]

### Preguntas para el cliente (máximo 10)
1. [Pregunta específica 1]
2. [Pregunta específica 2]

---

## 6. RECOMENDACIONES INICIALES
1. [Recomendación basada en investigación]
2. [Recomendación basada en investigación]

---

## 7. REFERENCIAS
[Lista de fuentes utilizadas]

## INSTRUCCIONES DE CALIDAD
- NO inventes datos. Si no hay información pública, indícalo explícitamente.
- TODA afirmación debe tener fuente.
- Mantén un tono profesional y objetivo.
- Responde SOLO en español.
EOF

# src/prompts/templates/F1-informe-necesidades.md
cat > backend/src/prompts/templates/F1-informe-necesidades.md << 'EOF'
---
id: F1
name: Informe de Necesidades de Capacitación
version: 1.0.0
tags: [EC0366, necesidades, gap-analysis, SMART]
---

Actúa como un analista de necesidades de capacitación con experiencia en el estándar EC0249 "Diagnóstico de necesidades de capacitación" del CONOCER.

## CONTEXTO ACUMULADO DEL PROYECTO
{{context}}

## DATOS DE ENTRADA DEL USUARIO EN ESTA FASE
{{userInputs}}

## PROCESO
1. Consolida la información del marco de referencia (F0) con las respuestas del cliente.
2. Clasifica las brechas identificadas: Conocimiento (saber), Habilidad (saber hacer), Actitud (saber ser). Solo las brechas de conocimiento y habilidad son capacitables.
3. Declara el problema de capacitación central en máximo 3 oraciones.
4. Define 3-5 objetivos de aprendizaje en formato SMART usando taxonomía de Bloom.
5. Identifica el perfil del participante ideal.
6. Genera el documento en el formato obligatorio.

## FORMATO DE SALIDA OBLIGATORIO

# INFORME DE NECESIDADES DE CAPACITACIÓN
**Proyecto:** [nombre]
**Fecha:** [fecha actual]
**Analista:** IA (basado en EC0249)

---

## 1. SÍNTESIS DEL CONTEXTO
[Resumen del marco de referencia y lo que confirmó el cliente]

---

## 2. ANÁLISIS DE BRECHAS DE COMPETENCIA

| Tipo de Brecha | Descripción | Capacitable |
|:---|:---|:---|
| Conocimiento | [texto] | Sí |
| Habilidad | [texto] | Sí |
| Actitud | [texto] | Parcialmente |

**Brechas NO capacitables identificadas:**
- [Si aplica]

---

## 3. DECLARACIÓN DEL PROBLEMA DE CAPACITACIÓN
[Párrafo de máximo 3 oraciones que describe el problema central]

---

## 4. OBJETIVOS DE APRENDIZAJE (SMART + Taxonomía de Bloom)

| # | Objetivo | Nivel Bloom | Tipo |
|:---|:---|:---|:---|
| 1 | Al finalizar, el participante **[verbo Bloom]** [resultado medible] | [Recordar/Comprender/Aplicar/Analizar/Evaluar/Crear] | Conocimiento |
| 2 | Al finalizar, el participante **[verbo Bloom]** [resultado medible] | [nivel] | Habilidad |

---

## 5. PERFIL DEL PARTICIPANTE IDEAL

| Característica | Descripción |
|:---|:---|
| Perfil profesional | [texto] |
| Nivel educativo mínimo | [texto] |
| Experiencia previa | [texto] |
| Conocimientos previos requeridos | [texto] |
| Rango de edad estimado | [texto] |
| Motivación principal | [texto] |

---

## 6. RESULTADOS ESPERADOS DEL CURSO

Al finalizar el curso, los participantes serán capaces de:
1. [Resultado medible 1]
2. [Resultado medible 2]
3. [Resultado medible 3]

---

## 7. RECOMENDACIONES PARA EL DISEÑO
[3-5 recomendaciones basadas en el análisis]

## INSTRUCCIONES DE CALIDAD
- Los objetivos DEBEN ser SMART y usar verbos de la taxonomía de Bloom.
- No mezcles brechas capacitables con las que no lo son.
- Responde SOLO en español.
EOF

# src/prompts/templates/F2-especificaciones-analisis.md
cat > backend/src/prompts/templates/F2-especificaciones-analisis.md << 'EOF'
---
id: F2
name: Especificaciones de Análisis y Diseño
version: 1.0.0
tags: [EC0366, analisis, modalidad, interactividad, perfil-ingreso]
---

Actúa como un diseñador instruccional certificable en el estándar EC0366 "Desarrollo de cursos de formación en línea".

## CONTEXTO ACUMULADO DEL PROYECTO
{{context}}

## DATOS DE ENTRADA DEL USUARIO EN ESTA FASE
{{userInputs}}

## PROCESO
1. Define la modalidad del curso: asincrónico, sincrónico o mixto. Justifica con base en el perfil del participante y los objetivos.
2. Define el nivel de interactividad (nivel 1-4 según SCORM): Pasivo, Limitado, Moderado, Robusto.
3. Propón la estructura temática preliminar: módulos, temas, subtemas.
4. Define el PERFIL DE INGRESO completo (requisito obligatorio del EC0366).
5. Estima la duración en horas con justificación.
6. Genera el documento en el formato obligatorio.

## FORMATO DE SALIDA OBLIGATORIO

# ESPECIFICACIONES DE ANÁLISIS Y DISEÑO
**Proyecto:** [nombre]
**Fase:** F2
**Fecha:** [fecha actual]

---

## 1. DECISIÓN DE MODALIDAD

| Parámetro | Decisión | Justificación |
|:---|:---|:---|
| Modalidad | [Asincrónico/Sincrónico/Mixto] | [razón basada en perfil y objetivos] |
| Plataforma sugerida | [LMS recomendado] | [razón] |
| Sincronía | [% sincrónico / % asincrónico] | [razón] |

---

## 2. NIVEL DE INTERACTIVIDAD

**Nivel seleccionado:** [1/2/3/4] - [Pasivo/Limitado/Moderado/Robusto]

| Elemento interactivo | Incluido | Frecuencia |
|:---|:---|:---|
| Video con preguntas | [Sí/No] | [texto] |
| Actividades prácticas | [Sí/No] | [texto] |
| Simulaciones | [Sí/No] | [texto] |
| Evaluaciones formativas | [Sí/No] | [texto] |
| Foros de discusión | [Sí/No] | [texto] |

---

## 3. ESTRUCTURA TEMÁTICA PRELIMINAR

| Módulo | Tema | Subtemas | Duración estimada |
|:---|:---|:---|:---|
| 1. [Nombre] | [Tema 1.1] | [Subtema a, b] | [X horas] |
| 1. [Nombre] | [Tema 1.2] | [Subtema a, b] | [X horas] |
| 2. [Nombre] | [Tema 2.1] | [Subtema a, b] | [X horas] |

**Total de horas estimadas:** [N horas]

---

## 4. PERFIL DE INGRESO (Obligatorio EC0366)

### 4.1 Conocimientos previos requeridos
- [Conocimiento 1]
- [Conocimiento 2]

### 4.2 Habilidades previas requeridas
- [Habilidad 1]
- [Habilidad 2]

### 4.3 Actitudes esperadas
- [Actitud 1]

### 4.4 Requisitos técnicos
- Equipo: [especificación]
- Conexión: [velocidad mínima]
- Software: [lista]

---

## 5. ESTRATEGIAS INSTRUCCIONALES PROPUESTAS

| Estrategia | Descripción | Módulos donde aplica |
|:---|:---|:---|
| [Nombre] | [descripción] | [módulo N] |

---

## 6. SUPUESTOS Y RESTRICCIONES
- [Supuesto 1]
- [Restricción 1]

## INSTRUCCIONES DE CALIDAD
- El perfil de ingreso es un requisito legal del EC0366. No lo omitas.
- Justifica cada decisión de diseño con evidencia del análisis previo.
- Responde SOLO en español.
EOF

# src/prompts/templates/F3-especificaciones-tecnicas.md
cat > backend/src/prompts/templates/F3-especificaciones-tecnicas.md << 'EOF'
---
id: F3
name: Especificaciones Técnicas del Curso
version: 1.0.0
tags: [EC0366, tecnico, LMS, SCORM, duracion]
---

Actúa como un diseñador instruccional certificable en EC0366 con experiencia en implementación de LMS y estándares SCORM/xAPI.

## CONTEXTO ACUMULADO DEL PROYECTO
{{context}}

## DATOS DE ENTRADA DEL USUARIO EN ESTA FASE
{{userInputs}}

## PROCESO
1. Confirma el LMS seleccionado y sus capacidades técnicas.
2. Define el estándar de empaquetamiento (SCORM 1.2, SCORM 2004, xAPI, AICC).
3. Define los requisitos de reporteo y seguimiento.
4. Calcula la duración final del curso con desglose por actividad.
5. Define los formatos multimedia permitidos y sus especificaciones.
6. Define los criterios de aprobación/reprobación.
7. Genera el documento en el formato obligatorio.

## FORMATO DE SALIDA OBLIGATORIO

# ESPECIFICACIONES TÉCNICAS DEL CURSO
**Proyecto:** [nombre]
**Fase:** F3
**Fecha:** [fecha actual]

---

## 1. PLATAFORMA LMS

| Parámetro | Especificación |
|:---|:---|
| LMS seleccionado | [nombre y versión] |
| URL / hosting | [texto] |
| Estándar de empaquetamiento | [SCORM 1.2 / SCORM 2004 / xAPI / AICC] |
| Compatibilidad con navegadores | [lista] |
| Soporte para móviles | [Sí/No + especificación] |

---

## 2. REQUISITOS DE REPORTEO Y SEGUIMIENTO

| Métrica | ¿Se rastrea? | Herramienta |
|:---|:---|:---|
| Progreso por módulo | [Sí/No] | [LMS nativo / xAPI / otro] |
| Tiempo invertido | [Sí/No] | [texto] |
| Calificaciones | [Sí/No] | [texto] |
| Intentos por evaluación | [Sí/No] | [texto] |
| Fecha de inicio/fin | [Sí/No] | [texto] |

---

## 3. DURACIÓN CALCULADA

| Componente | Cantidad | Tiempo unitario | Total |
|:---|:---|:---|:---|
| Videos | [N] | [X min/video] | [X hrs] |
| Lecturas | [N] | [X min/lectura] | [X hrs] |
| Actividades prácticas | [N] | [X min/actividad] | [X hrs] |
| Evaluaciones | [N] | [X min/evaluación] | [X hrs] |
| **TOTAL** | | | **[X hrs]** |

---

## 4. ESPECIFICACIONES MULTIMEDIA

| Formato | Resolución/Calidad | Peso máximo | Herramienta sugerida |
|:---|:---|:---|:---|
| Video | [1080p/720p] | [MB] | [texto] |
| Audio | [kbps] | [MB] | [texto] |
| Imágenes | [px] | [KB] | [texto] |
| PDFs | [texto] | [MB] | [texto] |

---

## 5. CRITERIOS DE APROBACIÓN

| Criterio | Valor |
|:---|:---|
| Calificación mínima aprobatoria | [%] |
| Progreso mínimo requerido | [%] |
| Número máximo de intentos | [N] |
| ¿Se emite constancia/certificado? | [Sí/No] |
| Vigencia de la constancia | [texto] |

---

## 6. ARQUITECTURA DE EVALUACIÓN

| Tipo | Peso | Descripción |
|:---|:---|:---|
| Evaluación diagnóstica | [%] | [texto] |
| Evaluaciones formativas | [%] | [texto] |
| Evaluación sumativa | [%] | [texto] |

## INSTRUCCIONES DE CALIDAD
- Especifica versiones exactas (SCORM 1.2 vs SCORM 2004 marcan diferencia técnica).
- Los criterios de aprobación deben ser medibles y objetivos.
- Responde SOLO en español.
EOF

# src/prompts/templates/F4-produccion.md
cat > backend/src/prompts/templates/F4-produccion.md << 'EOF'
---
id: F4
name: Producción de Contenidos EC0366
version: 1.0.0
tags: [produccion, EC0366, E1219, E1220, 8-productos]
---

Actúa como un diseñador instruccional certificable en el estándar EC0366 "Desarrollo de cursos de formación en línea" del CONOCER.

## CONTEXTO ACUMULADO DEL PROYECTO
{{context}}

## DATOS DE ENTRADA DEL USUARIO EN ESTA FASE
{{userInputs}}

## INSTRUCCIÓN PRINCIPAL
Genera los 8 PRODUCTOS DE PRODUCCIÓN requeridos por los Elementos E1219 y E1220 del EC0366. Estos son los documentos que el candidato debe presentar ante el evaluador del CONOCER.

---

## FORMATO DE SALIDA OBLIGATORIO

# PRODUCTOS DE PRODUCCIÓN EC0366
**Proyecto:** [nombre]
**Candidato:** [clientName]
**Fecha de elaboración:** [fecha actual]

---

## PRODUCTO 1: CRONOGRAMA DE DESARROLLO (E1219)

**Curso:** [nombre del curso]

| # | Actividad | Tiempo estimado | Fecha inicio | Fecha fin | Responsable |
|:---|:---|:---|:---|:---|:---|
| 1 | Elaborar estructura temática | [N] días | [fecha] | [fecha] | [clientName] |
| 2 | Desarrollar información general | [N] días | [fecha] | [fecha] | [clientName] |
| 3 | Diseñar guía de actividades | [N] días | [fecha] | [fecha] | [clientName] |
| 4 | Desarrollar materiales didácticos | [N] días | [fecha] | [fecha] | [clientName] |
| 5 | Desarrollar instrumentos de evaluación | [N] días | [fecha] | [fecha] | [clientName] |
| 6 | Configurar curso en LMS | [N] días | [fecha] | [fecha] | [clientName] |
| 7 | Verificar funcionamiento técnico | [N] días | [fecha] | [fecha] | [clientName] |

---

## PRODUCTO 2: DOCUMENTO DE INFORMACIÓN GENERAL (E1219)

### 2.1 Título del curso
[Título basado en el contexto]

### 2.2 Objetivo general
El participante, al terminar el curso, **[verbo cognitivo]** [resultado], **[verbo psicomotor]** [habilidad], y **[verbo afectivo]** [actitud], con la finalidad de [beneficio].

### 2.3 Objetivos específicos
1. [Objetivo 1 - SMART + Bloom]
2. [Objetivo 2 - SMART + Bloom]
3. [Objetivo 3 - SMART + Bloom]

### 2.4 Perfil de ingreso
[Perfil del participante ideal - ya definido en F2]

### 2.5 Perfil de egreso
[Lo que el participante podrá hacer al terminar]

### 2.6 Información logística
| Parámetro | Valor |
|:---|:---|
| Duración total | [X horas] |
| Modalidad | [Asincrónico/Sincrónico/Mixto] |
| Plataforma LMS | [nombre] |
| Criterio de aprobación | [%] |

---

## PRODUCTO 3: ESTRUCTURA TEMÁTICA (E1219)

| Módulo | Tema | Subtema | Tipo de contenido | Duración |
|:---|:---|:---|:---|:---|
| 1. [Nombre] | [Tema] | [Subtema] | [Video/Lectura/Actividad] | [X min] |

---

## PRODUCTO 4: GUÍA DE ACTIVIDADES DE APRENDIZAJE (E1220)

| # | Actividad | Objetivo que evalúa | Instrucciones | Recursos | Duración | Criterio de evaluación |
|:---|:---|:---|:---|:---|:---|:---|
| 1 | [nombre] | [objetivo N] | [pasos] | [recursos] | [min] | [criterio] |

---

## PRODUCTO 5: MATERIALES DIDÁCTICOS (E1220)

Lista de todos los materiales a producir:

| Material | Formato | Módulo | Objetivo | Descripción |
|:---|:---|:---|:---|:---|
| [nombre] | [Video/PDF/Presentación] | [N] | [objetivo] | [descripción] |

---

## PRODUCTO 6: INSTRUMENTOS DE EVALUACIÓN (E1220)

### 6.1 Evaluación diagnóstica
[Descripción y 3 preguntas de ejemplo]

### 6.2 Evaluaciones formativas (por módulo)
[Descripción: tipo, número de reactivos, tiempo límite]

### 6.3 Evaluación sumativa final
[Descripción: tipo, número de reactivos, tiempo límite, calificación mínima]

---

## PRODUCTO 7: CONFIGURACIÓN EN LMS (E1220)

| Parámetro | Configuración |
|:---|:---|
| Nombre del curso en LMS | [texto] |
| Estructura de carpetas | [descripción] |
| Configuración de seguimiento | [SCORM/xAPI] |
| Regla de aprobación | [%] |
| Certificado automático | [Sí/No] |

---

## PRODUCTO 8: LISTA DE VERIFICACIÓN DE PRODUCCIÓN (E1219 + E1220)

| Elemento | Requerido por | Completado | Observaciones |
|:---|:---|:---|:---|
| Cronograma de desarrollo | E1219 | ☐ | |
| Documento de información general | E1219 | ☐ | |
| Estructura temática | E1219 | ☐ | |
| Guía de actividades | E1220 | ☐ | |
| Materiales didácticos | E1220 | ☐ | |
| Instrumentos de evaluación | E1220 | ☐ | |
| Configuración en LMS | E1220 | ☐ | |
| Evidencias de funcionamiento | E1221 | ☐ | |

## INSTRUCCIONES DE CALIDAD
- Los 8 productos son obligatorios. No omitas ninguno.
- Todos los objetivos deben usar verbos de la taxonomía de Bloom.
- Responde SOLO en español.
EOF

# src/prompts/templates/F5-verificacion.md
cat > backend/src/prompts/templates/F5-verificacion.md << 'EOF'
---
id: F5
name: Verificación y Evaluación del Curso
version: 1.0.0
tags: [EC0366, E1221, verificacion, checklist, evaluacion]
---

Actúa como un evaluador del estándar EC0366 del CONOCER realizando la verificación del Elemento de Competencia E1221.

## CONTEXTO ACUMULADO DEL PROYECTO
{{context}}

## DATOS DE ENTRADA DEL USUARIO EN ESTA FASE
{{userInputs}}

## PROCESO
1. Analiza los resultados de las pruebas de usuario reportados.
2. Genera el checklist de verificación técnica y pedagógica.
3. Genera la plantilla del reporte de pruebas.
4. Identifica observaciones y ajustes necesarios.

## FORMATO DE SALIDA OBLIGATORIO

# VERIFICACIÓN Y EVALUACIÓN DEL CURSO (E1221)
**Proyecto:** [nombre]
**Fecha de verificación:** [fecha actual]

---

## 1. CHECKLIST DE VERIFICACIÓN TÉCNICA

| Ítem | Verificado | Evidencia | Observaciones |
|:---|:---|:---|:---|
| El curso carga correctamente en el LMS | ☐ | [captura/URL] | |
| El seguimiento SCORM/xAPI funciona | ☐ | [reporte] | |
| Los videos reproducen sin error | ☐ | [captura] | |
| Las evaluaciones calculan correctamente | ☐ | [reporte] | |
| El certificado se emite al aprobar | ☐ | [captura] | |
| El curso es compatible con móviles | ☐ | [captura] | |
| Los enlaces están activos | ☐ | [verificación] | |
| El tiempo de carga es aceptable (<5s) | ☐ | [medición] | |

---

## 2. CHECKLIST DE VERIFICACIÓN PEDAGÓGICA

| Ítem | Verificado | Observaciones |
|:---|:---|:---|
| Los objetivos son alcanzables | ☐ | |
| La secuencia didáctica es lógica | ☐ | |
| Las actividades corresponden a los objetivos | ☐ | |
| Las evaluaciones miden lo que deben medir | ☐ | |
| El lenguaje es claro y apropiado | ☐ | |
| El nivel de dificultad es adecuado | ☐ | |
| Las instrucciones son claras | ☐ | |

---

## 3. PLANTILLA DE REPORTE DE PRUEBAS DE USUARIO

**Nombre del evaluador:** [nombre]
**Fecha de prueba:** [fecha]
**Número de participantes en prueba:** [N]

| Participante | Perfil | ¿Completó el curso? | Calificación | Tiempo invertido | Observaciones |
|:---|:---|:---|:---|:---|:---|
| 1 | [perfil] | Sí/No | [%] | [hrs] | [texto] |

### Hallazgos principales
1. [Hallazgo 1]
2. [Hallazgo 2]

### Ajustes recomendados
1. [Ajuste 1] - Prioridad: Alta/Media/Baja
2. [Ajuste 2] - Prioridad: Alta/Media/Baja

## INSTRUCCIONES DE CALIDAD
- El checklist debe incluir TODOS los ítems. No omitas ninguno.
- Los ajustes recomendados deben ser específicos y accionables.
- Responde SOLO en español.
EOF

# src/prompts/templates/F5_2-evidencias.md
cat > backend/src/prompts/templates/F5_2-evidencias.md << 'EOF'
---
id: F5_2
name: Anexo de Evidencias del Curso
version: 1.0.0
tags: [EC0366, E1221, evidencias, capturas, documentacion]
---

Actúa como un documentador técnico especializado en procesos de certificación EC0366.

## CONTEXTO ACUMULADO DEL PROYECTO
{{context}}

## DATOS DE ENTRADA DEL USUARIO EN ESTA FASE
{{userInputs}}

## PROCESO
Genera el ANEXO DE EVIDENCIAS completo con base en las URLs y capturas de pantalla proporcionadas por el usuario. Este documento acompaña el expediente de certificación ante el CONOCER.

## FORMATO DE SALIDA OBLIGATORIO

# ANEXO DE EVIDENCIAS - EC0366
**Proyecto:** [nombre]
**Candidato:** [clientName]
**Fecha:** [fecha actual]

---

## DECLARACIÓN
El candidato [clientName] declara que las siguientes evidencias corresponden al curso desarrollado en el marco del proceso de certificación EC0366 ante el CONOCER.

---

## EVIDENCIA 1: CURSO PUBLICADO EN LMS

| Campo | Valor |
|:---|:---|
| URL del curso | [URL proporcionada] |
| Plataforma LMS | [nombre] |
| Fecha de publicación | [fecha] |
| Estado | Activo |

**Captura de pantalla:** [descripción de la captura / URL de imagen]

---

## EVIDENCIA 2: SEGUIMIENTO Y REPORTEO

| Campo | Valor |
|:---|:---|
| URL del reporte | [URL proporcionada] |
| Tipo de seguimiento | [SCORM/xAPI] |
| Métricas capturadas | [lista] |

**Captura de pantalla:** [descripción]

---

## EVIDENCIA 3: RESULTADOS DE EVALUACIONES

| Evaluación | Participantes | Promedio | Aprobados | Reprobados |
|:---|:---|:---|:---|:---|
| Diagnóstica | [N] | [%] | [N] | [N] |
| Formativa M1 | [N] | [%] | [N] | [N] |
| Sumativa | [N] | [%] | [N] | [N] |

---

## EVIDENCIA 4: CERTIFICADOS EMITIDOS

**Número de certificados emitidos:** [N]
**Captura de ejemplo:** [descripción]

---

## DECLARACIÓN DE AUTENTICIDAD

El candidato certifica que todas las evidencias presentadas son auténticas y corresponden al proceso de desarrollo del curso descrito en este expediente.

**Nombre:** [clientName]
**Firma:** _________________________
**Fecha:** [fecha]

## INSTRUCCIONES DE CALIDAD
- Referencia CADA captura de pantalla por número.
- Si faltan evidencias, indícalo claramente para que el candidato las agregue.
- Responde SOLO en español.
EOF

# src/prompts/templates/F6-ajustes.md
cat > backend/src/prompts/templates/F6-ajustes.md << 'EOF'
---
id: F6
name: Documento de Ajustes Post-Evaluación
version: 1.0.0
tags: [EC0366, ajustes, revision, calidad, E1221]
---

Actúa como un consultor de calidad instruccional especializado en procesos de mejora continua para cursos en línea bajo el estándar EC0366.

## CONTEXTO ACUMULADO DEL PROYECTO
{{context}}

## DATOS DE ENTRADA DEL USUARIO EN ESTA FASE
{{userInputs}}

## PROCESO
1. Analiza las observaciones del usuario sobre el curso.
2. Clasifica los ajustes por tipo y prioridad.
3. Genera el plan de ajustes con responsables y fechas.
4. Genera el documento formal de ajustes para el expediente de certificación.

## FORMATO DE SALIDA OBLIGATORIO

# DOCUMENTO DE AJUSTES POST-EVALUACIÓN
**Proyecto:** [nombre]
**Versión del curso:** [N]
**Fecha:** [fecha actual]

---

## 1. RESUMEN DE OBSERVACIONES RECIBIDAS

[Síntesis de las observaciones del usuario y/o participantes de prueba]

---

## 2. CLASIFICACIÓN DE AJUSTES

| # | Observación | Tipo | Prioridad | Responsable | Plazo |
|:---|:---|:---|:---|:---|:---|
| 1 | [texto] | Técnico/Pedagógico/Administrativo | Alta/Media/Baja | [nombre] | [fecha] |

---

## 3. PLAN DE AJUSTES DETALLADO

### Ajuste 1: [nombre]
- **Problema identificado:** [descripción]
- **Solución propuesta:** [descripción]
- **Archivo(s) a modificar:** [lista]
- **Responsable:** [nombre]
- **Fecha límite:** [fecha]
- **Verificación:** [cómo se verificará que el ajuste está completo]

---

## 4. CONTROL DE VERSIONES

| Versión | Fecha | Cambios realizados | Responsable |
|:---|:---|:---|:---|
| 1.0 | [fecha inicial] | Versión inicial del curso | [clientName] |
| 1.1 | [fecha] | [ajustes de esta ronda] | [clientName] |

---

## 5. DECLARACIÓN DE CONFORMIDAD

El candidato [clientName] declara que los ajustes listados han sido implementados y que el curso cumple con los requisitos del estándar EC0366.

**Firma:** _________________________  **Fecha:** _____________

## INSTRUCCIONES DE CALIDAD
- Cada ajuste debe tener una verificación objetiva y medible.
- El control de versiones es obligatorio para el expediente de certificación.
- Responde SOLO en español.
EOF

# src/prompts/templates/F6_2-firmas.md
cat > backend/src/prompts/templates/F6_2-firmas.md << 'EOF'
---
id: F6_2
name: Lista de Verificación de Firmas y Cierre
version: 1.0.0
tags: [EC0366, firmas, cierre, expediente, certificacion]
---

Actúa como un coordinador de certificación EC0366 responsable del cierre del expediente ante el CONOCER.

## CONTEXTO ACUMULADO DEL PROYECTO
{{context}}

## DATOS DE ENTRADA DEL USUARIO EN ESTA FASE
{{userInputs}}

## PROCESO
Genera el documento final de cierre con la lista de verificación de todos los productos del expediente, los espacios de firma requeridos y el resumen ejecutivo del proceso.

## FORMATO DE SALIDA OBLIGATORIO

# LISTA DE VERIFICACIÓN DE FIRMAS Y CIERRE EC0366
**Proyecto:** [nombre]
**Candidato:** [clientName]
**Folio de expediente:** [generar folio: EC0366-YYYY-XXXX]
**Fecha de cierre:** [fecha actual]

---

## 1. INVENTARIO COMPLETO DEL EXPEDIENTE

| # | Documento | Fase | Elemento EC | Incluido | Páginas | Firma requerida |
|:---|:---|:---|:---|:---|:---|:---|
| 1 | Marco de Referencia del Cliente | F0 | E1219 | ☐ | [N] | Candidato |
| 2 | Informe de Necesidades | F1 | E1219 | ☐ | [N] | Candidato |
| 3 | Especificaciones de Análisis | F2 | E1219 | ☐ | [N] | Candidato |
| 4 | Especificaciones Técnicas | F3 | E1219 | ☐ | [N] | Candidato |
| 5 | Cronograma de Desarrollo | F4-P1 | E1219 | ☐ | [N] | Candidato + Revisor |
| 6 | Documento de Información General | F4-P2 | E1219 | ☐ | [N] | Candidato |
| 7 | Estructura Temática | F4-P3 | E1219 | ☐ | [N] | Candidato |
| 8 | Guía de Actividades | F4-P4 | E1220 | ☐ | [N] | Candidato |
| 9 | Materiales Didácticos | F4-P5 | E1220 | ☐ | [N] | Candidato |
| 10 | Instrumentos de Evaluación | F4-P6 | E1220 | ☐ | [N] | Candidato + Revisor |
| 11 | Configuración LMS | F4-P7 | E1220 | ☐ | [N] | Candidato |
| 12 | Lista de Verificación | F4-P8 | E1219+E1220 | ☐ | [N] | Candidato |
| 13 | Checklist de Verificación | F5.1 | E1221 | ☐ | [N] | Candidato + Evaluador |
| 14 | Reporte de Pruebas | F5.1 | E1221 | ☐ | [N] | Candidato |
| 15 | Anexo de Evidencias | F5.2 | E1221 | ☐ | [N] | Candidato |
| 16 | Documento de Ajustes | F6.1 | E1221 | ☐ | [N] | Candidato |

---

## 2. FIRMAS DE CIERRE

### Candidato a Certificación
**Nombre completo:** [clientName]
**CURP:** _________________________
**Firma:** _________________________
**Fecha:** _________________________

### Revisor Técnico (si aplica)
**Nombre completo:** _________________________
**Cargo:** _________________________
**Firma:** _________________________
**Fecha:** _________________________

### Coordinador del Proceso
**Nombre completo:** _________________________
**Organismo Certificador:** _________________________
**Firma:** _________________________
**Fecha:** _________________________

---

## 3. RESUMEN EJECUTIVO DEL PROCESO

**Nombre del curso desarrollado:** [nombre]
**Industria/Sector:** [industria]
**Duración total del curso:** [X horas]
**Modalidad:** [tipo]
**Plataforma LMS utilizada:** [nombre]
**Número de módulos:** [N]
**Número de actividades:** [N]
**Número de evaluaciones:** [N]
**Fecha de inicio del proceso:** [fecha F0]
**Fecha de cierre del expediente:** [fecha actual]
**Duración total del proceso:** [N días]

---

## 4. DECLARACIÓN FINAL

El candidato [clientName] declara bajo protesta de decir verdad que todos los documentos incluidos en este expediente son auténticos y que el curso descrito fue desarrollado íntegramente por el/la suscrito/a en el marco del proceso de certificación bajo el estándar EC0366 del CONOCER.

**Firma del candidato:** _________________________
**Fecha:** _________________________

## INSTRUCCIONES DE CALIDAD
- El folio de expediente debe generarse con formato: EC0366-[AÑO]-[4 dígitos aleatorios].
- Todos los 16 documentos deben estar listados. No omitas ninguno.
- Responde SOLO en español.
EOF

# src/prompts/variables (archivos de variables reutilizables)
cat > backend/src/prompts/variables/section-metodologia.md << 'EOF'
## METODOLOGÍA EC0366

El estándar EC0366 "Desarrollo de cursos de formación en línea" del CONOCER contempla 3 Elementos de Competencia:

- **E1219**: Diseño instruccional del curso en línea (fases F0-F4)
- **E1220**: Producción de contenidos del curso en línea (fase F4)
- **E1221**: Evaluación y verificación del curso en línea (fases F5-F6)
EOF

info "Prompts de IA generados."

# =============================================================================
# SECCIÓN 5: BACKEND - SERVICIOS Y RUTAS
# =============================================================================

# src/services/supabase.service.ts
cat > backend/src/services/supabase.service.ts << 'EOF'
// src/services/supabase.service.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../types/env';

export class SupabaseService {
  private client: SupabaseClient;

  constructor(env: Env) {
    this.client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async createProject(params: {
    userId: string;
    name: string;
    clientName: string;
    industry?: string;
    email?: string;
  }): Promise<{ projectId: string }> {
    const { data, error } = await this.client.rpc('sp_create_project', {
      p_user_id: params.userId,
      p_name: params.name,
      p_client_name: params.clientName,
      p_industry: params.industry ?? null,
      p_email: params.email ?? null,
    });

    if (error) throw new Error(`sp_create_project failed: ${error.message}`);
    if (!data.success) throw new Error(data.error);
    return { projectId: data.project_id };
  }

  async saveStep(params: {
    projectId: string;
    stepNumber: number;
    inputData: Record<string, unknown>;
  }): Promise<{ stepId: string }> {
    const { data, error } = await this.client.rpc('sp_save_step', {
      p_project_id: params.projectId,
      p_step_number: params.stepNumber,
      p_input_data: params.inputData,
    });

    if (error) throw new Error(`sp_save_step failed: ${error.message}`);
    if (!data.success) throw new Error(data.error);
    return { stepId: data.step_id };
  }

  async saveDocument(params: {
    projectId: string;
    stepId: string;
    phaseId: string;
    title: string;
    content: string;
  }): Promise<{ documentId: string }> {
    const { data, error } = await this.client.rpc('sp_save_document', {
      p_project_id: params.projectId,
      p_step_id: params.stepId,
      p_phase_id: params.phaseId,
      p_title: params.title,
      p_content: params.content,
    });

    if (error) throw new Error(`sp_save_document failed: ${error.message}`);
    if (!data.success) throw new Error(data.error);
    return { documentId: data.document_id };
  }

  async getProjectContext(projectId: string): Promise<Record<string, unknown>> {
    const { data, error } = await this.client.rpc('sp_get_project_context', {
      p_project_id: projectId,
    });

    if (error) throw new Error(`sp_get_project_context failed: ${error.message}`);
    return data as Record<string, unknown>;
  }

  async markStepError(stepId: string, errorMsg: string): Promise<void> {
    await this.client.rpc('sp_mark_step_error', {
      p_step_id: stepId,
      p_error_msg: errorMsg,
    });
  }

  async getUserProjects(userId: string) {
    const { data, error } = await this.client
      .from('vw_project_progress')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`getUserProjects failed: ${error.message}`);
    return data ?? [];
  }
}
EOF

# src/services/ai.service.ts
cat > backend/src/services/ai.service.ts << 'EOF'
// src/services/ai.service.ts
import { getPromptRegistry } from '../prompts';
import type { Env } from '../types/env';
import type { PromptId, ProjectContext } from '../types/wizard.types';

export interface GenerateOptions {
  promptId: PromptId;
  context: ProjectContext;
  userInputs: Record<string, unknown>;
}

export class AIService {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  async generate(options: GenerateOptions): Promise<string> {
    const registry = getPromptRegistry();

    const rendered = registry.render(options.promptId, {
      context: JSON.stringify(options.context, null, 2),
      userInputs: JSON.stringify(options.userInputs, null, 2),
    });

    const systemPrompt = `Eres un experto en diseño instruccional certificado en el estándar EC0366 del CONOCER.
Genera documentos profesionales SOLO en español.
Usa formato Markdown estricto con tablas y listas.
No inventes datos. Si no tienes información, indícalo explícitamente.
Responde únicamente con el documento solicitado, sin preámbulos ni explicaciones adicionales.`;

    try {
      const response = await this.env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
        prompt: rendered,
        system_prompt: systemPrompt,
        max_tokens: 4096,
        temperature: 0.3,
        stream: false,
      });

      const content = typeof response === 'string' ? response : (response as { response: string }).response;
      if (!content) throw new Error('Empty response from AI');
      return content;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown AI error';
      throw new Error(`AI generation failed: ${msg}`);
    }
  }
}
EOF

# src/middleware/auth.middleware.ts
cat > backend/src/middleware/auth.middleware.ts << 'EOF'
// src/middleware/auth.middleware.ts
import { createMiddleware } from 'hono/factory';
import { createClient } from '@supabase/supabase-js';
import type { Env } from '../types/env';

export const authMiddleware = createMiddleware<{ Bindings: Env; Variables: { userId: string } }>(
  async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const token = authHeader.slice(7);
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return c.json({ success: false, error: 'Invalid token' }, 401);
    }

    c.set('userId', data.user.id);
    await next();
  }
);
EOF

# src/middleware/error.middleware.ts
cat > backend/src/middleware/error.middleware.ts << 'EOF'
// src/middleware/error.middleware.ts
import { createMiddleware } from 'hono/factory';

export const errorMiddleware = createMiddleware(async (c, next) => {
  try {
    await next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[ERROR]', message);
    return c.json(
      { success: false, error: message, timestamp: new Date().toISOString() },
      500
    );
  }
});
EOF

# src/routes/health.route.ts
cat > backend/src/routes/health.route.ts << 'EOF'
// src/routes/health.route.ts
import { Hono } from 'hono';
import type { Env } from '../types/env';

const health = new Hono<{ Bindings: Env }>();

health.get('/', (c) => {
  return c.json({
    success: true,
    service: 'knowto-backend',
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
  });
});

export { health };
EOF

# src/routes/wizard.route.ts
cat > backend/src/routes/wizard.route.ts << 'EOF'
// src/routes/wizard.route.ts
import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { SupabaseService } from '../services/supabase.service';
import { AIService } from '../services/ai.service';
import type { Env } from '../types/env';
import type { PromptId } from '../types/wizard.types';

// ============================================================================
// ZOD SCHEMAS (SSOT para validación)
// ============================================================================
const createProjectSchema = z.object({
  name: z.string().min(3).max(200),
  clientName: z.string().min(2).max(200),
  industry: z.string().optional(),
  email: z.string().email().optional(),
});

const generateDocumentSchema = z.object({
  projectId: z.string().uuid(),
  stepId: z.string().uuid(),
  phaseId: z.enum(['F0', 'F1', 'F2', 'F3', 'F4', 'F5.1', 'F5.2', 'F6.1', 'F6.2', 'CLOSE']),
  promptId: z.enum(['F0', 'F1', 'F2', 'F3', 'F4', 'F5', 'F5_2', 'F6', 'F6_2']),
  context: z.object({
    projectName: z.string(),
    clientName: z.string(),
    industry: z.string().optional(),
    email: z.string().optional(),
    previousData: z.record(z.unknown()).optional(),
  }),
  userInputs: z.record(z.unknown()),
});

const saveStepSchema = z.object({
  projectId: z.string().uuid(),
  stepNumber: z.number().int().min(0).max(9),
  inputData: z.record(z.unknown()),
});

// ============================================================================
// ROUTER
// ============================================================================
const wizard = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

wizard.use('*', authMiddleware);

// POST /api/wizard/project - Crear proyecto
wizard.post(
  '/project',
  zValidator('json', createProjectSchema),
  async (c) => {
    const body = c.req.valid('json');
    const userId = c.get('userId');
    const supabase = new SupabaseService(c.env);

    const result = await supabase.createProject({
      userId,
      name: body.name,
      clientName: body.clientName,
      industry: body.industry,
      email: body.email,
    });

    return c.json({ success: true, data: result, timestamp: new Date().toISOString() }, 201);
  }
);

// GET /api/wizard/project/:projectId - Obtener contexto del proyecto
wizard.get('/project/:projectId', async (c) => {
  const projectId = c.req.param('projectId');
  const supabase = new SupabaseService(c.env);
  const context = await supabase.getProjectContext(projectId);

  return c.json({ success: true, data: context, timestamp: new Date().toISOString() });
});

// GET /api/wizard/projects - Listar proyectos del usuario
wizard.get('/projects', async (c) => {
  const userId = c.get('userId');
  const supabase = new SupabaseService(c.env);
  const projects = await supabase.getUserProjects(userId);

  return c.json({ success: true, data: projects, timestamp: new Date().toISOString() });
});

// POST /api/wizard/step - Guardar datos de un paso
wizard.post(
  '/step',
  zValidator('json', saveStepSchema),
  async (c) => {
    const body = c.req.valid('json');
    const supabase = new SupabaseService(c.env);

    const result = await supabase.saveStep({
      projectId: body.projectId,
      stepNumber: body.stepNumber,
      inputData: body.inputData,
    });

    return c.json({ success: true, data: result, timestamp: new Date().toISOString() });
  }
);

// POST /api/wizard/generate - Generar documento con IA
wizard.post(
  '/generate',
  zValidator('json', generateDocumentSchema),
  async (c) => {
    const body = c.req.valid('json');
    const supabase = new SupabaseService(c.env);
    const ai = new AIService(c.env);

    // Generar documento con IA
    const content = await ai.generate({
      promptId: body.promptId as PromptId,
      context: body.context,
      userInputs: body.userInputs,
    });

    // Persistir documento en Supabase
    const { documentId } = await supabase.saveDocument({
      projectId: body.projectId,
      stepId: body.stepId,
      phaseId: body.phaseId,
      title: `${body.phaseId} - ${body.context.projectName}`,
      content,
    });

    return c.json({
      success: true,
      data: { documentId, content },
      timestamp: new Date().toISOString(),
    });
  }
);

export { wizard };
EOF

# src/index.ts
cat > backend/src/index.ts << 'EOF'
// src/index.ts
// Entry point del Cloudflare Worker
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { health } from './routes/health.route';
import { wizard } from './routes/wizard.route';
import { errorMiddleware } from './middleware/error.middleware';
import type { Env } from './types/env';

const app = new Hono<{ Bindings: Env }>();

// ============================================================================
// MIDDLEWARE GLOBAL
// ============================================================================
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: ['http://localhost:5173', 'https://knowto.dev'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })
);
app.use('*', errorMiddleware);

// ============================================================================
// RUTAS
// ============================================================================
app.route('/api/health', health);
app.route('/api/wizard', wizard);

// 404 handler
app.notFound((c) =>
  c.json({ success: false, error: `Route not found: ${c.req.method} ${c.req.path}` }, 404)
);

export default app;
EOF

info "Backend generado."

# =============================================================================
# SECCIÓN 6: FRONTEND
# =============================================================================
log "Generando frontend..."

# package.json
cat > frontend/package.json << 'EOF'
{
  "name": "knowto-frontend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.3",
    "vite": "^5.1.0"
  }
}
EOF

# tsconfig.json
cat > frontend/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
EOF

# vite.config.ts
cat > frontend/vite.config.ts << 'EOF'
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
EOF

# css/styles.css
cat > frontend/css/styles.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ============================================================
   KNOWTO - Design System
   ============================================================ */

:root {
  --color-primary: #000f43;
  --color-surface: #f7faf9;
  --color-surface-container: #e8edf0;
  --color-on-surface: #181c1c;
  --color-border: #e2e8f0;
}

/* Wizard progress bar */
.wizard-step-indicator {
  @apply flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-all duration-300;
}

.wizard-step-indicator.completed {
  @apply bg-green-500 text-white;
}

.wizard-step-indicator.active {
  @apply bg-blue-900 text-white ring-2 ring-blue-300;
}

.wizard-step-indicator.pending {
  @apply bg-gray-200 text-gray-500;
}

/* Document preview */
.document-preview {
  @apply font-mono text-sm leading-relaxed;
}

.document-preview h1 { @apply text-2xl font-bold mb-4 text-gray-900 border-b pb-2; }
.document-preview h2 { @apply text-xl font-semibold mb-3 mt-6 text-gray-800; }
.document-preview h3 { @apply text-lg font-medium mb-2 mt-4 text-gray-700; }
.document-preview table { @apply w-full border-collapse mb-4; }
.document-preview th { @apply bg-gray-100 border border-gray-300 px-3 py-2 text-left text-sm font-semibold; }
.document-preview td { @apply border border-gray-300 px-3 py-2 text-sm; }
.document-preview ul { @apply list-disc list-inside mb-3 space-y-1; }
.document-preview ol { @apply list-decimal list-inside mb-3 space-y-1; }
.document-preview p { @apply mb-3 text-gray-700; }
.document-preview strong { @apply font-semibold text-gray-900; }
.document-preview hr { @apply border-gray-200 my-6; }
EOF

# tailwind.config.js
cat > frontend/tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,js}', './templates/**/*.html'],
  theme: {
    extend: {
      colors: {
        primary: '#000f43',
        'surface-bright': '#f7faf9',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
EOF

# postcss.config.js
cat > frontend/postcss.config.js << 'EOF'
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
EOF

# index.html
cat > frontend/index.html << 'EOF'
<!DOCTYPE html>
<html lang="es" class="h-full">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>KNOWTO - Certificación EC0366</title>
  <link rel="stylesheet" href="/css/styles.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
</head>
<body class="h-full bg-gray-50 font-sans text-gray-900">

  <!-- AUTH VIEW -->
  <div id="view-auth" class="hidden min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 to-blue-900">
    <div class="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-md text-center">
      <div class="text-4xl font-black text-blue-900 tracking-tight mb-2">KNOWTO</div>
      <p class="text-gray-500 mb-8">Certificación EC0366 asistida por IA</p>
      <button id="btn-google-login"
        class="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all">
        <svg class="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continuar con Google
      </button>
      <p class="mt-6 text-xs text-gray-400">Al iniciar sesión aceptas los términos de uso</p>
    </div>
  </div>

  <!-- MAIN APP -->
  <div id="view-app" class="hidden min-h-screen flex flex-col">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div class="text-2xl font-black text-blue-900 tracking-tight">KNOWTO</div>
      <div class="flex items-center gap-4">
        <span id="header-user-email" class="text-sm text-gray-500"></span>
        <button id="btn-logout" class="text-sm text-gray-500 hover:text-red-600 transition-colors">Salir</button>
      </div>
    </header>

    <!-- Content area -->
    <main class="flex-1 container mx-auto px-4 py-8 max-w-6xl">
      <!-- WIZARD CONTAINER -->
      <div id="wizard-container" class="hidden">
        <!-- Progress bar -->
        <div id="wizard-progress" class="mb-8">
          <!-- Rendered by main.ts -->
        </div>
        <!-- Step content -->
        <div id="wizard-step-content" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <!-- Rendered by step controllers -->
        </div>
        <!-- Navigation -->
        <div id="wizard-navigation" class="mt-6 flex justify-between">
          <button id="btn-prev-step"
            class="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium">
            ← Anterior
          </button>
          <button id="btn-next-step"
            class="px-6 py-3 bg-blue-900 text-white rounded-xl hover:bg-blue-800 transition-colors font-semibold">
            Siguiente →
          </button>
        </div>
      </div>

      <!-- DASHBOARD / PROJECT LIST -->
      <div id="dashboard-container">
        <!-- Rendered by main.ts -->
      </div>
    </main>
  </div>

  <!-- LOADING OVERLAY -->
  <div id="loading-overlay" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl">
      <div class="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
      <p id="loading-message" class="text-gray-700 font-medium">Generando documento...</p>
    </div>
  </div>

  <!-- MODAL -->
  <div id="modal-overlay" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl">
      <h3 id="modal-title" class="text-xl font-bold text-gray-900 mb-3"></h3>
      <p id="modal-message" class="text-gray-600 mb-6"></p>
      <div class="flex justify-end gap-3">
        <button id="modal-cancel" class="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
        <button id="modal-confirm" class="px-5 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800">Confirmar</button>
      </div>
    </div>
  </div>

  <script type="module" src="/src/main.ts"></script>
</body>
</html>
EOF

# src/types/wizard.types.ts
cat > frontend/src/types/wizard.types.ts << 'EOF'
// src/types/wizard.types.ts

export type PhaseId = 'F0' | 'F1' | 'F2' | 'F3' | 'F4' | 'F5.1' | 'F5.2' | 'F6.1' | 'F6.2' | 'CLOSE';
export type PromptId = 'F0' | 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F5_2' | 'F6' | 'F6_2';
export type StepStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface WizardStep {
  stepNumber: number;
  phaseId: PhaseId;
  promptId: PromptId;
  label: string;
  icon: string;
  status: StepStatus;
  inputData: Record<string, unknown>;
  documentContent?: string;
  documentId?: string;
  stepId?: string;
}

export interface WizardState {
  projectId: string | null;
  projectName: string;
  clientName: string;
  industry: string;
  email: string;
  currentStep: number;
  steps: WizardStep[];
  isGenerating: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
EOF

# src/types/document.types.ts
cat > frontend/src/types/document.types.ts << 'EOF'
// src/types/document.types.ts

export interface Document {
  id: string;
  projectId: string;
  phaseId: string;
  title: string;
  content: string;
  format: 'markdown' | 'html' | 'pdf';
  version: number;
  createdAt: string;
  updatedAt: string;
}
EOF

# src/shared/endpoints.ts
cat > frontend/src/shared/endpoints.ts << 'EOF'
// src/shared/endpoints.ts
// SSOT: Única fuente de verdad para todas las URLs de la API
// NO escribas URLs directamente en los controladores. Usa siempre este archivo.

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8787';

export const ENDPOINTS = {
  health: `${BASE_URL}/api/health`,

  wizard: {
    createProject: `${BASE_URL}/api/wizard/project`,
    getProject: (id: string) => `${BASE_URL}/api/wizard/project/${id}`,
    listProjects: `${BASE_URL}/api/wizard/projects`,
    saveStep: `${BASE_URL}/api/wizard/step`,
    generate: `${BASE_URL}/api/wizard/generate`,
  },

  auth: {
    me: `${BASE_URL}/api/auth/me`,
  },
} as const;
EOF

# src/shared/http.client.ts
cat > frontend/src/shared/http.client.ts << 'EOF'
// src/shared/http.client.ts
import type { ApiResponse } from '../types/wizard.types';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T>(url: string, options: RequestOptions): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = localStorage.getItem('knowto_auth_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(url, {
    method: options.method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json() as ApiResponse<T>;

  if (!response.ok) {
    throw new Error(data.error ?? `HTTP ${response.status}`);
  }

  return data;
}

export const getData = <T>(url: string): Promise<ApiResponse<T>> =>
  request<T>(url, { method: 'GET' });

export const postData = <T>(url: string, body: unknown): Promise<ApiResponse<T>> =>
  request<T>(url, { method: 'POST', body });

export const putData = <T>(url: string, body: unknown): Promise<ApiResponse<T>> =>
  request<T>(url, { method: 'PUT', body });

export const patchData = <T>(url: string, body: unknown): Promise<ApiResponse<T>> =>
  request<T>(url, { method: 'PATCH', body });

export const deleteData = <T>(url: string): Promise<ApiResponse<T>> =>
  request<T>(url, { method: 'DELETE' });
EOF

# src/shared/ui.ts
cat > frontend/src/shared/ui.ts << 'EOF'
// src/shared/ui.ts
// Funciones de UI compartidas (modales, loading, notificaciones)

export function showLoading(message = 'Generando documento con IA...'): void {
  const overlay = document.getElementById('loading-overlay');
  const msg = document.getElementById('loading-message');
  if (overlay) overlay.classList.remove('hidden');
  if (msg) msg.textContent = message;
}

export function hideLoading(): void {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.classList.add('hidden');
}

export function showModal(options: {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}): void {
  const overlay = document.getElementById('modal-overlay');
  const title = document.getElementById('modal-title');
  const message = document.getElementById('modal-message');
  const btnConfirm = document.getElementById('modal-confirm');
  const btnCancel = document.getElementById('modal-cancel');

  if (!overlay || !title || !message || !btnConfirm || !btnCancel) return;

  title.textContent = options.title;
  message.textContent = options.message;
  btnConfirm.textContent = options.confirmText ?? 'Confirmar';
  btnCancel.textContent = options.cancelText ?? 'Cancelar';

  overlay.classList.remove('hidden');

  const confirmHandler = () => {
    overlay.classList.add('hidden');
    options.onConfirm?.();
    btnConfirm.removeEventListener('click', confirmHandler);
    btnCancel.removeEventListener('click', cancelHandler);
  };

  const cancelHandler = () => {
    overlay.classList.add('hidden');
    options.onCancel?.();
    btnConfirm.removeEventListener('click', confirmHandler);
    btnCancel.removeEventListener('click', cancelHandler);
  };

  btnConfirm.addEventListener('click', confirmHandler);
  btnCancel.addEventListener('click', cancelHandler);
}

export function hideModal(): void {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.add('hidden');
}

export function showError(message: string): void {
  showModal({ title: '⚠️ Error', message, confirmText: 'Cerrar', onConfirm: () => {} });
}

export function showSuccess(message: string, onClose?: () => void): void {
  showModal({
    title: '✅ Éxito',
    message,
    confirmText: 'Continuar',
    cancelText: '',
    onConfirm: onClose,
  });
}

export function renderMarkdown(raw: string): string {
  // Renderizado básico de Markdown a HTML (sin dependencias externas)
  return raw
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^---$/gm, '<hr />')
    .replace(/^\| (.+) \|$/gm, (match) => {
      const cells = match.split('|').filter(c => c.trim()).map(c => c.trim());
      return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
    })
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[huplt])/gm, '<p>')
    .replace(/(?<![>])$/gm, '</p>');
}
EOF

# src/shared/template.loader.ts
cat > frontend/src/shared/template.loader.ts << 'EOF'
// src/shared/template.loader.ts
// Carga templates HTML desde /templates/ con caché en memoria

class TemplateLoaderClass {
  private cache: Map<string, HTMLTemplateElement> = new Map();
  private readonly basePath = '/templates';

  async load(templateId: string): Promise<HTMLTemplateElement> {
    if (this.cache.has(templateId)) {
      return this.cache.get(templateId)!;
    }

    const response = await fetch(`${this.basePath}/${templateId}.html`);
    if (!response.ok) {
      throw new Error(`Failed to load template: ${templateId} (HTTP ${response.status})`);
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const template = doc.querySelector('template');

    if (!template) {
      throw new Error(`Template "${templateId}" must contain a <template> tag`);
    }

    this.cache.set(templateId, template);
    return template;
  }

  async clone(templateId: string): Promise<DocumentFragment> {
    const tpl = await this.load(templateId);
    return tpl.content.cloneNode(true) as DocumentFragment;
  }

  preload(ids: string[]): Promise<void[]> {
    return Promise.all(ids.map((id) => this.load(id).then(() => undefined)));
  }
}

export const TemplateLoader = new TemplateLoaderClass();
EOF

# src/shared/supabase.client.ts
cat > frontend/src/shared/supabase.client.ts << 'EOF'
// src/shared/supabase.client.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing env vars VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(
  supabaseUrl ?? 'http://localhost:54321',
  supabaseAnonKey ?? 'dummy-key'
);
EOF

# src/shared/auth.ts
cat > frontend/src/shared/auth.ts << 'EOF'
// src/shared/auth.ts
import { supabase } from './supabase.client';

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
}

export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) throw new Error(`Google sign-in failed: ${error.message}`);
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  localStorage.removeItem('knowto_auth_token');
  window.location.reload();
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  localStorage.setItem('knowto_auth_token', session.access_token);

  return {
    id: session.user.id,
    email: session.user.email ?? '',
    fullName: session.user.user_metadata?.['full_name'] as string | undefined,
    avatarUrl: session.user.user_metadata?.['avatar_url'] as string | undefined,
  };
}

export function onAuthStateChange(callback: (user: AuthUser | null) => void): void {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (session) {
      localStorage.setItem('knowto_auth_token', session.access_token);
      callback({
        id: session.user.id,
        email: session.user.email ?? '',
        fullName: session.user.user_metadata?.['full_name'] as string | undefined,
      });
    } else {
      localStorage.removeItem('knowto_auth_token');
      callback(null);
    }
  });
}
EOF

# src/stores/wizard.store.ts
cat > frontend/src/stores/wizard.store.ts << 'EOF'
// src/stores/wizard.store.ts
// Singleton que mantiene el estado global del wizard con persistencia en localStorage

import type { WizardState, WizardStep, StepStatus } from '../types/wizard.types';

const STORAGE_KEY = 'knowto_wizard_state';

const STEP_DEFINITIONS: Omit<WizardStep, 'status' | 'inputData' | 'documentContent' | 'documentId' | 'stepId'>[] = [
  { stepNumber: 0, phaseId: 'F0',    promptId: 'F0',   label: 'Marco de Referencia', icon: 'search' },
  { stepNumber: 1, phaseId: 'F1',    promptId: 'F1',   label: 'Necesidades',         icon: 'analytics' },
  { stepNumber: 2, phaseId: 'F2',    promptId: 'F2',   label: 'Análisis',            icon: 'architecture' },
  { stepNumber: 3, phaseId: 'F3',    promptId: 'F3',   label: 'Especificaciones',    icon: 'settings' },
  { stepNumber: 4, phaseId: 'F4',    promptId: 'F4',   label: 'Producción',          icon: 'construction' },
  { stepNumber: 5, phaseId: 'F5.1',  promptId: 'F5',   label: 'Verificación',        icon: 'fact_check' },
  { stepNumber: 6, phaseId: 'F5.2',  promptId: 'F5_2', label: 'Evidencias',          icon: 'photo_library' },
  { stepNumber: 7, phaseId: 'F6.1',  promptId: 'F6',   label: 'Ajustes',             icon: 'tune' },
  { stepNumber: 8, phaseId: 'F6.2',  promptId: 'F6_2', label: 'Firmas',              icon: 'draw' },
  { stepNumber: 9, phaseId: 'CLOSE', promptId: 'F6_2', label: 'Finalización',        icon: 'celebration' },
];

function createInitialState(): WizardState {
  return {
    projectId: null,
    projectName: '',
    clientName: '',
    industry: '',
    email: '',
    currentStep: 0,
    isGenerating: false,
    steps: STEP_DEFINITIONS.map((def) => ({
      ...def,
      status: 'pending' as StepStatus,
      inputData: {},
    })),
  };
}

class WizardStore {
  private state: WizardState;
  private listeners: Array<(state: WizardState) => void> = [];

  constructor() {
    this.state = this.loadFromStorage() ?? createInitialState();
  }

  private loadFromStorage(): WizardState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as WizardState) : null;
    } catch {
      return null;
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      console.warn('[WizardStore] Could not persist state to localStorage');
    }
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn(this.state));
  }

  subscribe(fn: (state: WizardState) => void): () => void {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter((l) => l !== fn); };
  }

  getState(): Readonly<WizardState> { return this.state; }

  getStep(n: number): WizardStep | undefined { return this.state.steps[n]; }

  getCurrentStep(): WizardStep | undefined { return this.state.steps[this.state.currentStep]; }

  setProjectInfo(info: { projectId: string; projectName: string; clientName: string; industry?: string; email?: string }): void {
    this.state = {
      ...this.state,
      projectId: info.projectId,
      projectName: info.projectName,
      clientName: info.clientName,
      industry: info.industry ?? '',
      email: info.email ?? '',
    };
    this.persist();
    this.notify();
  }

  setStepInputData(stepNumber: number, data: Record<string, unknown>): void {
    const steps = [...this.state.steps];
    const step = steps[stepNumber];
    if (!step) return;
    steps[stepNumber] = { ...step, inputData: data };
    this.state = { ...this.state, steps };
    this.persist();
    this.notify();
  }

  setStepStatus(stepNumber: number, status: StepStatus): void {
    const steps = [...this.state.steps];
    const step = steps[stepNumber];
    if (!step) return;
    steps[stepNumber] = { ...step, status };
    this.state = { ...this.state, steps };
    this.persist();
    this.notify();
  }

  setStepDocument(stepNumber: number, content: string, documentId: string): void {
    const steps = [...this.state.steps];
    const step = steps[stepNumber];
    if (!step) return;
    steps[stepNumber] = { ...step, documentContent: content, documentId, status: 'completed' };
    this.state = { ...this.state, steps };
    this.persist();
    this.notify();
  }

  setStepId(stepNumber: number, stepId: string): void {
    const steps = [...this.state.steps];
    const step = steps[stepNumber];
    if (!step) return;
    steps[stepNumber] = { ...step, stepId };
    this.state = { ...this.state, steps };
    this.persist();
  }

  goToStep(n: number): void {
    if (n < 0 || n >= this.state.steps.length) return;
    this.state = { ...this.state, currentStep: n };
    this.persist();
    this.notify();
  }

  setGenerating(val: boolean): void {
    this.state = { ...this.state, isGenerating: val };
    this.notify();
  }

  reset(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.state = createInitialState();
    this.notify();
  }

  buildContext(): Record<string, unknown> {
    const completedSteps = this.state.steps
      .filter((s) => s.status === 'completed')
      .map((s) => ({ phaseId: s.phaseId, inputData: s.inputData, content: s.documentContent }));

    return {
      projectName: this.state.projectName,
      clientName: this.state.clientName,
      industry: this.state.industry,
      email: this.state.email,
      previousData: Object.fromEntries(
        completedSteps.map((s) => [s.phaseId, { inputData: s.inputData, content: s.content }])
      ),
    };
  }
}

export const wizardStore = new WizardStore();
EOF

# src/main.ts
cat > frontend/src/main.ts << 'EOF'
// src/main.ts
// Orquestador principal: maneja auth, navegación entre vistas y pasos del wizard

import { getCurrentUser, signInWithGoogle, signOut, onAuthStateChange } from './shared/auth';
import { wizardStore } from './stores/wizard.store';
import { showError, showLoading, hideLoading } from './shared/ui';
import { postData, getData } from './shared/http.client';
import { ENDPOINTS } from './shared/endpoints';
import type { WizardState } from './types/wizard.types';

// Controllers (importación lazy por paso)
import { initStep0 } from './controllers/step0.clientdata';
import { initStep1 } from './controllers/step1.needs';
import { initStep2 } from './controllers/step2.analysis';
import { initStep3 } from './controllers/step3.specs';
import { initStep4 } from './controllers/step4.production';
import { initStep5 } from './controllers/step5.checklist';
import { initStep6 } from './controllers/step6.evidence';
import { initStep7 } from './controllers/step7.adjustments';
import { initStep8 } from './controllers/step8.signatures';
import { initStep9 } from './controllers/step9.closing';

const STEP_INIT_FNS = [
  initStep0, initStep1, initStep2, initStep3, initStep4,
  initStep5, initStep6, initStep7, initStep8, initStep9,
];

// ============================================================================
// DOM references
// ============================================================================
const viewAuth = document.getElementById('view-auth')!;
const viewApp  = document.getElementById('view-app')!;
const headerEmail = document.getElementById('header-user-email')!;
const btnGoogleLogin = document.getElementById('btn-google-login')!;
const btnLogout = document.getElementById('btn-logout')!;
const wizardContainer = document.getElementById('wizard-container')!;
const dashboardContainer = document.getElementById('dashboard-container')!;
const wizardProgress = document.getElementById('wizard-progress')!;
const wizardStepContent = document.getElementById('wizard-step-content')!;
const btnPrev = document.getElementById('btn-prev-step') as HTMLButtonElement;
const btnNext = document.getElementById('btn-next-step') as HTMLButtonElement;

// ============================================================================
// AUTH
// ============================================================================
btnGoogleLogin.addEventListener('click', () => signInWithGoogle().catch(showError));
btnLogout.addEventListener('click', () => signOut());

onAuthStateChange(async (user) => {
  if (user) {
    viewAuth.classList.add('hidden');
    viewApp.classList.remove('hidden');
    headerEmail.textContent = user.email;
    await initDashboard();
  } else {
    viewAuth.classList.remove('hidden');
    viewApp.classList.add('hidden');
  }
});

// ============================================================================
// DASHBOARD
// ============================================================================
async function initDashboard(): Promise<void> {
  dashboardContainer.classList.remove('hidden');
  wizardContainer.classList.add('hidden');

  try {
    const res = await getData<unknown[]>(ENDPOINTS.wizard.listProjects);
    const projects = res.data ?? [];
    renderDashboard(projects);
  } catch {
    renderDashboard([]);
  }
}

function renderDashboard(projects: unknown[]): void {
  dashboardContainer.innerHTML = `
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Mis proyectos</h1>
        <p class="text-gray-500 mt-1">Gestiona tus procesos de certificación EC0366</p>
      </div>
      <button id="btn-new-project"
        class="bg-blue-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-800 transition-colors flex items-center gap-2">
        <span class="material-symbols-outlined text-sm">add</span>
        Nuevo proyecto
      </button>
    </div>
    ${projects.length === 0
      ? `<div class="text-center py-20 text-gray-400">
          <span class="material-symbols-outlined text-6xl mb-4 block">folder_open</span>
          <p class="text-lg">No tienes proyectos aún.</p>
          <p class="text-sm mt-2">Crea tu primer proyecto para comenzar.</p>
        </div>`
      : `<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          ${(projects as Record<string, unknown>[]).map((p) => `
            <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer project-card"
              data-project-id="${p['project_id']}">
              <div class="font-semibold text-gray-900 text-lg mb-1">${p['name']}</div>
              <div class="text-gray-500 text-sm mb-4">${p['client_name']}</div>
              <div class="flex items-center gap-2">
                <div class="flex-1 bg-gray-100 rounded-full h-2">
                  <div class="bg-blue-900 rounded-full h-2" style="width:${p['progress_pct']}%"></div>
                </div>
                <span class="text-xs text-gray-500">${p['progress_pct']}%</span>
              </div>
              <div class="mt-3 text-xs text-gray-400">Paso ${p['current_step']} / 9</div>
            </div>
          `).join('')}
        </div>`
    }
  `;

  document.getElementById('btn-new-project')?.addEventListener('click', () => startNewProject());

  document.querySelectorAll('.project-card').forEach((card) => {
    card.addEventListener('click', () => {
      const projectId = (card as HTMLElement).dataset['projectId'];
      if (projectId) resumeProject(projectId);
    });
  });
}

// ============================================================================
// WIZARD NAVIGATION
// ============================================================================
async function startNewProject(): Promise<void> {
  wizardStore.reset();
  dashboardContainer.classList.add('hidden');
  wizardContainer.classList.remove('hidden');
  renderProgress();
  await loadStep(0);
}

async function resumeProject(projectId: string): Promise<void> {
  try {
    showLoading('Cargando proyecto...');
    const res = await getData<Record<string, unknown>>(ENDPOINTS.wizard.getProject(projectId));
    const project = res.data?.['project'] as Record<string, unknown> | undefined;

    if (project) {
      wizardStore.setProjectInfo({
        projectId,
        projectName: String(project['name'] ?? ''),
        clientName: String(project['client_name'] ?? ''),
        industry: String(project['industry'] ?? ''),
        email: String(project['email'] ?? ''),
      });
      wizardStore.goToStep(Number(project['current_step'] ?? 0));
    }

    dashboardContainer.classList.add('hidden');
    wizardContainer.classList.remove('hidden');
    renderProgress();
    await loadStep(wizardStore.getState().currentStep);
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Error al cargar el proyecto');
  } finally {
    hideLoading();
  }
}

function renderProgress(): void {
  const state = wizardStore.getState();
  wizardProgress.innerHTML = `
    <div class="flex items-center gap-1 overflow-x-auto pb-2">
      ${state.steps.map((step, i) => `
        <div class="flex items-center gap-1 flex-shrink-0">
          <div class="flex flex-col items-center">
            <div class="wizard-step-indicator ${
              step.status === 'completed' ? 'completed' :
              i === state.currentStep ? 'active' : 'pending'
            }" title="${step.label}">
              ${step.status === 'completed'
                ? '<span class="material-symbols-outlined text-sm">check</span>'
                : String(i + 1)
              }
            </div>
            <span class="text-xs mt-1 text-gray-500 hidden md:block">${step.label}</span>
          </div>
          ${i < state.steps.length - 1
            ? `<div class="w-8 h-px bg-gray-200 flex-shrink-0 mb-4"></div>`
            : ''
          }
        </div>
      `).join('')}
    </div>
  `;
}

async function loadStep(n: number): Promise<void> {
  const initFn = STEP_INIT_FNS[n];
  if (!initFn) return;

  wizardStepContent.innerHTML = '';

  const state = wizardStore.getState();
  btnPrev.disabled = n === 0;
  btnPrev.classList.toggle('opacity-50', n === 0);
  btnNext.textContent = n === state.steps.length - 1 ? '🎉 Finalizar' : 'Siguiente →';

  await initFn(wizardStepContent, wizardStore);
  renderProgress();
}

btnPrev.addEventListener('click', () => {
  const { currentStep } = wizardStore.getState();
  if (currentStep > 0) {
    wizardStore.goToStep(currentStep - 1);
    loadStep(currentStep - 1);
  }
});

btnNext.addEventListener('click', async () => {
  const { currentStep, steps } = wizardStore.getState();
  if (currentStep < steps.length - 1) {
    wizardStore.goToStep(currentStep + 1);
    await loadStep(currentStep + 1);
  } else {
    // Cierre del wizard
    alert('¡Proceso completado! Descarga tu expediente desde el panel de proyectos.');
    wizardStore.reset();
    await initDashboard();
  }
});

// ============================================================================
// INIT
// ============================================================================
(async () => {
  const user = await getCurrentUser();
  if (user) {
    viewAuth.classList.add('hidden');
    viewApp.classList.remove('hidden');
    headerEmail.textContent = user.email;
    await initDashboard();
  } else {
    viewAuth.classList.remove('hidden');
  }
})();
EOF

# Función para crear un controlador de paso
create_step_controller() {
  local file=$1
  local step_num=$2
  local step_name=$3
  local phase_id=$4
  local prompt_id=$5
  local title=$6
  local description=$7
  local fields=$8

cat > "$file" << EOFC
// src/controllers/${step_name}
// Controlador del paso ${step_num}: ${title}
// Estructura de 7 secciones (ver FRONTEND ARCHITECTURE DOCUMENT.md)

// ============================================================================
// 1. DEPENDENCIAS
// ============================================================================
import { postData } from '../shared/http.client';
import { ENDPOINTS } from '../shared/endpoints';
import { showLoading, hideLoading, showError, renderMarkdown } from '../shared/ui';
import type { WizardStore } from '../stores/wizard.store';

// ============================================================================
// 2. ESTADO PRIVADO Y CONFIGURACIÓN
// ============================================================================
let _container: HTMLElement;
let _store: typeof import('../stores/wizard.store').wizardStore;

const _dom: {
  form?: HTMLFormElement;
  btnGenerate?: HTMLButtonElement;
  previewPanel?: HTMLDivElement;
} = {};

// ============================================================================
// 3. CACHÉ DEL DOM
// ============================================================================
const _cacheDOM = (): void => {
  _dom.form = _container.querySelector('#step-${step_num}-form') ?? undefined;
  _dom.btnGenerate = _container.querySelector('#btn-generate-${step_num}') ?? undefined;
  _dom.previewPanel = _container.querySelector('#preview-${step_num}') ?? undefined;
};

// ============================================================================
// 4. LÓGICA DE VISTA
// ============================================================================
const _renderPreview = (content: string): void => {
  if (!_dom.previewPanel) return;
  _dom.previewPanel.innerHTML = \`
    <div class="document-preview p-6 bg-gray-50 rounded-xl border border-gray-200 max-h-96 overflow-y-auto">
      \${renderMarkdown(content)}
    </div>
    <div class="mt-4 flex gap-3">
      <button class="btn-copy-doc px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
        📋 Copiar documento
      </button>
    </div>
  \`;

  _container.querySelector('.btn-copy-doc')?.addEventListener('click', () => {
    navigator.clipboard.writeText(content).then(() => alert('Documento copiado'));
  });
};

const _setLoading = (loading: boolean): void => {
  if (_dom.btnGenerate) {
    _dom.btnGenerate.disabled = loading;
    _dom.btnGenerate.textContent = loading ? '⏳ Generando con IA...' : '✨ Generar documento';
  }
};

// ============================================================================
// 5. LÓGICA DE NEGOCIO
// ============================================================================
const _collectFormData = (): Record<string, unknown> => {
  const data: Record<string, unknown> = {};
  if (!_dom.form) return data;
  const formData = new FormData(_dom.form);
  for (const [key, value] of formData.entries()) {
    data[key] = value;
  }
  return data;
};

const _generateDocument = async (): Promise<void> => {
  const state = _store.getState();
  if (!state.projectId) {
    showError('No hay proyecto activo. Regresa al inicio.');
    return;
  }

  const inputData = _collectFormData();
  const currentStep = state.steps[${step_num}];
  if (!currentStep?.stepId) {
    showError('Error: step ID no encontrado.');
    return;
  }

  _setLoading(true);
  showLoading('Generando documento de ${title}...');

  try {
    _store.setStepInputData(${step_num}, inputData);

    const context = _store.buildContext() as {
      projectName: string;
      clientName: string;
      industry?: string;
      email?: string;
      previousData?: Record<string, unknown>;
    };

    const res = await postData<{ documentId: string; content: string }>(
      ENDPOINTS.wizard.generate,
      {
        projectId: state.projectId,
        stepId: currentStep.stepId,
        phaseId: '${phase_id}',
        promptId: '${prompt_id}',
        context,
        userInputs: inputData,
      }
    );

    if (res.data) {
      _store.setStepDocument(${step_num}, res.data.content, res.data.documentId);
      _renderPreview(res.data.content);
    }
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Error al generar el documento');
    _store.setStepStatus(${step_num}, 'error');
  } finally {
    _setLoading(false);
    hideLoading();
  }
};

// ============================================================================
// 6. REGISTRO DE EVENTOS
// ============================================================================
const _bindEvents = (): void => {
  _dom.btnGenerate?.addEventListener('click', (e) => {
    e.preventDefault();
    void _generateDocument();
  });
};

// ============================================================================
// 7. API PÚBLICA
// ============================================================================
export async function initStep${step_num}(
  container: HTMLElement,
  store: typeof import('../stores/wizard.store').wizardStore
): Promise<void> {
  _container = container;
  _store = store;

  const state = store.getState();
  const step = state.steps[${step_num}];

  // Si hay documento previo, mostrarlo directamente
  const previewHtml = step?.documentContent
    ? \`<div class="document-preview p-6 bg-gray-50 rounded-xl border border-gray-200 max-h-96 overflow-y-auto">
        \${renderMarkdown(step.documentContent)}
       </div>\`
    : '';

  container.innerHTML = \`
    <div class="space-y-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">${title}</h2>
        <p class="text-gray-500 mt-1">${description}</p>
      </div>

      <form id="step-${step_num}-form" class="space-y-4">
        ${fields}
      </form>

      <button id="btn-generate-${step_num}"
        class="w-full bg-blue-900 text-white py-4 rounded-xl font-semibold text-lg hover:bg-blue-800 transition-colors">
        ✨ Generar documento con IA
      </button>

      <div id="preview-${step_num}">
        \${previewHtml}
      </div>
    </div>
  \`;

  // Guardar stepId si el proyecto ya existe
  if (state.projectId && !step?.stepId) {
    try {
      const res = await postData<{ stepId: string }>(ENDPOINTS.wizard.saveStep, {
        projectId: state.projectId,
        stepNumber: ${step_num},
        inputData: step?.inputData ?? {},
      });
      if (res.data) store.setStepId(${step_num}, res.data.stepId);
    } catch { /* silent */ }
  }

  _cacheDOM();
  _bindEvents();
}
EOFC
}

# Crear controladores de pasos
create_step_controller \
  "frontend/src/controllers/step0.clientdata.ts" \
  "0" "step0.clientdata.ts" "F0" "F0" \
  "Marco de Referencia del Cliente" \
  "La IA investigará el sector, la competencia y las mejores prácticas para tu proyecto." \
  '<div class="grid md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nombre del proyecto *</label>
          <input name="projectName" type="text" required placeholder="Ej: Curso de Seguridad Industrial"
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nombre del candidato *</label>
          <input name="clientName" type="text" required placeholder="Nombre completo"
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Industria / Sector *</label>
          <input name="industry" type="text" required placeholder="Ej: Manufactura, Salud, Educación"
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
          <input name="email" type="email" placeholder="correo@empresa.com"
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">Descripción breve del curso a desarrollar *</label>
          <textarea name="courseDescription" required rows="3" placeholder="Describe brevemente qué aprenderán los participantes..."
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">Público objetivo</label>
          <input name="targetAudience" type="text" placeholder="Ej: Operadores de planta con 1-3 años de experiencia"
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
      </div>'

create_step_controller \
  "frontend/src/controllers/step1.needs.ts" \
  "1" "step1.needs.ts" "F1" "F1" \
  "Informe de Necesidades de Capacitación" \
  "Identifica la brecha de competencias y define objetivos SMART con la taxonomía de Bloom." \
  '<div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Confirma las brechas identificadas en el Marco de Referencia</label>
          <textarea name="confirmedGaps" rows="4" placeholder="Describe las brechas de conocimiento, habilidad o actitud identificadas..."
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500"></textarea>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Resultados esperados del curso</label>
          <textarea name="expectedResults" rows="3" placeholder="¿Qué podrán hacer los participantes al finalizar?"
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500"></textarea>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Perfil del participante ideal</label>
          <input name="participantProfile" type="text" placeholder="Ej: Técnicos con 2 años de experiencia en el área"
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>'

create_step_controller \
  "frontend/src/controllers/step2.analysis.ts" \
  "2" "step2.analysis.ts" "F2" "F2" \
  "Especificaciones de Análisis y Diseño" \
  "Define la modalidad, el nivel de interactividad, la estructura temática y el perfil de ingreso." \
  '<div class="grid md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Modalidad preferida</label>
          <select name="modality" class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500">
            <option value="asincrono">Asincrónico (sin sesiones en vivo)</option>
            <option value="sincrono">Sincrónico (sesiones en vivo)</option>
            <option value="mixto">Mixto (ambos)</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nivel de interactividad deseado</label>
          <select name="interactivity" class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500">
            <option value="1">Nivel 1 - Pasivo (solo lectura/video)</option>
            <option value="2">Nivel 2 - Limitado (quizzes básicos)</option>
            <option value="3" selected>Nivel 3 - Moderado (actividades interactivas)</option>
            <option value="4">Nivel 4 - Robusto (simulaciones, gamificación)</option>
          </select>
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">Temas principales del curso (uno por línea)</label>
          <textarea name="mainTopics" rows="4" placeholder="Tema 1: Introducción a la seguridad&#10;Tema 2: Equipos de protección&#10;Tema 3: Procedimientos de emergencia"
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500"></textarea>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Duración estimada (horas)</label>
          <input name="estimatedHours" type="number" min="1" max="500" placeholder="40"
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>'

create_step_controller \
  "frontend/src/controllers/step3.specs.ts" \
  "3" "step3.specs.ts" "F3" "F3" \
  "Especificaciones Técnicas" \
  "Define el LMS, el estándar de empaquetamiento, los criterios de aprobación y los formatos multimedia." \
  '<div class="grid md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Plataforma LMS</label>
          <select name="lms" class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500">
            <option value="moodle">Moodle</option>
            <option value="talent_lms">TalentLMS</option>
            <option value="canvas">Canvas</option>
            <option value="blackboard">Blackboard</option>
            <option value="google_classroom">Google Classroom</option>
            <option value="docebo">Docebo</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Estándar de empaquetamiento</label>
          <select name="standard" class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500">
            <option value="scorm_12">SCORM 1.2</option>
            <option value="scorm_2004">SCORM 2004</option>
            <option value="xapi">xAPI (Tin Can)</option>
            <option value="aicc">AICC</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Calificación mínima aprobatoria (%)</label>
          <input name="passingScore" type="number" min="50" max="100" placeholder="70"
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Intentos máximos por evaluación</label>
          <input name="maxAttempts" type="number" min="1" max="10" placeholder="3"
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" />
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">¿Hay algún requisito técnico especial?</label>
          <textarea name="technicalRequirements" rows="2" placeholder="Ej: Requiere webcam para evaluaciones, navegador Chrome obligatorio..."
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500"></textarea>
        </div>
      </div>'

create_step_controller \
  "frontend/src/controllers/step4.production.ts" \
  "4" "step4.production.ts" "F4" "F4" \
  "Producción de Contenidos (8 Productos EC0366)" \
  "La IA generará los 8 productos obligatorios requeridos por los Elementos E1219 y E1220." \
  '<div class="space-y-4">
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p class="text-blue-800 font-medium text-sm">📋 Se generarán los 8 productos obligatorios del EC0366:</p>
          <ul class="mt-2 text-blue-700 text-sm space-y-1">
            <li>1. Cronograma de Desarrollo (E1219)</li>
            <li>2. Documento de Información General (E1219)</li>
            <li>3. Estructura Temática (E1219)</li>
            <li>4. Guía de Actividades (E1220)</li>
            <li>5. Lista de Materiales Didácticos (E1220)</li>
            <li>6. Instrumentos de Evaluación (E1220)</li>
            <li>7. Configuración en LMS (E1220)</li>
            <li>8. Lista de Verificación de Producción (E1219+E1220)</li>
          </ul>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">¿Hay algún detalle adicional para la producción?</label>
          <textarea name="productionNotes" rows="3" placeholder="Ej: El curso tendrá 5 módulos, cada uno con 2 videos de 10 minutos..."
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500"></textarea>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Fecha estimada de inicio de producción</label>
          <input name="startDate" type="date" class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>'

create_step_controller \
  "frontend/src/controllers/step5.checklist.ts" \
  "5" "step5.checklist.ts" "F5.1" "F5" \
  "Verificación del Curso (E1221)" \
  "Genera el checklist de verificación técnica y pedagógica, y la plantilla del reporte de pruebas." \
  '<div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Resultados de las pruebas de usuario realizadas</label>
          <textarea name="testResults" rows="4" placeholder="Describe los resultados: número de participantes, calificaciones obtenidas, problemas encontrados..."
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500"></textarea>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Número de participantes en la prueba piloto</label>
          <input name="pilotParticipants" type="number" min="1" placeholder="5"
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Problemas técnicos encontrados</label>
          <textarea name="technicalIssues" rows="2" placeholder="Ej: Los videos tardaban en cargar, el quiz del módulo 2 no guardaba..."
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500"></textarea>
        </div>
      </div>'

create_step_controller \
  "frontend/src/controllers/step6.evidence.ts" \
  "6" "step6.evidence.ts" "F5.2" "F5_2" \
  "Anexo de Evidencias del Curso" \
  "Documenta las capturas de pantalla y URLs que acreditan el funcionamiento del curso." \
  '<div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">URL del curso publicado en el LMS *</label>
          <input name="courseUrl" type="url" required placeholder="https://mi-lms.com/cursos/mi-curso"
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">URL del reporte de seguimiento (SCORM/xAPI)</label>
          <input name="reportUrl" type="url" placeholder="https://mi-lms.com/reportes/..."
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Descripción de las capturas de pantalla tomadas</label>
          <textarea name="screenshotsDescription" rows="3" placeholder="Captura 1: Pantalla de inicio del curso&#10;Captura 2: Módulo 1 completado&#10;Captura 3: Certificado emitido"
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500"></textarea>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Número de certificados emitidos</label>
          <input name="certificatesIssued" type="number" min="0" placeholder="10"
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>'

create_step_controller \
  "frontend/src/controllers/step7.adjustments.ts" \
  "7" "step7.adjustments.ts" "F6.1" "F6" \
  "Documento de Ajustes Post-Evaluación" \
  "Documenta las correcciones realizadas al curso tras la verificación." \
  '<div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Observaciones recibidas del evaluador o usuarios</label>
          <textarea name="observations" rows="4" placeholder="Lista las observaciones recibidas durante la evaluación del curso..."
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500"></textarea>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Ajustes realizados al curso</label>
          <textarea name="adjustmentsMade" rows="4" placeholder="Describe los cambios que hiciste al curso en respuesta a las observaciones..."
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500"></textarea>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Versión actual del curso</label>
          <input name="courseVersion" type="text" placeholder="Ej: 1.1"
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>'

create_step_controller \
  "frontend/src/controllers/step8.signatures.ts" \
  "8" "step8.signatures.ts" "F6.2" "F6_2" \
  "Lista de Verificación de Firmas y Cierre" \
  "Genera el documento final del expediente con el inventario de los 16 productos requeridos." \
  '<div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nombre completo del candidato (para firmas)</label>
          <input name="candidateName" type="text" placeholder="Nombre completo como aparecerá en el expediente"
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nombre del revisor técnico (si aplica)</label>
          <input name="reviewerName" type="text" placeholder="Nombre del revisor o evaluador"
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Organismo Certificador</label>
          <input name="certifyingOrg" type="text" placeholder="Ej: CECATI, CONALEP, ICAP..."
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" />
        </div>
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p class="text-amber-800 text-sm font-medium">⚠️ Este es el último documento del expediente.</p>
          <p class="text-amber-700 text-sm mt-1">Verifica que todos los pasos anteriores estén completados antes de generar este documento.</p>
        </div>
      </div>'

# step9.closing.ts - cierre especial
cat > frontend/src/controllers/step9.closing.ts << 'EOF'
// src/controllers/step9.closing.ts
// Paso 9: Finalización del proceso

import type { WizardStore } from '../stores/wizard.store';

export async function initStep9(
  container: HTMLElement,
  store: typeof import('../stores/wizard.store').wizardStore
): Promise<void> {
  const state = store.getState();
  const completedSteps = state.steps.filter((s) => s.status === 'completed').length;
  const totalDocs = state.steps.length - 1; // excluir el paso de cierre

  container.innerHTML = `
    <div class="text-center py-12 space-y-6">
      <div class="text-6xl">🎉</div>
      <h2 class="text-3xl font-bold text-gray-900">¡Proceso completado!</h2>
      <p class="text-gray-500 max-w-md mx-auto">
        Has generado <strong>${completedSteps} de ${totalDocs}</strong> documentos del expediente EC0366.
        Tu carpeta de certificación está lista.
      </p>

      <div class="bg-green-50 border border-green-200 rounded-xl p-6 max-w-md mx-auto text-left">
        <p class="font-semibold text-green-800 mb-3">📁 Próximos pasos:</p>
        <ol class="text-green-700 text-sm space-y-2 list-decimal list-inside">
          <li>Descarga todos los documentos generados</li>
          <li>Revisa que estén firmados donde corresponde</li>
          <li>Entrega el expediente a tu Organismo Certificador</li>
          <li>Agenda tu evaluación con el evaluador asignado</li>
        </ol>
      </div>

      <div class="flex justify-center gap-4 pt-4">
        <button id="btn-download-all"
          class="bg-blue-900 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-800 transition-colors">
          📥 Descargar expediente completo
        </button>
        <button id="btn-new-project-close"
          class="border border-gray-300 text-gray-700 px-8 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
          🆕 Nuevo proyecto
        </button>
      </div>
    </div>
  `;

  document.getElementById('btn-download-all')?.addEventListener('click', () => {
    // Compilar todos los documentos en un solo texto descargable
    const docs = state.steps
      .filter((s) => s.documentContent)
      .map((s) => `\n\n${'='.repeat(60)}\n${s.label.toUpperCase()}\n${'='.repeat(60)}\n\n${s.documentContent}`)
      .join('');

    const blob = new Blob([`EXPEDIENTE EC0366\nProyecto: ${state.projectName}\nCandidato: ${state.clientName}\n${docs}`], {
      type: 'text/markdown',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expediente-EC0366-${state.projectName.replace(/\s+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('btn-new-project-close')?.addEventListener('click', () => {
    store.reset();
    window.location.reload();
  });
}
EOF

info "Controladores del wizard generados."

# src/vite-env.d.ts
cat > frontend/src/vite-env.d.ts << 'EOF'
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
EOF

# frontend/.env.local
cat > frontend/.env.local << 'EOF'
VITE_API_URL=http://localhost:8787
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=dummy-key-for-local
EOF

# backend/.dev.vars
cat > backend/.dev.vars << 'EOF'
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=dummy-service-role-key
SUPABASE_JWT_SECRET=dummy-jwt-secret
OLLAMA_URL=http://localhost:11434
ENVIRONMENT=development
EOF

info "Variables de entorno locales generadas."

# =============================================================================
# SECCIÓN 7: GITHUB ACTIONS
# =============================================================================
log "Generando GitHub Actions workflows..."

cat > .github/workflows/test.yml << 'EOF'
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm', cache-dependency-path: backend/package-lock.json }
      - run: npm ci
        working-directory: backend
      - run: npm test
        working-directory: backend

  type-check-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm', cache-dependency-path: frontend/package-lock.json }
      - run: npm ci
        working-directory: frontend
      - run: npm run type-check
        working-directory: frontend
EOF

cat > .github/workflows/deploy-backend.yml << 'EOF'
name: Deploy Backend

on:
  push:
    branches: [main]
    paths: [backend/**]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
        working-directory: backend
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          workingDirectory: backend
          command: deploy --env production
EOF

cat > .github/workflows/deploy-frontend.yml << 'EOF'
name: Deploy Frontend

on:
  push:
    branches: [main]
    paths: [frontend/**]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
        working-directory: frontend
      - run: npm run build
        working-directory: frontend
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          command: pages deploy frontend/dist --project-name=knowto
EOF

info "GitHub Actions generados."

# =============================================================================
# RESUMEN FINAL
# =============================================================================
echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}  ✅  KNOWTO generado correctamente     ${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "📁 Estructura creada en: ${BLUE}./$ROOT/${NC}"
echo ""
echo -e "${YELLOW}PRÓXIMOS PASOS:${NC}"
echo ""
echo "  1. Configura variables de entorno:"
echo "     cp .env.example .env"
echo "     # Edita .env con tus credenciales reales de Supabase"
echo ""
echo "  2. Inicia el entorno de desarrollo:"
echo "     cd $ROOT"
echo "     docker-compose up -d"
echo ""
echo "  3. Accede a la aplicación:"
echo "     🌐 Frontend:  http://localhost:5173"
echo "     🔌 Backend:   http://localhost:8787"
echo "     🗄️  DB:        http://localhost:5432"
echo ""
echo "  4. Para desarrollo sin Docker:"
echo "     # Backend"
echo "     cd $ROOT/backend && npm install && npm run dev"
echo "     # Frontend (otra terminal)"
echo "     cd $ROOT/frontend && npm install && npm run dev"
echo ""
echo -e "${YELLOW}NOTAS IMPORTANTES:${NC}"
echo "  - Los prompts de IA están en: backend/src/prompts/templates/*.md"
echo "  - Las migraciones SQL están en: supabase/migrations/"
echo "  - Configura Google OAuth en tu proyecto de Supabase"
echo "  - El Worker necesita Workers AI habilitado en Cloudflare"
echo ""
EOF
