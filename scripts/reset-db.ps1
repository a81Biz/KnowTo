# =============================================================================
# KnowTo — reset-db.ps1
#
# Reinicia el stack eliminando TODOS los volúmenes (volumen viejo postgres_data
# y el nuevo supabase_db_data). Útil para empezar desde cero o cuando las
# migraciones fallan por datos incompatibles.
#
# Uso:
#   .\scripts\reset-db.ps1
#
# ADVERTENCIA: esto borra todos los datos del PostgreSQL local.
# =============================================================================

Write-Host "⚠️  Deteniendo contenedores y eliminando volúmenes declarados..." -ForegroundColor Yellow
docker compose down -v

Write-Host "🧹 Eliminando volúmenes huérfanos (si quedan)..." -ForegroundColor Cyan
docker volume prune -f

Write-Host "🚀 Levantando el stack completo..." -ForegroundColor Green
docker compose up -d

Write-Host ""
Write-Host "✅ Listo. Puedes verificar con:" -ForegroundColor Green
Write-Host "   docker compose ps"
Write-Host "   curl http://localhost:54321/auth/v1/health"
