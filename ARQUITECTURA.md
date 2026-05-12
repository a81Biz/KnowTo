# KnowTo — Arquitectura y Funcionamiento Completo

> Documento de referencia técnica. Cubre concepto, flujo de datos, código, base de datos e IA.
> Última actualización: 2026-05-12

---

## 1. Qué es KnowTo y para qué sirve

**KnowTo** es una plataforma web de diseño instruccional asistido por IA. Permite a diseñadores instruccionales, expertos en la materia y coordinadores de capacitación crear en horas lo que normalmente toma semanas: el paquete completo de documentos para un curso de formación laboral bajo estándares mexicanos de certificación.

El sistema está construido alrededor del estándar **EC0366-SITTSA** (CONOCER/SEP), que dicta exactamente qué documentos debe entregar un proveedor de capacitación para obtener reconocimiento oficial de competencias. Son 8 entregables —llamados P1 a P8— más una fase de análisis previa. KnowTo automatiza la generación de todos ellos con LLMs.

### Sitios (microsites)

| Subdominio | Microsite | Estándar |
|---|---|---|
| `dcfl.localhost` | **DCFL** — Diseño de Cursos para Formación Laboral | EC0366 (CONOCER) |
| `cce.localhost` | **CCE** — Consultoría y Coaching Empresarial | EC0249 |
| `localhost` | Portal raíz (landing + login) | — |

Cada microsite es independiente en frontend y lógica de negocio, pero comparten el mismo servidor backend, la misma instancia de Supabase y el mismo motor de LLM.

---

## 2. Arquitectura general del sistema

```
Browser
  ├── dcfl.localhost  → Vite SPA (frontend/dcfl, puerto 5173)
  ├── cce.localhost   → Vite SPA (frontend/cce, puerto 5175)
  └── localhost       → Vite SPA (frontend/root, puerto 5174)
         │
         │  (todas las APIs van a api.localhost)
         ▼
nginx (puerto 80)
  └── api.localhost   → Backend Hono (puerto 8787)
                            ├── /dcfl/*  → Router DCFL
                            └── /cce/*   → Router CCE
                                    │
                     ┌──────────────┼────────────────┐
                     ▼              ▼                 ▼
              Supabase DB      Ollama (dev)       Tavily API
              (PostgreSQL)    Cloudflare AI (prod) (búsqueda web)
```

**En desarrollo:** todo corre en Docker (`docker compose up`). Ollama provee LLM local con modelos descargados. Supabase corre como stack propio (Kong, GoTrue, PostgreSQL, Realtime).

**En producción:** Backend se despliega en Cloudflare Workers. LLM via Cloudflare Workers AI. Supabase cloud.

---

## 3. Backend — Estructura del código

### 3.1 Punto de entrada: `backend/src/index.ts`

El servidor usa **Hono**, un framework HTTP ultraligero compatible con Cloudflare Workers. Al arrancar:

1. Configura CORS dinámico (dev: acepta `*.localhost`, `127.0.0.1`; prod: mismo apex domain)
2. Registra middleware global: logger, CORS, error handler
3. Monta los routers de cada microsite bajo su prefijo:
   - `/dcfl/*` → `dcfl/router.ts`
   - `/cce/*` → `cce/router.ts`
4. Expone `/health`, `/openapi.json` y `/docs` (Scalar UI)

**Autenticación:** Bearer token. En dev acepta el token `dev-local-bypass` sin verificar. En prod valida el JWT de Supabase (Google OAuth).

### 3.2 Router DCFL: `backend/src/dcfl/router.ts`

Al arrancar, el router:

1. Lee y parsea `src/dcfl/prompts/flow-map.yaml` — el mapa de todos los pipelines
2. Construye el objeto `SiteConfig` con `site_id: 'dcfl'` y el mapa parseado
3. Registra rutas:
   - `POST /dcfl/wizard/generate` — generar documento (síncrono, legacy)
   - `POST /dcfl/wizard/generate-async` — generar documento (asíncrono, estándar actual)
   - `GET  /dcfl/wizard/job/:jobId` — consultar estado de un job
   - `GET  /dcfl/wizard/projects` — listar proyectos del usuario
   - `GET  /dcfl/wizard/project/:id` — obtener proyecto
   - `GET  /dcfl/api/form-schema/:projectId/:producto` — obtener schema de formulario
   - `POST /dcfl/api/form-schema/:projectId/:producto` — guardar valores del formulario
   - `GET  /dcfl/wizard/project/:id/fase4/productos` — documentos F4 generados

