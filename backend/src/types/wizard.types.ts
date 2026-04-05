// src/types/wizard.types.ts

export type PhaseId = 'F0' | 'F1' | 'F2' | 'F3' | 'F4' | 'F5.1' | 'F5.2' | 'F6.1' | 'F6.2' | 'CLOSE';
export type PromptId = 'F0' | 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F5_2' | 'F6' | 'F6_2' | 'EXTRACTOR';

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
