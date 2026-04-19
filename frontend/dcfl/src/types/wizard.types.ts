// src/types/wizard.types.ts
// Tipos completos según FRONTEND ARCHITECTURE DOCUMENT (sección 10)

// ============================================================================
// ENUMS / UNIONS
// ============================================================================
export type PhaseId = 'F0' | 'F1' | 'F2' | 'F2.5' | 'F3' | 'F4' | 'F5.1' | 'F5.2' | 'F6.1' | 'F6.2a' | 'F6.2b' | 'CLOSE';
export type PromptId =
  | 'F0' | 'F1' | 'F2' | 'F2_5' | 'F3'
  | 'F4_P0' | 'F4_P1' | 'F4_P2' | 'F4_P3' | 'F4_P4' | 'F4_P5' | 'F4_P6' | 'F4_P7'
  | 'F5' | 'F5_2'
  | 'F6' | 'F6_FORM' | 'F6_2a' | 'F6_2b';
export type StepStatus = 'pending' | 'processing' | 'completed' | 'error';

// ============================================================================
// STEP
// ============================================================================
export interface WizardStep {
  stepNumber: number;
  phaseId: PhaseId;
  promptId: PromptId | null;
  label: string;
  icon: string;
  status: StepStatus;
  inputData: Record<string, unknown>;
  documentContent?: string;
  documentId?: string;
  stepId?: string;
}

// ============================================================================
// DATOS POR FASE (del FRONTEND ARCHITECTURE DOCUMENT sección 10)
// ============================================================================
export interface ClientData {
  clientName: string;
  projectName: string;
  industry: string;
  email: string;
  courseTopic?: string;
  experienceLevel?: string;
  courseLevel?: string;
  targetAudience?: string;
  expectedOutcome?: string;
  budget?: string;
  courseDuration?: string;
  deadline?: string;
  constraints?: string;
}

export interface GapAnalysisItem {
  behavior: string;
  rootCause: 'knowledge' | 'skill' | 'attitude' | 'process' | 'tool';
  isTrainable: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface SmartObjective {
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timeBound: string;
}

export interface NeedsData {
  confirmedGaps: string;
  expectedResults: string;
  participantProfile: string;
  expectedStudents?: string;
  gapAnalysis?: GapAnalysisItem[];
  smartObjective?: SmartObjective;
}

export interface Module {
  name: string;
  objective: string;
  duration: number;
  topics: string[];
}

export interface Profile {
  minEducation: string;
  priorKnowledge: string[];
  digitalSkills: string[];
  hardware?: string;
  internetSpeed?: string;
  weeklyAvailability: number;
}

export interface AnalysisData {
  modality: 'asynchronous' | 'synchronous' | 'blended' | 'self-paced';
  interactivity: 'low' | 'medium' | 'high';
  mainTopics: string;
  estimatedHours?: number;
  weeklyAvailability?: number;
  minEducation: string;
  priorKnowledge: string;
  digitalSkills?: string;
  modules?: Module[];
  profile?: Profile;
}

export interface ReportingConfig {
  activities: string[];
  frequency: 'daily' | 'weekly' | 'perModule';
  recipients?: string[];
}

export interface DurationCalculation {
  videosCount?: number;
  videoDuration?: number;
  totalHours?: number;
}

export interface SpecsData {
  platform: string;
  platformReason?: string;
  reportingActivities?: string;
  reportFrequency: 'daily' | 'weekly' | 'perModule';
  videosCount?: number;
  videoDuration?: number;
  reporting?: ReportingConfig;
  duration?: DurationCalculation;
}

export interface ProductionData {
  productionNotes?: string;
  startDate?: string;
  instructorName?: string;
  reviewerName?: string;
  // Productos generados por IA (indexados por número 0-7)
  products?: Record<number, { content: string; documentId: string; approved: boolean }>;
  currentProductIndex?: number;
}

// Formulario dinámico generado por IA para F6
export interface DynamicFormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number';
  placeholder?: string;
  required: boolean;
  helpText?: string;
  options?: Array<{ value: string; label: string }>;
}

export interface DynamicFormSchema {
  formTitle: string;
  description: string;
  fields: DynamicFormField[];
}

export interface ChecklistItem {
  id: string;
  category: string;
  description: string;
  completed: boolean;
  observation?: string;
}

export interface ChecklistData {
  notes?: string;
  items?: ChecklistItem[];
  lastUpdated?: string;
}

export interface ScreenshotEvidence {
  code: string;
  description: string;
  url?: string;
  taken: boolean;
}

export interface EvidenceData {
  notes?: string;
  screenshots?: ScreenshotEvidence[];
  lmsPlatform?: string;
  testDate?: string;
}

export interface Observation {
  id: string;
  type: 'design' | 'content' | 'functionality';
  unit: string;
  description: string;
  proposal: string;
  priority: 'critical' | 'major' | 'minor';
  status: 'pending' | 'corrected' | 'rejected';
  correctionDate?: string;
}

export interface AdjustmentsData {
  notes?: string;
  observations?: Observation[];
  summary?: { corrected: number; pending: number; rejected: number };
}

export interface Signature {
  role: string;
  name: string;
  signed: boolean;
  signatureDate?: string;
}

export interface PaymentData {
  notes?: string;
  signatures?: Signature[];
  candidateName?: string;
  reviewerName?: string;
  certifyingOrg?: string;
}

export interface ClosingData {
  notes?: string;
  finalApproval?: boolean;
  completionDate?: string;
}

// ============================================================================
// EXTRACTED CONTEXT
// ============================================================================

/** Contexto compacto extraído de fases previas, listo para inyectarse al prompt. */
export interface ExtractedContextEntry {
  /** ID del registro en base de datos */
  extractedContextId: string;
  /** Contenido markdown compacto extraído */
  content: string;
}

// ============================================================================
// WIZARD STATE (coincide con FRONTEND ARCHITECTURE DOCUMENT sección 9)
// ============================================================================
export interface WizardState {
  currentStep: number;
  projectId: string | null;
  clientData: ClientData;
  needsData: NeedsData | null;
  analysisData: AnalysisData | null;
  specsData: SpecsData | null;
  productionData: ProductionData | null;
  checklistData: ChecklistData | null;
  evidenceData: EvidenceData | null;
  adjustmentsData: AdjustmentsData | null;
  paymentData: PaymentData | null;
  closingData: ClosingData | null;
  // Steps metadata para el progress indicator
  steps: WizardStep[];
  /**
   * Contextos extraídos indexados por stepNumber del paso destino.
   * Ej: extractedContexts[2] = contexto compacto preparado para el paso F2.
   */
  extractedContexts: Record<number, ExtractedContextEntry>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