### 3.3 Estructura de carpetas del backend

```
backend/src/
  index.ts                         — Servidor Hono, CORS, middleware
  dcfl/
    router.ts                      — Router DCFL, carga flow-map.yaml
    prompts/
      flow-map.yaml                — Definición de todos los pipelines
      templates/                   — Un .md por fase/producto (ver sección 7)
    handlers/
      document.handlers.ts         — Endpoints /generate, /generate-async, /job/:id
      helpers/
        pipeline-router.helper.ts  — Gateway que enruta outputs de agentes a handlers
        osint.helper.ts            — Enriquecimiento con búsqueda web (Tavily)
      phases/
        f0.phase.ts                — Lógica de ensamblado F0
        f1.phase.ts                — Lógica de ensamblado F1
        f2.phase.ts                — Lógica de ensamblado F2 y F2.5
        f3.phase.ts                — Lógica de ensamblado F3
        f4.phase.ts                — Dispatcher de productos P1-P8
        products/
          product.types.ts         — Tipos compartidos (ProductContext)
          p1-document.assembler.ts
          p2-document.assembler.ts
          p3-document.assembler.ts
          p4-document.assembler.ts
          p5-document.assembler.ts
          p6-document.assembler.ts
          p7-document.assembler.ts
          p8-document.assembler.ts
  core/
    services/
      ai.service.ts                — Servicio AI unificado (detecta pipeline vs legacy)
      pipeline-orchestrator.service.ts — Orquestador multi-agente (si se usa con flow-map)
      llm.provider.ts              — Interfaz ILLMProvider (Ollama / Cloudflare AI)
      supabase.service.ts          — Cliente Supabase + todos los métodos de persistencia
      web-search.service.ts        — Cliente Tavily para búsqueda web OSINT
```

---

## 4. El flujo de un pipeline — De clic a documento

Cuando el usuario hace clic en "Generar" en cualquier fase:

```
[1] Frontend POST /dcfl/wizard/generate-async
    {projectId, stepId, phaseId, promptId, context, userInputs}
        │
        ▼
[2] document.handlers.ts → handleGenerateAsync()
    ├─ Crea job en pipeline_jobs (status='pending')
    ├─ Responde 202 Accepted con {jobId}
    └─ Lanza runPipelineAsync() en background
        │
        ▼
[3] runPipelineAsync()
    ├─ Marca job como 'running'
    ├─ Carga contexto histórico de BD (outputs de fases anteriores)
    │   F0: sin contexto previo
    │   F1: inyecta f0_estructurado + preguntas_respuestas
    │   F2: inyecta f0 + f1
    │   F3: inyecta f2 + f2_5
    │   F4: inyecta productos_previos (P1-P6 ya generados)
    ├─ Si es F0 o F4_P4: enriquece con Tavily (búsqueda web)
    └─ Llama AIService.generate({promptId, context, userInputs, callbacks})
        │
        ▼
[4] AIService.generate() — detecta modo
    ├─ Lee prompt de site_prompts en Supabase (metadata + template)
    └─ Si tiene pipeline_steps → MODO PIPELINE
        │
        ▼
[5] Ejecución de agentes (pipeline_steps en orden)
    Para cada agente:
    ├─ Acumula outputs de agentes previos declarados en inputs_from
    ├─ Construye el prompt: template + task del agente + outputs anteriores
    ├─ Llama LLMProvider.generate(prompt, model)
    │   → OllamaProvider en dev (qwen2.5:14b por defecto)
    │   → CloudflareProvider en prod
    ├─ Dispara onAgentOutput callback con (agentName, output)
    └─ onAgentOutput → dispatchAgentEvent() en pipeline-router.helper.ts
        │
        ▼
[6] dispatchAgentEvent() — el gateway
    ├─ Guarda output en pipeline_agent_outputs
    ├─ Si agente es ensamblador de F4 → handleF4Events()
    │   └─ handleDocumentPnAssembler() — lógica TypeScript específica por producto
    │      └─ Lee outputs de agentes previos desde pipeline_agent_outputs
    │      └─ Ensambla documento final (Markdown)
    │      └─ Guarda en fase4_productos
    │      └─ Retorna documentoFinal (string)
    ├─ Si agente es ensamblador de F0/F1/F2/F3 → handleFnEvents()
    │   └─ Procesa JSON del LLM, convierte a Markdown estructurado
    │   └─ Guarda en tabla fase-específica (fase0_estructurado, etc.)
    └─ Si agente es juez → registra decisión
        │
        ▼
[7] Job completado
    ├─ UPDATE pipeline_jobs SET status='completed', result={documentId, content}
    └─ Supabase Realtime publica el UPDATE → Frontend recibe via WebSocket
        │
        ▼
[8] Frontend recibe notificación
    ├─ Via WebSocket (Supabase Realtime): detecta status='completed'
    └─ Fallback polling cada 3s si WebSocket no conecta
    → wizardStore.setStepDocument() → UI se actualiza
```

