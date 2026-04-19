# Plan de Implementación — Sub-wizard F4: 8 Productos de Producción EC0366

**Fecha:** 2026-04-19  
**Estado:** Borrador — pendiente de aprobación

---

## 1. Estado actual (auditoría)

### Lo que YA existe (no tocar)

| Componente | Archivo | Estado |
|:---|:---|:---|
| Prompt F4_P0 | `backend/src/dcfl/prompts/templates/F4_P0-cronograma.md` | INCOMPLETO — pipeline_steps tiene 5 etapas pero usa nombres genéricos (`synthesizer`, `judge`) sin validador ni sintetizador_final específico |
| Prompts F4_P1–F4_P7 | `backend/src/dcfl/prompts/templates/F4_P*.md` | LEGACY — mono-prompt simple, sin pipeline_steps ni multi-agente |
| Frontend controller | `frontend/dcfl/src/controllers/step4.production.ts` | FUNCIONA — maneja 8 productos secuencialmente, aprobación por producto |
| Frontend template | `frontend/dcfl/templates/tpl-step4-production.html` | FUNCIONA — UI completa con progress indicators |
| Route schema | `backend/src/dcfl/routes/wizard.route.ts` | FUNCIONA — F4_P0–F4_P7 en enum de promptId y phaseId |
| Prompt registry | `backend/src/dcfl/prompts/index.ts` | FUNCIONA — todos los prompts F4 registrados |

### Lo que FALTA implementar

| Gap | Impacto | Bloque |
|:---|:---|:---|
| F4_P0–F4_P7 sin arquitectura doble-agente + juez completa | Pipeline vacío; productos de baja calidad | A |
| Sin `validador_pX` (código, no IA) para ningún producto | Placeholders y errores llegan al documento final | B |
| Sin `sintetizador_final_f4` (código, no IA) | No hay limpieza final ni formato EC0366 garantizado | B |
| 24 nuevos nombres de agente no declarados en `pipeline.types.ts` | TypeScript errors | B |
| Sin tabla `fase4_productos` en BD | Productos solo en `pipeline_jobs.result` (JSON crudo) | C |
| Sin `saveF4Producto()` en `supabase.service.ts` | No se puede consultar ni reportar por producto | C |
| Sin parser F4 (texto → JSONB estructurado) | Datos de productos no accesibles para fases posteriores | C |
| Sin handler post-job en `wizard.route.ts` para F4 | Pipeline completa pero no persiste datos estructurados | D |

---

## 2. Arquitectura objetivo (por producto)

```
Para cada producto F4_Px:

  extractor_f4_px  ──→  Extrae datos necesarios de F0/F1/F2/F2.5/F3 + userInputs
        │                Salida: JSON estructurado con los campos del producto
        ↓
  agente_a_px ──┐        Modelo 8B — genera borrador A del producto
                │        inputs_from: [extractor_f4_px]
  agente_b_px ──┤        Modelo 70B — genera borrador B del producto (independiente)
                │        inputs_from: [extractor_f4_px]
                ↓
  juez_px          ──→  Compara A vs B, elige el más completo (campos EC0366)
        │                Si ambos tienen placeholders, elige el menor
        ↓
  validador_px     ──→  CÓDIGO — verifica invariantes específicos del producto
        │                Si pasa: continúa. Si falla: parchea en out[]
        ↓
  sintetizador_final_f4  ──→  CÓDIGO — limpia placeholders, aplica formato, guarda en BD
```

