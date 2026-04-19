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
  agent:
    | 'extractor'
    | 'specialist' | 'specialist_a' | 'specialist_b'
    | 'synthesizer' | 'judge'
    | 'seccion_1' | 'seccion_2' | 'seccion_3' | 'seccion_4'
    | 'seccion_5_gaps' | 'seccion_5_preguntas'
    | 'seccion_6' | 'seccion_7'
    | 'ensamblador'
    | 'sintetizador_qa_1_3' | 'sintetizador_qa_4_6' | 'sintetizador_qa_7_9'
    | 'sintetizador_parcial' | 'sintetizador_final'
    | 'diseno_a' | 'diseno_b'
    | 'generador_preguntas_f2'
    // F2 specialized agents
    | 'extractor_f2'
    | 'agente_modalidad_plataforma' | 'agente_interactividad'
    | 'agente_estructura' | 'agente_perfil_ingreso' | 'agente_estrategias_supuestos'
    | 'sintetizador_a_f2' | 'sintetizador_b_f2' | 'juez_f2' | 'sintetizador_final_f2'
    // F3 specialized agents
    | 'extractor_f3'
    | 'agente_plataforma_navegador' | 'agente_reporteo'
    | 'agente_formatos_multimedia' | 'agente_navegacion_identidad'
    | 'agente_criterios_aceptacion' | 'agente_calculo_duracion'
    | 'agente_doble_A_f3' | 'agente_doble_B_f3' | 'agente_juez_f3' | 'sintetizador_final_f3'
    // F2.5 specialized agents
    | 'extractor_f2_5'
    | 'agente_actividades' | 'agente_metricas' | 'agente_videos' | 'agente_referencias'
    | 'agente_doble_A_f2_5' | 'agente_doble_B_f2_5' | 'agente_juez_f2_5' | 'sintetizador_final_f2_5'
    // Validadores (código, sin IA) — verifican integridad antes del sintetizador_final
    | 'validador_f0' | 'validador_f1' | 'validador_f2' | 'validador_f3'
    // F1 code handlers
    | 'qa_tabla_builder'
    // F4 extractores (uno por producto)
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
    // F4 jueces (uno por producto)
    | 'juez_p0' | 'juez_p1' | 'juez_p2' | 'juez_p3'
    | 'juez_p4' | 'juez_p5' | 'juez_p6' | 'juez_p7'
    // F4 validadores (código puro, sin IA)
    | 'validador_p0' | 'validador_p1' | 'validador_p2' | 'validador_p3'
    | 'validador_p4' | 'validador_p5' | 'validador_p6' | 'validador_p7'
    // F4 sintetizador final compartido (código puro, sin IA)
    | 'sintetizador_final_f4'
    | string;
  model?: string;
  task?: string;
  rules?: string[];
  output_schema?: string;
  /**
   * Lista de nombres de agentes cuyos outputs se inyectan en el prompt de este agente.
   * Si se declara (incluso vacío []), el agente usa el handler genérico controlado
   * en lugar del case hardcodeado del switch — esto corrige el bug del synthesizer en F0.
   * Si se omite, el switch usa el case por nombre de agente (retrocompatible).
   */
  inputs_from?: string[];
  /** Límite de caracteres por cada output anterior inyectado. Sin límite si se omite. */
  max_input_chars?: number;
  /**
   * Si false, no inyecta el template completo del prompt al final del agente.
   * Útil para agentes intermedios (extractor, researchers) que no necesitan el formato de salida.
   * Default: true (retrocompatible).
   */
  include_template?: boolean;
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
