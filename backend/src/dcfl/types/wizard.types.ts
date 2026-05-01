// src/dcfl/types/wizard.types.ts

export type PhaseId = 'F0' | 'F1' | 'F2' | 'F2.5' | 'F3' | 'F4' | 'F5.1' | 'F5.2' | 'F6.1' | 'F6.2a' | 'F6.2b' | 'CLOSE';
export type PromptId =
  | 'F0' | 'F1' | 'F2' | 'F2_5' | 'F3'
  | 'F4_P1' | 'F4_P2' | 'F4_P3' | 'F4_P4' | 'F4_P5' | 'F4_P6' | 'F4_P7' | 'F4_P8'
  | 'F4_GENERATE_FORM_SCHEMA'
  | 'F4_P1_GENERATE_DOCUMENT'
  | 'F4_P2_GENERATE_DOCUMENT' | 'F4_P3_GENERATE_DOCUMENT' | 'F4_P4_GENERATE_DOCUMENT'
  | 'F4_P5_GENERATE_DOCUMENT' | 'F4_P6_GENERATE_DOCUMENT' | 'F4_P7_GENERATE_DOCUMENT' | 'F4_P8_GENERATE_DOCUMENT'
  | 'F4_P1_FORM_SCHEMA' | 'F4_P2_FORM_SCHEMA' | 'F4_P3_FORM_SCHEMA' | 'F4_P4_FORM_SCHEMA'
  | 'F4_P5_FORM_SCHEMA' | 'F4_P6_FORM_SCHEMA' | 'F4_P7_FORM_SCHEMA' | 'F4_P8_FORM_SCHEMA'
  | 'F5' | 'F5_2'
  | 'F6' | 'F6_FORM' | 'F6_2a' | 'F6_2b'
  | 'EXTRACTOR'
  // Sub-prompts del pipeline 5-etapas (specialist_a, specialist_b, synthesizer por fase)
  | 'DCFL_F0_SPECIALIST_A' | 'DCFL_F0_SPECIALIST_B' | 'DCFL_F0_SYNTHESIZER'
  | 'DCFL_F1_SPECIALIST_A' | 'DCFL_F1_SPECIALIST_B' | 'DCFL_F1_SYNTHESIZER'
  | 'DCFL_F2_SPECIALIST_A' | 'DCFL_F2_SPECIALIST_B' | 'DCFL_F2_SYNTHESIZER'
  | 'DCFL_F3_SPECIALIST_A' | 'DCFL_F3_SPECIALIST_B' | 'DCFL_F3_SYNTHESIZER'
  | 'DCFL_F4_P0_SPECIALIST_A' | 'DCFL_F4_P0_SPECIALIST_B' | 'DCFL_F4_P0_SYNTHESIZER';

export interface ProjectContext {
  projectName: string;
  clientName: string;
  industry?: string | undefined;
  email?: string | undefined;
  previousData?: Record<string, unknown> | undefined;
}

export interface GenerateDocumentRequest {
  projectId: string;
  stepId: string;
  phaseId: PhaseId;
  promptId: PromptId;
  context: ProjectContext;
  userInputs: Record<string, unknown>;
}

export interface GenerateDocumentResponse {
  success: boolean;
  documentId?: string;
  content?: string;
  error?: string;
}

export interface StepData {
  stepNumber: number;
  phaseId: PhaseId;
  inputData: Record<string, unknown>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// ── Extractor types ──────────────────────────────────────────────────────────

export interface ExtractorSourceField {
  /** ID de la fase fuente (ej: "F0", "F1") */
  phaseId: string;
  /** Clave del campo en flow-map[phaseId].salida (ej: "sector_industria") */
  fieldKey: string;
  /** Encabezado markdown que marca el inicio de la sección */
  header: string;
  /** Patrón regex (string) para localizar la sección en el documento */
  patron: string;
  /** Contenido del documento fuente completo */
  sourceDocument: string;
}

export interface ExtractContextRequest {
  projectId: string;
  /** ID del nodo extractor en el flow-map (ej: "EXTRACTOR_F2") */
  extractorId: string;
  /** Documentos fuente indexados por phaseId */
  sourceDocuments: Record<string, string>;
}

export interface ExtractContextResponse {
  extractorId: string;
  /** Contexto extraído listo para ser enviado al prompt de la siguiente fase */
  content: string;
  /** Indica si se usó el parser (true) o la IA fallback (false) para cada campo */
  parserUsed: Record<string, boolean>;
  extractedContextId: string;
}
