// src/types/wizard.types.ts

export type PhaseId = 'F0' | 'F1' | 'F2' | 'F3' | 'F4' | 'F5.1' | 'F5.2' | 'F6.1' | 'F6.2' | 'CLOSE';
export type PromptId = 'F0' | 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F5_2' | 'F6' | 'F6_2';

export interface ProjectContext {
  projectName: string;
  clientName: string;
  industry?: string;
  email?: string;
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
