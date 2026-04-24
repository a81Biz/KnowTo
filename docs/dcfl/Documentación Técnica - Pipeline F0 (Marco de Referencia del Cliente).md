## Opción: Yo puedo redactar la documentación técnica completa.

Basado en todo lo que hemos construido y depurado, conozco el flujo completo.

---

## Documentación Técnica - Pipeline F0 (Marco de Referencia del Cliente)

### 1. Flujo General

```
Usuario (Frontend) → POST /dcfl/wizard/generate-async → Backend → Pipeline F0 → Documento Final
```

### 2. Diagrama de flujo detallado

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              wizard.route.ts                                        │
│  POST /dcfl/wizard/generate-async                                                  │
│  - Recibe projectId, stepId, phaseId, promptId, context, userInputs               │
│  - Crea job en pipeline_jobs (estado: pending)                                    │
│  - Ejecuta _runPipelineAsync en segundo plano                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         document.handlers.ts                                        │
│                       _runPipelineAsync (Fase 0)                                    │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  PASO 0: Pre-extracción de variables del proyecto                                  │
│  - projectName, industry, courseTopic                                             │
│                                                                                     │
│  PASO 1: Generación de queries (OSINT Dorking)                                     │
│  - LLM: qwen2.5:14b                                                               │
│  - Genera 7 queries: market_size, trends, regulations, certifications,            │
│    competitors, practices, references                                             │
│                                                                                     │
│  PASO 2: Búsquedas paralelas con Tavily                                            │
│  - Promise.all con 7 búsquedas + 1 de desafíos                                    │
│  - Parámetros: searchDepth: "advanced", maxResults: 3, includeAnswer: true       │
│                                                                                     │
│  PASO 3: Extracción estructurada (extractStructured)                               │
│  - Convierte resultados en array de {i, t, u, c, f}                               │
│  - t: título (max 120 chars), u: URL, c: contenido (max 800 chars)                │
│                                                                                     │
│  PASO 4: Enriquecimiento del contexto                                              │
│  - enrichedContext.webSearchResults = { market_size, trends, regulations,         │
│    certifications, competitors, practices, references, challenges }               │
│  - Guarda enrichedContext en pipeline_jobs                                        │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         ai.service.ts                                              │
│                         ai.generate()                                              │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  Lee prompt F0-marco-referencia.md y ejecuta pipeline_steps secuencialmente       │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                    F0-marco-referencia.md (Pipeline Steps)                         │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  Step 1:  extractor_f0 (qwen2.5:14b)                                              │
│           - Extrae projectName, industry, courseTopic del contexto                │
│           - Salida: {"projectName": "...", "industry": "...", "courseTopic": "..."}│
│                                                                                     │
│  Step 2:  agente_sector_A (qwen2.5:14b)                                           │
│           - Extrae tamaño, tendencias, regulaciones, certificaciones, desafíos    │
│           - Fuente: webSearchResults.market_size, trends, regulations,            │
│             certifications, challenges                                            │
│           - Salida: JSON con 9 campos                                             │
│                                                                                     │
│  Step 3:  agente_sector_B (qwen2.5:14b) - misma estructura (perspectiva B)        │
│                                                                                     │
│  Step 4:  juez_sector (gemma2:27b)                                                │
│           - Compara A vs B, elige el más completo                                 │
│           - Salida: {"seleccion": "A" | "B", "razon": "..."}                      │
│                                                                                     │
│  Step 5:  agente_practicas_A (qwen2.5:14b)                                        │
│           - Extrae mejores prácticas de webSearchResults.practices                │
│           - Salida: Array de {practica, descripcion, fuente}                      │
│                                                                                     │
│  Step 6:  agente_practicas_B (qwen2.5:14b) - misma estructura                     │
│                                                                                     │
│  Step 7:  juez_practicas (gemma2:27b)                                             │
│                                                                                     │
│  Step 8:  agente_competencia_A (qwen2.5:14b)                                      │
│           - Extrae cursos competidores de webSearchResults.competitors            │
│           - Salida: Array de {curso, plataforma, precio, alumnos, duracion,       │
│             enfoque, oportunidad}                                                 │
│                                                                                     │
│  Step 9:  agente_competencia_B (qwen2.5:14b) - misma estructura                   │
│                                                                                     │
│  Step 10: juez_competencia (gemma2:27b)                                           │
│                                                                                     │
│  Step 11: agente_estandares_A (qwen2.5:14b)                                       │
│           - Busca EC standards (solo CONOCER, no certificaciones del sector)      │
│           - Salida: Array de {codigo, nombre, proposito, aplicabilidad}           │
│                                                                                     │
│  Step 12: agente_estandares_B (qwen2.5:14b) - misma estructura                    │
│                                                                                     │
│  Step 13: juez_estandares (gemma2:27b)                                            │
│                                                                                     │
│  Step 14: agente_gaps_A (qwen2.5:14b)                                             │
│           - Analiza brechas usando challenges, competitors, practices             │
│           - Salida: {"mejores_practicas": "...", "competencia": "..."}            │
│                                                                                     │
│  Step 15: agente_gaps_B (qwen2.5:14b) - misma estructura                          │
│                                                                                     │
│  Step 16: juez_gaps (gemma2:27b)                                                  │
│                                                                                     │
│  Step 17: agente_preguntas_A (qwen2.5:14b)                                        │
│           - Genera 9 preguntas estratégicas para el cliente                       │
│           - Salida: Array de 9 strings                                            │
│                                                                                     │
│  Step 18: agente_preguntas_B (qwen2.5:14b) - misma estructura                     │
│                                                                                     │
│  Step 19: juez_preguntas (gemma2:27b)                                             │
│                                                                                     │
│  Step 20: agente_recomendaciones_A (qwen2.5:14b)                                  │
│           - Genera 3 recomendaciones accionables en español                       │
│           - Salida: Array de 3 strings                                            │
│                                                                                     │
│  Step 21: agente_recomendaciones_B (qwen2.5:14b) - misma estructura               │
│                                                                                     │
│  Step 22: juez_recomendaciones (gemma2:27b)                                       │
│                                                                                     │
│  Step 23: agente_referencias_A (qwen2.5:14b)                                      │
│           - Extrae referencias bibliográficas de webSearchResults.references      │
│           - Salida: Array de {id, referencia}                                     │
│                                                                                     │
│  Step 24: agente_referencias_B (qwen2.5:14b) - misma estructura                   │
│                                                                                     │
│  Step 25: juez_referencias (gemma2:27b)                                           │
│                                                                                     │
│  Step 26: ensamblador_f0 (qwen2.5:14b) - placeholder (sobrescrito por código)    │
│           - task: "CÓDIGO - El ensamblaje se realiza en wizard.route.ts"          │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         f0.handler.ts                                              │
│                       handleF0Assembler()                                          │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  1. Obtiene outputs de los agentes seleccionados por los jueces                   │
│     - sector: pickSelected('sector') → agente_sector_A o B                        │
│     - practicas: pickSelected('practicas') → agente_practicas_A o B               │
│     - competencia: pickSelected('competencia') → agente_competencia_A o B         │
│     - estandares: pickSelected('estandares') → agente_estandares_A o B            │
│     - gaps: pickSelected('gaps') → agente_gaps_A o B                              │
│     - preguntas: pickSelected('preguntas') → agente_preguntas_A o B               │
│     - recomendaciones: pickSelected('recomendaciones') → agente_recomendaciones_A o B│
│     - referencias: pickSelected('referencias') → agente_referencias_A o B         │
│                                                                                     │
│  2. Normaliza estructuras (sin inventar datos)                                    │
│     - normalizeSector(), normalizeEstandares(), normalizeGaps()                  │
│                                                                                     │
│  3. Obtiene projectName desde BD                                                  │
│                                                                                     │
│  4. Genera documento con buildF0Document()                                        │
│                                                                                     │
│  5. Guarda componentes en fase0_componentes                                       │
│                                                                                     │
│  6. Retorna documento final (sobrescribe output del ensamblador)                  │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         f0-formatter.ts                                           │
│                       buildF0Document()                                           │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  Genera Markdown con 8 secciones:                                                 │
│  1. ANÁLISIS DEL SECTOR/INDUSTRIA (tabla + desafíos)                             │
│  2. MEJORES PRÁCTICAS (tabla)                                                    │
│  3. COMPETENCIA IDENTIFICADA (tabla + análisis de brecha)                         │
│  4. ESTÁNDARES EC RELACIONADOS (tabla)                                           │
│  5. ANÁLISIS DE GAPS INICIALES (2 párrafos)                                      │
│  6. PREGUNTAS PARA EL CLIENTE (lista numerada)                                   │
│  7. RECOMENDACIONES INICIALES (lista numerada)                                   │
│  8. REFERENCIAS (lista numerada)                                                 │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 3. Modelos de IA utilizados