**Nota sobre modelos:**
- Agente A: `@cf/meta/llama-3.1-8b-instruct` (rápido, creativo)
- Agente B: `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (más capaz, referencia)
- Juez: `@cf/meta/llama-3.1-8b-instruct` (evaluación estructurada)
- Sintetizador final: código puro (no LLM)

---

## 3. Plan de implementación por bloques

---

### BLOQUE A — Prompts (8 archivos)

**Objetivo:** Reescribir todos los prompts F4_Px con pipeline_steps completo.

**Orden de implementación:** P7 → P6 → P5 → P4 → P3 → P2 → P1 → P0  
(de menor a mayor complejidad para rodear errores pronto)

#### A.1 — Estructura pipeline_steps estándar por producto

Cada prompt `F4_Px-nombre.md` debe tener esta estructura en su frontmatter:

```yaml
pipeline_steps:
  - agent: extractor_f4_px
    inputs_from: []
    include_template: false
    task: |
      [Tarea específica del producto: qué extraer de context/userInputs]

  - agent: agente_a_px
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f4_px]
    include_template: false
    max_input_chars: 3000
    task: |
      [Instrucciones específicas para generar el borrador A del producto]

  - agent: agente_b_px
    model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
    inputs_from: [extractor_f4_px]
    include_template: false
    max_input_chars: 3000
    task: |
      [Instrucciones para borrador B — perspectiva diferente, misma plantilla EC0366]

  - agent: juez_px
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [agente_a_px, agente_b_px]
    include_template: false
    max_input_chars: 4000
    task: |
      Compara AGENTE_A y AGENTE_B. Elige el borrador con más campos EC0366 completos.
      Devuelve SOLO este JSON:
      {
        "borrador_elegido": "A" | "B",
        "razon": string,
        "campos_faltantes": [string],
        "placeholders_detectados": number
      }
      Regla: si ambos tienen placeholders, elige el de menor conteo.

  - agent: validador_px
    inputs_from: [extractor_f4_px, agente_a_px, agente_b_px, juez_px]

  - agent: sintetizador_final_f4
    inputs_from: [extractor_f4_px, agente_a_px, agente_b_px, juez_px, validador_px]
    include_template: true
    max_input_chars: 6000
    task: |
      [Instrucciones para el sintetizador — tomadas del task del prompt F4_Px original]
