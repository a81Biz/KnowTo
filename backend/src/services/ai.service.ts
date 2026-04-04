// src/services/ai.service.ts
import { getPromptRegistry } from '../prompts';
import type { Env } from '../types/env';
import type { PromptId, ProjectContext } from '../types/wizard.types';

export interface GenerateOptions {
  promptId: PromptId;
  context: ProjectContext;
  userInputs: Record<string, unknown>;
}

export class AIService {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  async generate(options: GenerateOptions): Promise<string> {
    const registry = getPromptRegistry();

    const rendered = registry.render(options.promptId, {
      context: JSON.stringify(options.context, null, 2),
      userInputs: JSON.stringify(options.userInputs, null, 2),
    });

    const systemPrompt = `Eres un experto en diseño instruccional certificado en el estándar EC0366 del CONOCER.
Genera documentos profesionales SOLO en español.
Usa formato Markdown estricto con tablas y listas.
No inventes datos. Si no tienes información, indícalo explícitamente.
Responde únicamente con el documento solicitado, sin preámbulos ni explicaciones adicionales.`;

    try {
      const response = await this.env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
        prompt: rendered,
        system_prompt: systemPrompt,
        max_tokens: 4096,
        temperature: 0.3,
        stream: false,
      });

      const content = typeof response === 'string' ? response : (response as { response: string }).response;
      if (!content) throw new Error('Empty response from AI');
      return content;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown AI error';
      throw new Error(`AI generation failed: ${msg}`);
    }
  }
}