| Rol | Modelo | Proveedor | Uso |
|:---|:---|:---|:---|
| Generador de queries | qwen2.5:14b | Ollama | Genera 7 queries de búsqueda |
| Extractores (A/B) | qwen2.5:14b | Ollama | Extraen datos de resultados web |
| Jueces | gemma2:27b | Ollama | Comparan y seleccionan mejor opción |
| Ensamblador (placeholder) | qwen2.5:14b | Ollama | No se usa (sobrescrito) |

---

### 4. Tablas de base de datos involucradas

| Tabla | Propósito |
|:---|:---|
| `pipeline_jobs` | Estado del job, enriched_context |
| `pipeline_agent_outputs` | Outputs de cada agente |
| `fase0_componentes` | Componentes estructurados del documento F0 |
| `pipeline_job_agents` | (alias de pipeline_agent_outputs) |

---

### 5. Flujo de datos

```
Input del usuario:
{
  projectName: string,
  clientName: string,
  industry?: string,
  courseTopic?: string,
  experienceLevel?: string,
  targetAudience?: string,
  ...
}

                    ↓

Enriched Context:
{
  ...input,
  webSearchResults: {
    market_size: [{i, t, u, c, f}],
    trends: [{i, t, u, c, f}],
    regulations: [{i, t, u, c, f}],
    certifications: [{i, t, u, c, f}],
    competitors: [{i, t, u, c, f}],
    practices: [{i, t, u, c, f}],
    references: [{i, t, u, c, f}],
    challenges: [{i, t, u, c, f}]
  }
}

                    ↓

Agentes A y B (paralelo):
- agente_sector → JSON con 9 campos
- agente_practicas → Array de prácticas
- agente_competencia → Array de competidores
- agente_estandares → Array de EC standards
- agente_gaps → {mejores_practicas, competencia}
- agente_preguntas → Array de 9 strings
- agente_recomendaciones → Array de 3 strings
- agente_referencias → Array de {id, referencia}

                    ↓

Jueces (seleccionan A o B por sección)

                    ↓

Ensamblador (código puro):
- Toma outputs seleccionados
- Normaliza estructuras
- Genera Markdown
- Guarda en BD
```

---

### 6. Archivos clave y sus responsabilidades

| Archivo | Responsabilidad |
|:---|:---|
| `backend/src/dcfl/routes/wizard.route.ts` | Endpoints de la API |
| `backend/src/dcfl/handlers/document.handlers.ts` | Generación de queries, búsqueda Tavily, enriquecimiento |
| `backend/src/dcfl/handlers/f0.handler.ts` | Ensamblaje final, normalización, guardado |
| `backend/src/dcfl/services/f0-formatter.ts` | Generación del Markdown final |
| `backend/src/dcfl/prompts/templates/F0-marco-referencia.md` | Pipeline steps y prompts de agentes |
| `backend/src/core/services/ai.service.ts` | Motor de ejecución de agentes |
| `backend/src/core/services/web-search.service.ts` | Cliente Tavily |

---

### 7. Variables de entorno requeridas

```env
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=qwen2.5:14b
TAVILY_API_KEY=tvly-xxx
```

---

**¿Necesitas que profundice en alguna sección específica o que genere el diagrama en algún formato particular?**