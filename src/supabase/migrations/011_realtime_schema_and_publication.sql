-- 011_realtime_schema_and_publication.sql
--
-- Infraestructura requerida por Supabase Realtime v2 self-hosted.
--
-- ¿Por qué esta migración existe?
--
--   Realtime v2 en REPLICATION_MODE=RLS necesita dos cosas en la tenant DB:
--
--   1. Schema `realtime` — Realtime corre sus propias Ecto migrations en este
--      schema al conectar el primer canal. Si el schema no existe, falla con:
--        "schema 'realtime' does not exist" → CHANNEL_ERROR en el frontend.
--
--   2. Publicación `supabase_realtime FOR ALL TABLES` — Realtime usa esta
--      publicación para el WAL logical decoding. Sin ella no hay postgres_changes.
--      La migración 010 intentaba añadir pipeline_jobs a la publicación con un
--      IF EXISTS, pero como las migraciones corren antes que Realtime (que la
--      crea), el IF EXISTS nunca era verdadero y la publicación nunca se creaba.
--      Aquí la creamos nosotros directamente.
--
-- Orden de arranque:
--   supabase-db init → corre todas las migraciones (incluida esta) →
--   supabase-realtime arranca → encuentra schema y publicación ya creados →
--   sus migraciones Ecto crean las tablas dentro de `realtime` → OK.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Schema realtime
-- ─────────────────────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS realtime;

GRANT ALL   ON SCHEMA realtime TO supabase_admin;
GRANT USAGE ON SCHEMA realtime TO anon;
GRANT USAGE ON SCHEMA realtime TO authenticated;
GRANT USAGE ON SCHEMA realtime TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Publicación supabase_realtime
--    FOR ALL TABLES: cualquier tabla con RLS puede recibir cambios via Realtime.
--    Las políticas RLS de cada tabla controlan qué ve cada rol.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    -- NOTA: no usar CREATE PUBLICATION ... FOR ALL TABLES dentro de una función
    -- pl/pgSQL porque no soporta DDL de replicación. Usar EXECUTE.
    EXECUTE 'CREATE PUBLICATION supabase_realtime FOR ALL TABLES';
  END IF;
END $$;
