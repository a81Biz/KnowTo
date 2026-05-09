# Test de Generación de Productos F4

Este documento explica cómo usar el endpoint de test para generar los 8 productos EC0366 en un proyecto existente, y cómo limpiar los datos generados para empezar de cero.

---

## Prerequisitos

1. Docker corriendo: `docker compose up -d`
2. El proyecto debe tener completadas las fases 0-3 (F0, F1, F2, F2.5, F3).
3. Los formularios de productos (`producto_form_schemas`) deben tener `valores_usuario` llenos. Esto ocurre cuando el usuario llena los formularios en Step 4 del wizard. Si no están llenos, el test skippea ese producto.

### Obtener el projectId

```sql
-- Ejecutar en Supabase Studio (http://localhost:54323) o via psql:
docker exec knowto-supabase-db psql -U postgres -d postgres \
  -c "SELECT id, name, client_name, created_at FROM projects ORDER BY created_at DESC LIMIT 5;"
```

---

## 1. Limpiar datos generados (reset)

Borra todos los productos generados, formularios y jobs F4 de un proyecto para empezar desde cero.

```bash
# Reemplazar <PROJECT_ID> con el UUID del proyecto
curl -X DELETE http://api.localhost/dcfl/test/reset/<PROJECT_ID>
```

**O directamente con SQL** (para limpiar TODO sin distinción de proyecto):

```bash
docker exec knowto-supabase-db psql -U postgres -d postgres -c "
  TRUNCATE TABLE fase4_productos CASCADE;
  TRUNCATE TABLE producto_form_schemas CASCADE;
  DELETE FROM pipeline_jobs WHERE phase_id = 'F4';
"
```

### Qué se borra

| Tabla | Contenido |
|---|---|
| `fase4_productos` | Documentos generados (P1-P8) |
| `producto_form_schemas` | Schemas y valores de los formularios |
| `pipeline_jobs` (phase F4) | Jobs del pipeline |
| `pipeline_agent_outputs` | Outputs de agentes (CASCADE desde jobs) |

---

## 2. Generar todos los productos (test run)

El endpoint corre el ciclo completo por cada producto en background y retorna inmediatamente.

### Ciclo por producto

```
Para cada producto (P1, P4, P3, P2, P5, P6, P7, P8):
  1. Genera el form schema vía pipeline F4_P{N}_FORM_SCHEMA
     (si ya existe en BD lo reutiliza, no lo regenera)
  2. Lee los suggested_value de cada campo del schema como entradas
     (si el usuario ya llenó el formulario manualmente, usa esos valores)
  3. Genera el documento vía pipeline F4_P{N}_GENERATE_DOCUMENT
     - P1, P4: un solo job con todos los campos
     - P2, P3, P5, P6, P7, P8: un job por cada módulo (guion_unidad_N, etc.)
  4. Espera a que el job complete antes de pasar al siguiente producto
```

### No requiere preparación previa

El test genera los form schemas automáticamente. Solo necesita que las fases 0-3 estén completas.

### Lanzar el test

```bash
# Reemplazar <PROJECT_ID> con el UUID del proyecto
curl -X POST http://api.localhost/dcfl/test/run-all \
  -H "Content-Type: application/json" \
  -d '{ "projectId": "<PROJECT_ID>" }'
```

**Respuesta (202 Accepted)**:

```json
{
  "success": true,
  "runId": "abc12345-1715000000000",
  "projectId": "<PROJECT_ID>",
  "message": "Test run iniciado. 8 productos se generarán secuencialmente en background.",
  "order": "P1 → P4 → P3 (por módulo) → P2 (por módulo) → P5 → P6 → P7 → P8",
  "monitor": {
    "logs":     "docker logs knowto-backend -f 2>&1 | grep TEST-RUN",
    "products": "SELECT producto, validacion_estado, created_at FROM fase4_productos WHERE project_id='...' ORDER BY producto, created_at DESC;",
    "jobs":     "SELECT prompt_id, status, LEFT(error,80) FROM pipeline_jobs WHERE project_id='...' AND phase_id='F4' ORDER BY created_at DESC LIMIT 20;"
  }
}
```

---

## 3. Monitorear el progreso

### Logs en tiempo real

