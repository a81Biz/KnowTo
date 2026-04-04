// src/prompts/index.ts
// Prompt Registry: carga y gestión de prompts externalizados desde archivos .md

import type { PromptId } from '../types/wizard.types';

// Importar todos los prompts como texto estático (compatible con Workers)
// En Workers, usamos importaciones estáticas ya que no hay acceso a fs
import F0 from './templates/F0-marco-referencia.md';
import F1 from './templates/F1-informe-necesidades.md';
import F2 from './templates/F2-especificaciones-analisis.md';
import F3 from './templates/F3-especificaciones-tecnicas.md';
import F4 from './templates/F4-produccion.md';
import F5 from './templates/F5-verificacion.md';
import F5_2 from './templates/F5_2-evidencias.md';
import F6 from './templates/F6-ajustes.md';
import F6_2 from './templates/F6_2-firmas.md';

interface PromptMetadata {
  id: string;
  name: string;
  version: string;
  tags: string[];
}

interface PromptEntry {
  metadata: PromptMetadata;
  content: string;
}

const PROMPT_MAP: Record<PromptId, string> = {
  F0,
  F1,
  F2,
  F3,
  F4,
  F5,
  F5_2,
  F6,
  F6_2,
};

class PromptRegistry {
  private cache: Map<PromptId, PromptEntry> = new Map();

  private parse(raw: string): PromptEntry {
    const frontmatterMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!frontmatterMatch) {
      return {
        metadata: { id: 'unknown', name: 'Unknown', version: '1.0.0', tags: [] },
        content: raw,
      };
    }
    const frontmatter = frontmatterMatch[1] ?? '';
    const content = frontmatterMatch[2] ?? '';
    const metadata: PromptMetadata = { id: 'unknown', name: '', version: '1.0.0', tags: [] };

    for (const line of frontmatter.split('\n')) {
      const [key, ...rest] = line.split(':');
      const value = rest.join(':').trim();
      if (key === 'id') metadata.id = value;
      if (key === 'name') metadata.name = value;
      if (key === 'version') metadata.version = value;
      if (key === 'tags') {
        metadata.tags = value
          .replace(/[\[\]]/g, '')
          .split(',')
          .map((t) => t.trim());
      }
    }

    return { metadata, content: content.trim() };

  }

  get(id: PromptId): PromptEntry {
    if (this.cache.has(id)) return this.cache.get(id)!;

    const raw = PROMPT_MAP[id];
    if (!raw) throw new Error(`Prompt not found: ${id}`);

    const entry = this.parse(raw);
    this.cache.set(id, entry);
    return entry;
  }

  render(id: PromptId, variables: Record<string, string>): string {
    const entry = this.get(id);
    let rendered = entry.content;

    for (const [key, value] of Object.entries(variables)) {
      rendered = rendered.replaceAll(`{{${key}}}`, value);
    }

    return rendered;
  }
}

// Singleton
const registry = new PromptRegistry();
export const getPromptRegistry = () => registry;
export type { PromptEntry };
