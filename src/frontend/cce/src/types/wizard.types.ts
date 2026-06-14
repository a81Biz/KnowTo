// src/types/wizard.types.ts — CCE (EC0249 Consultoría Empresarial)

// ============================================================================
// ENUMS / UNIONS
// ============================================================================
export type PhaseId =
  | 'INTAKE' | 'F0' | 'F0_CLIENT_ANSWERS'
  | 'F1_1' | 'F1_2_FIELDWORK' | 'F1_2'
  | 'F2' | 'F2_5' | 'F3' | 'F4'
  | 'F5' | 'F5_TEST_REPORT' | 'F6' | 'CLOSE';

export type PromptId =
  | 'F0' | 'F0_CLIENT_QUESTIONS_FORM'
  | 'F1_1' | 'F1_2' | 'F1_2_FIELDWORK_SYNTHESIS'
  | 'F2' | 'F2_5' | 'F3' | 'F4'
  | 'F4_PAC_DC2' | 'F4_CARTA_DESCRIPTIVA' | 'F4_MANUAL_PARTICIPANTE'
  | 'F4_INSTRUMENTOS_EVALUACION' | 'F4_MATERIALES_APOYO'
  | 'F4_DC5_CONSTANCIA' | 'F4_INFORME_EJECUTIVO'
  | 'F5' | 'F5_TEST_REPORT_FORM' | 'F6';

export type StepStatus = 'pending' | 'processing' | 'completed' | 'error';

// ============================================================================
// PIPELINE STATUS
// ============================================================================
export interface PipelineStatus {
  status: 'processing' | 'completed' | 'failed';
  currentStage?: string;
  totalStages?: number;
  completedStages?: number;
  output?: string | Record<string, unknown>;
  intermediateOutputs?: Record<string, unknown>;
  error?: string;
  retryCount?: number;
}

// ============================================================================
// STEP
// ============================================================================
export interface WizardStep {
  stepNumber: number;
  phaseId: PhaseId;
  promptId: PromptId;
  label: string;
  icon: string;
  status: StepStatus;
  inputData: Record<string, unknown>;
  documentContent?: string;
  documentId?: string;
  stepId?: string;
}

// ============================================================================
// DATOS POR FASE
// ============================================================================

/** Step 0 — Datos de entrada del cliente (FORMATO DE ENTRADA DEL CLIENTE) */
export interface ClientData {
  // ── Identificadores del proyecto ────────────────────────────────────────────
  clientName: string;       // Nombre del contacto principal
  projectName: string;      // Nombre interno del proyecto (consultor)
  // ── Sección 1: Identificación de la empresa ─────────────────────────────────
  companyName: string;      // Razón social
  tradeName?: string;       // Nombre comercial
  mainActivity?: string;    // Giro o actividad principal
  sector: string;           // Sector económico
  subsector?: string;       // Subsector (si se conoce)
  // ── Sección 2: Ubicación y operaciones ──────────────────────────────────────
  city?: string;
  stateRegion?: string;     // Estado (evita conflicto con TS 'state')
  hasMultipleSites?: string;   // Sí / No
  yearsInOperation?: string;
  isPartOfCorporation?: string; // Sí / No
  // ── Sección 3: Tamaño y estructura ──────────────────────────────────────────
  totalWorkers?: string;
  unionizedWorkers?: string;
  mainDepartments?: string;
  workersByArea?: string;
  // ── Sección 4: Síntomas o problemas conocidos ────────────────────────────────
  currentSituation?: string;  // Problema principal + síntomas
  mainProblem?: string;        // ¿Cuál es el problema principal?
  symptoms?: string;           // Síntomas observables (mínimo 2-3)
  problemStart?: string;       // ¿Desde cuándo ocurre?
  quantitativeData?: string;   // Datos cuantitativos
  previousAttempts?: string;   // ¿Han intentado algo?
  // ── Sección 5: Obligaciones y capacitación previa ────────────────────────────
  hasIMSS?: string;            // Sí / No / No sé
  hasDC2?: string;
  hasMixedCommission?: string;
  hasSTPS?: string;
  recentTraining?: string;
  hasDC3?: string;
  // ── Sección 6: Recursos disponibles ─────────────────────────────────────────
  hasTrainingBudget?: string;
  hasTrainingFacilities?: string;
  hasLMS?: string;
  hasInternalInstructor?: string;
  trainingAvailability?: string; // Alta / Media / Baja / No sé
  // ── Sección 7: Expectativas ──────────────────────────────────────────────────
  mainObjective?: string;      // ¿Qué espera lograr?
  measurableResult?: string;   // ¿Resultado específico a medir?
  timeframe?: string;          // Plazo esperado (unificado con deadline)
  restrictions?: string;       // Condiciones o restricciones especiales
  // ── Sección 8: Contacto ───────────────────────────────────────────────────────
  contactPosition?: string;    // Cargo del contacto
  email: string;
  phone?: string;
  availableSchedule?: string;  // Horario disponible para entrevistas
  // ── Sección 9: Presencia digital (opcional) ──────────────────────────────────
  websiteUrl?: string;          // URL del sitio web
  socialMediaUrls?: string;     // URLs de redes sociales (texto libre, una por línea)
  mostActiveNetworks?: string;  // Redes más activas
  reviewProfiles?: string;      // Perfiles de reseñas (Google Maps, Trustpilot, etc.)
}

