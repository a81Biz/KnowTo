# Mapa Completo del Ecosistema DCFL — Fases F y Productos P

---

## 1. La Lista Maestra de Fases

### Fases F — Formularios / Inputs base (el usuario las completa antes de F4)

| Fase | Nombre | Tabla BD | Columnas JSONB clave |
|---|---|---|---|
| **F0** | Marco de Referencia del Cliente | `fase0_estructurado` | `analisis_sector`, `desafios`, `competencia`, `estandares_ec`, `brechas`, `recomendaciones` |
| **F1** | Informe de Necesidades de Capacitación | `fase1_informe_necesidades` | `brechas_competencia`, `objetivos_aprendizaje`, `perfil_participante`, `resultados_esperados` |
| **F2** | Especificaciones de Análisis y Diseño | `fase2_analisis_alcance` | `modalidad`, `interactividad`, `estructura_tematica`, `perfil_ingreso`, `estrategias` |
| **F2.5** | Recomendaciones (paso intermedio) | `fase2_5_recomendaciones` | `estructura_videos`, `actividades`, `metricas`, `total_videos`, `duracion_promedio_minutos` |
| **F3** | Especificaciones Técnicas del Curso | `fase3_especificaciones` | `plataforma_navegador`, `formatos_multimedia`, `calculo_duracion`, `reporteo` |

---

### Productos P — Fase 4 (los 8 entregables EC0366)

Todos van a la misma tabla: `fase4_productos`, diferenciados por la columna `producto`.

| Código | Nombre completo | Datos estructurados en `datos_producto` JSONB |
|---|---|---|
| **P1** | Instrumentos de Evaluación | `{objetivo_general, objetivos_particulares, perfil_ingreso}` |
| **P2** | Presentación Electrónica del Facilitador | `{partes: {modulo_1: {slides, actividades, cierre}, ...}, total_modulos}` |
| **P3** | Guiones Multimedia (Paquete de Producción) | `{partes: {modulo_1: {ficha_tecnica, escaleta, guion_literario, guion_tecnico, storyboard}, ...}, total_modulos}` |
| **P4** | Manual del Participante | `{capitulos: [{unidad, nombre, contenido_md, palabras}]}` |
| **P5** | Guías de Actividades | — |
| **P6** | Calendario General | — |
| **P7** | Documento de Información | — |
| **P8** | Cronograma de Desarrollo | — |

---

## 2. Orden Cronológico de Ejecución

### Fases F (secuencial, cada una alimenta a la siguiente)

```
F0 → F1 → F2 → F2.5 → F3 → F4
```

### Dentro de F4 — orden de ejecución del PRODUCTS array (frontend)

```
P1 → P4 → P3 → P2 → P5 → P6 → P7 → P8
```

> **Nota:** El número del producto (P1, P2…) es el código de negocio EC0366.
> El orden de ejecución (índice 0-7 del array) es distinto: P4 se ejecuta antes que P3 y P2.
> Esto es intencional: P4 (Manual) genera el `datos_producto.capitulos` que P3 y P2 necesitan como contexto.

---

## 3. El Payload de `userInputs` — ¿Quién lo arma y cómo?

### El frontend lo arma antes del POST (step4.production.ts)

El backend **no** va a la BD a traer datos F dentro de `userInputs`. El frontend lo hace directamente antes de lanzar el pipeline.

---

### Para P3 — un POST por módulo

```typescript
// Frontend carga P4.datos_producto.capitulos desde /api/fase4-productos
const p4Capitulo = p4Capitulos.find(c => c.unidad === moduloNum)?.contenido_md || '';

userInputs = {
  guion_unidad_N: valores["guion_unidad_N"],   // texto del form dinámico
  _modulo_actual: moduloNum,                    // número entero
  _nombre_video: "Nombre del módulo",           // extraído del label del campo en schema
  _producto: 'P3',
  p4_capitulo: p4Capitulo,                      // capítulo completo de P4 en Markdown
}
```

**Fuente de `p4_capitulo`:** `fase4_productos.datos_producto.capitulos` (JSONB) — NO el `documento_final` TEXT.

---

### Para P2 — un POST por módulo

