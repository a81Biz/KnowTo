-- Migration 037: Corregir jwt_secret del tenant Realtime
--
-- El servicio supabase-realtime crea el tenant 'realtime-dev' con un secret
-- aleatorio al arrancar por primera vez. Ese secret no coincide con el
-- API_JWT_SECRET de docker-compose.yml, lo que provoca:
--   Auth error: {:error, :expected_claims_map}
-- y ningún cliente obtiene status SUBSCRIBED → fallback a polling HTTP.
--
-- Este migration garantiza que el jwt_secret del tenant coincida con el
-- API_JWT_SECRET usado para firmar los anon/service keys.
-- Ref: docker-compose.yml → REALTIME_API_JWT_SECRET / API_JWT_SECRET

DO $$
BEGIN
  UPDATE _realtime.tenants
  SET jwt_secret = 'super-secret-jwt-token-with-at-least-32-characters-long'
  WHERE external_id = 'realtime-dev';
EXCEPTION WHEN undefined_table OR invalid_schema_name THEN
  RAISE WARNING '037: _realtime.tenants does not exist yet — skipping jwt_secret fix. Run manually after Realtime starts.';
END $$;

-- Si el tenant aún no existe (primer arranque antes de que Realtime lo cree),
-- la migración no hace nada. El contenedor Realtime lo creará después con un
-- secret aleatorio, pero el próximo docker compose restart supabase-db +
-- re-ejecución de migraciones lo corregirá.
-- Para un arranque en frío limpio, ejecutar manualmente:
--   docker exec knowto-supabase-db psql -U postgres -d postgres \
--     -c "UPDATE _realtime.tenants SET jwt_secret='super-secret-jwt-token-with-at-least-32-characters-long' WHERE external_id='realtime-dev';"
--   docker compose restart supabase-realtime