```

#### A.2 — Especificaciones de extractor por producto

| Producto | extractor_f4_px extrae | Campos JSON de salida |
|:---|:---|:---|
| **P0** `extractor_f4_p0` | projectName, clientName, módulos F2 (nombre+duración), duración total F3, startDate, instructorName, reviewerName | `{ projectName, clientName, modulos[], duracionTotal, startDate, instructorName, reviewerName }` |
| **P1** `extractor_f4_p1` | objetivoGeneral F1, objetivosParticulares F1 (cognitivo/psicomotriz/afectivo), perfilIngreso F2, perfilEgreso F2, modalidad F2, plataforma F3, scormVersion F3, duracionTotal F3, evaluacion F3 | `{ objetivoGeneral, objetivosParticulares{}, perfilIngreso, perfilEgreso, modalidad, plataforma, scormVersion, duracionTotal, evaluacion }` |
| **P2** `extractor_f4_p2` | módulos F2 (nombre+temas+duración+actividades), actividadesRecomendadas F2.5, criteriosAceptacion F3, reporteoActividades F3 | `{ modulos[]{nombre, temas[], duracion, actividadesRecomendadas[]}, criteriosAceptacion }` |
| **P3** `extractor_f4_p3` | módulos F2 con ponderaciones de P2 (si existe), startDate userInputs, duracionTotal F3 | `{ modulos[], startDate, duracionTotal, semanas[] }` |
| **P4** `extractor_f4_p4` | sector F0, temas principales F2 (1 por módulo), objetivos F1, industria F0 | `{ sector, industria, modulos[]{nombre, temasPrincipales[]}, objetivos[] }` |
| **P5** `extractor_f4_p5` | módulos F2 (nombre+objetivo+temas), contenido P4 si existe | `{ modulos[]{nombre, objetivo, temas[]}, tieneP4: boolean }` |
| **P6** `extractor_f4_p6` | numVideos F2.5, duracionVideo F2.5, módulos F2, plataforma F3, estiloVideo F2.5 | `{ numVideos, duracionVideo, modulos[], plataforma, estiloVideo }` |
| **P7** `extractor_f4_p7` | objetivosBloom F1, módulos F2, criteriosAceptacion F3, nivelesBloom[] | `{ objetivos[], modulos[], criteriosAceptacion[] }` |

#### A.3 — Instrucciones especiales del juez por producto

| Producto | Regla del juez |
|:---|:---|
| **P0** | Elige el que tenga las 4 fases completas (Diseño, Producción, Integración, Revisión) y fechas coherentes |
| **P1** | Elige el que tenga los 3 dominios Bloom explícitos (cognitivo, psicomotriz, afectivo) y las 7 secciones |
| **P2** | Elige el que tenga ≥3 actividades por módulo y la suma de ponderaciones más cercana a 100% |
| **P3** | Elige el que tenga fechas mejor alineadas con la duración total F3 y sin traslapes |
| **P4** | Elige el que tenga documentos más extensos y alineados con los objetivos F1 |
| **P5** | Elige el que tenga ≥8 diapositivas por módulo con la estructura completa |
| **P6** | Elige el que tenga más videos detallados con timecodes y la duración total correcta |
| **P7** | Elige el que tenga los 3 instrumentos completos y la rúbrica con porcentajes que sumen 100% |

---

### BLOQUE B — Backend: handlers de código (`ai.service.ts` + `pipeline.types.ts`)

**Objetivo:** Registrar 16 nuevos agentes de código (8 validadores + sintetizador_final_f4 compartido) y actualizar tipos.

#### B.1 — `pipeline.types.ts`: nuevos agentes

Agregar a la unión `agent` en `PipelineStep`:

```typescript
// F4 extractors (uno por producto)
| 'extractor_f4_p0' | 'extractor_f4_p1' | 'extractor_f4_p2' | 'extractor_f4_p3'
| 'extractor_f4_p4' | 'extractor_f4_p5' | 'extractor_f4_p6' | 'extractor_f4_p7'
// F4 agentes A y B (uno por producto)
| 'agente_a_p0' | 'agente_b_p0'
| 'agente_a_p1' | 'agente_b_p1'
| 'agente_a_p2' | 'agente_b_p2'
| 'agente_a_p3' | 'agente_b_p3'
| 'agente_a_p4' | 'agente_b_p4'
| 'agente_a_p5' | 'agente_b_p5'
| 'agente_a_p6' | 'agente_b_p6'
| 'agente_a_p7' | 'agente_b_p7'
// F4 jueces
| 'juez_p0' | 'juez_p1' | 'juez_p2' | 'juez_p3'
| 'juez_p4' | 'juez_p5' | 'juez_p6' | 'juez_p7'
// F4 validadores (código puro)
| 'validador_p0' | 'validador_p1' | 'validador_p2' | 'validador_p3'
| 'validador_p4' | 'validador_p5' | 'validador_p6' | 'validador_p7'
// F4 sintetizador final (compartido todos los productos)
| 'sintetizador_final_f4'
```

#### B.2 — `ai.service.ts`: handler `validador_pX` (código, no IA)

Insertar 8 handlers antes del bloque `ensamblador`. Cada validador:
1. Lee `out['juez_px']` para saber cuál borrador fue elegido
2. Lee `out['agente_a_px']` y `out['agente_b_px']`
3. Aplica validaciones específicas del producto (ver tabla)
4. Si detecta error: parcha `out['agente_a_px']` o `out['agente_b_px']` en-place
5. Escribe resultado en `out['validador_px']`

**Validaciones por producto:**

```typescript
// validador_p0 — Cronograma
if (step.agent === 'validador_p0') {
  const FASES_REQUERIDAS = ['diseño instruccional', 'producción', 'integración', 'revisión'];
  const borrador = getBorrador(out, 'p0');
  const faltantes = FASES_REQUERIDAS.filter(f => !borrador.toLowerCase().includes(f));
  out['validador_p0'] = JSON.stringify({ ok: faltantes.length === 0, fases_faltantes: faltantes });
  continue;
}

// validador_p1 — Info General
if (step.agent === 'validador_p1') {
  const DOMINIOS = ['cognitivo', 'psicomotriz', 'afectivo'];
  const borrador = getBorrador(out, 'p1');
  const faltantes = DOMINIOS.filter(d => !borrador.toLowerCase().includes(d));
  out['validador_p1'] = JSON.stringify({ ok: faltantes.length === 0, dominios_faltantes: faltantes });
  continue;
}

// validador_p2 — Guías de Actividades
if (step.agent === 'validador_p2') {
  const borrador = getBorrador(out, 'p2');
  // Extraer ponderaciones con regex y sumar
  const ponderaciones = [...borrador.matchAll(/(\d+)\s*%/g)].map(m => parseInt(m[1]));
  const suma = ponderaciones.reduce((a, b) => a + b, 0);
  const ok = suma >= 95 && suma <= 105; // tolerancia ±5%
  if (!ok && suma > 0) {
    // Normalizar: escalar proporcionalmente a 100%
    const factor = 100 / suma;
    const borradorFijo = borrador.replace(/(\d+)\s*%/g, (_, n) => `${Math.round(parseInt(n) * factor)}%`);
    const juezParsed = JSON.parse(out['juez_p2'] || '{}');
    if (juezParsed.borrador_elegido === 'A') out['agente_a_p2'] = borradorFijo;
    else out['agente_b_p2'] = borradorFijo;
  }
  out['validador_p2'] = JSON.stringify({ ok, suma_ponderaciones: suma });
  continue;
}

