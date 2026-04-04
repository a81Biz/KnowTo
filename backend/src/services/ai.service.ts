// src/services/ai.service.ts
//
// Estrategia por entorno:
//   production  → Workers AI  (env.AI.run — binding de Cloudflare)
//   development → Ollama       (fetch a OLLAMA_URL, por defecto http://localhost:11434)
//
// Así el código nunca intenta autenticarse con Cloudflare en desarrollo local.

import { getPromptRegistry } from '../prompts';
import type { Env } from '../types/env';
import type { PromptId, ProjectContext } from '../types/wizard.types';

export interface GenerateOptions {
  promptId: PromptId;
  context: ProjectContext;
  userInputs: Record<string, unknown>;
}

const SYSTEM_PROMPT =
  'Eres un experto en diseño instruccional certificado en el estándar EC0366 del CONOCER.\n' +
  'Genera documentos profesionales SOLO en español.\n' +
  'Usa formato Markdown estricto con tablas y listas.\n' +
  'No inventes datos. Si no tienes información, indícalo explícitamente.\n' +
  'Responde únicamente con el documento solicitado, sin preámbulos ni explicaciones adicionales.';

export class AIService {
  private env: Env;
  private isProd: boolean;

  constructor(env: Env) {
    this.env = env;
    this.isProd = env.ENVIRONMENT === 'production';
  }

  async generate(options: GenerateOptions): Promise<string> {
    const registry = getPromptRegistry();
    const rendered = registry.render(options.promptId, {
      context: JSON.stringify(options.context, null, 2),
      userInputs: JSON.stringify(options.userInputs, null, 2),
    });

    try {
      return this.isProd
        ? await this._workersAI(rendered)
        : await this._ollama(rendered);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown AI error';
      throw new Error(`AI generation failed: ${msg}`);
    }
  }

  // ── Workers AI (producción — Cloudflare) ────────────────────────────────────
  private async _workersAI(prompt: string): Promise<string> {
    const response = await this.env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
      prompt,
      system_prompt: SYSTEM_PROMPT,
      max_tokens: 4096,
      temperature: 0.3,
      stream: false,
    });

    const content =
      typeof response === 'string'
        ? response
        : (response as { response: string }).response;

    if (!content) throw new Error('Empty response from Workers AI');
    return content;
  }

  // ── Ollama (desarrollo local — Docker o nativo) ─────────────────────────────
  private async _ollama(prompt: string): Promise<string> {
    const base  = (this.env.OLLAMA_URL   ?? 'http://localhost:11434').replace(/\/$/, '');
    const model = (this.env.OLLAMA_MODEL ?? 'llama3.2:3b');

    const res = await fetch(`${base}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        system: SYSTEM_PROMPT,
        stream: false,
      }),
    });

    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}: ${await res.text()}`);

    const data = (await res.json()) as { response?: string };
    if (!data.response) throw new Error('Empty response from Ollama');
    return data.response;
  }
}
