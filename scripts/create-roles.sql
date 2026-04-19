-- Crea los roles que Supabase Realtime v2 requiere.
-- El stack usa supabase_admin como superusuario, pero Realtime espera
-- que existan: postgres, anon, authenticated, service_role.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'postgres') THEN
    CREATE ROLE postgres SUPERUSER LOGIN PASSWORD 'postgres';
    RAISE NOTICE 'Role postgres created';
  ELSE
    RAISE NOTICE 'Role postgres already exists';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
    RAISE NOTICE 'Role anon created';
  ELSE
    RAISE NOTICE 'Role anon already exists';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
    RAISE NOTICE 'Role authenticated created';
  ELSE
    RAISE NOTICE 'Role authenticated already exists';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
    RAISE NOTICE 'Role service_role created';
  ELSE
    RAISE NOTICE 'Role service_role already exists';
  END IF;

  -- Grants que necesita Realtime para operar
  GRANT USAGE ON SCHEMA realtime TO postgres, anon, authenticated, service_role;
  GRANT USAGE ON SCHEMA public  TO postgres, anon, authenticated, service_role;

  RAISE NOTICE 'All roles verified and grants applied';
END $$;