---

## 5. Patrón de agentes: A vs B → Juez → Ensamblador

El patrón central del sistema para cualquier fase es:

```
userInputs + contexto histórico
    │
    ▼
[extractor]   — JSON puro, sin LLM creativo. Mapea campos del formulario
    │            al vocabulario que esperan los especialistas.
    │
    ├─────────────────────┐
    ▼                     ▼
[agente_A]            [agente_B]      ← corren en paralelo (o secuencial si el modelo no soporta)
 perspectiva A         perspectiva B    Modelo: qwen2.5:14b
    │                     │
    └──────────┬───────────┘
               ▼
           [juez]         — Compara A vs B, elige el mejor.
                            Output: {"seleccion": "A"|"B"|"RECHAZADO", "razon": "..."}
                            Si RECHAZADO → reintento (max 2 veces)
               │
               ▼
        [ensamblador]     — TypeScript puro (no LLM). Lee outputs de agentes anteriores
                            desde pipeline_agent_outputs en Supabase.
                            Aplica invariantes obligatorios (firmas, campos institucionales).
                            Genera documento Markdown final.
                            Guarda en fase4_productos / tabla de fase.
```

**Por qué A y B:** Los LLMs producen resultados variables. Tener dos perspectivas independientes y un juez que elige la mejor garantiza mayor calidad y reduce alucinaciones. El juez tiene criterios de VETO —si ambos producen contenido inválido, los rechaza y fuerza un reintento.

**El ensamblador es TypeScript:** Garantiza invariantes que no pueden quedar al criterio del LLM. Por ejemplo: que la firma del evaluador siempre esté presente, que el estándar EC0366 siempre aparezca en los datos institucionales, que los materiales de actividades sean físicamente posibles.

---

## 6. Fases del flujo DCFL (F0 a F8)

### F0 — Marco de Referencia del Cliente
**Propósito:** Primera fase del wizard. Extrae el contexto del negocio del cliente: sector, competencia a certificar, estándares EC relacionados, brechas detectadas.

**Agentes:**
- `extractor_f0` — mapea el formulario inicial del cliente
- `agente_sector_A` / `agente_sector_B` — analizan sector e industria
- `agente_competencia_A` / `agente_competencia_B` — identifican la competencia EC0366 aplicable
- `agente_brechas_A` / `agente_brechas_B` — detectan brechas de capacitación
- `juez_f0` — elige el mejor análisis
- `sintetizador_final_f0` — ensambla el Marco de Referencia

**Enriquecimiento OSINT:** Antes de llamar a los agentes, el sistema hace búsquedas en Tavily sobre el sector e industria del cliente. Los resultados se inyectan como contexto adicional para los especialistas.

**Persiste en:** `fase0_estructurado`, `fase0_componentes` (preguntas para el cliente), `preguntas_fase` (preguntas que pasan a F1)

### F1 — Informe de Necesidades de Capacitación (INC)
**Propósito:** Diagnóstico formal de brechas. Define objetivos SMART, perfil del participante, indicadores de impacto.

**Contexto recibido de F0:** `f0_estructurado` (sector, competencia, brechas), preguntas respondidas por el cliente.

**Persiste en:** `fase1_informe_necesidades` (diagnóstico, objetivos SMART, perfil del participante)

### F2 — Especificaciones de Análisis y Diseño
**Propósito:** Estructura temática del curso. Define módulos, unidades, modalidad (presencial/virtual/híbrido), perfil de ingreso. Genera el temario oficial.

**Contexto recibido:** `f0_estructurado` + `f1_informe`

**Persiste en:** `fase2_analisis_alcance` (estructura temática con módulos y unidades, decisión del juez)

### F2.5 — Recomendaciones de Producción
**Propósito:** Recomendaciones sobre videos (cantidad, duración), tipos de actividad, métricas de aprendizaje.

**Persiste en:** `fase2_5_recomendaciones`

### F3 — Especificaciones Técnicas
**Propósito:** Define LMS, versión SCORM, formatos multimedia, criterios de aceptación técnica, desglose de horas por módulo.

