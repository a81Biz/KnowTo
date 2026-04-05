// src/dcfl/prompts/index.ts
// Prompt Registry: carga y gestión de prompts externalizados desde archivos .md

import type { PromptId } from '../types/wizard.types';

// Importar todos los prompts como texto estático (compatible con Workers)
// En Workers, usamos importaciones estáticas ya que no hay acceso a fs
import F0     from './templates/F0-marco-referencia.md';
import F1     from './templates/F1-informe-necesidades.md';
import F2     from './templates/F2-especificaciones-analisis.md';
import F2_5   from './templates/F2_5-recomendaciones.md';
import F3     from './templates/F3-especificaciones-tecnicas.md';
import F4_P0  from './templates/F4_P0-cronograma.md';
import F4_P1  from './templates/F4_P1-info-general.md';
import F4_P2  from './templates/F4_P2-guias-actividades.md';
import F4_P3  from './templates/F4_P3-calendario.md';
import F4_P4  from './templates/F4_P4-documentos-texto.md';
import F4_P5  from './templates/F4_P5-presentacion.md';
import F4_P6  from './templates/F4_P6-guion-video.md';
import F4_P7  from './templates/F4_P7-instrumentos-evaluacion.md';
import F5     from './templates/F5-verificacion.md';
import F5_2   from './templates/F5_2-evidencias.md';
import F6     from './templates/F6-ajustes.md';
import F6_FORM from './templates/F6_FORM.md';
import F6_2a  from './templates/F6_2a-inventario-firmas.md';
import F6_2b  from './templates/F6_2b-resumen-declaracion.md';
import EXTRACTOR from './templates/EXTRACTOR.md';

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
  F2_5,
  F3,
  F4_P0,
  F4_P1,
  F4_P2,
  F4_P3,
  F4_P4,
  F4_P5,
  F4_P6,
  F4_P7,
  F5,
  F5_2,
  F6,
  F6_FORM,
  F6_2a,
  F6_2b,
  EXTRACTOR,
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