// validador_p3 — Calendario
if (step.agent === 'validador_p3') {
  // Verificar que hay semanas y fechas
  const borrador = getBorrador(out, 'p3');
  const semanas = (borrador.match(/semana\s+\d+/gi) || []).length;
  out['validador_p3'] = JSON.stringify({ ok: semanas >= 1, semanas_detectadas: semanas });
  continue;
}

// validador_p4 — Documentos de Texto
if (step.agent === 'validador_p4') {
  const borrador = getBorrador(out, 'p4');
  const palabras = borrador.split(/\s+/).length;
  out['validador_p4'] = JSON.stringify({ ok: palabras >= 500, palabras_detectadas: palabras });
  continue;
}

// validador_p5 — Presentación Electrónica
if (step.agent === 'validador_p5') {
  const borrador = getBorrador(out, 'p5');
  const diapositivas = (borrador.match(/diapositiva\s+\d+|slide\s+\d+|\*\*\d+\./gi) || []).length;
  const SECCIONES = ['portada', 'agenda', 'objetivo', 'resumen'];
  const faltantes = SECCIONES.filter(s => !borrador.toLowerCase().includes(s));
  out['validador_p5'] = JSON.stringify({ ok: diapositivas >= 8 && faltantes.length === 0, diapositivas, secciones_faltantes: faltantes });
  continue;
}

