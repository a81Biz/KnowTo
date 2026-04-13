// frontend/cce/src/stores/wizard.store.ts
// Singleton store para el wizard CCE (EC0249) — 10 pasos (0–9)
import type {
  WizardState, WizardStep, StepStatus,
  ClientData, ExtractedContextEntry,
} from '../types/wizard.types';

type Listener = (state: WizardState) => void;
const STORAGE_KEY = 'knowto_cce_wizard_state';

const STEP_DEFINITIONS: Omit<WizardStep, 'status' | 'inputData'>[] = [
  { stepNumber: 0, phaseId: 'INTAKE',          promptId: 'F0',   label: 'Datos del Cliente',    icon: 'person' },
  { stepNumber: 1, phaseId: 'F1_1',            promptId: 'F1_1', label: 'Marco de Referencia',  icon: 'search' },
  { stepNumber: 2, phaseId: 'F1_2_FIELDWORK',  promptId: 'F1_1', label: 'Trabajo de Campo',     icon: 'upload_file' },
  { stepNumber: 3, phaseId: 'F1_2',            promptId: 'F1_2', label: 'Diagnóstico',          icon: 'analytics' },
  { stepNumber: 4, phaseId: 'F2',              promptId: 'F2',   label: 'Priorización',         icon: 'priority_high' },
  { stepNumber: 5, phaseId: 'F2_5',            promptId: 'F2_5', label: 'Estrategia y Specs',   icon: 'architecture' },
  { stepNumber: 6, phaseId: 'F4',              promptId: 'F4',   label: 'Producción',           icon: 'construction' },
  { stepNumber: 7, phaseId: 'F5',              promptId: 'F5',   label: 'Verificación y Cierre', icon: 'fact_check' },
];

const initialState: WizardState = {
  currentStep: 0,
  projectId: null,
  clientData: { clientName: '', projectName: '', companyName: '', sector: '', email: '', tradeName: '', mainActivity: '', city: '', stateRegion: '', totalWorkers: '', mainProblem: '', currentSituation: '', mainObjective: '' },
  clientAnswersData: null,
  instrumentsData: null,
  fieldworkData: null,
  diagnosisData: null,
  prioritizationData: null,
  pedagogySpecsData: null,
  productionData: null,
  closingData: null,
  steps: STEP_DEFINITIONS.map((d) => ({ ...d, status: 'pending' as StepStatus, inputData: {} })),
  extractedContexts: {},
};

class WizardStoreClass {
  private state: WizardState = { ...initialState };
  private listeners: Listener[] = [];

  constructor() { this.loadFromLocalStorage(); }

  subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter((l) => l !== listener); };
  }

  private notify(): void { this.listeners.forEach((l) => l(this.state)); }

  private saveToLocalStorage(): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state)); } catch { /* silent */ }
  }

  private loadFromLocalStorage(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) this.state = { ...initialState, ...JSON.parse(saved) as WizardState };
    } catch { /* silent */ }
  }

  // ── Getters ──────────────────────────────────────────────────────────────────
  getState(): WizardState { return { ...this.state }; }
  getCurrentStep(): number { return this.state.currentStep; }
  getProjectId(): string | null { return this.state.projectId; }
  getClientData(): ClientData { return { ...this.state.clientData }; }

  /**
   * Devuelve los proyectos almacenados en localStorage (dev mode).
   * En producción la lista viene de la API.
   */
  getDevProjects(): Array<{
    projectId: string;
    name: string;
    clientName: string;
    companyName: string;
    currentStep: number;
    totalSteps: number;
    updatedAt: string;
  }> {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const state = JSON.parse(saved) as WizardState;
      if (!state.projectId || !state.clientData.projectName) return [];
      const totalSteps = state.steps?.length ?? 8;
      return [
        {
          projectId: state.projectId,
          name: state.clientData.projectName,
          clientName: state.clientData.clientName,
          companyName: state.clientData.companyName ?? '',
          currentStep: state.currentStep ?? 0,
          totalSteps,
          updatedAt: new Date().toLocaleDateString('es-MX'),
        },
      ];
    } catch {
      return [];
    }
  }

  /**
   * Restaura el estado completo desde localStorage para un projectId dado.
   * Si el projectId coincide con el guardado, no hace nada (ya está cargado).
   */
  restoreFromLocalStorage(projectId: string): boolean {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return false;
      const state = JSON.parse(saved) as WizardState;
      if (state.projectId !== projectId) return false;
      this.state = { ...initialState, ...state };
      this.notify();
      return true;
    } catch {
      return false;
    }
  }

  getStepData<T>(stepId: number): T | null {
    const keys: Record<number, keyof WizardState> = {
      0: 'clientData',
      1: 'clientAnswersData',
      2: 'fieldworkData',
      3: 'diagnosisData',
      4: 'prioritizationData',
      5: 'pedagogySpecsData',
      6: 'productionData',
      7: 'closingData',
    };
    const key = keys[stepId];
    return key ? (this.state[key] as T) ?? null : null;
  }

  // ── Setters ──────────────────────────────────────────────────────────────────
  setCurrentStep(step: number): void {
    this.state.currentStep = step;
    this.saveToLocalStorage();
    this.notify();
  }

  setProjectId(id: string): void {
    this.state.projectId = id;
    this.saveToLocalStorage();
    this.notify();
  }

  setClientData(data: Partial<ClientData>): void {
    this.state.clientData = { ...this.state.clientData, ...data };
    this.saveToLocalStorage();
    this.notify();
  }

  setStepData(stepId: number, data: unknown): void {
    const keys: Record<number, keyof WizardState> = {
      0: 'clientData',
      1: 'clientAnswersData',
      2: 'fieldworkData',
      3: 'diagnosisData',
      4: 'prioritizationData',
      5: 'pedagogySpecsData',
      6: 'productionData',
      7: 'closingData',
    };
    const key = keys[stepId];
    if (key) {
      (this.state as unknown as Record<string, unknown>)[key] = data;
      this.saveToLocalStorage();
      this.notify();
    }
  }

  // ── Step metadata ─────────────────────────────────────────────────────────────
  setStepStatus(stepNumber: number, status: StepStatus): void {
    const steps = [...this.state.steps];
    const s = steps[stepNumber];
    if (!s) return;
    steps[stepNumber] = { ...s, status };
    this.state = { ...this.state, steps };
    this.saveToLocalStorage();
    this.notify();
  }

  setStepDocument(stepNumber: number, content: string, documentId: string): void {
    const steps = [...this.state.steps];
    const s = steps[stepNumber];
    if (!s) return;
    steps[stepNumber] = { ...s, documentContent: content, documentId, status: 'completed' };
    this.state = { ...this.state, steps };
    this.saveToLocalStorage();
    this.notify();
  }

  setStepId(stepNumber: number, stepId: string): void {
    const steps = [...this.state.steps];
    const s = steps[stepNumber];
    if (!s) return;
    steps[stepNumber] = { ...s, stepId };
    this.state = { ...this.state, steps };
    this.saveToLocalStorage();
  }

  setStepInputData(stepNumber: number, data: Record<string, unknown>): void {
    const steps = [...this.state.steps];
    const s = steps[stepNumber];
    if (!s) return;
    steps[stepNumber] = { ...s, inputData: data };
    this.state = { ...this.state, steps };
    this.saveToLocalStorage();
  }

  setExtractedContext(stepNumber: number, entry: ExtractedContextEntry): void {
    this.state = {
      ...this.state,
      extractedContexts: { ...this.state.extractedContexts, [stepNumber]: entry },
    };
    this.saveToLocalStorage();
  }

  // ── Navegación ────────────────────────────────────────────────────────────────
  nextStep(): void { if (this.state.currentStep < 7) this.setCurrentStep(this.state.currentStep + 1); }
  prevStep(): void { if (this.state.currentStep > 0) this.setCurrentStep(this.state.currentStep - 1); }
  goToStep(n: number): void { if (n >= 0 && n <= 7) this.setCurrentStep(n); }

  reset(): void {
    this.state = {
      ...initialState,
      steps: STEP_DEFINITIONS.map((d) => ({ ...d, status: 'pending' as StepStatus, inputData: {} })),
      extractedContexts: {},
    };
    localStorage.removeItem(STORAGE_KEY);
    this.notify();
  }

  /**
   * Construye el contexto para el prompt de un paso dado.
   * - Pasos 0-2: contexto acumulado completo.
   * - Pasos 3+: usa el extractedContext compacto si está disponible.
   */
  buildContext(forStep?: number): Record<string, unknown> {
    const prev: Record<string, unknown> = {};
    this.state.steps.filter((s) => s.status === 'completed').forEach((s) => {
      prev[s.phaseId] = { inputData: s.inputData, content: s.documentContent };
    });

    const cd = this.state.clientData;

    // Para step 1 (F1_1 — instrumentos) enviamos contexto compacto + documento F0.
    // El modelo 3b tiene ventana de contexto limitada; el F0 ya contiene el análisis
    // completo del sector, NOMs y preguntas, por lo que no hace falta repetir todos
    // los campos del cliente.
    if (forStep === 1) {
      const ctx: Record<string, unknown> = {
        projectName:     cd.projectName,
        clientName:      cd.clientName,
        contactPosition: cd.contactPosition,
        companyName:     cd.companyName,
        tradeName:       cd.tradeName,
        mainActivity:    cd.mainActivity,
        sector:          cd.sector,
        subsector:       cd.subsector,
        city:            cd.city,
        stateRegion:     cd.stateRegion,
        totalWorkers:    cd.totalWorkers,
        mainDepartments: cd.mainDepartments,
        mainProblem:     cd.mainProblem,
        symptoms:        cd.symptoms,
        currentSituation:cd.currentSituation,
        mainObjective:   cd.mainObjective,
        timeframe:       cd.timeframe,
        hasDC2:          cd.hasDC2,
        hasMixedCommission: cd.hasMixedCommission,
        hasSTPS:         cd.hasSTPS,
        recentTraining:  cd.recentTraining,
        hasDC3:          cd.hasDC3,
      };
      // NO incluir el documento F0 completo — el JSON embebido confunde al modelo 3b.
      // El contexto compacto + las respuestas del cliente en userInputs son suficientes.
      return ctx;
    }

    const base: Record<string, unknown> = {
      projectName: cd.projectName,
      clientName: cd.clientName,
      companyName: cd.companyName,
      tradeName: cd.tradeName,
      mainActivity: cd.mainActivity,
      sector: cd.sector,
      subsector: cd.subsector,
      city: cd.city,
      stateRegion: cd.stateRegion,
      totalWorkers: cd.totalWorkers,
      mainDepartments: cd.mainDepartments,
      mainProblem: cd.mainProblem,
      currentSituation: cd.currentSituation,
      symptoms: cd.symptoms,
      mainObjective: cd.mainObjective,
      measurableResult: cd.measurableResult,
      timeframe: cd.timeframe,
      restrictions: cd.restrictions,
      contactPosition: cd.contactPosition,
      email: cd.email,
      phone: cd.phone,
      websiteUrl: cd.websiteUrl,
      socialMediaUrls: cd.socialMediaUrls,
      mostActiveNetworks: cd.mostActiveNetworks,
      reviewProfiles: cd.reviewProfiles,
    };

    if (forStep !== undefined && forStep >= 3) {
      const extracted = this.state.extractedContexts[forStep];
      if (extracted) {
        return { ...base, previousData: { extractedContext: extracted.content } };
      }
    }

    return { ...base, previousData: prev };
  }
}

export const wizardStore = new WizardStoreClass();
