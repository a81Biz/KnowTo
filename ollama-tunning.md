# Problema de Contexto P7/P8 — Análisis y Cambios Requeridos

## Descripción del Problema

P7 (Documento de Información General) y P8 (Cronograma de Desarrollo) cierran el ciclo de producción: P7 es un manual de referencia y P8 es el cronograma real del proyecto. Para hacer su trabajo correctamente, ambos necesitan saber qué materiales ya fueron producidos (P1–P6).

Actualmente ambos reciben un `compactContext` que solo contiene `userInputs` con los campos `informacion_unidad_N` / `cronograma_unidad_N`. No reciben ningún documento previamente generado.

**Resultado**: los modelos generan contenido genérico en lugar de referenciar los materiales reales producidos para el curso.

---

## Raíz del Problema: Flujo de Datos

```
frontend/dcfl/src/controllers/step4.production.ts
  └── _generateCurrentProduct() [línea ~481]
        └── wizardStore.buildContext(STEP_NUMBER) [línea ~515]
              └── frontend/dcfl/src/stores/wizard.store.ts
                    └── buildContext() [línea 183]
                          └── itera solo wizard_steps (F0–F3)
                          └── returns { ...base, previousData: { ...completed_steps } }
                          └── NUNCA lee fase4_productos
```

El store `wizard.store.ts` construye el contexto a partir de `wizard_steps` (F0–F3). Los productos F4 (P1–P8) se almacenan en la tabla `fase4_productos`, que el frontend **nunca consulta** al construir el contexto para la generación.

La tabla y el método ya existen en el backend:

```typescript
// backend/src/core/services/supabase.service.ts — línea 790
async getF4Productos(projectId: string): Promise<Array<{
  id: string;
  producto: string;
  documento_final: string | null;
  validacion_estado: string | null;
  validacion_errores: string[] | null;
  datos_producto: any;
  job_id: string | null;
  created_at: string;
  approved_at: string | null;
}>>
```

> Tabla real: `fase4_productos` (NO `f4_productos_finales`)

---

## Tabla de Archivos a Modificar

| # | Archivo | Cambio |
|---|---|---|
| 1 | `backend/src/dcfl/handlers/document.handlers.ts` | Inyectar `productos_previos` en `enrichedContext` para P7/P8 |
| 2 | `backend/src/core/services/ai.service.ts` | Exponer `productos_previos` en `compactContext` |
| 3 | `backend/src/dcfl/prompts/templates/F4_P7_GENERATE_DOCUMENT.md` | Actualizar extractor + agente_A para usar `materiales_producidos` |
| 4 | `backend/src/dcfl/prompts/templates/F4_P8_GENERATE_DOCUMENT.md` | Actualizar extractor + agente_A para usar `entregables_existentes` |

---

## Cambio 1 — `document.handlers.ts`

**Punto de inserción**: después del bloque `if (body.phaseId === 'F3')` (~línea 207), antes de `// PASO 2: Enriquecer con OSINT`.

```typescript
const isP7orP8 = body.promptId === 'F4_P7_GENERATE_DOCUMENT' || body.promptId === 'F4_P8_GENERATE_DOCUMENT';
if (isP7orP8) {
  try {
    const prevProducts = await supabase.getF4Productos(body.projectId);
    const productos_previos: Record<string, string> = {};
    for (const p of prevProducts) {
      if (['P1', 'P2', 'P3', 'P4', 'P5', 'P6'].includes(p.producto) && p.documento_final) {
        productos_previos[p.producto] = p.documento_final;
      }
    }
    if (Object.keys(productos_previos).length > 0) {
      enrichedContext.productos_previos = productos_previos;
    }
  } catch (err) {
    console.warn('[F4 P7/P8] No se pudieron inyectar productos previos:', err);
  }
}
```

---

## Cambio 2 — `ai.service.ts`

**Punto de inserción**: después de la línea `if (options.context.fase3) compactContextObj.fase3 = options.context.fase3;` (~línea 120).

```typescript
if (options.context.productos_previos) compactContextObj.productos_previos = options.context.productos_previos;
```

**`compactContext` resultante para P7/P8 tras el fix:**

```json
{
  "projectName": "Herrería Ornamental",
  "clientName": "Juana García",
  "userInputs": {
    "informacion_unidad_1": "Tema: Materiales metálicos...",
    "informacion_unidad_2": "Tema: Técnicas de corte..."
  },
  "productos_previos": {
    "P1": "# Instrumentos de Evaluación (EC0366)\n...",
    "P2": "# Presentación Electrónica\n...",
    "P3": "# Guiones Multimedia\n...",
    "P4": "# Manual del Participante\n...",
    "P5": "# Guías de Actividades\n...",
    "P6": "# Calendario General del Curso\n..."
  }
}
```