**Contexto recibido:** `f2_analisis` + `f2_5_recomendaciones`

**Persiste en:** `fase3_especificaciones` (JSONB con 6 categorías técnicas + Markdown del documento)

### F4 — Producción (8 Productos)
**Propósito:** Genera los 8 entregables obligatorios del EC0366. Cada producto tiene su propio pipeline de 2 pasos:
1. **Form Schema** — genera el formulario dinámico que el usuario llena
2. **Generate Document** — genera el documento final con los datos del formulario

Los productos se generan **por módulo** (excepto P4 que genera todos los capítulos en un solo job). El frontend lanza un job por módulo y cuando todos completan, llama `_loadProductsFromBD` para mostrar el documento consolidado.

| Producto | Nombre | Assembler | Acumula por módulo |
|---|---|---|---|
| P1 | Instrumentos de Evaluación | `handleDocumentP1Assembler` | No (único por proyecto) |
| P2 | Presentación Electrónica del Facilitador | `handleDocumentP2Assembler` | Sí |
| P3 | Guiones Multimedia (Paquete de Producción) | `handleDocumentP3Assembler` | Sí |
| P4 | Manual del Participante | `handleDocumentP4Assembler` | No (todos los cap. en 1 job) |
| P5 | Guías de Actividades del Instructor | `handleDocumentP5Assembler` | Sí |
| P6 | Calendario General del Curso | `handleDocumentP6Assembler` | Sí |
| P7 | Ficha Técnica del Programa | `handleDocumentP7Assembler` | Sí (por tema) |
| P8 | Cronograma de Desarrollo del Proyecto | `handleDocumentP8Assembler` | Sí |

**Contexto de productos previos:** P5 lee P6 para validar duración de actividades vs slot del calendario. P6 lee P8 para inyectar el lugar de impartición. P8 lee P6 para obtener fechas de sesión.

### F5 — Verificación de Calidad
**Propósito:** Lista de verificación técnica y pedagógica. Valida que todos los entregables cumplen requisitos EC0366.

### F6 — Ajustes y Cierre
**Propósito:** Ajustes post-revisión, inventario final, firmas y declaración de cumplimiento.

---

## 7. Templates de prompts

Cada fase y cada producto tiene uno o más archivos `.md` en `backend/src/dcfl/prompts/templates/`. El formato es:

```markdown
---
id: F4_P5_GENERATE_DOCUMENT
name: Generador de Guías de Actividades
version: 4.0.0
tags: [EC0366, actividades, rúbrica, json-structured]
pipeline_steps:
  - agent: extractor_p5
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      [instrucciones específicas del extractor]
  - agent: agente_actividad_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_p5]
    task: |
      [instrucciones del especialista A]
  ...
---

# Contenido del template (contexto adicional para los agentes)
```

El frontmatter YAML define la cadena de agentes. El cuerpo Markdown es contexto adicional que se adjunta al prompt de cada agente que tenga `include_template: true`.

**Variables disponibles en tasks:**
- `{campo_del_extractor}` — cualquier campo del JSON que produjo el extractor
- `{nombre_modulo}`, `{modulo_actual}` — datos del módulo actual

**Lista completa de templates:**

| Template | Descripción |
|---|---|
| `F0-marco-referencia.md` | Marco de referencia (11 agentes) |
| `F1-informe-necesidades.md` | INC — diagnóstico y objetivos |
| `F2-estructuracion-temario.md` | Temario y estructura modular |
| `F2_5-recomendaciones.md` | Recomendaciones de producción |
| `F3-especificaciones-tecnicas.md` | Especificaciones técnicas |
| `F4_P1_FORM_SCHEMA.md` | Formulario para instrumentos P1 |
| `F4_P1_GENERATE_DOCUMENT.md` | Generador de instrumentos P1 |
| `F4_P2_FORM_SCHEMA.md` | Formulario para presentación P2 |
| `F4_P2_GENERATE_DOCUMENT.md` | Generador de presentación P2 |
| `F4_P3_FORM_SCHEMA.md` | Formulario para guiones P3 |
| `F4_P3_GENERATE_DOCUMENT.md` | Generador de guiones P3 |
| `F4_P3_ORCHESTRATOR.md` | Orquestador multi-módulo P3 |
| `F4_P4_FORM_SCHEMA.md` | Formulario para manual P4 |
| `F4_P4_GENERATE_DOCUMENT.md` | Generador de manual P4 |
| `F4_P5_FORM_SCHEMA.md` | Formulario para actividades P5 |
| `F4_P5_GENERATE_DOCUMENT.md` | Generador de actividades P5 |
| `F4_P6_FORM_SCHEMA.md` | Formulario para calendario P6 |
| `F4_P6_GENERATE_DOCUMENT.md` | Generador de calendario P6 |
| `F4_P7_FORM_SCHEMA.md` | Formulario para ficha técnica P7 |
| `F4_P7_GENERATE_DOCUMENT.md` | Generador de ficha técnica P7 |
| `F4_P8_FORM_SCHEMA.md` | Formulario para cronograma P8 |
| `F4_P8_GENERATE_DOCUMENT.md` | Generador de cronograma P8 |
| `F5-verificacion.md` | Lista de verificación |
| `F6-ajustes.md` | Ajustes y cierre |
| `EXTRACTOR.md` | Template genérico de extractor |