```typescript
// Frontend carga P3.datos_producto.partes y P4.datos_producto.capitulos en un solo fetch
const p3ModuloKey = `modulo_${moduloNum}`;
const p3Data = p3Partes[p3ModuloKey] || {};
const p3Guion = [p3Data.guion_literario, p3Data.escaleta]
  .filter(Boolean).join('\n\n');

const p4Capitulo = p4Capitulos.find(c => c.unidad === moduloNum)?.contenido_md || '';

userInputs = {
  presentacion_unidad_N: valores["presentacion_unidad_N"],  // texto del form dinámico
  _modulo_actual: moduloNum,
  _nombre_modulo: "Nombre del módulo",
  _producto: 'P2',
  p3_guion: p3Guion,       // guion_literario + escaleta del módulo correspondiente
  p4_capitulo: p4Capitulo,  // capítulo completo de P4
}
```

**Fuente de `p3_guion`:** `fase4_productos.datos_producto.partes.modulo_N.guion_literario` + `.escaleta` (JSONB) — NO el `documento_final` TEXT.

---

### Para P7 / P8 y algunos FORM_SCHEMA — el backend inyecta en `context`

El backend (document.handlers.ts:209-233) enriquece el **`context`** (no el `userInputs`) con productos anteriores:

```typescript
// Solo para: F4_P7_GENERATE_DOCUMENT, F4_P8_GENERATE_DOCUMENT,
//            F4_P2_FORM_SCHEMA, F4_P3_FORM_SCHEMA, F4_P7_FORM_SCHEMA, F4_P8_FORM_SCHEMA
const prevProducts = await supabase.getF4Productos(body.projectId);
for (const p of prevProducts) {
  if (['P1', 'P2', 'P3', 'P4', 'P5', 'P6'].includes(p.producto) && p.documento_final) {
    productos_previos[p.producto] = p.documento_final;  // ← Aquí SÍ se usa documento_final TEXT
  }
}
context.productos_previos = productos_previos;
```

**Para F7/F8:** se usa `documento_final` (Markdown), no el JSONB.

---

### Para F1 / F2 / F3 — el backend inyecta en `context.previousData`

```typescript
// F1: lee fase0_estructurado (tabla propia)
context.previousData.f0_estructurado = await supabase.getFase0Estructurado(projectId);
context.previousData.preguntas_respuestas_estructuradas = await supabase.getFaseAnswersDetailed(projectId, 1);

// F2: lee fase0_estructurado + fase1_informe_necesidades
context.previousData.f0_estructurado = await supabase.getF0AgentOutputs(projectId);
context.previousData.f1_estructurado = await supabase.getF1Informe(projectId);

// F3: lee fase2_analisis_alcance + fase2_5_recomendaciones
context.previousData.f2_estructurado = await supabase.getF2Analisis(projectId);
context.previousData.f2_5_estructurado = { total_videos, duracion_promedio_video, estructura_videos, ... };
```

---

## 4. Esquema de Base de Datos

### Tabla principal de productos: `fase4_productos`

```sql
CREATE TABLE fase4_productos (
  id                  UUID        PRIMARY KEY,
  project_id          UUID        NOT NULL,
  producto            VARCHAR(10) NOT NULL,          -- 'P1'..'P8'
  documento_final     TEXT,                          -- Markdown ensamblado (legible humano)
  borrador_a          TEXT,                          -- Auditoría
  borrador_b          TEXT,                          -- Auditoría
  juez_decision       JSONB,                         -- {borrador_elegido, razon, campos_faltantes}
  validacion_estado   VARCHAR(20) DEFAULT 'pendiente', -- 'aprobado'|'revision_humana'|'pendiente'
  validacion_errores  JSONB,
  datos_producto      JSONB,                         -- Datos estructurados por producto (ver abajo)
  job_id              UUID,
  version             INT DEFAULT 1,
  created_at          TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ
);

-- Índice único parcial: solo un registro 'aprobado' por proyecto+producto
CREATE UNIQUE INDEX idx_fase4_unique_aprobado
  ON fase4_productos(project_id, producto)
  WHERE validacion_estado = 'aprobado';
```

**Respuesta directa:** el assembler **siempre lee de `datos_producto` JSONB** para acumular entre módulos, nunca del `documento_final`. El `documento_final` es solo el Markdown final para mostrar en pantalla.

---

### Tablas de inputs base (Fases F)