```bash
# Ver solo mensajes del test runner
docker logs knowto-backend -f 2>&1 | grep TEST-RUN

# Ver todos los logs del pipeline (incluye agentes individuales)
docker logs knowto-backend -f 2>&1 | grep -E "TEST-RUN|pipeline|assembler"
```

### Estado de productos en BD

```bash
# Reemplazar <PROJECT_ID>
docker exec knowto-supabase-db psql -U postgres -d postgres -c "
  SELECT producto, validacion_estado, created_at
  FROM fase4_productos
  WHERE project_id = '<PROJECT_ID>'
  ORDER BY producto, created_at DESC;
"
```

### Estado de jobs

```bash
docker exec knowto-supabase-db psql -U postgres -d postgres -c "
  SELECT prompt_id, status, LEFT(error, 100) as error_preview, created_at
  FROM pipeline_jobs
  WHERE project_id = '<PROJECT_ID>' AND phase_id = 'F4'
  ORDER BY created_at DESC
  LIMIT 20;
"
```

---

## 4. Ciclo completo de prueba

```bash
# 1. Reiniciar backend para cargar cambios de código
docker compose restart backend

# 2. Limpiar datos previos
curl -X DELETE http://api.localhost/dcfl/test/reset/<PROJECT_ID>

# 3. Esperar que el frontend genere los form schemas (abrir Step 4 en el wizard)
#    O verificar que ya existen:
docker exec knowto-supabase-db psql -U postgres -d postgres -c "
  SELECT producto, array_length(ARRAY(SELECT jsonb_object_keys(valores_usuario)), 1) as campos_llenos
  FROM producto_form_schemas
  WHERE project_id = '<PROJECT_ID>'
  ORDER BY producto;"

# 4. Lanzar test run
curl -X POST http://api.localhost/dcfl/test/run-all \
  -H "Content-Type: application/json" \
  -d '{ "projectId": "<PROJECT_ID>" }'

# 5. Monitorear (el proceso puede tardar 2-4 horas con Ollama local)
docker logs knowto-backend -f 2>&1 | grep TEST-RUN
```

---

## 5. Estimación de tiempo

Con Ollama local (llama3.1-8b + llama3.3-70b):

| Producto | Tipo | Tiempo estimado |
|---|---|---|
| P1 | Single job | 10-20 min |
| P4 | Single job | 10-20 min |
| P3 | N módulos × job | 15-25 min por módulo |
| P2 | N módulos × job | 15-25 min por módulo |
| P5 | N módulos × job | 20-30 min por módulo |
| P6 | N módulos × job | 15-20 min por módulo |
| P7 | N módulos × job | 15-25 min por módulo |
| P8 | N módulos × job | 15-20 min por módulo |

Con 4 módulos por producto multi-módulo: **estimado 4-6 horas en total**.

---

## 6. Diagnóstico de errores

### Producto generado pero vacío

```bash
docker exec knowto-supabase-db psql -U postgres -d postgres -c "
  SELECT producto, validacion_estado, LEFT(documento_final, 200)
  FROM fase4_productos
  WHERE project_id = '<PROJECT_ID>'
  ORDER BY producto;"
```

### Job fallido — ver error

```bash
docker exec knowto-supabase-db psql -U postgres -d postgres -c "
  SELECT prompt_id, status, error
  FROM pipeline_jobs
  WHERE project_id = '<PROJECT_ID>' AND status = 'failed'
  ORDER BY created_at DESC;"
```

### Ver outputs de agentes de un job específico

```bash
docker exec knowto-supabase-db psql -U postgres -d postgres -c "
  SELECT agent_name, LEFT(output, 100), char_count
  FROM pipeline_agent_outputs
  WHERE job_id = '<JOB_ID>'
  ORDER BY created_at;"
```

### Señales de bug comunes

| Señal en logs | Causa probable | Solución |
|---|---|---|
| `[TEST-RUN] P5: skipped:no-form-values` | No hay valores_usuario para ese producto | Llenar el formulario en el wizard primero |
| `assembler falló: Expected property name` | JSON.parse sin try-catch en assembler | Ver CLAUDE.md sección "Reglas críticas" |
| `Sin handler para assembler` | Nombre de agente en template no coincide con productHandlers | Ver tabla de registro en CLAUDE.md |
| Job queda en `running` por más de 30 min | Timeout de Ollama o modelo colgado | Reiniciar Ollama y relanazar |
