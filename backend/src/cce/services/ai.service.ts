// src/cce/services/ai.service.ts
//
// Estrategia por entorno:
//   production  → Workers AI  (env.AI.run — binding de Cloudflare)
//   development → Ollama       (fetch a OLLAMA_URL)

import { getPromptRegistry, type PromptEntry } from '../prompts';
import type { Env } from '../../core/types/env';
import type { PromptId, ProjectContext } from '../types/wizard.types';

export interface GenerateOptions {
  promptId: PromptId;
  context: ProjectContext;
  userInputs: Record<string, unknown>;
}

const SYSTEM_PROMPT =
  'Eres un consultor empresarial experto en servicios de consultoría general, certificado en el estándar EC0249 del CONOCER.\n' +
  'Genera documentos profesionales SOLO en español.\n' +
  'Usa formato Markdown estricto con tablas y listas cuando aplique.\n' +
  'No inventes datos. Si no tienes información, indícalo explícitamente.\n' +
  'Responde únicamente con el documento solicitado, sin preámbulos ni explicaciones adicionales.';

export class AIService {
  private env: Env;
  private isProd: boolean;

  constructor(env: Env) {
    this.env = env;
    this.isProd = env.ENVIRONMENT === 'production';
  }

  /**
   * Extrae texto de una imagen escaneada (OCR).
   * - Producción: llama-3.2-11b-vision-instruct (Workers AI)
   * - Desarrollo: llava via Ollama (si no está disponible, retorna mensaje informativo)
   */
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

  async generate(options: GenerateOptions): Promise<string> {
    const registry = getPromptRegistry();
    const entry = registry.get(options.promptId);

    // Si no tiene cadena definida, asume el comportamiento monolítico anterior.
    if (!entry.metadata.pipeline_steps || entry.metadata.pipeline_steps.length === 0) {
      return this._runLegacyGenerate(entry, options, registry);
    }

    return this._runPipeline(entry, options, registry);
  }

  /**
   * Ejecuta un agente puramente dinámico basado en DB (Nuevo Pipeline Orquestador)
   */
  async runAgent(promptText: string, modelType: string, systemPrompt: string): Promise<string> {
    try {
      const raw = this.isProd 
        ? await this._workersAI(promptText, modelType, systemPrompt) 
        : await this._ollama(promptText, modelType, systemPrompt);
      return this._cleanResponse(raw);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown AI error';
      throw new Error(`runAgent failed: ${msg}`);
    }
  }

  private async _runLegacyGenerate(
    entry: PromptEntry,
    options: GenerateOptions,
    registry: ReturnType<typeof getPromptRegistry>
  ): Promise<string> {
    const today = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
    const rendered = registry.render(entry.content, {
      context: JSON.stringify(options.context, null, 2),
      userInputs: JSON.stringify(options.userInputs, null, 2),
      fechaActual: today,
    });

    try {
      const raw = this.isProd ? await this._workersAI(rendered) : await this._ollama(rendered);
      return this._cleanResponse(raw);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown AI error';
      throw new Error(`AI generation failed: ${msg}`);
    }
  }

