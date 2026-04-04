// src/types/document.types.ts

export interface Document {
  id: string;
  projectId: string;
  phaseId: string;
  title: string;
  content: string;
  format: 'markdown' | 'html' | 'pdf';
  version: number;
  createdAt: string;
  updatedAt: string;
}