---

## 8. Servicios core

### 8.1 AIService — `backend/src/core/services/ai.service.ts`

El servicio central de IA. Abstrae el mecanismo de generación:

```typescript
class AIService {
  // Modo automático: detecta si el prompt tiene pipeline_steps o no
  async generate(options: GenerateOptions): Promise<string>

  // Llamada directa a un agente (usada internamente por p4-assembler)
  async runAgent(promptText: string, model: string, systemPrompt: string): Promise<string>
}
```

**Detección de modo:**
- Si el prompt de `site_prompts` tiene `metadata.pipeline_steps` → **Modo Pipeline** (multi-agente)
- Si no → **Modo Legacy** (generación directa, monoprompt)

**Modo Pipeline — ejecución de agentes:**

Para cada step en `pipeline_steps`:
1. Acumula los outputs de los agentes en `inputs_from` (leídos de `pipeline_agent_outputs` vía callback `getAgentOutput`)
2. Construye el prompt del agente: `task + outputs_anteriores + [template si include_template=true]`
3. Llama `LLMProvider.generate(prompt, model)`
4. Dispara `onAgentOutput(agentName, rawOutput)` — el callback que hace toda la persistencia
5. Si el agente es un ensamblador (nombre empieza con `ensamblador_` o `sintetizador_final_`) → captura el string retornado y lo re-guarda en `pipeline_agent_outputs` como output del agente

**Gestión de contexto:**
- **Extractor** (inputs_from vacío): recibe contexto completo + userInputs
- **Especialistas y jueces**: reciben contexto base (sin userInputs, ya extraídos)
- **Pipelines F4**: excluyen `fase3` y `productos_previos` del contexto inyectado al extractor (para no saturar el prompt; los assemblers los leen directamente del event)

**Judge veto-retry:**
Si el juez produce `"seleccion": "RECHAZADO"`, el AIService reintenta los agentes especialistas y el juez (máximo 2 reintentos). Si persiste RECHAZADO, usa el agente A como fallback.

### 8.2 LLMProvider — `backend/src/core/services/llm.provider.ts`

**Interfaz:**
```typescript
interface ILLMProvider {
  generate(prompt: string, model?: string, systemPrompt?: string): Promise<string>
  generateVision(prompt: string, imageBase64: string, mimeType: string): Promise<string>
  chat(prompt: string, tools?: Tool[], systemPrompt?: string): Promise<ChatResponse>
}
```

**OllamaProvider (desarrollo):**
- Endpoint: `http://ollama:11434/api/generate`
- Timeout: 15 minutos (para modelos grandes)
- Modelo por defecto: `qwen2.5:14b`
- Mapea modelos de producción a locales: `@cf/meta/llama-3-8b-instruct` → `qwen2.5:14b`

**CloudflareProvider (producción):**
- Usa `env.AI.run()` de Cloudflare Workers AI
- Modelo por defecto: `@cf/meta/llama-3-8b-instruct`
- Visión: `@cf/meta/llama-3.2-11b-vision-instruct`

### 8.3 SupabaseService — `backend/src/core/services/supabase.service.ts`

Clase base con el cliente Supabase (service role key, bypasa RLS). Métodos clave:

