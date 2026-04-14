// frontend/dcfl/src/stores/wizard.store.ts
// Singleton — FRONTEND ARCHITECTURE DOCUMENT sección 9
import type {
  WizardState, WizardStep, StepStatus,
  ClientData, ExtractedContextEntry,
} from '../types/wizard.types';

type Listener = (state: WizardState) => void;
const STORAGE_KEY = 'knowto_wizard_state';

const STEP_DEFINITIONS: Omit<WizardStep, 'status' | 'inputData'>[] = [
  { stepNumber: 0,  phaseId: 'F0',    promptId: 'F0',    label: 'Marco de Referencia',   icon: 'search' },
  { stepNumber: 1,  phaseId: 'F1',    promptId: 'F1',    label: 'Necesidades',            icon: 'analytics' },
  { stepNumber: 2,  phaseId: 'F2',    promptId: 'F2',    label: 'Análisis',               icon: 'architecture' },
  { stepNumber: 3,  phaseId: 'F2.5',  promptId: 'F2_5',  label: 'Recomendaciones',        icon: 'lightbulb' },
  { stepNumber: 4,  phaseId: 'F3',    promptId: 'F3',    label: 'Especificaciones',       icon: 'settings' },
  { stepNumber: 5,  phaseId: 'F4',    promptId: 'F4_P0', label: 'Producción',             icon: 'construction' },
  { stepNumber: 6,  phaseId: 'F5.1',  promptId: 'F5',    label: 'Verificación',           icon: 'fact_check' },
  { stepNumber: 7,  phaseId: 'F5.2',  promptId: 'F5_2',  label: 'Evidencias',             icon: 'photo_library' },
  { stepNumber: 8,  phaseId: 'F6.1',  promptId: 'F6',    label: 'Ajustes',                icon: 'tune' },
  { stepNumber: 9,  phaseId: 'F6.2a', promptId: 'F6_2a', label: 'Inventario y Firmas',    icon: 'inventory' },
  { stepNumber: 10, phaseId: 'F6.2b', promptId: 'F6_2b', label: 'Resumen y Declaración',  icon: 'summarize' },
  { stepNumber: 11, phaseId: 'CLOSE', promptId: 'F6_2b', label: 'Finalización',            icon: 'celebration' },
];

const initialState: WizardState = {
  currentStep: 0,
  projectId: null,
  clientData: { clientName: '', projectName: '', industry: '', email: '' },
  needsData: null,
  analysisData: null,
  specsData: null,
  productionData: null,
  checklistData: null,
  evidenceData: null,
  adjustmentsData: null,
  paymentData: null,
  closingData: null,
  steps: STEP_DEFINITIONS.map((d) => ({ ...d, status: 'pending' as StepStatus, inputData: {} })),
  extractedContexts: {},
};

class WizardStoreClass {
  private state: WizardState = { ...initialState };
  private listeners: Listener[] = [];

  constructor() { this.loadFromLocalStorage(); }

