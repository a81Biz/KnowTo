-- =============================================================================
-- KNOWTO - Migration 000: Supabase Internal Setup
-- =============================================================================
-- Este script monta las estructuras internas que el image supabase/postgres
-- crearía con sus propios initdb scripts, PERO que se pierden cuando
-- montamos nuestro directorio en /docker-entrypoint-initdb.d/ (el mount
-- reemplaza el directorio completo, ocultando los scripts del image).
--
-- Crea:
--   • Roles: anon, authenticated, service_role (roles base de Supabase)
--   • Schema: _realtime (requerido por supabase/realtime para sus migraciones Ecto)
--   • Schema: storage  (requerido por PostgREST y futuras integraciones)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Roles base de Supabase
--    anon        → rol de solo lectura para usuarios no autenticados
--    authenticated → rol para usuarios con sesión activa
--    service_role → rol de admin para el backend (bypassa RLS)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN
    -- supabase_admin ya existe como SUPERUSER (es con el que conectamos),
    -- pero por si acaso en alguna variante del image no existe:
    CREATE ROLE supabase_admin NOLOGIN SUPERUSER;
  END IF;
END $$;

-- Conceder acceso básico al schema public a los roles de Supabase
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL   ON SCHEMA public TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Schema _realtime
--    Requerido por supabase/realtime (Ecto migrations en Elixir).
--    Debe existir antes de que el servicio Realtime corra /app/bin/migrate.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS _realtime;
GRANT ALL ON SCHEMA _realtime TO supabase_admin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Schema storage
--    Requerido por PostgREST (PGRST_DB_SCHEMAS: public,storage).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS storage;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
GRANT ALL   ON SCHEMA storage TO service_role;