```typescript
// Proyectos
getUserProjects(userId)
getProject(projectId)
createProject({userId, name, clientName, ...})

// Contexto de fases
getProjectContext(projectId)           // Fetch todo el proyecto + steps
getFase0Estructurado(projectId)
getF1Informe(projectId)
getF2Analisis(projectId)
getF2_5Recomendaciones(projectId)
getF3Especificaciones(projectId)

// Persistencia de fases
saveFase0Estructurado({projectId, jobId, sector, competencia, brechas, ...})
saveFase0Componentes({projectId, jobId, preguntas})
saveF1Informe({projectId, jobId, diagnostico, objetivos, perfil})
saveF2Analisis({projectId, jobId, estructuraTematica, decisionJuez})
saveF3Especificaciones({projectId, jobId, plataforma, reporteo, ...})

// F4 Productos
getF4Productos(projectId)
saveF4Producto({projectId, producto, documentoFinal, borradorA, borradorB,
                validacionEstado, jobId, validacionErrores, datosProducto})

// Jobs
createJob({siteId, projectId, phaseId, promptId})
startJob(jobId)
completeJob(jobId, result)
failJob(jobId, error)
updateJobProgress(jobId, {currentStep, progress})
getJob(jobId)

// Pipeline outputs (por agente)
saveAgentOutput(jobId, agentName, output)
getAgentOutput(jobId, agentName)
```

### 8.4 WebSearchService — `backend/src/core/services/web-search.service.ts`

Usa **Tavily API** (motor de búsqueda optimizado para LLMs):

```typescript
async search(query: string, options?: {
  maxResults?: number,           // default 5
  searchDepth?: 'basic' | 'advanced',
  includeDomains?: string[],
  excludeDomains?: string[]
}): Promise<{results: TavilyResult[]}>

// Método específico para unidades del manual P4
async searchUnitTopic(unitName: string, projectName: string): Promise<SearchResult>
```

Se usa en:
- **F0:** enriquece el contexto con datos de mercado del sector del cliente
- **F4 P4:** busca información técnica para cada capítulo del manual del participante

### 8.5 PipelineRouterHelper — `backend/src/dcfl/helpers/pipeline-router.helper.ts`

El **gateway** entre el AIService y los handlers de fase. Cuando un agente produce output, `dispatchAgentEvent()` decide qué hacer:

```
dispatchAgentEvent(agentName, output, jobId, ...)
  │
  ├─ [Siempre] saveAgentOutput(jobId, agentName, output) → pipeline_agent_outputs
  │
  ├─ Si agentName empieza con "ensamblador_doc_" o "sintetizador_final_" o "validador_"
  │   → handleF4Events() — busca en productHandlers el assembler TS correspondiente
  │      Mapa: ensamblador_doc_p1 → handleDocumentP1Assembler, etc.
  │      El assembler retorna documentoFinal (string)
  │      saveAgentOutput(jobId, agentName, documentoFinal) ← re-guarda el resultado
  │
  ├─ Si agentName coincide con patrón de F0 → handleF0Events()
  ├─ Si agentName coincide con patrón de F1 → handleF1Events()
  ├─ Si agentName coincide con patrón de F2/F2.5 → handleF2Events()
  └─ Si agentName coincide con patrón de F3 → handleF3Events()
```

**Regla crítica:** El nombre del agente en el template YAML **debe coincidir exactamente** con la clave en `productHandlers` de `f4.phase.ts`. Si no coincide, el assembler nunca se llama y el producto no se guarda.

---

## 9. Base de datos — Tablas completas

### Tablas de sistema

| Tabla | Descripción |
|---|---|
| `projects` | Proyectos de usuarios (id, user_id, name, client_name, sector, status, current_step) |
| `wizard_steps` | Pasos del wizard por proyecto (step_number, status, input_data) |
| `documents` | Documentos generados (phase_id, title, content en Markdown) |
| `pipeline_jobs` | Jobs de generación (status, result, error, progress). **Realtime habilitado.** |
| `pipeline_agent_outputs` | Output texto de cada agente por job (job_id, agent_name, output) |
| `site_prompts` | Todos los templates de prompts (site_id, prompt_id, content, metadata JSONB) |

### Tablas de fases DCFL

| Tabla | Fase | Contenido |
|---|---|---|
| `fase0_estructurado` | F0 | sector, competencia, ec_relacionados, brechas, documento_final |
| `fase0_componentes` | F0 | preguntas generadas para el cliente (JSONB array) |
| `preguntas_fase` | F0→F1 | Preguntas que pasan entre fases |
| `fase1_informe_necesidades` | F1 | diagnostico_brechas, objetivos_smart, perfil_participante |
| `fase2_analisis_alcance` | F2 | estructura_tematica (módulos y unidades), decision_juez |
| `f2_jueces_decisiones` | F2 | Decisiones del juez por iteración |
| `fase2_5_recomendaciones` | F2.5 | total_videos, duracion, estructura_videos, actividades, metricas |
| `fase3_especificaciones` | F3 | plataforma_navegador, reporteo, formatos_multimedia, navegacion_identidad, criterios_aceptacion, calculo_duracion, documento_final |

