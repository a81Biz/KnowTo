// src/cce/prompts/index.ts
// Prompt Registry CCE: carga y gestión de prompts del microsite EC0249, soportando Prompt Chaining YAML

import matter from 'gray-matter';
import type { PromptId } from '../types/wizard.types';

import F0             from './templates/F0-marco-referencia.md';
import F0_FORM        from './templates/F0-client-questions-form.md';
import F1_1           from './templates/F1-1-instrumentos.md';
import F1_2           from './templates/F1-2-diagnostico.md';
import F1_2_SYNTHESIS from './templates/F1-2-fieldwork-synthesis.md';
import F2             from './templates/F2-priorizacion.md';
import F2_5           from './templates/F2-5-pedagogia.md';
import F3             from './templates/F3-especificaciones.md';
import F4             from './templates/F4-produccion.md';
import F5             from './templates/F5-verificacion.md';
import F5_FORM        from './templates/F5-test-report-form.md';
import F6             from './templates/F6-ajustes-cierre.md';

export interface PipelineStep {
  agent: 'extractor' | 'specialist' | 'judge';
  model?: string;
  task?: string;
  rules?: string[];
  output_schema?: string;
}

export interface PromptMetadata {
  id: string;
  name?: string;
  version?: string;
  tags?: string[];
  type?: string;
  pipeline_steps?: PipelineStep[];
}

export interface PromptEntry {
  metadata: PromptMetadata;
  content: string;
}

const PROMPT_MAP: Record<PromptId, string> = {
  F0,
  F0_CLIENT_QUESTIONS_FORM: F0_FORM,
  F1_1,
  F1_2,
  F1_2_FIELDWORK_SYNTHESIS: F1_2_SYNTHESIS,
  F2,
  F2_5,
  F3,
  F4,
  F5,
  F5_TEST_REPORT_FORM: F5_FORM,
  F6,
};

class PromptRegistry {
  private cache: Map<PromptId, PromptEntry> = new Map();

  private parse(raw: string): PromptEntry {
    try {
      const parsed = matter(raw);
      const metadata = (parsed.data || {}) as PromptMetadata;
      if (!metadata.id) metadata.id = 'unknown';
      return { metadata, content: parsed.content.trim() };
    } catch {
      // Fallback si matter() falla (ej. YAML invalido)
      return {
        metadata: { id: 'unknown' },
        content: raw.trim(),
      };
    }
  }

  get(id: PromptId): PromptEntry {
    if (this.cache.has(id)) return this.cache.get(id)!;

    const raw = PROMPT_MAP[id];
    if (!raw) throw new Error(`CCE Prompt not found: ${id}`);

    const entry = this.parse(raw);
    this.cache.set(id, entry);
    return entry;
  }

  render(template: string, variables: Record<string, string>): string {
    let rendered = template;
    for (const [key, value] of Object.entries(variables)) {
      rendered = rendered.replaceAll(`{{${key}}}`, value);
    }
    return rendered;
  }
}

const registry = new PromptRegistry();
export const getPromptRegistry = () => registry;
