// src/stores/wizard.store.ts
// Singleton que mantiene el estado global del wizard con persistencia en localStorage

import type { WizardState, WizardStep, StepStatus } from '../types/wizard.types';

const STORAGE_KEY = 'knowto_wizard_state';

const STEP_DEFINITIONS: Omit<WizardStep, 'status' | 'inputData' | 'documentContent' | 'documentId' | 'stepId'>[] = [
  { stepNumber: 0, phaseId: 'F0',    promptId: 'F0',   label: 'Marco de Referencia', icon: 'search' },
  { stepNumber: 1, phaseId: 'F1',    promptId: 'F1',   label: 'Necesidades',         icon: 'analytics' },
  { stepNumber: 2, phaseId: 'F2',    promptId: 'F2',   label: 'Análisis',            icon: 'architecture' },
  { stepNumber: 3, phaseId: 'F3',    promptId: 'F3',   label: 'Especificaciones',    icon: 'settings' },
  { stepNumber: 4, phaseId: 'F4',    promptId: 'F4',   label: 'Producción',          icon: 'construction' },
  { stepNumber: 5, phaseId: 'F5.1',  promptId: 'F5',   label: 'Verificación',        icon: 'fact_check' },
  { stepNumber: 6, phaseId: 'F5.2',  promptId: 'F5_2', label: 'Evidencias',          icon: 'photo_library' },
  { stepNumber: 7, phaseId: 'F6.1',  promptId: 'F6',   label: 'Ajustes',             icon: 'tune' },
  { stepNumber: 8, phaseId: 'F6.2',  promptId: 'F6_2', label: 'Firmas',              icon: 'draw' },
  { stepNumber: 9, phaseId: 'CLOSE', promptId: 'F6_2', label: 'Finalización',        icon: 'celebration' },
];

function createInitialState(): WizardState {
  return {
    projectId: null,
    projectName: '',
    clientName: '',
    industry: '',
    email: '',
    currentStep: 0,
    isGenerating: false,
    steps: STEP_DEFINITIONS.map((def) => ({
      ...def,
      status: 'pending' as StepStatus,
      inputData: {},
    })),
  };
}

class WizardStore {
  private state: WizardState;
  private listeners: Array<(state: WizardState) => void> = [];

  constructor() {
    this.state = this.loadFromStorage() ?? createInitialState();
  }

  private loadFromStorage(): WizardState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as WizardState) : null;
    } catch {
      return null;
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      console.warn('[WizardStore] Could not persist state to localStorage');
    }
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn(this.state));
  }

  subscribe(fn: (state: WizardState) => void): () => void {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter((l) => l !== fn); };
  }

  getState(): Readonly<WizardState> { return this.state; }

  getStep(n: number): WizardStep | undefined { return this.state.steps[n]; }

  getCurrentStep(): WizardStep | undefined { return this.state.steps[this.state.currentStep]; }

  setProjectInfo(info: { projectId: string; projectName: string; clientName: string; industry?: string; email?: string }): void {
    this.state = {
      ...this.state,
      projectId: info.projectId,
      projectName: info.projectName,
      clientName: info.clientName,
      industry: info.industry ?? '',
      email: info.email ?? '',
    };
    this.persist();
    this.notify();
  }

  setStepInputData(stepNumber: number, data: Record<string, unknown>): void {
    const steps = [...this.state.steps];
    const step = steps[stepNumber];
    if (!step) return;
    steps[stepNumber] = { ...step, inputData: data };
    this.state = { ...this.state, steps };
    this.persist();
    this.notify();
  }

  setStepStatus(stepNumber: number, status: StepStatus): void {
    const steps = [...this.state.steps];
    const step = steps[stepNumber];
    if (!step) return;
    steps[stepNumber] = { ...step, status };
    this.state = { ...this.state, steps };
    this.persist();
    this.notify();
  }

  setStepDocument(stepNumber: number, content: string, documentId: string): void {
    const steps = [...this.state.steps];
    const step = steps[stepNumber];
    if (!step) return;
    steps[stepNumber] = { ...step, documentContent: content, documentId, status: 'completed' };
    this.state = { ...this.state, steps };
    this.persist();
    this.notify();
  }

  setStepId(stepNumber: number, stepId: string): void {
    const steps = [...this.state.steps];
    const step = steps[stepNumber];
    if (!step) return;
    steps[stepNumber] = { ...step, stepId };
    this.state = { ...this.state, steps };
    this.persist();
  }

  goToStep(n: number): void {
    if (n < 0 || n >= this.state.steps.length) return;
    this.state = { ...this.state, currentStep: n };
    this.persist();
    this.notify();
  }

  setGenerating(val: boolean): void {
    this.state = { ...this.state, isGenerating: val };
    this.notify();
  }

  reset(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.state = createInitialState();
    this.notify();
  }

  buildContext(): Record<string, unknown> {
    const completedSteps = this.state.steps
      .filter((s) => s.status === 'completed')
      .map((s) => ({ phaseId: s.phaseId, inputData: s.inputData, content: s.documentContent }));

    return {
      projectName: this.state.projectName,
      clientName: this.state.clientName,
      industry: this.state.industry,
      email: this.state.email,
      previousData: Object.fromEntries(
        completedSteps.map((s) => [s.phaseId, { inputData: s.inputData, content: s.content }])
      ),
    };
  }
}

export const wizardStore = new WizardStore();
