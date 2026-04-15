// src/core/services/ai.service.ts
//
// Servicio de generación de IA unificado para todos los micrositios.
// Combina las capacidades de dcfl/ai.service.ts y cce/ai.service.ts:
//   - Generación con pipeline multi-agente (extractor → specialist → judge)
//   - Fallback a generación legacy (mono-prompt) si no hay pipeline_steps
//   - Soporte Vision / OCR (Llama Vision en prod, LLaVA en dev)
//   - runAgent() para el PipelineOrchestratorService
//
// Estrategia de LLM:
//   production  → Cloudflare Workers AI (env.AI.run)
//   development → Ollama local (fetch a OLLAMA_URL)
//
// Uso con registry inyectado:
//   const ai = new AIService(env, getPromptRegistry(), systemPrompt);
//   const content = await ai.generate({ promptId: 'F0', context, userInputs });

import type { Env } from '../types/env';
import type { IPromptRegistry } from '../types/pipeline.types';

export interface GenerateOptions {
  promptId: string;
  context: Record<string, unknown>;
  userInputs: Record<string, unknown>;
}

export class AIService {
  private isProd: boolean;

  /**
   * @param env          Workers bindings
   * @param registry     Registry de prompts del microsite (inyectado)
   * @param systemPrompt System prompt base del microsite (rol del agente)
   */
  constructor(
    private readonly env: Env,
    private readonly registry: IPromptRegistry,
    private readonly systemPrompt: string
  ) {
    this.isProd = env.ENVIRONMENT === 'production';
  }

  // ── generate ───────────────────────────────────────────────────────────────

  async generate(options: GenerateOptions): Promise<string> {
    const entry = this.registry.get(options.promptId);

    if (!entry.metadata.pipeline_steps || entry.metadata.pipeline_steps.length === 0) {
      return this._runLegacy(entry.content, options);
    }

    return this._runPipeline(entry.content, entry.metadata.pipeline_steps, options);
  }

  // ── runAgent (para PipelineOrchestratorService) ────────────────────────────

  async runAgent(promptText: string, modelType: string, systemPromptOverride: string): Promise<string> {
    const sysPrompt = systemPromptOverride || this.systemPrompt;
    try {
      const raw = this.isProd
        ? await this._workersAI(promptText, modelType, sysPrompt)
        : await this._ollama(promptText, modelType, sysPrompt);
      return this._clean(raw);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown AI error';
      throw new Error(`runAgent failed: ${msg}`);
    }
  }

  // ── extractTextFromImage (OCR) ────────────────────────────────────────────