| Tabla | Fase | Qué guarda |
|---|---|---|
| `fase0_estructurado` | F0 | JSONB: analisis_sector, competencia, estandares_ec, recomendaciones |
| `fase1_informe_necesidades` | F1 | JSONB: brechas_competencia, objetivos_aprendizaje, perfil_participante |
| `fase2_analisis_alcance` | F2 | JSONB: modalidad, estructura_tematica (módulos), perfil_ingreso, estrategias |
| `fase2_5_recomendaciones` | F2.5 | JSONB: estructura_videos, total_videos, duracion_promedio_minutos |
| `fase3_especificaciones` | F3 | JSONB: plataforma_navegador, formatos_multimedia, calculo_duracion |
| `fase4_productos` | F4 | `datos_producto` JSONB acumulativo por módulo + `documento_final` TEXT |
| `producto_form_schemas` | F4 forms | Schema JSONB del formulario dinámico + valores_usuario por producto |
| `pipeline_agent_outputs` | Todos | Output crudo de cada agente por job_id+agent_name (UNIQUE) |
| `pipeline_jobs` | Todos | Estado y progreso del job async |
| `wizard_steps` | Todos | input_data JSONB + output_text por step_number |

---

## 5. Generación de Form Schemas — El paso intermedio entre Fases F y Documentos P

### ¿Qué es un form schema?

Antes de que el pipeline de un producto P genere el documento, el usuario debe rellenar un formulario. Ese formulario **no está hardcodeado** — lo genera la IA en tiempo real a partir de los datos de F2 y F3. El resultado se guarda en `producto_form_schemas` y lo que el usuario escribe en `valores_usuario`.

---

### Flujo completo: de Fase F a Documento P

```
F2 (estructura_tematica)  ─┐
F3 (calculo_duracion)     ─┼──► GET /api/form-schema/:projectId/:producto
P4 documento (solo P3)    ─┘          │
                                       ▼
                            Pipeline F4_P{N}_FORM_SCHEMA
                            (extractor_f4 → agente_form_A ‖ agente_form_B → juez_form → ensamblador)
                                       │
                                       ▼
                            producto_form_schemas  (schema_json + valores_sugeridos)
                                       │
                              Usuario edita el formulario en el browser
                                       │
                            POST /api/form-schema/:projectId/:producto
                            (guarda valores_usuario)
                                       │
                                       ▼
                            Frontend arma userInputs desde valores_usuario
                                       │
                            POST /api/dcfl/wizard/generate-async
                            (body: { context, userInputs })
                                       │
                                       ▼
                            Pipeline F4_P{N}_GENERATE_DOCUMENT
                            (extractor → agentes A/B → juez → ensamblador)
                                       │
                                       ▼
                            fase4_productos (documento_final + datos_producto)
```

---

### Estructura del pipeline de form schema (igual para todos los P)

| Agente | Rol | Entrada |
|---|---|---|
| `extractor_f4` | Copia verbatim `fase3.unidades` a JSON estructurado | `context.fase3.unidades` |
| `agente_form_A` | Genera array de campos de formulario (perspectiva A) | output de `extractor_f4` |
| `agente_form_B` | Genera array de campos de formulario (perspectiva B) | output de `extractor_f4` |
| `juez_form` | Elige A o B — `{"seleccion": "A"|"B", "razon": "..."}` | outputs de A y B |
| `ensamblador_form_schema` | Agrega cabecera normativa + campos del ganador → UPSERT en BD | `juez_form` output (lee el ganador de pipeline_agent_outputs) |

---

### Contexto que inyecta la ruta `form-schema.routes.ts` en el `context`

La ruta lee directamente de las tablas F **antes de lanzar el pipeline**:

```typescript
// Desde fase2_analisis_alcance (F2)
context.fase3.unidades = f2.estructura_tematica   // array [{modulo, nombre, objetivo}]

// Desde fase3_especificaciones (F3)
context.fase3.calculo_duracion = f3.calculo_duracion

// Solo para P3: desde fase4_productos (P4 ya generado)
context.productos_previos.P4 = fase4_productos.documento_final  // Markdown completo de P4
```

**Para P7 y P8:** el backend (`document.handlers.ts`) inyecta `context.productos_previos` con los Markdown de P1–P6 al momento de ejecutar el pipeline de FORM_SCHEMA (no en la ruta, sino en el handler).

---

### Lo que genera cada agente de form schema

Todos devuelven un **array de objetos de campo** con esta estructura:

```json
[
  {
    "name": "instrumento_unidad_1",
    "label": "Evaluación: Nombre de la Unidad",
    "type": "textarea",
    "suggested_value": "Instrucción: ...\nReactivos:\n1. ...\n2. ...\nEvidencia: Desempeño"
  }
]
```

El nombre del campo (`name`) usa un prefijo fijo por producto:

| Producto | Prefijo de campo |
|---|---|
| P1 | `instrumento_unidad_N` |
| P2 | `presentacion_unidad_N` |
| P3 | `guion_unidad_N` |
| P4 | `manual_unidad_N` |
| P5 | `actividad_unidad_N` |
| P6 | `sesion_unidad_N` |
| P7 | `informacion_unidad_N` |
| P8 | `cronograma_unidad_N` |