### Tablas de producción F4

| Tabla | Descripción |
|---|---|
| `fase4_productos` | Documentos generados de P1-P8. Un registro por producto (el assembler hace DELETE + INSERT al guardar). Columnas: `producto`, `documento_final`, `datos_producto` (JSONB), `validacion_estado` (VARCHAR 30) |
| `producto_form_schemas` | Schemas de formulario por producto. `schema_json` contiene los fields. `valores_usuario` queda null (los valores van en `event.body.userInputs`). |

### Notas sobre `validacion_estado`

Valores posibles en `fase4_productos.validacion_estado`:
- `'pendiente'` — generado pero sin validar
- `'aprobado'` — sin errores de validación
- `'aprobado_con_errores'` — generado con advertencias (ej: palabras prohibidas detectadas)
- `'aprobado_por_fallback'` — el juez rechazó ambos agentes; se usó agente A como fallback
- `'rechazado'` — falló la validación crítica

### Realtime

`pipeline_jobs` tiene **Realtime habilitado** en Supabase. Cuando el backend hace `UPDATE pipeline_jobs SET status='completed'`, Supabase publica el cambio via WebSocket. El frontend está subscrito con `supabase.channel().on('postgres_changes', ...)`.

---

## 10. Frontend DCFL

### Tecnología

- **Framework:** Vite + (React o Vue — ver `frontend/dcfl/src/`)
- **Estado:** `wizardStore` (singleton con patrón observer)
- **Comunicación:** Fetch API + Supabase JS Client (Realtime)
- **Supabase URL en frontend:** `http://localhost:54321` (Kong local)

### Páginas principales

- `/` — Landing y login
- `/wizard` — El wizard de diseño instruccional (steps F0 a F6)
- `/wizard/step/:n` — Cada paso del wizard
- `/wizard/project/:id/production` — Fase de producción F4 (productos P1-P8)

### Detección de finalización de job

El frontend usa una estrategia dual:

**Canal primario — WebSocket (Supabase Realtime):**
```typescript
supabase
  .channel('job-' + jobId)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'pipeline_jobs',
    filter: `id=eq.${jobId}`
  }, (payload) => {
    if (payload.new.status === 'completed') onComplete(payload.new.result)
    if (payload.new.status === 'failed')    onError(payload.new.error)
    if (payload.new.progress)              onUpdate(payload.new)
  })
  .subscribe()
```

**Canal de respaldo — HTTP Polling:**
Si el WebSocket no conecta en 8 segundos, activa polling cada 3 segundos a `GET /dcfl/wizard/job/:jobId`. Timeout máximo: 20 minutos.

**Actualizaciones de progreso:**
Mientras el job corre, el backend llama `onProgress({currentStep, stepIndex, totalSteps})` por cada agente completado. El frontend muestra el agente actual y el porcentaje de avance.

### Flujo de formularios dinámicos F4

Los formularios de los productos P1-P8 no son estáticos. Son generados por IA:

```
1. Usuario hace clic en producto Pn
2. Frontend GET /dcfl/api/form-schema/:projectId/Pn
3. Si no existe → Backend lanza pipeline F4_Pn_FORM_SCHEMA
   (genera los campos del formulario en función del contexto del proyecto)
4. Devuelve {fields: [{name, label, type, suggested_value, ...}, ...]}
5. Frontend renderiza el formulario con los campos y valores sugeridos
6. Usuario edita y hace clic en "Generar"
7. Frontend POST /dcfl/wizard/generate-async
   {promptId: 'F4_Pn_GENERATE_DOCUMENT', userInputs: {campo1: val1, campo2: val2, ...}}
8. Pipeline F4_Pn_GENERATE_DOCUMENT corre y produce el documento final
```

---

## 11. Modelos LLM usados

| Modelo (dev/Ollama) | Modelo (prod/Cloudflare) | Usado en |
|---|---|---|
| `qwen2.5:14b` | `@cf/meta/llama-3.2-3b-instruct` | Todos los agentes de pipeline (extractor, especialistas A/B, juez) |
| `qwen2.5:7b` | `@cf/meta/llama-3-8b-instruct` | Algunos especialistas en flow-map |
| `mistral-7b` | — | Sintetizadores en flow-map |
| `llava` | `@cf/meta/llama-3.2-11b-vision-instruct` | OCR / extracción de imágenes |