  async extractTextFromImage(params: {
    base64Content: string;
    mimeType: 'image/jpeg' | 'image/png';
  }): Promise<string> {
    const prompt =
      'Extrae y transcribe TODO el texto visible en esta imagen de forma literal y completa. ' +
      'Incluye preguntas, respuestas, marcas, nombres y fechas tal como aparecen. ' +
      'No omitas nada. Responde únicamente con el texto extraído, sin explicaciones.';
    try {
      return this.isProd
        ? await this._workersAIVision(prompt, params.base64Content, params.mimeType)
        : await this._ollamaVision(prompt, params.base64Content);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`OCR failed: ${msg}`);
    }
  }

  // ── Implementaciones privadas ──────────────────────────────────────────────

  private async _runLegacy(template: string, options: GenerateOptions): Promise<string> {
    const today = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
    const rendered = this.registry.render(template, {
      context:     JSON.stringify(options.context, null, 2),
      userInputs:  JSON.stringify(options.userInputs, null, 2),
      fechaActual: today,
      projectName: (options.context['projectName'] as string) ?? '',
      clientName:  (options.context['clientName']  as string) ?? '',
    });
    try {
      const raw = this.isProd
        ? await this._workersAI(rendered)
        : await this._ollama(rendered);
      return this._clean(raw);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown AI error';
      throw new Error(`AI generation failed: ${msg}`);
    }
  }

  private async _runPipeline(
    template: string,
    steps: NonNullable<ReturnType<IPromptRegistry['get']>['metadata']['pipeline_steps']>,
    options: GenerateOptions
  ): Promise<string> {
    const today = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
    const params: Record<string, string> = {
      context:     JSON.stringify(options.context, null, 2),
      userInputs:  JSON.stringify(options.userInputs, null, 2),
      fechaActual: today,
      projectName: (options.context['projectName'] as string) ?? '',
      clientName:  (options.context['clientName']  as string) ?? '',
    };

    // Named outputs — each agent's result is stored by role for downstream stages
    const out: Record<string, string> = {
      extractor: '', specialist: '', specialist_a: '', specialist_b: '', synthesizer: '', judge: '',
    };

    for (const step of steps) {
      let promptText: string;

      switch (step.agent) {
        case 'extractor':
          promptText =
            `TAREA DE EXTRACCIÓN:\n${step.task ?? 'Extrae información relevante.'}\n\n` +
            `USER INPUTS:\n{{userInputs}}\n\nCONTEXTO:\n{{context}}\n\n` +
            `Solo devuelve la información solicitada.`;
          break;

        case 'specialist':
          promptText =
            `MISIÓN DEL ESPECIALISTA:\n${step.task ?? 'Atiende la regla predefinida.'}\n\n` +
            `INFORMACIÓN EXTRAÍDA:\n${out.extractor}\n\n` +
            `USER INPUTS:\n{{userInputs}}\n\nCONTEXTO:\n{{context}}\n\n` +
            `PLANTILLA / REGLAS ESTRUCTURALES:\n${template}`;
          break;

        case 'specialist_a':
          promptText =
            `MISIÓN ESPECIALISTA A:\n${step.task ?? 'Genera la perspectiva A del documento.'}\n\n` +
            `INFORMACIÓN EXTRAÍDA:\n${out.extractor}\n\n` +
            `USER INPUTS:\n{{userInputs}}\n\nCONTEXTO:\n{{context}}\n\n` +
            `PLANTILLA:\n${template}`;
          break;

        case 'specialist_b':
          promptText =
            `MISIÓN ESPECIALISTA B:\n${step.task ?? 'Genera la perspectiva B del documento.'}\n\n` +
            `INFORMACIÓN EXTRAÍDA:\n${out.extractor}\n\n` +
            `USER INPUTS:\n{{userInputs}}\n\nCONTEXTO:\n{{context}}\n\n` +
            `PLANTILLA:\n${template}`;
          break;

        case 'synthesizer':
          promptText =
            `SINTETIZADOR — integra las dos perspectivas en un documento unificado.\n` +
            `TAREA:\n${step.task ?? 'Combina y unifica en el documento final.'}\n\n` +
            `PERSPECTIVA A:\n${out.specialist_a}\n\n` +
            `PERSPECTIVA B:\n${out.specialist_b}\n\n` +
            `PLANTILLA / ESQUEMA DE SALIDA:\n${template}`;
          break;

        case 'judge': {
          const rulesText = step.rules
            ? step.rules.map((r) => `- ${r}`).join('\n')
            : 'Valida el documento y emite la redacción final en el esquema previsto.';
          // Judge uses the most recent meaningful output
          const docToReview =
            out.synthesizer || out.specialist_b || out.specialist_a || out.specialist || out.extractor;
          promptText =
            `ERES EL JUEZ (VALIDADOR FINAL). Revisa, audita y emite el Markdown o JSON final.\n\n` +
            `REGLAS DE AUDITORÍA:\n${rulesText}\n\n` +
            `DOCUMENTO A EVALUAR:\n${docToReview}\n\n` +
            `ESQUEMA DE SALIDA ESPERADO:\n${template}`;
          break;
        }

        default:
          promptText =
            `Continúa procesando:\n${step.task ?? ''}\n\nDocumento previo:\n${out.synthesizer || out.specialist_a || out.extractor}\n\nPlantilla:\n${template}`;
      }

      const rendered = this.registry.render(promptText, params);
      const model = this._getModelForAgent(step.agent, step.model);

      try {
        const raw = this.isProd
          ? await this._workersAI(rendered, model)
          : await this._ollama(rendered, model);
        out[step.agent] = this._clean(raw);
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown AI error';
        throw new Error(`Pipeline failed at step '${step.agent}': ${msg}`);
      }
    }

    // Return the last meaningful output in pipeline order
    return (
      out['judge'] || out['synthesizer'] || out['specialist_b'] ||
      out['specialist_a'] || out['specialist'] || out['extractor'] || ''
    );
  }

  /**
   * Resolves the model to use for a pipeline step based on environment:
   * - Development: always use env.OLLAMA_MODEL (ignores metadata model)
   * - Production: use step model if provided, else per-agent CF fallback
   */
  private _getModelForAgent(agentType: string, stepModel?: string): string {
    if (!this.isProd) {
      return this.env.OLLAMA_MODEL ?? 'llama3.2:3b';
    }

    if (stepModel) return stepModel;

    switch (agentType) {
      case 'extractor':    return '@cf/meta/llama-3.2-3b-instruct';
      case 'specialist_a': return '@cf/meta/llama-3.1-8b-instruct';
      case 'specialist_b': return '@cf/qwen/qwen2.5-7b-instruct';
      case 'synthesizer':  return '@cf/mistral/mistral-7b-instruct-v0.2';
      case 'judge':        return '@cf/mistral/mistral-7b-instruct-v0.2';
      default:             return '@cf/meta/llama-3.2-3b-instruct';
    }
  }

  private _clean(text: string): string {
    return text
      // Quita bloque envolvente ```markdown … ```
      .replace(/^```(?:markdown|md)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      // Elimina secciones de instrucciones al AI que el modelo puede colar en el output
      .replace(/\n## INSTRUCCIONES(?: DE CALIDAD)?(?:\s*\([^)]*\))?[\s\S]*?(?=\n## |\n# |$)/gi, '')
      // Elimina blockquotes de criterios/fundamentos (artefacto de plantillas)
      .replace(/\n> \*\*(?:Criterio(?: de selección)?|Fundamento|Nota|Regla):\*\*[\s\S]*?(?=\n[^>]|\n$|$)/gm, '')
      .replace(/\n> (?:Criterio|Fundamento|Nota|Regla):.*(?:\n> .*)*/g, '')
      // Elimina frases de prólogo típicas de LLMs
      .replace(/^(?:Aquí te presento|A continuación(?:\s+te presento)?|He generado|El siguiente es|Por supuesto,?)[^\n]*\n+/gim, '')
      .trim();
  }

  // ── Workers AI (producción) ────────────────────────────────────────────────

  private async _workersAI(prompt: string, modelOverride?: string, sysPrompt?: string): Promise<string> {
    const model = modelOverride ?? '@cf/meta/llama-3.2-3b-instruct';
    const response = await this.env.AI.run(model as Parameters<typeof this.env.AI.run>[0], {
      prompt,
      system_prompt: sysPrompt ?? this.systemPrompt,
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

  // ── Ollama (desarrollo local) ──────────────────────────────────────────────

  private async _ollama(prompt: string, modelOverride?: string, sysPrompt?: string): Promise<string> {
    const base  = (this.env.OLLAMA_URL   ?? 'http://localhost:11434').replace(/\/$/, '');
    const model = modelOverride ?? (this.env.OLLAMA_MODEL ?? 'llama3.2:3b');

    // 20 minutos — suficiente para llama3.2:3b en CPU sin GPU.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20 * 60 * 1000);

    const res = await fetch(`${base}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        system: sysPrompt ?? this.systemPrompt,
        stream: false,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { response?: string };
    if (!data.response) throw new Error('Empty response from Ollama');
    return data.response;
  }

  // ── Workers AI Vision (OCR producción) ────────────────────────────────────

  private async _workersAIVision(
    prompt: string,
    base64: string,
    mimeType: 'image/jpeg' | 'image/png'
  ): Promise<string> {
    const response = await this.env.AI.run(
      '@cf/meta/llama-3.2-11b-vision-instruct' as Parameters<typeof this.env.AI.run>[0],
      {
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
            ],
          },
        ],
        max_tokens: 2048,
      } as Parameters<typeof this.env.AI.run>[1]
    );

    const content =
      typeof response === 'string'
        ? response
        : (response as { response?: string }).response ?? '';
    if (!content) throw new Error('Empty response from Workers AI Vision');
    return content.trim();
  }

  // ── Ollama Vision (OCR desarrollo) ────────────────────────────────────────

  private async _ollamaVision(prompt: string, base64: string): Promise<string> {
    const base = (this.env.OLLAMA_URL ?? 'http://localhost:11434').replace(/\/$/, '');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20 * 60 * 1000);

    const res = await fetch(`${base}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llava:7b', prompt, images: [base64], stream: false }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) throw new Error(`Ollama Vision HTTP ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { response?: string };
    if (!data.response) throw new Error('Empty response from Ollama Vision');
    return data.response.trim();
  }
}
