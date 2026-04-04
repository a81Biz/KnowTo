// src/types/wizard.types.ts

export type PhaseId = 'F0' | 'F1' | 'F2' | 'F3' | 'F4' | 'F5.1' | 'F5.2' | 'F6.1' | 'F6.2' | 'CLOSE';
export type PromptId = 'F0' | 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F5_2' | 'F6' | 'F6_2';
export type StepStatus = 'pending' | 'processing' | 'completed' | 'error';

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

export interface WizardState {
  projectId: string | null;
  projectName: string;
  clientName: string;
  industry: string;
  email: string;
  currentStep: number;
  steps: WizardStep[];
  isGenerating: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