/** Step 2 — Respuestas del cliente a las preguntas generadas en F0 */
export interface ClientAnswersData {
  /** Respuestas en formato libre o JSON según el FormSchema dinámico */
  answers: Record<string, string>;
  /** FormSchema generado por la IA */
  formSchema?: DynamicFormSchema;
}

/** Instrumento de diagnóstico individual */
export interface DiagnosticInstrument {
  instrumentId: string;
  label: string;
  /** Contenido del instrumento generado por IA */
  content?: string;
  documentId?: string;
  /** Si fue rellenado en papel y subido */
  uploadedFileId?: string;
  uploadedFileName?: string;
}

/** Step 3 — Instrumentos de diagnóstico (F1_1) */
export interface InstrumentsData {
  instruments: DiagnosticInstrument[];
  generatedContent?: string;
  documentId?: string;
}

/** Step 4 — Trabajo de campo (F1_2_FIELDWORK): instrumentos completados */
export interface FieldworkData {
  /** IDs de archivos subidos indexados por instrumentId */
  uploadedFiles: Record<string, { fileId: string; fileName: string; extractedText?: string }>;
  /** Observaciones del trabajo de campo */
  fieldNotes?: string;
}

/** Step 5 — Diagnóstico (F1_2) */
export interface DiagnosisData {
  content?: string;
  documentId?: string;
}

/** Step 6 — Priorización (F2) */
export interface PrioritizationData {
  content?: string;
  documentId?: string;
}

/** Step 7 — Estrategia pedagógica (F2_5) + Especificaciones (F3) */
export interface PedagogySpecsData {
  pedagogyContent?: string;
  pedagogyDocumentId?: string;
  specsContent?: string;
  specsDocumentId?: string;
}

/** Step 8 — Producción (F4) — Sub-wizard de 7 productos */
export interface ProductState {
  id: string; // P0 a P6
  name: string;
  content?: string;
  documentId?: string;
  approved: boolean;
}

export interface ProductionData {
  products: ProductState[];
  productNotes?: string;
}

/** Step 9 — Verificación + Reporte de pruebas + Ajustes + Cierre */
export interface ClosingData {
  verificationContent?: string;
  verificationDocumentId?: string;
  testReportSchema?: DynamicFormSchema;
  testReportAnswers?: Record<string, string>;
  adjustmentsContent?: string;
  adjustmentsDocumentId?: string;
  closingNotes?: string;
}

// ============================================================================
// FORMULARIO DINÁMICO (generado por IA)
// ============================================================================
export interface DynamicFormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'date';
  placeholder?: string;
  required: boolean;
  hint?: string;
  options?: Array<{ value: string; label: string }>;
}

export interface DynamicFormSection {
  id: string;
  title: string;
  fields: DynamicFormField[];
}

export interface DynamicFormSchema {
  formTitle: string;
  description: string;
  sections: DynamicFormSection[];
}

// ============================================================================
// EXTRACTED CONTEXT
// ============================================================================
export interface ExtractedContextEntry {
  extractedContextId: string;
  content: string;
}

// ============================================================================
// WIZARD STATE (10 steps: 0–9)
// ============================================================================
export interface WizardState {
  currentStep: number;
  projectId: string | null;
  clientData: ClientData;
  clientAnswersData: ClientAnswersData | null;
  instrumentsData: InstrumentsData | null;
  fieldworkData: FieldworkData | null;
  diagnosisData: DiagnosisData | null;
  prioritizationData: PrioritizationData | null;
  pedagogySpecsData: PedagogySpecsData | null;
  productionData: ProductionData | null;
  closingData: ClosingData | null;
  steps: WizardStep[];
  extractedContexts: Record<number, ExtractedContextEntry>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