  // Suscripción
  subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter((l) => l !== listener); };
  }

  private notify(): void { this.listeners.forEach((l) => l(this.state)); }

  // Persistencia
  private saveToLocalStorage(): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state)); } catch { /* silent */ }
  }

  private loadFromLocalStorage(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) this.state = { ...initialState, ...JSON.parse(saved) as WizardState };
    } catch { /* silent */ }
  }

  // Getters
  getState(): WizardState { return { ...this.state }; }
  getCurrentStep(): number { return this.state.currentStep; }
  getProjectId(): string | null { return this.state.projectId; }
  getClientData(): ClientData { return { ...this.state.clientData }; }

  getStepData<T>(stepId: number): T | null {
    const keys: Record<number, keyof WizardState> = {
      0: 'clientData', 1: 'needsData', 2: 'analysisData', 3: 'analysisData',
      4: 'specsData', 5: 'productionData', 6: 'checklistData',
      7: 'evidenceData', 8: 'adjustmentsData', 9: 'paymentData',
      10: 'closingData', 11: 'closingData',
    };
    const key = keys[stepId];
    return key ? (this.state[key] as T) ?? null : null;
  }

  // Setters del FRONTEND ARCHITECTURE DOCUMENT
  setCurrentStep(step: number): void { this.state.currentStep = step; this.saveToLocalStorage(); this.notify(); }
  setProjectId(id: string): void { this.state.projectId = id; this.saveToLocalStorage(); this.notify(); }
  setClientData(data: Partial<ClientData>): void {
    this.state.clientData = { ...this.state.clientData, ...data };
    this.saveToLocalStorage(); this.notify();
  }

  setStepData(stepId: number, data: unknown): void {
    const keys: Record<number, keyof WizardState> = {
      0: 'clientData', 1: 'needsData', 2: 'analysisData', 3: 'analysisData',
      4: 'specsData', 5: 'productionData', 6: 'checklistData',
      7: 'evidenceData', 8: 'adjustmentsData', 9: 'paymentData',
      10: 'closingData', 11: 'closingData',
    };
    const key = keys[stepId];
    if (key) { (this.state as unknown as Record<string, unknown>)[key] = data; this.saveToLocalStorage(); this.notify(); }
  }

  // Métodos de Steps (metadata del wizard)
  setStepStatus(stepNumber: number, status: StepStatus): void {
    const steps = [...this.state.steps];
    const s = steps[stepNumber]; if (!s) return;
    steps[stepNumber] = { ...s, status };
    this.state = { ...this.state, steps };
    this.saveToLocalStorage(); this.notify();
  }

  setStepDocument(stepNumber: number, content: string, documentId: string): void {
    const steps = [...this.state.steps];
    const s = steps[stepNumber]; if (!s) return;
    steps[stepNumber] = { ...s, documentContent: content, documentId, status: 'completed' };
    this.state = { ...this.state, steps };
    this.saveToLocalStorage(); this.notify();
  }

  setStepId(stepNumber: number, stepId: string): void {
    const steps = [...this.state.steps];
    const s = steps[stepNumber]; if (!s) return;
    steps[stepNumber] = { ...s, stepId };
    this.state = { ...this.state, steps };
    this.saveToLocalStorage();
  }

  setStepInputData(stepNumber: number, data: Record<string, unknown>): void {
    const steps = [...this.state.steps];
    const s = steps[stepNumber]; if (!s) return;
    // Merge with existing inputData to preserve fields not present in this update
    steps[stepNumber] = { ...s, inputData: { ...s.inputData, ...data } };
    this.state = { ...this.state, steps };
    this.saveToLocalStorage();
    this.notify();
  }

  /** Guarda los datos del paso y avanza al siguiente. */
  saveAndNext(stepNumber: number, data: Record<string, unknown>): void {
    this.setStepInputData(stepNumber, data);
    this.nextStep();
  }

  setExtractedContext(stepNumber: number, entry: ExtractedContextEntry): void {
    this.state = {
      ...this.state,
      extractedContexts: { ...this.state.extractedContexts, [stepNumber]: entry },
    };
    this.saveToLocalStorage();
  }

  // Navegación
  nextStep(): void { if (this.state.currentStep < 11) this.setCurrentStep(this.state.currentStep + 1); }
  prevStep(): void { if (this.state.currentStep > 0) this.setCurrentStep(this.state.currentStep - 1); }
  goToStep(n: number): void { if (n >= 0 && n <= 11) this.setCurrentStep(n); }

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
   * - Pasos 0-1: contexto acumulado completo (previousData con todos los docs completados).
   * - Pasos 2+: usa el extractedContext compacto si está disponible, caída al acumulado si no.
   */
  buildContext(forStep?: number): Record<string, unknown> {
    const prev: Record<string, unknown> = {};
    this.state.steps.filter((s) => s.status === 'completed').forEach((s) => {
      prev[s.phaseId] = { inputData: s.inputData, content: s.documentContent };
    });

    const base = {
      projectName: this.state.clientData.projectName,
      clientName: this.state.clientData.clientName,
      industry: this.state.clientData.industry,
      email: this.state.clientData.email,
    };

    // Pasos 2+ usan el contexto extraído compacto cuando esté disponible
    if (forStep !== undefined && forStep >= 2) {
      const extracted = this.state.extractedContexts[forStep];
      if (extracted) {
        return { ...base, previousData: { extractedContext: extracted.content } };
      }
    }

    return { ...base, previousData: prev };
  }
}

export const wizardStore = new WizardStoreClass();
