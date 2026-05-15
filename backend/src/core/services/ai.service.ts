// src/core/services/ai.service.ts
//
// Servicio de generación de IA unificado para todos los micrositios.
// Combina las capacidades de dcfl/ai.service.ts y cce/ai.service.ts:
//   - Generación con pipeline multi-agente (extractor → specialist → judge)
//   - Fallback a generación legacy (mono-prompt) si no hay pipeline_steps
//   - Soporte Vision / OCR (Llama Vision en prod, LLaVA en dev)
//   - runAgent() para el PipelineOrchestratorService
//
// Ahora utiliza ILLMProvider para desacoplar la implementación del modelo.
//

import type { Env } from '../types/env';
import type { IPromptRegistry } from '../types/pipeline.types';
import type { ILLMProvider } from './llm.provider';
import { WebSearchService } from './web-search.service';

export interface GenerateOptions {
  promptId: string;
  context: Record<string, unknown>;
  userInputs: Record<string, unknown>;
  onProgress?: (progress: { currentStep: string; stepIndex: number; totalSteps: number }) => Promise<void>;
  onAgentOutput?: (agentName: string, output: string, out: Record<string, string>) => Promise<void | string>;
  getAgentOutput?: (agentName: string) => Promise<string | null>;
}

export class AIService {
  /**
   * @param provider     Proveedor de LLM (Ollama o Cloudflare)
   * @param registry     Registry de prompts del microsite
   * @param systemPrompt System prompt base del microsite
   */
  constructor(
    private readonly provider: ILLMProvider,
    private readonly registry: IPromptRegistry,
    private readonly systemPrompt: string,
    private readonly env: Env
  ) { }

  async generate(options: GenerateOptions): Promise<string> {
    const entry = this.registry.get(options.promptId);

    // Extraer el Project Soul del contexto para inyectarlo como prefijo del System Prompt.
    // Esto garantiza la coherencia semántica (anti-amnesia) en todas las fases posteriores a F1.
    const projectSoul = typeof options.context._projectSoul === 'string'
      ? options.context._projectSoul
      : '';

    if (!entry.metadata.pipeline_steps || entry.metadata.pipeline_steps.length === 0) {
      return this._runLegacy(entry.content, options, projectSoul);
    }
    return this._runPipeline(entry.content, entry.metadata.pipeline_steps, options, projectSoul);
  }

  async runAgent(promptText: string, modelType: string, systemPromptOverride: string): Promise<string> {
    const sysPrompt = systemPromptOverride || this.systemPrompt;
    try {
      const raw = await this.provider.generate(promptText, modelType, sysPrompt);
      return this._clean(raw);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown AI error';
      throw new Error(`runAgent failed: ${msg}`);
    }
  }

