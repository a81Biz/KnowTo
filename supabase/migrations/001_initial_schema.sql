-- =============================================================================
-- KNOWTO - Migration 001: Initial Schema
-- =============================================================================

-- ---------------------------------------------------------------------------
-- COMPATIBILIDAD: stubs de auth para initdb.d
--
-- supabase/postgres no pre-crea auth.users — lo hace GoTrue al arrancar.
-- Pero initdb.d corre ANTES que GoTrue. La tabla creada aquí debe tener
-- TODAS las columnas del schema inicial de GoTrue (00_init_auth_schema.up.sql)
-- para que las migraciones incrementales posteriores de GoTrue encuentren
-- las columnas que esperan (confirmed_at, instance_id, etc.).
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    CREATE SCHEMA auth;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN
    -- Schema completo de GoTrue v2 (00_init_auth_schema.up.sql)
    CREATE TABLE auth.users (
      instance_id              uuid NULL,
      id                       uuid NOT NULL,
      aud                      varchar(255) NULL,
      "role"                   varchar(255) NULL,
      email                    varchar(255) NULL UNIQUE,
      encrypted_password       varchar(255) NULL,
      confirmed_at             timestamptz NULL,
      invited_at               timestamptz NULL,
      confirmation_token        varchar(255) NULL,
      confirmation_sent_at     timestamptz NULL,
      recovery_token           varchar(255) NULL,
      recovery_sent_at         timestamptz NULL,
      email_change_token       varchar(255) NULL,
      email_change             varchar(255) NULL,
      email_change_sent_at     timestamptz NULL,
      last_sign_in_at          timestamptz NULL,
      raw_app_meta_data        jsonb NULL,
      raw_user_meta_data       jsonb NULL,
      is_super_admin           bool NULL,
      created_at               timestamptz NULL,
      updated_at               timestamptz NULL,
      CONSTRAINT users_pkey PRIMARY KEY (id)
    );
    CREATE INDEX IF NOT EXISTS users_instance_id_email_idx ON auth.users (instance_id, email);
    CREATE INDEX IF NOT EXISTS users_instance_id_idx ON auth.users (instance_id);
  END IF;

  -- auth.uid() stub para RLS policies de migration 002.
  -- GoTrue la reemplazará con su implementación real al arrancar.
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'auth' AND p.proname = 'uid'
  ) THEN
    EXECUTE $func$
      CREATE FUNCTION auth.uid() RETURNS uuid
      LANGUAGE sql STABLE
      AS 'SELECT NULL::uuid';
    $func$;
  END IF;
END $$;



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
  step_number   INTEGER NOT NULL CHECK (step_number BETWEEN 0 AND 11),
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

-- =============================================================================
-- SEED: usuario de desarrollo
-- UUID fijo para el token 'dev-local-bypass' (auth.middleware.ts DEV_USER_ID).
-- Usa las columnas del stub de auth.users creado arriba (confirmed_at, no
-- email_confirmed_at, que es la columna que añade GoTrue en sus propias
-- migraciones incrementales).
-- =============================================================================
INSERT INTO auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, confirmed_at,
  created_at, updated_at,
  confirmation_token, recovery_token,
  email_change_token, email_change
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'dev@local.dev',
  crypt('dev-password', gen_salt('bf')),
  NOW(), NOW(), NOW(), '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, email, full_name)
VALUES ('00000000-0000-0000-0000-000000000001', 'dev@local.dev', 'Dev User')
ON CONFLICT (id) DO NOTHING;
