# Diagnóstico: `relation "public.fase2_5_recomendaciones" does not exist`

## Causa raíz

Las migraciones 016 y 017 **nunca se aplicaron** al volumen PostgreSQL en ejecución.

`run_all.sql` se monta en `/docker-entrypoint-initdb.d/` y Postgres solo lo ejecuta
**una vez**, cuando el volumen está vacío. El volumen `knowto-supabase-db` ya existía
cuando se crearon las migraciones 016 y 017, por lo que nunca se ejecutaron automáticamente.
La migración 017 tampoco estaba referenciada en `run_all.sql`.

**Estado antes del fix:**

| Tabla | Existía en BD |
|:---|:---:|
| `fase1_informe_necesidades` | ✅ |
| `fase2_analisis_alcance` | ✅ |
| `fase2_resolucion_discrepancias` | ✅ |
| `fase3_especificaciones` | ✅ |
| `fase2_5_recomendaciones` | ❌ |
| `fase4_productos` | ❌ |

---

## Archivos auditados

### 1. `backend/supabase/migrations/016_create_fase2_5_recomendaciones.sql`
El archivo SQL es correcto. Crea la tabla, índices y permisos. No tenía errores.

### 2. `backend/supabase/migrations/run_all.sql` (antes del fix)
Incluía `\ir 016_create_fase2_5_recomendaciones.sql` pero **NO incluía `017`**.
Esto significa que ante cualquier recreación del volumen, la tabla `fase4_productos`
también faltaría.

### 3. `backend/src/core/services/supabase.service.ts`
`saveF2_5Recomendaciones()` y `getF2_5Recomendaciones()` apuntan correctamente
a `'fase2_5_recomendaciones'`. El código no tiene errores.

### 4. `backend/src/dcfl/routes/wizard.route.ts`
El endpoint `GET /proyecto/{id}/fase2_5/recomendaciones` y el handler post-job
para `sintetizador_final_f2_5` están correctamente escritos. Sin errores.

---

## Fix aplicado

### Paso 1 — Aplicar migraciones manualmente al contenedor en ejecución

```bash
cat backend/supabase/migrations/016_create_fase2_5_recomendaciones.sql \
  | docker exec -i knowto-supabase-db psql -U postgres -d postgres

cat backend/supabase/migrations/017_create_fase4_productos.sql \
  | docker exec -i knowto-supabase-db psql -U postgres -d postgres
```

**Resultado:**
```
CREATE TABLE / CREATE INDEX / CREATE INDEX / GRANT / GRANT   ← 016
CREATE TABLE / CREATE INDEX / CREATE INDEX / ...              ← 017
```

### Paso 2 — Añadir 017 a `run_all.sql`

```sql
-- backend/supabase/migrations/run_all.sql  (después del fix)
\ir 016_create_fase2_5_recomendaciones.sql
\ir 017_create_fase4_productos.sql          ← añadida
```

Esto garantiza que en cualquier recreación futura del volumen, ambas migraciones
se apliquen automáticamente.

---

## Estado final

```
SELECT tablename FROM pg_tables WHERE tablename LIKE 'fase%' ORDER BY tablename;

           tablename
--------------------------------
 fase1_informe_necesidades      ✅
 fase2_5_recomendaciones        ✅  (nueva)
 fase2_analisis_alcance         ✅
 fase2_resolucion_discrepancias ✅
 fase3_especificaciones         ✅
 fase4_productos                ✅  (nueva)
```

---

## Patrón a seguir para migraciones futuras

Cada vez que se cree un archivo `0XX_create_*.sql` en `backend/supabase/migrations/`,
agregar la línea correspondiente en `run_all.sql` **Y aplicarla manualmente** si el
volumen de Postgres ya está inicializado:

```bash
cat backend/supabase/migrations/0XX_nombre.sql \
  | docker exec -i knowto-supabase-db psql -U postgres -d postgres
```
