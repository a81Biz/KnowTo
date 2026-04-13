// src/cce/types/wizard.types.ts
// Tipos del wizard EC0249 (Consultoría Empresarial)

export type PhaseId =
  | 'INTAKE'
  | 'F0' | 'F0_CLIENT_ANSWERS'
  | 'F1_1' | 'F1_2_FIELDWORK' | 'F1_2'
  | 'F2' | 'F2_5' | 'F3' | 'F4' | 'F5' | 'F5_TEST_REPORT' | 'F6'
  | 'CLOSE';

export type PromptId =
  | 'F0'
  | 'F0_CLIENT_QUESTIONS_FORM'
  | 'F1_1'
  | 'F1_2'
  | 'F1_2_FIELDWORK_SYNTHESIS'
  | 'F2'
  | 'F2_5'
  | 'F3'
  | 'F4'
  | 'F5'
  | 'F5_TEST_REPORT_FORM'
  | 'F6';

export interface ProjectContext {
  projectName: string;
  clientName: string;
  // §1 Identificación
  companyName?: string;
  tradeName?: string;
  mainActivity?: string;
  sector?: string;
  subsector?: string;
  //Crawler
  crawlerData?: string;
  // §2 Ubicación
  city?: string;
  stateRegion?: string;
  hasMultipleSites?: string;
  yearsInOperation?: string;
  isPartOfCorporation?: string;
  // §3 Tamaño
  totalWorkers?: string;
  unionizedWorkers?: string;
  mainDepartments?: string;
  workersByArea?: string;
  // §4 Síntomas
  mainProblem?: string;
  currentSituation?: string;
  symptoms?: string;
  problemStart?: string;
  quantitativeData?: string;
  previousAttempts?: string;
  // §5 Obligaciones STPS
  hasIMSS?: string;
  hasDC2?: string;
  hasMixedCommission?: string;
  hasSTPS?: string;
  recentTraining?: string;
  hasDC3?: string;
  // §6 Recursos
  hasTrainingBudget?: string;
  hasTrainingFacilities?: string;
  hasLMS?: string;
  hasInternalInstructor?: string;
  trainingAvailability?: string;
  // §7 Expectativas
  mainObjective?: string;
  measurableResult?: string;
  timeframe?: string;
  restrictions?: string;
  // §8 Contacto
  contactPosition?: string;
  email?: string;
  phone?: string;
  availableSchedule?: string;
  // §9 Presencia digital (opcional)
  websiteUrl?: string;
  socialMediaUrls?: string;
  mostActiveNetworks?: string;
  reviewProfiles?: string;
  // Contexto acumulado de fases anteriores
  previousData?: Record<string, unknown>;
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

export interface ExtractContextRequest {
  projectId: string;
  extractorId: string;
  sourceDocuments: Record<string, string>;
}

export interface ExtractContextResponse {
  extractorId: string;
  content: string;
  parserUsed: Record<string, boolean>;
  extractedContextId: string;
}

// ── Upload types ─────────────────────────────────────────────────────────────

export interface UploadFileRequest {
  projectId: string;
  instrumentId: string;
  fileName: string;
  mimeType: string;
  base64Content: string;
}

export interface UploadFileResponse {
  fileId: string;
  fileName: string;
  instrumentId: string;
}
