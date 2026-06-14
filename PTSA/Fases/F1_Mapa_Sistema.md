---
ptsa_version: 2.0
motor_version: 4.1
fase: F1
estado: COMPLETADA
ultima_actualizacion: 2026-06-13
confidence: 90
---

# F1 — Mapa del Sistema

## Update U-001 | Timestamp: 2026-06-13 23:20

---

## 1. Diagrama de Flujo de Requests (Mermaid)

```mermaid
flowchart TB
    Browser["Browser\n(dcfl.localhost / cce.localhost)"]
    
    Browser -->|HTTP/WS :80| Nginx["nginx:alpine\n(Reverse Proxy)"]
    
    Nginx -->|dcfl.localhost| FrontendDCFL["frontend-dcfl\nVite :5173"]
    Nginx -->|cce.localhost| FrontendCCE["frontend-cce\nVite :5175"]
    Nginx -->|localhost| FrontendRoot["frontend-root\nVite :5174"]
    Nginx -->|api.localhost| Backend["backend\nHono :8787\n(healthy)"]
    
    Backend -->|/dcfl/*| DCFLRouter["DCFL Router\n(dcfl/router.ts)"]
    Backend -->|/cce/*| CCERouter["CCE Router\n(cce/router.ts)"]
    
    DCFLRouter -->|Pipeline| AIService["AIService\n(core/services/ai.service.ts)"]
    AIService -->|ILLMProvider| LLMProvider["LLMProvider\n(dev: Ollama qwen2.5:14b)\n(prod: CloudflareWorkersAI)"]
    
    AIService -->|onAgentOutput| PhaseGateway["Phase Gateway\n(pipeline-router.helper.ts)"]
    PhaseGateway -->|dispatchByPromptId| F4Phase["f4.phase.ts\n(productHandlers registry)"]
    PhaseGateway -->|F0-F3| PhaseHandlers["f0-f3.phase.ts"]
    
    Backend -->|HTTP internal| SupabaseKong["supabase-kong:8000\n(API Gateway)"]
    
    SupabaseKong --> DB["PostgreSQL 15\n(29 tablas)"]
    SupabaseKong --> Auth["GoTrue Auth"]
    SupabaseKong --> Realtime["Supabase Realtime\n(WebSocket CDC)"]
    SupabaseKong --> PostgREST["PostgREST\n(REST auto-API)"]
    
    Browser -->|WebSocket ws://localhost:54321| SupabaseKong
    
    LLMProvider -->|fetch http| Ollama["Ollama :11434\nqwen2.5:14b\ngemma2:27b"]
    
    style Backend fill:#4CAF50,color:#fff
    style SupabaseKong fill:#3498db,color:#fff
    style AIService fill:#9b59b6,color:#fff
    style F4Phase fill:#e67e22,color:#fff
```

---

## 2. Flujo de Pipeline Multi-Agente (por documento)

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant BE as Backend (Hono)
    participant AI as AIService
    participant LLM as Ollama/CF Workers
    participant DB as PostgreSQL
    participant WS as Supabase Realtime

    FE->>BE: POST /dcfl/wizard/generate-async
    BE->>DB: INSERT pipeline_jobs (status=pending)
    BE-->>FE: 202 { jobId }
    
    Note over BE,DB: Job corre en background
    
    BE->>DB: UPDATE pipeline_jobs (status=running)
    BE->>AI: generate({ promptId, context, userInputs })
    
    AI->>LLM: extractor (TS — no LLM)
    AI->>LLM: agente_A (specialist, qwen2.5:14b)
    AI->>LLM: agente_B (specialist, gemma2:27b)
    AI->>AI: juez (evalúa A vs B, selecciona ganador)
    AI->>AI: validador (TS — invariantes EC0366)
    AI->>AI: sintetizador_final (TS — ensambla documento)
    
    AI-->>BE: onAgentOutput(agentName, output)
    BE->>DB: INSERT pipeline_agent_outputs
    
    Note over BE: Si agente es ensamblador_*
    BE->>BE: Phase Gateway → f4.phase.ts
    BE->>DB: INSERT fase4_productos (documento final)
    
    BE->>DB: UPDATE pipeline_jobs (status=completed)
    DB->>WS: CDC trigger (postgres_changes)
    WS-->>FE: WebSocket notification { jobId, status: completed }
    FE->>BE: GET /dcfl/wizard/project/:id (reload)