// validador_p6 — Guiones Multimedia
if (step.agent === 'validador_p6') {
  const borrador = getBorrador(out, 'p6');
  const videos = (borrador.match(/##\s*video\s+\d+|##\s*guión\s+\d+/gi) || []).length;
  // Extraer numVideos del extractor si está disponible
  let numVideosEsperado = 2;
  try { numVideosEsperado = JSON.parse(out['extractor_f4_p6'] || '{}').numVideos ?? 2; } catch {}
  out['validador_p6'] = JSON.stringify({ ok: videos >= numVideosEsperado, videos_detectados: videos, esperados: numVideosEsperado });
  continue;
}

// validador_p7 — Instrumentos de Evaluación
if (step.agent === 'validador_p7') {
  const borrador = getBorrador(out, 'p7');
  const tieneRubrica = /r[uú]brica/i.test(borrador);
  const tieneCotejo = /cotejo/i.test(borrador);
  const tieneCuestionario = /cuestionario/i.test(borrador);
  const preguntas = (borrador.match(/^\d+\.\s+/gm) || []).length;
  const criterios = (borrador.match(/criterio\s+\d+|\|\s*\d+\s*\|/gi) || []).length;
  // Verificar que los porcentajes de la rúbrica suman 100%
  const porcentajes = [...borrador.matchAll(/(\d+)\s*%/g)].map(m => parseInt(m[1]));
  const sumaRubrica = porcentajes.slice(0, 4).reduce((a, b) => a + b, 0); // primeros 4 = rúbrica
  const ok = tieneRubrica && tieneCotejo && tieneCuestionario && preguntas >= 5 && criterios >= 4;
  out['validador_p7'] = JSON.stringify({ ok, tiene_rubrica: tieneRubrica, tiene_cotejo: tieneCotejo, tiene_cuestionario: tieneCuestionario, preguntas, criterios });
  continue;
}
```

**Helper interno** (agregar al inicio del bloque F4):
```typescript
function getBorrador(out: Record<string, string>, px: string): string {
  let elegido = 'A';
  try { elegido = JSON.parse(out[`juez_${px}`] || '{}').borrador_elegido ?? 'A'; } catch {}
  return elegido === 'A' ? (out[`agente_a_${px}`] ?? '') : (out[`agente_b_${px}`] ?? '');
}
```

#### B.3 — `ai.service.ts`: handler `sintetizador_final_f4` (código, no IA)

Un único handler compartido para todos los productos:

```typescript
if (step.agent === 'sintetizador_final_f4') {
  // Detectar qué producto es según las claves presentes en out[]
  const px = Object.keys(out).find(k => k.startsWith('juez_p'))?.replace('juez_', '') ?? 'p0';
  const juezData = JSON.parse(out[`juez_${px}`] || '{}');
  const elegido = juezData.borrador_elegido ?? 'A';
  let documento = elegido === 'A'
    ? (out[`agente_a_${px}`] ?? '')
    : (out[`agente_b_${px}`] ?? '');

  // 1. Limpiar placeholders residuales [X], [Y], [texto], etc.
  const PLACEHOLDER_RE = /\[[YyNnXx]\](?:\s*min)?|\[(?:texto|nombre|valor|N|X|Y|Por definir)\]/gi;
  documento = documento.replace(PLACEHOLDER_RE, '[Por definir]');

  // 2. Extraer variables del extractor para sustituir valores conocidos
  const extractorData = JSON.parse(out[`extractor_f4_${px}`] || '{}');
  if (extractorData.projectName)
    documento = documento.replace(/\{\{projectName\}\}/g, extractorData.projectName);
  if (extractorData.clientName)
    documento = documento.replace(/\{\{clientName\}\}/g, extractorData.clientName);

  // 3. El resultado es el documento limpio
  out['sintetizador_final_f4'] = documento;
  // El framework toma out['sintetizador_final_f4'] como resultado final del pipeline
  continue;
}
```

---

### BLOQUE C — Base de datos

#### C.1 — Migración `017_create_fase4_productos.sql`

```sql
CREATE TABLE IF NOT EXISTS fase4_productos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID NOT NULL,
    producto            VARCHAR(10) NOT NULL,           -- 'P0'...'P7'
    
    -- Documento final (Markdown)
    documento_final     TEXT,
    
    -- Borradores intermedios (para auditoría)
    borrador_a          TEXT,
    borrador_b          TEXT,
    juez_decision       JSONB,                          -- { borrador_elegido, razon, campos_faltantes }
    
    -- Resultado de validación
    validacion_estado   VARCHAR(20) DEFAULT 'pendiente', -- 'aprobado' | 'revision_humana' | 'pendiente'
    validacion_errores  JSONB,
    
    -- Datos estructurados específicos por producto (JSONB flexible)
    datos_producto      JSONB,
    
    -- Metadatos
    version             INT DEFAULT 1,
    job_id              UUID,                           -- referencia al pipeline_jobs
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    approved_at         TIMESTAMPTZ
);

CREATE INDEX idx_fase4_productos_project ON fase4_productos(project_id);
CREATE INDEX idx_fase4_productos_producto ON fase4_productos(proyecto_id, producto);
CREATE UNIQUE INDEX idx_fase4_unique_producto ON fase4_productos(project_id, producto, version);
```

**Datos estructurados `datos_producto` por producto:**

| Producto | Campos en datos_producto JSONB |
|:---|:---|
| P0 | `{ fases: [], duracion_total_dias: number }` |
| P1 | `{ objetivo_general: string, objetivos_particulares: {cognitivo,psicomotriz,afectivo}, perfil_ingreso: {} }` |
| P2 | `{ actividades_por_modulo: [], suma_ponderaciones: number }` |
| P3 | `{ semanas: [], fecha_inicio: date, fecha_fin: date }` |
| P4 | `{ documentos_por_modulo: [], palabras_totales: number }` |
| P5 | `{ diapositivas_por_modulo: [], total_diapositivas: number }` |
| P6 | `{ videos: [], duracion_total_minutos: number }` |
| P7 | `{ cuestionario: {}, rubrica: {}, lista_cotejo: {}, suma_rubrica: number }` |

#### C.2 — `supabase.service.ts`: nuevo método

```typescript
async saveF4Producto(params: {
  projectId: string;
  producto: string;           // 'P0'..'P7'
  documentoFinal: string;
  borradorA?: string;
  borradorB?: string;
  juezDecision?: object;
  validacionEstado?: string;
  validacionErrores?: object;
  datosProducto?: object;
  jobId?: string;
}): Promise<{ id: string }> {
  const { data, error } = await this.client
    .from('fase4_productos')
    .upsert({
      project_id: params.projectId,
      producto: params.producto,
      documento_final: params.documentoFinal,
      borrador_a: params.borradorA,
      borrador_b: params.borradorB,
      juez_decision: params.juezDecision,
      validacion_estado: params.validacionEstado ?? 'aprobado',
      validacion_errores: params.validacionErrores,
      datos_producto: params.datosProducto,
      job_id: params.jobId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'project_id,producto,version' })
    .select('id')
    .single();
  if (error) throw error;
  return { id: data.id };
}

async getF4Productos(projectId: string): Promise<F4Producto[]> {
  const { data, error } = await this.client
    .from('fase4_productos')
    .select('*')
    .eq('project_id', projectId)
    .order('producto');
  if (error) throw error;
  return data ?? [];
}
```

---

### BLOQUE D — Route handler post-job F4

**Archivo:** `backend/src/dcfl/routes/wizard.route.ts`

En el callback `onComplete` del job (después de que el pipeline termina), agregar:

```typescript
// Bloque existente — después de los bloques F1, F2, F3, F2.5:
if (body.promptId.startsWith('F4_P')) {
  const producto = body.promptId.replace('F4_', ''); // 'P0'..'P7'
  const docFinal = result.content;
  const px = producto.toLowerCase(); // 'p0'..'p7'
  
  await supabase.saveF4Producto({
    projectId: body.projectId,
    producto,
    documentoFinal: docFinal,
    borradorA: agentOutputs[`agente_a_${px}`],
    borradorB: agentOutputs[`agente_b_${px}`],
    juezDecision: (() => { try { return JSON.parse(agentOutputs[`juez_${px}`] ?? '{}'); } catch { return {}; } })(),
    validacionEstado: (() => { try { return JSON.parse(agentOutputs[`validador_${px}`] ?? '{}').ok ? 'aprobado' : 'revision_humana'; } catch { return 'pendiente'; } })(),
    validacionErrores: (() => { try { return JSON.parse(agentOutputs[`validador_${px}`] ?? '{}'); } catch { return null; } })(),
    jobId: jobId,
  });
}
```

También agregar endpoint GET para consultar productos guardados:

```typescript
// GET /wizard/project/:projectId/fase4/productos
server.get('/wizard/project/:projectId/fase4/productos', async (req, reply) => {
  const { projectId } = req.params as { projectId: string };
  const productos = await supabase.getF4Productos(projectId);
  return reply.send({ productos });
});
```

---

### BLOQUE E — Frontend (ajustes menores)

El controller `step4.production.ts` ya funciona correctamente con la arquitectura nueva porque:
- Usa `generate-async` con el `promptId` correcto (F4_P0..F4_P7)
- Recibe el resultado por Supabase Realtime cuando el job completa
- El `content` del job result es el `sintetizador_final_f4` output

**Cambios necesarios:**

1. **Actualizar `PRODUCTS` array** con los nombres EC0366 correctos y referencias al elemento (E1219/E1220)
2. **Mostrar badge de validación** — si `validacion_estado === 'revision_humana'`, mostrar aviso al usuario antes del botón Aprobar
3. **Endpoint GET fase4/productos** — al iniciar el paso, cargar productos ya aprobados (para resumir sesión interrumpida)

---

## 4. Orden de ejecución recomendado

```
Sesión 1 — Fundamentos:
  [B] pipeline.types.ts — nuevos tipos (5 min)
  [C] Migration 017 — tabla fase4_productos (10 min)
  [C] supabase.service.ts — saveF4Producto + getF4Productos (15 min)

Sesión 2 — Backend lógica:
  [B] ai.service.ts — validador_p0..p7 + sintetizador_final_f4 (45 min)
  [D] wizard.route.ts — handler post-job F4 + GET endpoint (20 min)

Sesión 3 — Prompts (más largo):
  [A] F4_P7 — Instrumentos de Evaluación (20 min)
  [A] F4_P6 — Guiones Multimedia (20 min)
  [A] F4_P5 — Presentación Electrónica (20 min)
  [A] F4_P4 — Documentos de Texto (20 min)
  [A] F4_P3 — Calendario (15 min)
  [A] F4_P2 — Guías de Actividades (20 min)
  [A] F4_P1 — Información General (20 min)
  [A] F4_P0 — Cronograma (refactorizar existente) (15 min)

Sesión 4 — Frontend:
  [E] step4.production.ts — badge validación + recarga de sesión (20 min)
```

**Tiempo estimado total:** ~4 horas (sin interrupciones)

---

## 5. Resumen de archivos a modificar/crear

| # | Archivo | Acción | Bloque |
|:---:|:---|:---:|:---:|
| 1 | `backend/src/core/types/pipeline.types.ts` | Modificar — agregar 40 agentes nuevos | B |
| 2 | `backend/src/core/services/ai.service.ts` | Modificar — 9 handlers nuevos (8 validadores + sintetizador_final_f4) | B |
| 3 | `backend/src/core/services/supabase.service.ts` | Modificar — 2 métodos nuevos | C |
| 4 | `backend/supabase/migrations/017_create_fase4_productos.sql` | Crear | C |
| 5 | `backend/src/dcfl/routes/wizard.route.ts` | Modificar — handler post-job + GET endpoint | D |
| 6 | `backend/src/dcfl/prompts/templates/F4_P0-cronograma.md` | Modificar — agregar validador_p0 + sintetizador_final_f4; renombrar agentes | A |
| 7 | `backend/src/dcfl/prompts/templates/F4_P1-info-general.md` | Reescribir — pipeline_steps completo | A |
| 8 | `backend/src/dcfl/prompts/templates/F4_P2-guias-actividades.md` | Reescribir — pipeline_steps completo | A |
| 9 | `backend/src/dcfl/prompts/templates/F4_P3-calendario.md` | Reescribir — pipeline_steps completo | A |
| 10 | `backend/src/dcfl/prompts/templates/F4_P4-documentos-texto.md` | Reescribir — pipeline_steps completo | A |
| 11 | `backend/src/dcfl/prompts/templates/F4_P5-presentacion.md` | Reescribir — pipeline_steps completo | A |
| 12 | `backend/src/dcfl/prompts/templates/F4_P6-guion-video.md` | Reescribir — pipeline_steps completo | A |
| 13 | `backend/src/dcfl/prompts/templates/F4_P7-instrumentos-evaluacion.md` | Reescribir — pipeline_steps completo | A |
| 14 | `frontend/dcfl/src/controllers/step4.production.ts` | Modificar — badge validación + recarga sesión | E |

---

## 6. Dependencias críticas

```
pipeline.types.ts  ──→  ai.service.ts (necesita tipos para compilar)
017 migration      ──→  supabase.service.ts (necesita tabla para insert)
supabase.service   ──→  wizard.route.ts (necesita método save)
ai.service.ts      ──→  prompts (los handlers leen out[agente_a_px] — deben coincidir con agent names del prompt)
```

**Regla importante:** Los nombres de agente en `pipeline_steps[].agent` del prompt DEBEN coincidir exactamente con el `if (step.agent === '...')` del handler en `ai.service.ts`.

---

## 7. Nomenclatura de agentes (tabla definitiva)

| Producto | Extractor | Agente A | Agente B | Juez | Validador | Sin. Final |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| P0 | `extractor_f4_p0` | `agente_a_p0` | `agente_b_p0` | `juez_p0` | `validador_p0` | `sintetizador_final_f4` |
| P1 | `extractor_f4_p1` | `agente_a_p1` | `agente_b_p1` | `juez_p1` | `validador_p1` | `sintetizador_final_f4` |
| P2 | `extractor_f4_p2` | `agente_a_p2` | `agente_b_p2` | `juez_p2` | `validador_p2` | `sintetizador_final_f4` |
| P3 | `extractor_f4_p3` | `agente_a_p3` | `agente_b_p3` | `juez_p3` | `validador_p3` | `sintetizador_final_f4` |
| P4 | `extractor_f4_p4` | `agente_a_p4` | `agente_b_p4` | `juez_p4` | `validador_p4` | `sintetizador_final_f4` |
| P5 | `extractor_f4_p5` | `agente_a_p5` | `agente_b_p5` | `juez_p5` | `validador_p5` | `sintetizador_final_f4` |
| P6 | `extractor_f4_p6` | `agente_a_p6` | `agente_b_p6` | `juez_p6` | `validador_p6` | `sintetizador_final_f4` |
| P7 | `extractor_f4_p7` | `agente_a_p7` | `agente_b_p7` | `juez_p7` | `validador_p7` | `sintetizador_final_f4` |
