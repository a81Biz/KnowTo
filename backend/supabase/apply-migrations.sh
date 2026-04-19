#!/usr/bin/env bash
# Aplica todas las migraciones pendientes al contenedor Supabase DB.
# Uso: bash apply-migrations.sh [número_desde]
# Ejemplo: bash apply-migrations.sh 011   ← aplica solo 011 en adelante
#
# NOTAS:
# - docker-entrypoint-initdb.d SOLO se ejecuta en el primer inicio del volumen.
# - Para migraciones nuevas en un DB ya inicializado, usar este script.

set -euo pipefail

DB_CONTAINER="${DB_CONTAINER:-knowto-supabase-db}"
DB_USER="${DB_USER:-supabase_admin}"
DB_PASS="${DB_PASS:-supabase123}"
DB_NAME="${DB_NAME:-postgres}"
MIGRATIONS_DIR="$(dirname "$0")/migrations"
FROM="${1:-000}"

echo "==> Aplicando migraciones desde: $FROM"
echo "    Contenedor : $DB_CONTAINER"
echo "    Usuario    : $DB_USER"
echo ""

for file in "$MIGRATIONS_DIR"/*.sql; do
  filename=$(basename "$file")
  prefix="${filename%%_*}"
  if [[ "$prefix" < "$FROM" ]]; then
    echo "  ⏭  Saltando $filename"
    continue
  fi
  echo "  ▶  Aplicando $filename ..."
  docker cp "$file" "${DB_CONTAINER}:/tmp/${filename}"
  docker exec "$DB_CONTAINER" bash -c \
    "PGPASSWORD=${DB_PASS} psql -U ${DB_USER} -d ${DB_NAME} -f /tmp/${filename}" 2>&1 | \
    grep -v "^$" | sed 's/^/     /'
done

echo ""
echo "==> Listo. Tablas actuales:"
docker exec "$DB_CONTAINER" bash -c \
  "PGPASSWORD=${DB_PASS} psql -U ${DB_USER} -d ${DB_NAME} -c '\dt'" 2>&1 | \
  grep -v "^$"