  async extractTextFromImage(params: {
    base64Content: string;
    mimeType: 'image/jpeg' | 'image/png';
  }): Promise<string> {
    const prompt =
      'Extrae y transcribe TODO el texto visible en esta imagen de forma literal y completa. ' +
      'Incluye preguntas, respuestas, marcas, nombres y fechas tal como aparecen. ' +
      'No omitas nada. Responde únicamente con el texto extraído, sin explicaciones.';
    try {
      return await this.provider.generateVision(prompt, params.base64Content, params.mimeType);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`OCR failed: ${msg}`);
    }
  }

  private async _runLegacy(template: string, options: GenerateOptions, projectSoul: string = ''): Promise<string> {
    const today = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
    const params: Record<string, string> = {
      context: JSON.stringify(options.context, null, 2),
      userInputs: JSON.stringify(options.userInputs, null, 2),
      fechaActual: today,
    };
    for (const [k, v] of Object.entries(options.context)) {
      if (typeof v === 'string') params[k] = v;
    }
    const rendered = this.registry.render(template, params);
    try {
      const sysPrompt = projectSoul
        ? `${projectSoul}\n\n---\n\n${this.systemPrompt}`
        : undefined; // undefined = use default
      const raw = await this.provider.generate(rendered, undefined, sysPrompt);
      return this._clean(raw);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'AI generation failed';
      throw new Error(`AI generation failed: ${msg}`);
    }
  }

  private async _runPipeline(
    template: string,
    steps: NonNullable<ReturnType<IPromptRegistry['get']>['metadata']['pipeline_steps']>,
    options: GenerateOptions,
    projectSoul: string = ''
  ): Promise<string> {
    // Construir system prompt enriquecido con el Project Soul
    const effectiveSystemPrompt = projectSoul
      ? `${projectSoul}\n\n---\n\n${this.systemPrompt}`
      : this.systemPrompt;
    const today = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
    const params: Record<string, string> = {
      context: JSON.stringify(options.context, null, 2),
      userInputs: JSON.stringify(options.userInputs, null, 2),
      fechaActual: today,
    };
    for (const [k, v] of Object.entries(options.context)) {
      if (typeof v === 'string') params[k] = v;
    }

    const compactContextObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(options.context)) {
      if (typeof v === 'string') compactContextObj[k] = v;
    }
    const isF4Pipeline = options.promptId?.startsWith('F4_P');
    const isF4DocPipeline = isF4Pipeline && (
      options.promptId?.includes('_GENERATE_DOCUMENT') ||
      options.promptId?.includes('_GENERATE_CHAPTER')
    );
    if (options.context.previousData && !isF4DocPipeline) {
      compactContextObj.previousData = options.context.previousData;
    }
    if (options.context.webSearchResults) compactContextObj.webSearchResults = options.context.webSearchResults;

    // fase3: inyección quirúrgica según el tipo de pipeline
    // - F4 GENERATE_DOCUMENT/CHAPTER: los datos llegan vía userInputs (p4_secciones, p3_escaleta, etc.)
    //   fase3 es ruido innecesario → excluir completamente
    // - F4 FORM_SCHEMA / ORCHESTRATOR: solo necesita la lista de módulos
    //   → incluir solo { unidades } sin calculo_duracion ni metadata extra
    // - Non-F4: incluir fase3 completo
    if (options.context.fase3) {
      if (!isF4Pipeline) {
        compactContextObj.fase3 = options.context.fase3;
      } else if (!isF4DocPipeline) {
        const f3 = options.context.fase3 as Record<string, unknown>;
        compactContextObj.fase3 = { unidades: f3.unidades };
      }
      // isF4DocPipeline: no incluir fase3
    }

    // productos_previos: excluir en todos los F4 (datos relevantes vienen vía userInputs)
    if (options.context.productos_previos && !isF4Pipeline) {
      compactContextObj.productos_previos = options.context.productos_previos;
    }
    if (options.userInputs && Object.keys(options.userInputs).length > 0) {
      compactContextObj.userInputs = options.userInputs;
    }

    // Dos versiones de compactContext:
    // - fullContext  → extractor (inputs_from: []) → necesita userInputs para mapear el formulario
    // - baseContext  → especialistas, jueces → reciben datos vía TRABAJO PREVIO (output del extractor)
    //                  userInputs sería duplicado e innecesario para ellos
    const fullContext = JSON.stringify(compactContextObj);
    const baseContext = isF4DocPipeline ? (() => {
      const { userInputs: _omit, ...rest } = compactContextObj;
      return JSON.stringify(rest);
    })() : fullContext;

    params.compactContext = fullContext; // default; se sobreescribe por paso más abajo

    const stepsMap = new Map(steps.map(s => [s.agent, s]));
    const out: Record<string, string> = {};
    const totalSteps = steps.length;
    let stepIndex = 0;

    for (const step of steps) {
      if (options.onProgress) {
        await options.onProgress({ currentStep: step.agent, stepIndex, totalSteps }).catch(() => { });
      }

      if (options.getAgentOutput) {
        const cached = await options.getAgentOutput(step.agent).catch(() => null);
        if (cached) {
          out[step.agent] = cached;
          stepIndex++;
          continue;
        }
      }

      // Hardcoded "assembly" agents that don't call the LLM
      if (this._isAssemblyAgent(step.agent)) {
        const assembled = await this._handleAssemblyAgent(step.agent, out, step, options, template);
        out[step.agent] = assembled;
        if (options.onAgentOutput) {
          const override = await options.onAgentOutput(step.agent, assembled, out).catch((err) => {
            console.error(`[PIPELINE] assembler ${step.agent} falló:`, err instanceof Error ? err.message : err);
          });
          if (typeof override === 'string') {
            out[step.agent] = override;
          }
        }
        stepIndex++;
        continue;
      }

      let promptText = '';
      const isExtractorStep = Array.isArray(step.inputs_from) && step.inputs_from.length === 0;

      if (step.inputs_from !== undefined) {
        const relevantOutputs = step.inputs_from
          .filter((k) => (out[k] ?? '').trim().length > 0)
          .map((k) => `=== RESULTADO DE '${k.toUpperCase()}' ===\n${out[k]}`)
          .join('\n\n');

        // Extractor (inputs_from: []): contexto completo con userInputs
        // Especialistas y jueces (inputs_from: [prev_agent]): contexto mínimo sin userInputs
        // — ya tienen los datos mapeados en TRABAJO PREVIO
        const stepContext = isExtractorStep ? fullContext : baseContext;

        promptText =
          `TAREA ASIGNADA:\n${step.task ?? ''}\n\n` +
          `TRABAJO PREVIO:\n${relevantOutputs}\n\n` +
          `CONTEXTO:\n${stepContext}\n` +
          (step.include_template !== false ? `\nPLANTILLA / REGLAS:\n${template}` : '');
      } else {
        promptText = this._buildGenericPrompt(step, out, template);
      }

      let rendered = this.registry.render(promptText, params);
      
      // Interpolación manual de variables anidadas (Handlebars falla con strings JSON)
      if (options.userInputs) {
        rendered = rendered.replace(/\{\{\s*userInputs\.perfil\s*\}\}/g, JSON.stringify(options.userInputs.perfil || {}, null, 2));
        rendered = rendered.replace(/\{\{\s*userInputs\.objetivosAprobados\s*\}\}/g, JSON.stringify(options.userInputs.objetivosAprobados || [], null, 2));
        rendered = rendered.replace(/\{\{\s*userInputs\.notas\s*\}\}/g, String(options.userInputs.notas || 'Ninguna'));
      }

      const ctxType = isExtractorStep ? 'full' : (isF4DocPipeline ? 'base(no-userInputs)' : 'full');
      console.log(`[PIPELINE] Ejecutando agente: ${step.agent} (Step ${stepIndex + 1}/${totalSteps}) ctx=${ctxType} prompt=${rendered.length}chars`);

      let raw = '';
      if (step.tools && step.tools.length > 0) {
        raw = await this._runAgentWithTools(step, rendered, step.tools);
      } else {
        raw = await this.provider.generate(rendered, step.model, effectiveSystemPrompt);
      }

      console.log(`[PIPELINE] Respuesta de ${step.agent} recibida (${raw.length} chars)`);
      console.log(`[PIPELINE] Respuesta preview: ${raw.substring(0, 300)}...`);

      let cleaned = this._clean(raw);

      // Extraer JSON puro del texto solo cuando el output realmente es JSON
      // (agents de P1 generan markdown puro → no aplicar extracción JSON)
      const looksLikeJson = cleaned.trimStart().startsWith('{') || cleaned.trimStart().startsWith('[');
      if (looksLikeJson && step.agent.startsWith('agente_') && (step.agent.includes('_A') || step.agent.includes('_B'))) {
        cleaned = this._extractJsonFromText(cleaned);
      }

      out[step.agent] = cleaned;

      // Judge veto retry: when judge outputs "RECHAZADO", re-run specialist agents + judge (max 2x)
      if (step.agent.startsWith('juez_') && Array.isArray(step.inputs_from)) {
        let decision = this._parseJudgeDecision(out[step.agent]);
        if (decision.seleccion === 'RECHAZADO') {
          const MAX_RETRIES = 2;
          let retries = 0;
          while (decision.seleccion === 'RECHAZADO' && retries < MAX_RETRIES) {
            retries++;
            console.warn(`[PIPELINE] ${step.agent} RECHAZADO (intento ${retries}/${MAX_RETRIES}). Razón: ${decision.razon}`);
            const correctionHint = `\n\n⚠️ CORRECCIÓN OBLIGATORIA (Intento ${retries}/${MAX_RETRIES}):\nEl juez evaluador rechazó todos los borradores anteriores.\nRazón del rechazo: "${decision.razon}"\nCorrige específicamente ese problema antes de responder.`;

            for (const inputAgentName of step.inputs_from) {
              const inputStep = stepsMap.get(inputAgentName);
              if (!inputStep) continue;
              const isInputExtractor = Array.isArray(inputStep.inputs_from) && inputStep.inputs_from.length === 0;
              const inputRelevantOutputs = (inputStep.inputs_from || [])
                .filter((k: string) => (out[k] ?? '').trim().length > 0)
                .map((k: string) => `=== RESULTADO DE '${k.toUpperCase()}' ===\n${out[k]}`)
                .join('\n\n');
              const retryTask = (inputStep.task ?? '') + correctionHint;
              const retryPrompt =
                `TAREA ASIGNADA:\n${retryTask}\n\n` +
                `TRABAJO PREVIO:\n${inputRelevantOutputs}\n\n` +
                `CONTEXTO:\n${isInputExtractor ? fullContext : baseContext}\n` +
                (inputStep.include_template !== false ? `\nPLANTILLA / REGLAS:\n${template}` : '');
              const retryRendered = this.registry.render(retryPrompt, params);
              console.log(`[PIPELINE] RETRY agente ${inputAgentName} (${retryRendered.length}chars)`);
              const retryRaw = await this.provider.generate(retryRendered, inputStep.model, effectiveSystemPrompt);
              let retryCleaned = this._clean(retryRaw);
              if (inputAgentName.includes('_A') || inputAgentName.includes('_B')) {
                retryCleaned = this._extractJsonFromText(retryCleaned);
              }
              out[inputAgentName] = retryCleaned;
              if (options.onAgentOutput) {
                await options.onAgentOutput(inputAgentName, retryCleaned, out).catch(() => {});
              }
            }

            const judgeRelevantOutputs = step.inputs_from
              .filter((k: string) => (out[k] ?? '').trim().length > 0)
              .map((k: string) => `=== RESULTADO DE '${k.toUpperCase()}' ===\n${out[k]}`)
              .join('\n\n');
            const judgeRetryPrompt =
              `TAREA ASIGNADA:\n${step.task ?? ''}\n\n` +
              `TRABAJO PREVIO:\n${judgeRelevantOutputs}\n\n` +
              `CONTEXTO:\n${baseContext}\n` +
              (step.include_template !== false ? `\nPLANTILLA / REGLAS:\n${template}` : '');
            const judgeRetryRendered = this.registry.render(judgeRetryPrompt, params);
            console.log(`[PIPELINE] RETRY juez ${step.agent} (intento ${retries}/${MAX_RETRIES})`);
            const judgeRetryRaw = await this.provider.generate(judgeRetryRendered, step.model, effectiveSystemPrompt);
            out[step.agent] = this._clean(judgeRetryRaw);
            decision = this._parseJudgeDecision(out[step.agent]);
          }
          if (decision.seleccion === 'RECHAZADO') {
            console.warn(`[PIPELINE] ${step.agent} sigue RECHAZADO tras ${MAX_RETRIES} reintentos. Forzando 'A'.`);
            out[step.agent] = JSON.stringify({ seleccion: 'A', razon: `Forzado tras ${MAX_RETRIES} rechazos: ${decision.razon}` });
          }
        }
      }

      if (options.onAgentOutput) {
        const outputValue = out[step.agent] ?? '';
        const override = await options.onAgentOutput(step.agent, outputValue, out).catch((err) => {
          console.error(`[PIPELINE] onAgentOutput callback failed for ${step.agent}:`, err);
        });
        if (typeof override === 'string') {
          console.log(`[PIPELINE] ${step.agent} output OVERRIDDEN by callback`);
          out[step.agent] = override;
        }
      }

      stepIndex++;
      
      // Notificar progreso intermedio (Paso N completado)
      if (options.onProgress) {
        await options.onProgress({ 
          currentStep: `${step.agent} (finalizado)`, 
          stepIndex, 
          totalSteps 
        }).catch(() => { });
      }
    }

    const lastStep = steps[steps.length - 1];
    if (!lastStep) return '';
    return out[lastStep.agent] ?? '';
  }

  private _parseJudgeDecision(output: string): { seleccion: string; razon: string } {
    try {
      const match = output.match(/\{[\s\S]*\}/);
      if (match) {
        const obj = JSON.parse(match[0]);
        return { seleccion: obj.seleccion || '', razon: obj.razon || '' };
      }
    } catch {}
    return { seleccion: '', razon: '' };
  }

  private _isAssemblyAgent(name: string): boolean {
    return (
      ['ensamblador', 'qa_tabla_builder'].includes(name) ||
      name.startsWith('ensamblador_') ||
      name.startsWith('sintetizador_final') ||
      name.startsWith('validador_')
    );
  }

  private async _handleAssemblyAgent(name: string, out: Record<string, string>, step: any, options: GenerateOptions, template: string): Promise<string> {
    // Los agentes de ensamblaje delegan la lógica al callback onAgentOutput definido en el router.
    // Si no hay callback o el callback no retorna nada, se devuelve un string vacío para evitar placeholders.
    return '';
  }

  private _buildGenericPrompt(step: any, out: Record<string, string>, template: string): string {
    const prev = Object.entries(out).map(([k, v]) => `=== '${k.toUpperCase()}' ===\n${v}`).join('\n\n');
    return `TAREA:\n${step.task ?? ''}\n\nPREVIO:\n${prev}\n\nCONTEXTO:\n{{context}}\n\nPLANTILLA:\n${template}`;
  }

  /**
   * Limpia una respuesta que debería ser JSON pero puede contener preámbulos o errores de formato.
   */
  public static cleanJsonResponse(raw: string): string {
    if (!raw) return '{}';

    // 1. Eliminar preámbulos (texto antes del primer { o [)
    const firstBrace = raw.indexOf('{');
    const firstBracket = raw.indexOf('[');
    let start = -1;

    if (firstBrace !== -1 && firstBracket !== -1) {
      start = Math.min(firstBrace, firstBracket);
    } else {
      start = firstBrace !== -1 ? firstBrace : firstBracket;
    }

    if (start === -1) return raw;

    // Buscar el final del JSON (último } o ])
    const lastBrace = raw.lastIndexOf('}');
    const lastBracket = raw.lastIndexOf(']');
    const end = Math.max(lastBrace, lastBracket);

    let cleaned = raw.substring(start, end + 1);

    // Escapar saltos de línea crudos dentro de strings JSON para evitar errores de parsing
    cleaned = cleaned.replace(/(?<!\\)\n(?![\s]*[}\]])/g, '\\n');

    // 2. Corregir error común: { {obj}, {obj} } o { "0": {obj} } → [ {obj}, {obj} ] cuando se espera un array
    const trimmed = cleaned.trim();
    if (trimmed.startsWith('{') && trimmed.substring(1, 40).match(/^\s*(?:\{|"\d+"\s*:\s*\{)/)) {
      let depth = 0;
      let lastBraceIndex = -1;
      for (let i = 0; i < trimmed.length; i++) {
        if (trimmed[i] === '{') depth++;
        if (trimmed[i] === '}') depth--;
        if (depth === 0) {
          lastBraceIndex = i;
          break;
        }
      }

      if (lastBraceIndex !== -1) {
        let content = trimmed.substring(1, lastBraceIndex).trim();
        content = content.replace(/^\s*"\d+"\s*:\s*/, '');
        content = content.replace(/,\s*"\d+"\s*:\s*/g, ',');
        cleaned = '[' + content + ']';
      }
    }

    // 3. Corregir múltiples objetos JSON separados: {}{} o {} {} → [{},{}]
    // Detectar patrón: }{ o } { sin coma entre objetos
    const hasMultipleConsecutiveObjects = /\}\s*\{/.test(cleaned);
    if (hasMultipleConsecutiveObjects && !cleaned.trim().startsWith('[')) {
      cleaned = '[' + cleaned.replace(/\}\s*\{/g, '},{') + ']';
    } else if (hasMultipleConsecutiveObjects && cleaned.trim().startsWith('[')) {
      // Caso donde el array contiene objetos mal separados [{}, {}] -> ya es válido pero por si acaso
      cleaned = cleaned.replace(/\}\s*\{/g, '},{');
    }

    // 4. Corregir Unicode escapes mal formados
    cleaned = cleaned.replace(/\\u([0-9a-fA-F]{2,4})/g, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return `\\u${hex}`;
      }
    });

    // 5. Eliminar trailing commas
    cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

    // 6. Detectar y corregir array de pares [["key","value"], ...] → [{"key":"value"}]
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed) && parsed.length > 0 && Array.isArray(parsed[0]) && parsed[0].length === 2 && typeof parsed[0][0] === 'string') {
        const converted = [];
        let currentObj: Record<string, any> = {};
        for (const item of parsed) {
          if (Array.isArray(item) && item.length === 2) {
            const [k, v] = item;
            // Si detectamos la clave inicial de un objeto y el actual ya tiene datos, cerramos el actual
            if ((k === 'curso' || k === 'practica' || k === 'codigo') && Object.keys(currentObj).length > 0) {
              converted.push({ ...currentObj });
              currentObj = {};
            }
            currentObj[k] = v;
          }
        }
        if (Object.keys(currentObj).length > 0) converted.push(currentObj);
        return JSON.stringify(converted);
      }
    } catch {
      // Si el parseo interno falla, devolvemos el string limpio hasta el paso 5
    }

    return cleaned;
  }

  private _clean(raw: string): string {
    let cleaned = raw.replace(/```\w*\s*([\s\S]*?)```/i, '$1').trim();

    // ── Output Sanitizer ───────────────────────────────────────────────────
    // Detecta patrones prohibidos que indican Prompt Bleeding o fugas internas.

    // 1. Eliminar nombres de variables internas filtradas
    cleaned = cleaned.replace(/\bp\d+_secciones\.\w+/g, '');
    cleaned = cleaned.replace(/\bundefined\b/gi, '');

    // 2. Decodificar URIs mal formadas (ej. %CC%81 → caracteres reales)
    cleaned = cleaned.replace(/%[0-9A-Fa-f]{2}/g, (match) => {
      try { return decodeURIComponent(match); }
      catch { return match; }
    });

    // 3. Detectar fragmentos significativos en inglés (Prompt Bleeding)
    //    Solo loguear — no mutilar el output, ya que puede haber términos técnicos legítimos.
    const englishPatterns = /\b(acceptance criteria|learning outcomes|the following|as follows|please note|in conclusion|deliverables|assessment|stakeholder)\b/gi;
    const englishMatches = cleaned.match(englishPatterns);
    if (englishMatches && englishMatches.length >= 3) {
      console.warn(`[ai-service] ⚠️ Posible Prompt Bleeding detectado: ${englishMatches.length} fragmentos en inglés encontrados: ${englishMatches.slice(0, 5).join(', ')}`);
    }

    return cleaned;
  }

  /**
   * Sanitiza un output final de documento (usado por los assemblers).
   * Limpia artefactos de IA, variables internas, y URIs codificadas.
   */
  public static sanitizeOutput(text: string): string {
    if (!text) return '';

    let cleaned = text;

    // Eliminar variables internas filtradas
    cleaned = cleaned.replace(/\bp\d+_secciones\b[.\w]*/g, '');
    cleaned = cleaned.replace(/\{\{[^}]+\}\}/g, ''); // Handlebars sin resolver
    cleaned = cleaned.replace(/\bundefined\b/gi, '');

    // Decodificar URIs
    cleaned = cleaned.replace(/%[0-9A-Fa-f]{2}(?:%[0-9A-Fa-f]{2})*/g, (match) => {
      try { return decodeURIComponent(match); }
      catch { return match; }
    });

    // Limpiar líneas completamente vacías consecutivas (máx 2)
    cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');

    return cleaned;
  }

  /**
 * Ejecuta un agente con soporte para herramientas (tool calling)
 */
  private async _runAgentWithTools(
    step: any,
    renderedPrompt: string,
    tools?: any[]
  ): Promise<string> {
    console.log(`[RUN_AGENT] Agente: ${step.agent}`);
    
    // Si no hay tools, usar generate normal (recomendado)
    if (!tools || tools.length === 0) {
      console.log(`[RUN_AGENT] Sin herramientas, usando generate`);
      return await this.provider.generate(renderedPrompt, step.model);
    }
    
    // Fallback para fases que aún usan tools (legacy)
    console.log(`[RUN_AGENT] Con herramientas (legacy), usando chat`);
    const formattedTools = tools.map(tool => ({
      type: 'function',
      function: {
        name: typeof tool === 'string' ? tool : tool.name,
        description: tool.description || '',
        parameters: tool.parameters || {
          type: 'object',
          properties: { query: { type: 'string' } },
          required: ['query']
        }
      }
    }));
    
    const response = await this.provider.chat(renderedPrompt, formattedTools);
    return response.content;
  }

  /**
   * Extrae JSON puro del texto devuelto por el LLM.
   * Limpia preámbulos, bloques de código markdown, y extrae el primer objeto o array JSON válido.
   */
  private _extractJsonFromText(text: string): string {
    let cleaned = text.trim();

    // Eliminar bloques de código markdown
    cleaned = cleaned.replace(/^```json\s*/i, '');
    cleaned = cleaned.replace(/^```\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/i, '');

    // Eliminar frases de preámbulo comunes
    const prefixes = [
      /^aquí te dejo el resultado en json:\s*/i,
      /^aquí está el resultado:\s*/i,
      /^el resultado es:\s*/i,
      /^a continuación:\s*/i,
      /^te presento el resultado:\s*/i,
      /^devuelvo el siguiente json:\s*/i,
    ];
    for (const prefix of prefixes) {
      cleaned = cleaned.replace(prefix, '');
    }

    // Buscar el primer { o [ y el último } o ]
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    const start = firstBrace !== -1 ? (firstBracket !== -1 ? Math.min(firstBrace, firstBracket) : firstBrace) : firstBracket;

    const lastBrace = cleaned.lastIndexOf('}');
    const lastBracket = cleaned.lastIndexOf(']');
    const end = lastBrace !== -1 ? (lastBracket !== -1 ? Math.max(lastBrace, lastBracket) : lastBrace) : lastBracket;

    if (start !== -1 && end !== -1 && end > start) {
      return cleaned.substring(start, end + 1);
    }

    return cleaned;
  }
}
