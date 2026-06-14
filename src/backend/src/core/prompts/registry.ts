// src/core/prompts/registry.ts
//
// PromptRegistry unificado para todos los micrositios.
// Características:
//   1. Parseo de YAML frontmatter via gray-matter (compatible con CCE y DCFL)
//   2. Resolución desde BD (tabla site_prompts) como fuente primaria
//   3. Fallback a archivos locales (.md) si la BD no tiene el prompt
//   4. Caché en memoria para evitar re-parseos
//   5. Implementa IPromptRegistry (compatible con core AIService)
//
// Uso básico (solo archivos locales):
//   const registry = new PromptRegistry({ siteId: 'dcfl', localMap: PROMPT_MAP });
//
// Uso con BD:
//   const registry = new PromptRegistry({ siteId: 'cce', localMap: PROMPT_MAP, db: supabase });

import matter from 'gray-matter';
import type { IPromptRegistry, PromptEntry, PromptMetadata } from '../types/pipeline.types';

interface RegistryOptions {
  /** Identificador del microsite: 'dcfl', 'cce', etc. */
  siteId: string;
  /** Mapa local de promptId → contenido raw del archivo .md (fallback) */
  localMap?: Record<string, string>;
  /** Servicio Supabase para resolución desde BD (opcional) */
  db?: {
    getPromptFromSiteTable(siteId: string, promptId: string): Promise<Record<string, unknown> | null>;
  };
}

export class PromptRegistry implements IPromptRegistry {
  private cache: Map<string, PromptEntry> = new Map();

  constructor(private readonly opts: RegistryOptions) {}

  /** Obtiene un PromptEntry por ID. Busca primero en BD, luego en archivos locales. */
  get(id: string): PromptEntry {
    if (this.cache.has(id)) return this.cache.get(id)!;

    // Intentar resolver desde archivos locales (BD se resuelve de forma asíncrona)
    const raw = this.opts.localMap?.[id];
    if (!raw) throw new Error(`Prompt not found: '${id}' (site: ${this.opts.siteId})`);

    const entry = this._parse(raw);
    this.cache.set(id, entry);
    return entry;
  }

  /**
   * Obtiene un PromptEntry resolviendo primero en BD (async).
   * Úsalo en contextos donde se puede await (ej: pipeline orchestrator).
   */
  async getAsync(id: string): Promise<PromptEntry> {
    if (this.cache.has(id)) return this.cache.get(id)!;

    // Intentar BD primero
    if (this.opts.db) {
      try {
        const row = await this.opts.db.getPromptFromSiteTable(this.opts.siteId, id);
        if (row) {
          const metadata = (row['metadata'] as Record<string, unknown>) ?? {};
          const entry: PromptEntry = {
            metadata: {
              id,
              ...(metadata as Partial<PromptMetadata>),
            },
            content: (row['content'] as string) ?? '',
          };
          this.cache.set(id, entry);
          return entry;
        }
      } catch {
        // Si falla la BD, continuar con fallback local
      }
    }

    // Fallback: archivos locales
    return this.get(id);
  }

  /**
   * Renderiza un template string sustituyendo {{variable}} con el mapa de valores.
   * Implementa IPromptRegistry.render().
   */
  render(template: string, variables: Record<string, string>): string {
    let rendered = template;
    for (const [key, value] of Object.entries(variables)) {
      rendered = rendered.replaceAll(`{{${key}}}`, value);
    }
    return rendered;
  }

  /** Conveniencia: obtiene el template de un prompt por ID y lo renderiza. */
  renderById(id: string, variables: Record<string, string>): string {
    const entry = this.get(id);
    return this.render(entry.content, variables);
  }

  // ── Parser interno ──────────────────────────────────────────────────────────

  private _parse(raw: string): PromptEntry {
    try {
      // gray-matter soporta YAML frontmatter (---\n...\n---\n)
      const parsed = matter(raw);
      const metadata = (parsed.data ?? {}) as PromptMetadata;
      if (!metadata.id) metadata.id = 'unknown';
      return { metadata, content: parsed.content.trim() };
    } catch {
      // Fallback: sin frontmatter
      return {
        metadata: { id: 'unknown' },
        content: raw.trim(),
      };
    }
  }
}

// ── Factory helpers ──────────────────────────────────────────────────────────

/**
 * Crea un registry de solo-archivos (sin BD).
 * Útil para tests y para sites que aún no migran prompts a BD.
 */
export function createLocalRegistry(
  siteId: string,
  localMap: Record<string, string>
): PromptRegistry {
  return new PromptRegistry({ siteId, localMap });
}