**Nota:** En desarrollo, todos los modelos de Cloudflare se mapean a `qwen2.5:14b` local por defecto. La variable `OLLAMA_MODEL` en `.dev.vars` controla el modelo default.

---

## 12. Reglas de ensamblado (Reglas de Hierro)

Los assemblers TypeScript de F4 aplican invariantes que el LLM no puede omitir:

### Invarianza Institucional
Campos que siempre deben aparecer en el documento, sin importar qué genere el LLM:
- **P1:** `addInvariantInstitutionalFields()` inyecta Estándar EC0366-SITTSA, Centro de Evaluación, Fecha de evaluación en los datos generales
- **P1:** `addInvariantSignatureSection()` añade la tabla de firmas del evaluador
- **P5:** `unidad_competencia` siempre se inyecta en la ficha de actividad
- **P5:** `medidas_seguridad` se genera automáticamente cuando los materiales contienen patrones de riesgo (solventes, eléctrico, cortante, etc.)

### Coherencia de Slot
- **P5** lee de P6 el `horario_raw.total_horas` del módulo actual y verifica que la duración de la actividad no lo exceda. Si lo excede, emite un warning de coherencia.
- **P6** guarda `fecha_sesion` en los datos acumulados para que **P8** pueda leerla directamente.

### Filtro de Disonancia
- El juez de P5 veta combinaciones físicamente imposibles de verbo+material (Líquido+Cortar, Sólido+Verter, Digital+Soldar).
- Los agentes de P5 tienen una MATERIAL-ACTION FACTIBILITY MATRIX para auto-detectar estos casos.

---

## 13. Cómo diagnosticar problemas

### Ver productos generados en BD
```bash
docker exec knowto-supabase-db psql -U postgres -d postgres \
  -c "SELECT producto, validacion_estado, created_at FROM fase4_productos ORDER BY created_at DESC LIMIT 10;"
```

### Ver todos los agents outputs de un job
```bash
docker exec knowto-supabase-db psql -U postgres -d postgres \
  -c "SELECT agent_name, LEFT(output,100) FROM pipeline_agent_outputs WHERE job_id='<UUID>' ORDER BY created_at;"
```

### Ver logs del backend en tiempo real
```bash
docker logs knowto-backend 2>&1 | grep -E "p5-assembler|p6-assembler|assembler.*falló|PIPELINE.*falló"
```

### Señales de bug comunes

| Log que aparece | Causa | Fix |
|---|---|---|
| `[PIPELINE] assembler ensamblador_doc_pN falló: Expected property name...` | `JSON.parse` sin try-catch en el assembler | Envolver en try-catch |
| Assembler no aparece en logs pero job completa | Nombre del agente en template no coincide con `productHandlers` | Verificar clave exacta en `f4.phase.ts` |
| `No se encontraron secciones` | Assembler leyendo de fuente incorrecta de datos | Cambiar a `event?.body?.userInputs` |
| Job completa pero `fase4_productos` vacía | `saveF4Produto` nunca se llama (early return antes del save) | Verificar que el early return también persiste |

### Recargar backend tras cambios
```bash
docker compose restart backend
# tsx no tiene hot-reload — siempre requiere restart manual
```

---

## 14. Variables de entorno relevantes

**Archivo:** `backend/.dev.vars` (no commiteado)

| Variable | Descripción |
|---|---|
| `SUPABASE_URL` | URL del Kong proxy local (`http://supabase-kong:8000` desde backend) |
| `SUPABASE_SERVICE_ROLE_KEY` | JWT service role para bypasear RLS |
| `OLLAMA_URL` | URL del servidor Ollama (`http://ollama:11434`) |
| `OLLAMA_MODEL` | Modelo por defecto para dev (`qwen2.5:14b`) |
| `TAVILY_API_KEY` | API key para búsquedas web OSINT |
| `DEV_USER_ID` | UUID del usuario de dev (`00000000-0000-0000-0000-000000000001`) |

---

## 15. URLs locales de desarrollo

| URL | Servicio |
|---|---|
| `http://dcfl.localhost` | Frontend DCFL |
| `http://cce.localhost` | Frontend CCE |
| `http://localhost` | Portal raíz |
| `http://api.localhost/docs` | Swagger UI (Scalar) |
| `http://api.localhost/health` | Health check del API |
| `http://localhost:54321` | Supabase Kong (API gateway para el frontend) |
| `http://localhost:54323` | Supabase Studio (admin UI de la BD) |
| `http://localhost:11434` | Ollama (LLM local) |

---

*KnowTo DCFL — Documentación técnica completa. 2026-05-12.*