El ensamblador antepone siempre un campo fijo de cabecera normativa (`criterios_evaluacion_global`) generado deterministamente a partir de `unidades`, sin pasar por los agentes.

---

### Tabla `producto_form_schemas`

```sql
CREATE TABLE producto_form_schemas (
  id              UUID  PRIMARY KEY,
  project_id      UUID  NOT NULL,
  producto        TEXT  NOT NULL,                  -- 'P1'..'P8'
  schema_json     JSONB NOT NULL DEFAULT '{"fields":[]}',  -- campos renderizables
  valores_sugeridos JSONB,                          -- contexto del extractor LLM
  valores_usuario JSONB,                            -- lo que el usuario escribió/confirmó
  UNIQUE(project_id, producto)
);
```

El frontend lee `schema_json.fields` para renderizar el formulario, y `valores_usuario` para pre-rellenar con la última sesión del usuario.

---

## 6. Mapa de Dependencias: qué alimenta a cada P

### Form Schema (quién le da contexto al pipeline de formulario)

| Schema | Consume de F | Consume de P previo |
|---|---|---|
| P1 schema | F2 (`estructura_tematica`) | — |
| P2 schema | F2 (`estructura_tematica`), F3 (`calculo_duracion`) | — |
| P3 schema | F2 (`estructura_tematica`), F3 (`calculo_duracion`) | **P4** (`documento_final` Markdown) |
| P4 schema | F2 (`estructura_tematica`), F3 (`calculo_duracion`) | — |
| P5 schema | F2 (`estructura_tematica`) | — |
| P6 schema | F2 (`estructura_tematica`) | — |
| P7 schema | F2 (`estructura_tematica`) | **P1–P6** (`documento_final` Markdown) |
| P8 schema | F2 (`estructura_tematica`), F3 (`calculo_duracion`) | **P1–P6** (`documento_final` Markdown) |

---

### Document (quién le da contexto al pipeline de generación de documento)

| Documento | Consume de F (vía `context`) | Consume de P previo (vía `userInputs`) |
|---|---|---|
| P1 doc | F2 unidades, F3 duración (vía `context.fase3`) | — |
| P4 doc | F2 unidades + OSINT enriquecido (vía `context.fase3`) | — |
| P3 doc | F2 unidades (vía `context.fase3`) | **P4** `datos_producto.capitulos[N].contenido_md` → `userInputs.p4_capitulo` |
| P2 doc | F2 unidades (vía `context.fase3`) | **P4** `datos_producto.capitulos[N].contenido_md` → `userInputs.p4_capitulo`; **P3** `datos_producto.partes.modulo_N.{guion_literario,escaleta}` → `userInputs.p3_guion` |
| P5 doc | F2 unidades (vía `context.fase3`) | — |
| P6 doc | F2 unidades (vía `context.fase3`) | — |
| P7 doc | F2 unidades (vía `context.fase3`) | **P1–P6** `documento_final` Markdown → `context.productos_previos` |
| P8 doc | F2 unidades (vía `context.fase3`) | **P1–P6** `documento_final` Markdown → `context.productos_previos` |

> **Regla clave:** P3 y P2 leen de `datos_producto` JSONB (datos estructurados). P7 y P8 leen de `documento_final` TEXT (Markdown completo). Los schema de P7/P8 también usan `documento_final`.

---

### Orden cronológico completo con dependencias

```
F0 → F1 → F2 → F2.5 → F3
                 │
                 └──► F4 sub-wizard:
                        P1 schema (F2)
                        P1 doc    (F2 + userInputs)
                            │
                        P4 schema (F2, F3)
                        P4 doc    (F2, F3, OSINT + userInputs)
                            │
                        P3 schema (F2, F3, P4.documento_final)
                        P3 doc    (userInputs + P4.datos_producto.capitulos)
                            │
                        P2 schema (F2, F3)
                        P2 doc    (userInputs + P4.datos_producto.capitulos + P3.datos_producto.partes)
                            │
                        P5 schema (F2)
                        P5 doc    (userInputs)
                            │
                        P6 schema (F2)
                        P6 doc    (userInputs)
                            │
                        P7 schema (F2, P1–P6.documento_final)
                        P7 doc    (userInputs + P1–P6.documento_final)
                            │
                        P8 schema (F2, F3, P1–P6.documento_final)
                        P8 doc    (userInputs + P1–P6.documento_final)
```