---

## Cambio 3 — `F4_P7_GENERATE_DOCUMENT.md`

### Extractor actualizado

Reemplazar el task del `extractor_doc_generic`:

```yaml
    task: |
      Read from userInputs AND productos_previos in the provided context. Ignore previousData entirely.
      The product is "Documento de Información General" (P7). The form fields follow the pattern "informacion_unidad_N" where N is the unit number.

      OUTPUT ONLY THIS JSON — no other text, no markdown:
      {
        "producto": "P7",
        "proyecto": "[projectName from context]",
        "candidato": "[clientName from context]",
        "secciones": [
          { "campo": "informacion_unidad_1", "contenido": "[value of userInputs.informacion_unidad_1]" }
        ],
        "materiales_producidos": {
          "P1": "[first 300 chars of productos_previos.P1 if present, else null]",
          "P2": "[first 300 chars of productos_previos.P2 if present, else null]",
          "P5": "[first 300 chars of productos_previos.P5 if present, else null]",
          "P6": "[first 300 chars of productos_previos.P6 if present, else null]"
        }
      }

      Rules:
      - Include ONLY fields whose key starts with "informacion_unidad_" in secciones
      - Preserve the exact text of each field value — do not paraphrase or summarize
      - The number of secciones must equal the number of informacion_unidad_* keys in userInputs
      - For materiales_producidos: include a short excerpt (first 300 chars) if present; null if absent
```

### Regla adicional para `agente_doc_generic_A`

Agregar como Regla 7:

```
7. USE MATERIALES PRODUCIDOS: If materiales_producidos is present in the extracted data,
   the Recursos section of each unit MUST reference the actual materials already produced
   for this course. List them as: "P1 — Instrumento de Evaluación (producido)",
   "P5 — Guía de Actividades (producida)", etc. Do not list generic resource names.
   If materiales_producidos is null or absent, use generic resource descriptions.
```

---

## Cambio 4 — `F4_P8_GENERATE_DOCUMENT.md`

### Extractor actualizado

Reemplazar el task del `extractor_doc_generic`:

```yaml
    task: |
      Read from userInputs AND productos_previos in the provided context. Ignore previousData entirely.
      The product is "Cronograma de Desarrollo" (P8). The form fields follow the pattern "cronograma_unidad_N" where N is the unit number.

      OUTPUT ONLY THIS JSON — no other text, no markdown:
      {
        "producto": "P8",
        "proyecto": "[projectName from context]",
        "candidato": "[clientName from context]",
        "secciones": [
          { "campo": "cronograma_unidad_1", "contenido": "[value of userInputs.cronograma_unidad_1]" }
        ],
        "entregables_existentes": {
          "P1": "[extract instrument types per unit from productos_previos.P1 if present, else null]",
          "P2": "[extract slide counts per unit from productos_previos.P2 if present, else null]",
          "P3": "[extract script status per unit from productos_previos.P3 if present, else null]",
          "P4": "[extract page counts per unit from productos_previos.P4 if present, else null]",
          "P5": "[extract activity count per unit from productos_previos.P5 if present, else null]",
          "P6": "[extract session durations per unit from productos_previos.P6 if present, else null]"
        }
      }

      Rules:
      - Include ONLY fields whose key starts with "cronograma_unidad_" in secciones
      - Preserve the exact text of each field value — do not paraphrase or summarize
      - The number of secciones must equal the number of cronograma_unidad_* keys in userInputs
      - For entregables_existentes: extract factual quantities (counts, durations) if present; null if absent
```

### Regla adicional para `agente_doc_generic_A`

Agregar como Regla 7:

```
7. REAL DELIVERABLES: If entregables_existentes is present in the extracted data,
   the schedule tables MUST use the actual slide counts, page counts, and durations
   already established in P2, P4, and P6. The Estado column MUST reflect "Producido"
   for any deliverable present in entregables_existentes. Do not invent quantities
   that contradict the already-produced materials.
```

---

## Estado Actual vs. Estado Esperado (tras aplicar los cambios propuestos)

| Aspecto | Estado actual | Estado esperado |
|---|---|---|
| P7 — Normativa | Inventada o genérica | Basada en los instrumentos reales de P1 |
| P7 — Recursos | Genéricos | Lista los materiales producidos P1–P6 por nombre |
| P8 — Conteo de diapositivas | Inventado | Usa los valores reales de P2 |
| P8 — Duración de sesiones | Inventada | Usa los valores reales de P6 |
| P8 — Estado de entregables | Todos "Pendiente" | Marca como "Producido" los ya generados |
| Contexto disponible | Solo `userInputs` | `userInputs` + `productos_previos` |