  private async _runPipeline(
    entry: PromptEntry,
    options: GenerateOptions,
    registry: ReturnType<typeof getPromptRegistry>
  ): Promise<string> {
    const today = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
    const params: Record<string, string> = {
      context: JSON.stringify(options.context, null, 2),
      userInputs: JSON.stringify(options.userInputs, null, 2),
      fechaActual: today,
    };

    let previousOutput = '';
    const steps = entry.metadata.pipeline_steps!;

    for (const step of steps) {
      const stepModel = step.model;
      let promptText = '';

      if (step.agent === 'extractor') {
        promptText = `TAREA DE EXTRACCIÓN:\n${step.task || 'Extrae información relevante.'}\n\nUSER INPUTS:\n{{userInputs}}\n\nCONTEXTO:\n{{context}}\n\nSolo devuelve la información solicitada.`;
      } else if (step.agent === 'specialist') {
        promptText = `MISIÓN DEL ESPECIALISTA:\n${step.task || 'Atiende la regla predefinida.'}\n\nINFORMACIÓN EXTRAÍDA O PREVIA:\n${previousOutput}\n\nUSER INPUTS:\n{{userInputs}}\n\nCONTEXTO:\n{{context}}\n\nPLANTILLA / REGLAS ESTRUCTURALES:\n${entry.content}`;
      } else if (step.agent === 'judge') {
        const rulesText = step.rules ? step.rules.map(r => `- ${r}`).join('\n') : 'Valida el documento y emite la redacción final en el esquema previsto.';
        promptText = `ERES EL JUEZ (VALIDADOR FINAL). Revisa, audita y emite el Markdown o JSON final.\n\nREGLAS DE AUDITORÍA:\n${rulesText}\n\nDOCUMENTO A EVALUAR:\n${previousOutput}\n\nESQUEMA DE SALIDA ESPERADO:\n${entry.content}`;
      } else {
        promptText = `Continúa procesando:\n${step.task}\n\nDocumento previo:\n${previousOutput}\n\nPlantilla:\n${entry.content}`;
      }

      const rendered = registry.render(promptText, params);

      let raw = '';
      try {
        raw = this.isProd ? await this._workersAI(rendered, stepModel) : await this._ollama(rendered, stepModel);
        previousOutput = this._cleanResponse(raw);
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown AI error';
        throw new Error(`Pipeline failed at ${step.agent}: ${msg}`);
      }
    }

    return previousOutput;
  }

  /**
   * Limpia artefactos comunes que los modelos pequeños añaden al output:
   * - Envolturas ```markdown ... ``` o ```md ... ```
   * - Líneas vacías extra al inicio/fin
   */
  private _cleanResponse(text: string): string {
    return text
      .replace(/^```(?:markdown|md)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim();
  }

  // ── Workers AI (producción) ─────────────────────────────────────────────────
  private async _workersAI(prompt: string, modelOverride?: string, sysPrompt?: string): Promise<string> {
    const model = modelOverride || '@cf/meta/llama-3.2-3b-instruct';
    const response = await this.env.AI.run(model as Parameters<typeof this.env.AI.run>[0], {
      prompt,
      system_prompt: sysPrompt || SYSTEM_PROMPT,
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

  // ── Ollama (desarrollo local) ───────────────────────────────────────────────
  private async _ollama(prompt: string, modelOverride?: string, sysPrompt?: string): Promise<string> {
    const base  = (this.env.OLLAMA_URL   ?? 'http://localhost:11434').replace(/\/$/, '');
    const model = modelOverride || (this.env.OLLAMA_MODEL ?? 'llama3.2:3b');

    const res = await fetch(`${base}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        system: sysPrompt || SYSTEM_PROMPT,
        stream: false,
      }),
    });

    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}: ${await res.text()}`);

    const data = (await res.json()) as { response?: string };
    if (!data.response) throw new Error('Empty response from Ollama');
    return data.response;
  }

  // ── Workers AI Vision (producción — OCR) ────────────────────────────────────
  private async _workersAIVision(
    prompt: string,
    base64: string,
    mimeType: 'image/jpeg' | 'image/png',
  ): Promise<string> {
    const response = await this.env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct' as Parameters<typeof this.env.AI.run>[0], {
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
    } as Parameters<typeof this.env.AI.run>[1]);

    const content =
      typeof response === 'string'
        ? response
        : (response as { response?: string }).response ?? '';
    if (!content) throw new Error('Empty response from Workers AI Vision');
    return content.trim();
  }

  // ── Ollama Vision (desarrollo — OCR) ────────────────────────────────────────
  private async _ollamaVision(prompt: string, base64: string): Promise<string> {
    const base = (this.env.OLLAMA_URL ?? 'http://localhost:11434').replace(/\/$/, '');
    // Intentar con llava; si no está disponible, el error se propaga al caller
    const model = 'llava:7b';

    const res = await fetch(`${base}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        images: [base64],
        stream: false,
      }),
    });

    if (!res.ok) throw new Error(`Ollama Vision HTTP ${res.status}: ${await res.text()}`);

    const data = (await res.json()) as { response?: string };
    if (!data.response) throw new Error('Empty response from Ollama Vision');
    return data.response.trim();
  }
}
