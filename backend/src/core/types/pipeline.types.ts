// src/core/types/pipeline.types.ts
// Tipos compartidos para el sistema de pipelines multi-agente.
// Usado por PipelineOrchestratorService, AIService y los routers de los micrositios.

// ── Flow-map types (configuración estática por microsite) ─────────────────────

export interface FlowMapConfig {
  version: string;
  pipelines: Record<string, Pipeline>;
}

export interface Pipeline {
  description: string;
  stages: Stage[];
}

export interface Stage {
  id: string;
  agent: 'extractor' | 'specialist' | 'judge' | string;
  prompt_id: string;
  inputs?: string[];
  output_guard: string;
  next?: string;
  parallel_with?: string;
  retry_on_reject?: boolean;
  max_retries?: number;
  fallthrough_on_error?: boolean;
}

// ── SiteConfig: configuración inyectada en el orchestrator por microsite ───────

export interface SiteConfig {
  /** Identificador del microsite: 'dcfl', 'cce', etc. */
  site_id: string;
  /** Flow-map parseado (JSON/YAML) específico del estándar */
  flow_map: FlowMapConfig;
}

// ── Tipos del registry de prompts ────────────────────────────────────────────

export interface PipelineStep {
  agent: 'extractor' | 'specialist' | 'specialist_a' | 'specialist_b' | 'synthesizer' | 'judge';
  model?: string;
  task?: string;
  rules?: string[];
  output_schema?: string;
}

export interface PromptMetadata {
  id: string;
  name?: string;
  version?: string;
  tags?: string[];
  type?: string;
  pipeline_steps?: PipelineStep[];
}

export interface PromptEntry {
  metadata: PromptMetadata;
  content: string;
}

// ── Interfaz del registry (implementada por dcfl/cce registry y el unificado) ─

export interface IPromptRegistry {
  /** Obtiene un PromptEntry por su ID */
  get(id: string): PromptEntry;
  /**
   * Renderiza un template string sustituyendo {{variable}} con el mapa de valores.
   * NO recibe un ID — recibe el contenido del template ya resuelto.
   */
  render(template: string, variables: Record<string, string>): string;
}