```

---

## 3. Mapa de Dependencias de Módulos

```mermaid
graph LR
    subgraph Backend["src/backend/src/"]
        Index["index.ts\n(API Gateway)"]
        
        subgraph Core["core/"]
            AIService["AIService"]
            PipelineOrch["PipelineOrchestratorService"]
            SupabaseCore["BaseSupabaseService"]
            LLMProv["ILLMProvider"]
            ContextEx["ContextExtractorService"]
            WebSearch["WebSearchService"]
            PromptReg["PromptRegistry"]
        end
        
        subgraph DCFL["dcfl/"]
            DCFLRouter["router.ts"]
            DocHandlers["document.handlers.ts"]
            PhaseGateway["pipeline-router.helper.ts"]
            F4Phase["f4.phase.ts"]
            Products["products/\n(8 handlers + 8 assemblers)"]
            FlowMap["flow-map.yaml"]
            Templates["templates/*.md\n(33 archivos)"]
            DCFLSupabase["dcfl/services/supabase.service.ts"]
        end
        
        subgraph CCE["cce/"]
            CCERouter["cce/router.ts"]
            CCESupabase["cce/services/supabase.service.ts"]
        end
    end
    
    Index --> DCFLRouter
    Index --> CCERouter
    DCFLRouter --> DocHandlers
    DocHandlers --> AIService
    DocHandlers --> PhaseGateway
    DocHandlers --> DCFLSupabase
    PhaseGateway --> F4Phase
    F4Phase --> Products
    AIService --> LLMProv
    AIService --> PromptReg
    DCFLSupabase --> SupabaseCore
    CCESupabase --> SupabaseCore
    DocHandlers --> ContextEx
    DocHandlers --> WebSearch
    PromptReg --> Templates
    DCFLRouter --> FlowMap
```

---

## 4. Servicios Core detectados (real vs documentado)

| Servicio | Documentado | Real |
|:---|:---:|:---:|
| AIService | ✅ | ✅ |
| PipelineOrchestratorService | ✅ | ✅ |
| BaseSupabaseService | ✅ | ✅ |
| ContextExtractorService | ✅ | ✅ |
| CrawlerService | ✅ | ✅ |
| UploadService | ✅ | ✅ |
| PromptRegistry | ✅ | ✅ |
| ILLMProvider | ✅ | ✅ |
| **WebSearchService** | ❌ | ✅ (`web-search.service.ts` — usa Tavily API) |
| **PipelineJobsService** | ❌ | ✅ (`pipeline-jobs.service.ts`) |
| **PreguntasService** | ❌ | ✅ (`preguntas.service.ts`) |
| **core/websocket/manager.ts** | ❌ | ✅ (WebSocket manager propio) |

---

## 5. Endpoints reales (verificados via OpenAPI spec)

### DCFL
| Método | Ruta | Documentado |
|:---|:---|:---:|
| GET | `/dcfl/health` | ✅ |
| POST | `/dcfl/wizard/project` | ✅ |
| GET | `/dcfl/wizard/project/:id` | ✅ |
| GET | `/dcfl/wizard/projects` | ✅ |
| POST | `/dcfl/wizard/step` | ✅ |
| POST | `/dcfl/wizard/extract` | ✅ |
| POST | `/dcfl/wizard/generate-async` | ✅ |
| GET | `/dcfl/wizard/job/:jobId` | ✅ |
| POST | `/dcfl/wizard/generate-form` | ✅ |
| GET | `/dcfl/wizard/project/:id/fase1/informe` | ❌ (no en README) |
| GET | `/dcfl/wizard/project/:id/f4-productos` | ❌ (no en README) |
| POST | `/dcfl/test/run-all` | ❌ (test runner interno) |
| DELETE | `/dcfl/test/reset/:projectId` | ❌ (test runner interno) |

**Confidence F1:** 90
