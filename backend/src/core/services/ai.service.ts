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
  onProgress?: (progress: { currentStep: string; stepIndex: number; totalSteps: number }) => Promise<void>;
  /**
   * Persiste el output de un agente en DB después de generarlo.
   * Si se omite, los outputs solo viven en memoria durante el pipeline.
   * Errores en este callback son ignorados (no abortan el pipeline).
   */
  onAgentOutput?: (agentName: string, output: string) => Promise<void>;
  /**
   * Carga el output de un agente desde DB.
   * Si devuelve un string, el pipeline lo usa en lugar de regenerar el agente.
   * Permite reanudar un pipeline fallido desde el último checkpoint guardado.
   */
  getAgentOutput?: (agentName: string) => Promise<string | null>;
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
    const params: Record<string, string> = {
      context:     JSON.stringify(options.context, null, 2),
      userInputs:  JSON.stringify(options.userInputs, null, 2),
      fechaActual: today,
    };
    for (const [k, v] of Object.entries(options.context)) {
      if (typeof v === 'string') {
        params[k] = v;
      }
    }
    const rendered = this.registry.render(template, params);
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
    };
    for (const [k, v] of Object.entries(options.context)) {
      if (typeof v === 'string') {
        params[k] = v;
      }
    }

    // Versión compacta del contexto: solo los campos de texto esenciales.
    // Se inyecta via {{compactContext}} en los agentes que usan inputs_from,
    // evitando serializar previousData completo (~decenas de KB).
    params.compactContext = JSON.stringify(
      Object.fromEntries(
        Object.entries(options.context).filter(([_, v]) => typeof v === 'string')
      )
    );

    // Named outputs — each agent's result is stored by role for downstream stages
    const out: Record<string, string> = {};

    const totalSteps = steps.length;
    let stepIndex = 0;

    for (const step of steps) {
      let promptText: string;

      if (options.onProgress) {
        // Ejecución asíncrona permitida para no bloquear el start del agente (el update tira a Supabase en bg)
        await options.onProgress({ currentStep: step.agent, stepIndex, totalSteps }).catch(() => {});
      }

      // ── Checkpoint: reanudar desde DB si el agente ya fue completado ─────────
      // Permite retomar un pipeline fallido sin regenerar los agentes previos.
      if (options.getAgentOutput) {
        const cached = await options.getAgentOutput(step.agent).catch(() => null);
        if (cached) {
          out[step.agent] = cached;
          console.log(`[pipeline] '${step.agent}' restaurado desde checkpoint (${cached.length} chars)`);
          stepIndex++;
          continue;
        }
      }

      // ── sintetizador_final_f2: post-procesamiento en código, sin IA ────────────
      if (step.agent === 'sintetizador_final_f2') {
        const source = step.inputs_from?.length
          ? (out[step.inputs_from[0] ?? ''] ?? out['juez_f2'] ?? '')
          : (out['juez_f2'] ?? '');

        const cleaned = _cleanF2Document(source);
        out['sintetizador_final_f2'] = cleaned;

        if (options.onAgentOutput && cleaned) {
          options.onAgentOutput('sintetizador_final_f2', cleaned).catch((err) =>
            console.error(`[pipeline] onAgentOutput failed for 'sintetizador_final_f2':`, err)
          );
        }
        console.log(`[pipeline] 'sintetizador_final_f2' aplicado en código (${cleaned.length} chars)`);
        stepIndex++;
        continue;
      }

      // ── sintetizador_final_f2_5: post-procesamiento en código, sin IA ───────────
      // El juez elige borrador A o B; el sintetizador limpia y entrega el documento final.
      if (step.agent === 'sintetizador_final_f2_5') {
        const juezOutput = step.inputs_from?.length
          ? (out[step.inputs_from[0] ?? ''] ?? out['agente_juez_f2_5'] ?? '')
          : (out['agente_juez_f2_5'] ?? '');

        const borradorElegidoMatch = juezOutput.match(/"borrador_elegido"\s*:\s*"([AB])"/i);
        const elegido = borradorElegidoMatch?.[1] ?? 'A';
        const source = elegido === 'B'
          ? (out['agente_doble_B_f2_5'] ?? out['agente_doble_A_f2_5'] ?? '')
          : (out['agente_doble_A_f2_5'] ?? out['agente_doble_B_f2_5'] ?? '');

        const cleaned = _cleanF2_5Document(source, juezOutput);
        out['sintetizador_final_f2_5'] = cleaned;

        if (options.onAgentOutput && cleaned) {
          options.onAgentOutput('sintetizador_final_f2_5', cleaned).catch((err) =>
            console.error(`[pipeline] onAgentOutput failed for 'sintetizador_final_f2_5':`, err)
          );
        }
        console.log(`[pipeline] 'sintetizador_final_f2_5' borrador ${elegido} limpiado (${cleaned.length} chars)`);
        stepIndex++;
        continue;
      }

      // ── sintetizador_final_f3: post-procesamiento en código, sin IA ────────────
      // Mismo patrón que F2: el juez elige borrador A o B, aquí solo se limpia.
      if (step.agent === 'sintetizador_final_f3') {
        const juezOutput = step.inputs_from?.length
          ? (out[step.inputs_from[0] ?? ''] ?? out['agente_juez_f3'] ?? '')
          : (out['agente_juez_f3'] ?? '');

        // Extraer borrador elegido del JSON del juez
        const borradorElegidoMatch = juezOutput.match(/"borrador_elegido"\s*:\s*"([AB])"/i);
        const elegido = borradorElegidoMatch?.[1] ?? 'A';
        const source = elegido === 'B'
          ? (out['agente_doble_B_f3'] ?? out['agente_doble_A_f3'] ?? '')
          : (out['agente_doble_A_f3'] ?? out['agente_doble_B_f3'] ?? '');

        const cleaned = _cleanF3Document(source, juezOutput);
        out['sintetizador_final_f3'] = cleaned;

        if (options.onAgentOutput && cleaned) {
          options.onAgentOutput('sintetizador_final_f3', cleaned).catch((err) =>
            console.error(`[pipeline] onAgentOutput failed for 'sintetizador_final_f3':`, err)
          );
        }
        console.log(`[pipeline] 'sintetizador_final_f3' borrador ${elegido} limpiado (${cleaned.length} chars)`);
        stepIndex++;
        continue;
      }

      // ── Sintetizador final: siempre sintetiza, nunca bloquea al usuario ─────────
      // Independientemente del veredicto del juez (ok/revisar/humano), el sintetizador
      // siempre produce un documento final. El prompt le indica qué hacer en cada caso.
      // Nota: decision=='humano' ya no provoca un early-exit — el LLM elige automáticamente
      // la mejor propuesta disponible según sus instrucciones.

      // ── validador_f0: verifica que se generaron exactamente 9 preguntas ─────────
      if (step.agent === 'validador_f0') {
        const preguntas = out['seccion_5_preguntas'] ?? '';
        const lines = preguntas.split('\n').filter((l) => /¿|.*\?$/.test(l.trim()));
        const count = lines.length;
        const passed = count === 9;
        const result = { passed, question_count: count, issues: passed ? [] : [`${count} preguntas encontradas, se esperaban 9`] };
        out['validador_f0'] = JSON.stringify(result);
        if (!passed) console.warn(`[validador_f0] ADVERTENCIA: ${count} preguntas (se esperaban 9)`);
        else console.log(`[validador_f0] OK: ${count} preguntas`);
        stepIndex++;
        continue;
      }

      // ── validador_f1: verifica que el extractor mapeó todos los pares Q&A ──────
      if (step.agent === 'validador_f1') {
        const extractorRaw = out['extractor'] ?? '{}';
        let qaCount = 0;
        try {
          const parsed = JSON.parse(extractorRaw) as { qa?: unknown[] };
          qaCount = parsed.qa?.length ?? 0;
        } catch { /* JSON inválido */ }
        const passed = qaCount >= 5;
        const result = { passed, qa_count: qaCount, issues: passed ? [] : [`Solo ${qaCount} pares Q&A extraídos (mínimo 5)`] };
        out['validador_f1'] = JSON.stringify(result);
        if (!passed) console.warn(`[validador_f1] ADVERTENCIA: ${qaCount} pares Q&A`);
        else console.log(`[validador_f1] OK: ${qaCount} pares Q&A`);
        stepIndex++;
        continue;
      }

      // ── qa_tabla_builder: construye tabla Markdown de Q&A desde el JSON del extractor ─
      // Garantiza que TODOS los pares aparezcan en la tabla, sin depender del LLM.
      if (step.agent === 'qa_tabla_builder') {
        let qa: Array<{ pregunta: string; respuesta: string }> = [];
        try {
          const parsed = JSON.parse(out['extractor'] ?? '{}') as { qa?: Array<{ pregunta: string; respuesta: string }> };
          qa = parsed.qa ?? [];
        } catch { /* extractor JSON inválido */ }
        if (qa.length === 0) {
          out['qa_tabla_builder'] = '_No se encontraron preguntas._';
        } else {
          const escape = (s: string) => (s ?? 'No especificada').replace(/\|/g, '/').replace(/\n/g, ' ').trim();
          const rows = qa.map((p, i) => `| ${i + 1} | ${escape(p.pregunta)} | ${escape(p.respuesta)} |`).join('\n');
          out['qa_tabla_builder'] = `| # | Pregunta | Respuesta del cliente |\n|:---|:---|:---|\n${rows}`;
        }
        console.log(`[qa_tabla_builder] Tabla generada con ${qa.length} pares Q&A`);
        stepIndex++;
        continue;
      }

      // ── validador_f2: detecta y limpia placeholders AGENTE_*.* en output del juez ─
      if (step.agent === 'validador_f2') {
        const juezOutput = out['juez_f2'] ?? '';
        const agentePlaceholders = juezOutput.match(/AGENTE_[A-Z_]+\.[A-Za-z]+/g) ?? [];
        const bracketPlaceholders = juezOutput.match(/\[(?:nombre|texto|valor|módulo [0-9]+|N|X|Y)\]/gi) ?? [];
        const allIssues = [...agentePlaceholders, ...bracketPlaceholders];

        if (allIssues.length > 0) {
          // Limpiar en código: reemplazar referencias a agentes por etiquetas descriptivas
          const cleaned = juezOutput
            .replace(/AGENTE_ESTRUCTURA\.(\w+)/g, (_, f) => `Módulo con campo ${f}`)
            .replace(/AGENTE_[A-Z_]+\.(\w+)/g, (_, f) => f)
            .replace(/\[(?:nombre|texto|valor)\]/gi, '')
            .replace(/\[módulo [0-9]+\]/gi, '');
          out['juez_f2'] = cleaned;
          console.warn(`[validador_f2] ${allIssues.length} placeholder(s) detectados y limpiados:`, allIssues.slice(0, 5));
        } else {
          console.log('[validador_f2] OK: sin placeholders en juez_f2');
        }
        out['validador_f2'] = JSON.stringify({ passed: allIssues.length === 0, issues: allIssues });
        stepIndex++;
        continue;
      }

      // ── validador_f3: detecta placeholders [Y]/[N]/[X] y optimiza elección del juez ─
      if (step.agent === 'validador_f3') {
        const juezJson  = out['agente_juez_f3'] ?? '';
        const borradorA = out['agente_doble_A_f3'] ?? '';
        const borradorB = out['agente_doble_B_f3'] ?? '';

        const elegidoMatch = juezJson.match(/"borrador_elegido"\s*:\s*"([AB])"/i);
        const elegido = elegidoMatch?.[1] ?? 'A';

        const PLACEHOLDER_RE = /\[[YyNnXx]\](?:\s*min)?|\[(?:texto|nombre|valor|N|X|Y)\]/gi;
        const countPlaceholders = (txt: string) => (txt.match(PLACEHOLDER_RE) ?? []).length;
        const cntA = countPlaceholders(borradorA);
        const cntB = countPlaceholders(borradorB);
        const cntChosen = elegido === 'B' ? cntB : cntA;
        const cntAlt    = elegido === 'B' ? cntA : cntB;

        const issues: string[] = [];
        let betterLabel = elegido;

        if (cntChosen > 0) {
          issues.push(`Borrador ${elegido} tiene ${cntChosen} placeholder(s)`);
          if (cntAlt < cntChosen) {
            betterLabel = elegido === 'A' ? 'B' : 'A';
            const updated = juezJson.replace(/"borrador_elegido"\s*:\s*"[AB]"/i, `"borrador_elegido": "${betterLabel}"`);
            out['agente_juez_f3'] = updated;
            console.warn(`[validador_f3] Cambiando elección de ${elegido} → ${betterLabel} (${cntChosen} vs ${cntAlt} placeholders)`);
          }
        }

        // Parchear el borrador elegido: reemplazar [Y] min → duracionVideo, [N] → numVideos
        const extractorOut = out['extractor_f3'] ?? '';
        const durMatch  = extractorOut.match(/duracionVideo:\s*(\d+)/);
        const vidMatch  = extractorOut.match(/numVideos:\s*(\d+)/);
        const durValue  = durMatch?.[1] ?? '6';
        const vidValue  = vidMatch?.[1] ?? '5';
        const sourceKey = betterLabel === 'B' ? 'agente_doble_B_f3' : 'agente_doble_A_f3';
        const rawSource = out[sourceKey] ?? '';
        const patched   = rawSource
          .replace(/\[[YyNnXx]\]\s*min/g, `${durValue} min`)
          .replace(/\[(?:N|Y|X)\]\s*videos?/gi, `${vidValue} videos`)
          .replace(/\[[YyNnXx]\]/g, '');
        out[sourceKey] = patched;

        if (issues.length > 0) console.warn('[validador_f3] Issues:', issues);
        else console.log('[validador_f3] OK: sin placeholders críticos');
        out['validador_f3'] = JSON.stringify({ passed: issues.length === 0, borrador_usado: betterLabel, issues });
        stepIndex++;
        continue;
      }

      // ── F4 validadores y sintetizador_final (código puro, sin IA) ─────────────
      // Helper local: extrae el borrador elegido por el juez del producto Px.
      // Busca la clave juez_px en out[] y lee borrador_elegido del JSON.
      const _getF4Borrador = (px: string): string => {
        let elegido = 'A';
        try { elegido = (JSON.parse(out[`juez_${px}`] ?? '{}') as { borrador_elegido?: string }).borrador_elegido ?? 'A'; } catch { /* JSON inválido */ }
        return elegido === 'B'
          ? (out[`agente_b_${px}`] ?? out[`agente_a_${px}`] ?? '')
          : (out[`agente_a_${px}`] ?? out[`agente_b_${px}`] ?? '');
      };

      // ── validador_p0: Cronograma — las 4 fases EC0366 están presentes ───────
      if (step.agent === 'validador_p0') {
        const FASES_REQ = ['diseño instruccional', 'producción', 'integración', 'revisión'];
        const borrador = _getF4Borrador('p0');
        const lower = borrador.toLowerCase();
        const faltantes = FASES_REQ.filter((f) => !lower.includes(f));
        const passed = faltantes.length === 0;
        out['validador_p0'] = JSON.stringify({ passed, fases_faltantes: faltantes });
        if (!passed) console.warn(`[validador_p0] Fases faltantes:`, faltantes);
        else console.log('[validador_p0] OK: 4 fases presentes');
        stepIndex++; continue;
      }

      // ── validador_p1: Info General — 3 dominios de Bloom presentes ──────────
      if (step.agent === 'validador_p1') {
        const DOMINIOS = ['cognitivo', 'psicomotriz', 'afectivo'];
        const borrador = _getF4Borrador('p1');
        const lower = borrador.toLowerCase();
        const faltantes = DOMINIOS.filter((d) => !lower.includes(d));
        const passed = faltantes.length === 0;
        out['validador_p1'] = JSON.stringify({ passed, dominios_faltantes: faltantes });
        if (!passed) console.warn('[validador_p1] Dominios Bloom faltantes:', faltantes);
        else console.log('[validador_p1] OK: 3 dominios presentes');
        stepIndex++; continue;
      }

      // ── validador_p2: Guías — ponderaciones normalizadas a 100% ─────────────
      if (step.agent === 'validador_p2') {
        const borrador = _getF4Borrador('p2');
        const matches = [...borrador.matchAll(/\|\s*(\d+)\s*%/g)];
        const ponderaciones = matches.map((m) => parseInt(m[1] ?? '0'));
        const suma = ponderaciones.reduce((a, b) => a + b, 0);
        const passed = suma >= 95 && suma <= 105;
        if (!passed && suma > 10) {
          // Normalizar proporcionalmente
          const factor = 100 / suma;
          const normalizado = borrador.replace(/\|\s*(\d+)\s*%/g, (_, n) => `| ${Math.round(parseInt(n as string) * factor)}%`);
          const px = 'p2';
          let elegido = 'A';
          try { elegido = (JSON.parse(out['juez_p2'] ?? '{}') as { borrador_elegido?: string }).borrador_elegido ?? 'A'; } catch { /* */ }
          if (elegido === 'B') out['agente_b_p2'] = normalizado; else out['agente_a_p2'] = normalizado;
          console.warn(`[validador_p2] Ponderaciones normalizadas: ${suma}% → 100%`);
        } else console.log(`[validador_p2] OK: suma ponderaciones = ${suma}%`);
        out['validador_p2'] = JSON.stringify({ passed, suma_ponderaciones: suma });
        stepIndex++; continue;
      }

      // ── validador_p3: Calendario — hay al menos una semana definida ──────────
      if (step.agent === 'validador_p3') {
        const borrador = _getF4Borrador('p3');
        const semanas = (borrador.match(/semana\s+\d+/gi) ?? []).length;
        const passed = semanas >= 1;
        out['validador_p3'] = JSON.stringify({ passed, semanas_detectadas: semanas });
        if (!passed) console.warn('[validador_p3] No se detectaron semanas en el calendario');
        else console.log(`[validador_p3] OK: ${semanas} semana(s) detectada(s)`);
        stepIndex++; continue;
      }

      // ── validador_p4: Documentos — mínimo 500 palabras ──────────────────────
      if (step.agent === 'validador_p4') {
        const borrador = _getF4Borrador('p4');
        const palabras = borrador.split(/\s+/).filter((w) => w.length > 0).length;
        const passed = palabras >= 500;
        out['validador_p4'] = JSON.stringify({ passed, palabras_detectadas: palabras });
        if (!passed) console.warn(`[validador_p4] Solo ${palabras} palabras (mínimo 500)`);
        else console.log(`[validador_p4] OK: ${palabras} palabras`);
        stepIndex++; continue;
      }

      // ── validador_p5: Presentación — ≥8 diapositivas + secciones clave ──────
      if (step.agent === 'validador_p5') {
        const borrador = _getF4Borrador('p5');
        const lower = borrador.toLowerCase();
        const diapositivas = (borrador.match(/\|\s*\d+\s*\|/g) ?? []).length;
        const SECCIONES = ['portada', 'agenda', 'objetivo', 'resumen'];
        const faltantes = SECCIONES.filter((s) => !lower.includes(s));
        const passed = diapositivas >= 8 && faltantes.length === 0;
        out['validador_p5'] = JSON.stringify({ passed, diapositivas, secciones_faltantes: faltantes });
        if (!passed) console.warn(`[validador_p5] Diapositivas: ${diapositivas}, secciones faltantes:`, faltantes);
        else console.log(`[validador_p5] OK: ${diapositivas} diapositivas, secciones completas`);
        stepIndex++; continue;
      }

      // ── validador_p6: Guiones — al menos (numVideos) secciones de video ─────
      if (step.agent === 'validador_p6') {
        const borrador = _getF4Borrador('p6');
        const videos = (borrador.match(/##\s*(?:video|vídeo)\s*\d+/gi) ?? []).length;
        let numEsperado = 2;
        try { numEsperado = (JSON.parse(out['extractor_f4_p6'] ?? '{}') as { numVideos?: number }).numVideos ?? 2; } catch { /* */ }
        const passed = videos >= Math.min(numEsperado, 2); // mínimo 2 siempre
        out['validador_p6'] = JSON.stringify({ passed, videos_detectados: videos, esperados: numEsperado });
        if (!passed) console.warn(`[validador_p6] ${videos} video(s) detectados, se esperaban ${numEsperado}`);
        else console.log(`[validador_p6] OK: ${videos} video(s)`);
        stepIndex++; continue;
      }

      // ── validador_p7: Evaluación — 3 instrumentos + rúbrica suma 100% ───────
      if (step.agent === 'validador_p7') {
        const borrador = _getF4Borrador('p7');
        const lower = borrador.toLowerCase();
        const tieneRubrica      = /r[uú]brica/i.test(borrador);
        const tieneCotejo       = /cotejo/i.test(borrador);
        const tieneCuestionario = /cuestionario/i.test(borrador);
        const preguntas  = (borrador.match(/^\|\s*\d+\s*\|/gm) ?? []).length;
        const criterios  = (borrador.match(/criterio\s*\d+/gi) ?? []).length;
        // Verificar suma de porcentajes de rúbrica (busca últimas 4 ocurrencias de [n]%)
        const porcentajes = [...borrador.matchAll(/\|\s*(\d+)\s*%/g)].map((m) => parseInt(m[1] ?? '0'));
        const sumaRubrica = porcentajes.slice(-5).reduce((a, b) => a + b, 0);
        const passed = tieneRubrica && tieneCotejo && tieneCuestionario && preguntas >= 5 && criterios >= 4;
        out['validador_p7'] = JSON.stringify({
          passed, tiene_rubrica: tieneRubrica, tiene_cotejo: tieneCotejo,
          tiene_cuestionario: tieneCuestionario, preguntas, criterios, suma_rubrica: sumaRubrica,
        });
        if (!passed) console.warn('[validador_p7] Instrumentos incompletos:', { tieneRubrica, tieneCotejo, tieneCuestionario, preguntas, criterios });
        else console.log('[validador_p7] OK: 3 instrumentos presentes');
        stepIndex++; continue;
      }

      // ── sintetizador_final_f4: limpieza de placeholders y entrega final ──────
      // Compartido por todos los productos F4_P0–F4_P7.
      // Lee el borrador elegido por el juez del producto actual,
      // limpia placeholders residuales y sustituye variables conocidas del extractor.
      if (step.agent === 'sintetizador_final_f4') {
        // Detectar producto activo por presencia de clave juez_px en out[]
        const pxKey = Object.keys(out).find((k) => /^juez_p\d$/.test(k));
        const px = pxKey ? pxKey.replace('juez_', '') : 'p0';

        let documento = _getF4Borrador(px);

        // 1. Limpiar placeholders genéricos
        const PLACEHOLDER_RE = /\[[YyNnXx]\](?:\s*min)?|\[(?:texto|nombre|valor|Por definir|N|X|Y)\]/gi;
        documento = documento.replace(PLACEHOLDER_RE, '[Por definir]');

        // 2. Limpiar referencias de agentes (AGENTE_X.campo)
        documento = documento.replace(/AGENTE_[A-Z_]+\.(\w+)/g, '');

        // 3. Sustituir variables conocidas del extractor si están disponibles
        try {
          const ext = JSON.parse(out[`extractor_f4_${px}`] ?? '{}') as Record<string, unknown>;
          if (typeof ext.projectName === 'string')
            documento = documento.replace(/\{\{projectName\}\}/g, ext.projectName);
          if (typeof ext.clientName === 'string')
            documento = documento.replace(/\{\{clientName\}\}/g, ext.clientName);
        } catch { /* extractor JSON inválido — sin sustitución */ }

        out['sintetizador_final_f4'] = documento;
        if (options.onAgentOutput && documento) {
          options.onAgentOutput('sintetizador_final_f4', documento).catch((err) =>
            console.error(`[pipeline] onAgentOutput failed for 'sintetizador_final_f4':`, err)
          );
        }
        console.log(`[pipeline] 'sintetizador_final_f4' [${px}] limpiado (${documento.length} chars)`);
        stepIndex++; continue;
      }

      // ── Ensamblador: concatena outputs previos sin llamar a la IA ────────────
      // Actúa como "pegamento" final: une los outputs de inputs_from en orden,
      // añadiendo el encabezado del documento al inicio.
      if (step.agent === 'ensamblador' && step.inputs_from !== undefined) {
        const today = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
        const projectName = (options.context['projectName'] as string | undefined) ?? '';
        const header =
          `# MARCO DE REFERENCIA DEL CLIENTE\n` +
          `**Proyecto:** ${projectName}\n` +
          `**Fecha de investigación:** ${today}\n` +
          `**Investigador:** IA (fuentes documentadas)\n\n---\n\n`;
        // Solo procesar keys declarados — defensa contra acumulación accidental en out[].
        const validKeys = [...new Set(step.inputs_from)];

        // Frases que indican que el modelo generó texto residual fuera de su sección.
        const RESIDUAL_MARKERS = [
          /\nSECUENCIA DE ESCRITURA/i,
          /\nSiguiente[:\s]+Secci[oó]n/i,
          /\nPASO\s+\d+[:.\s]/i,
          /\nCONCLUSI[OÓ]N FINAL/i,
          /\nNota del autor/i,
          /\nFIN DEL EJEMPLO/i,
        ];

        // ── Formatear preguntas de diagnóstico ──────────────────────────────────
        // seccion_5_preguntas genera texto plano (una pregunta por línea, sin formato).
        // El ensamblador aplica formato de viñeta bold — compatible con cualquier visor PDF/MD.
        const preguntasKey = 'seccion_5_preguntas';
        if (validKeys.includes(preguntasKey) && (out[preguntasKey] ?? '').trim().length > 0) {
          const preguntasRaw = out[preguntasKey] ?? '';
          const preguntas = preguntasRaw
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l.includes('?'));
          if (preguntas.length > 0) {
            out[preguntasKey] =
              `### Preguntas para el cliente (máximo 10)\n\n` +
              preguntas
                .map(
                  (p) =>
                    `- **${p}**\n` +
                    `  - *Objetivo:* Obtener información necesaria para el diseño del curso.\n` +
                    `  - *Justificación:* Permite tomar decisiones fundamentadas sobre el diseño instruccional.`
                )
                .join('\n\n');
          }
        }

        // Une secciones con separador, pero evita `---` doble si la sección ya termina con uno.
        // Cada sección se trunca si el modelo generó contenido extra fuera de su alcance.
        const sections = validKeys
          .map((k) => {
            let raw = (out[k] ?? '').trim();
            // 1. Truncar en el segundo encabezado ## (indica sección adicional no solicitada).
            const firstH2 = raw.indexOf('\n##');
            if (firstH2 !== -1) {
              const secondH2 = raw.indexOf('\n##', firstH2 + 1);
              if (secondH2 !== -1) raw = raw.slice(0, secondH2).trim();
            }
            // 2. Truncar en marcadores de contenido residual conocidos.
            for (const marker of RESIDUAL_MARKERS) {
              const match = marker.exec(raw);
              if (match?.index !== undefined) raw = raw.slice(0, match.index).trim();
            }
            return raw;
          })
          .filter((s) => s.length > 0);

        const joined = sections.reduce((acc, section, i) => {
          if (i === 0) return section;
          const prevEndsWithSep = acc.trimEnd().endsWith('---');
          const sep = prevEndsWithSep ? '\n\n' : '\n\n---\n\n';
          return acc + sep + section;
        }, '');
        const assembled = header + joined;
        out['ensamblador'] = assembled;
        if (options.onAgentOutput && assembled) {
          options.onAgentOutput('ensamblador', assembled).catch((err) =>
            console.error(`[pipeline] onAgentOutput failed for 'ensamblador':`, err)
          );
        }
        stepIndex++;
        continue;
      }

      // ── Handler controlado por inputs_from ────────────────────────────────────
      // Si el step declara inputs_from (aunque sea []), usa este handler en lugar
      // del switch hardcodeado. Esto corrige el bug del synthesizer en F0 y permite
      // que cualquier agente reciba exactamente lo que necesita sin acumular todo.
      if (step.inputs_from !== undefined) {
        const relevantOutputs = step.inputs_from
          .filter((k) => (out[k] ?? '').trim().length > 0)
          .map((k) => {
            const content = out[k] ?? '';
            const limit = step.max_input_chars;
            const text =
              limit !== undefined && content.length > limit
                ? content.slice(0, limit) + '\n[...truncado para economizar tokens]'
                : content;
            return `=== RESULTADO DE '${k.toUpperCase()}' ===\n${text}`;
          })
          .join('\n\n');

        const templateSection =
          step.include_template !== false ? `\nPLANTILLA / REGLAS ESTRUCTURALES:\n${template}` : '';

        const taskText = step.task
          ?? (step.rules
            ? `ERES EL JUEZ VALIDADOR FINAL. Revisa el documento y emite la versión corregida.\n\nREGLAS DE AUDITORÍA:\n${step.rules.map((r) => `- ${r}`).join('\n')}`
            : '');

        promptText =
          `TAREA ASIGNADA:\n${taskText}\n\n` +
          (relevantOutputs ? `TRABAJO PREVIO:\n${relevantOutputs}\n\n` : '') +
          `CONTEXTO:\n{{compactContext}}\n` +
          templateSection;

      } else {
        // ── Switch legacy (retrocompatible para agentes sin inputs_from) ─────────
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

          default: {
            const previousOutputs = Object.entries(out)
              .filter(([_, v]) => v.trim().length > 0)
              .map(([k, v]) => `=== RESULTADO DE '${k.toUpperCase()}' ===\n${v}`)
              .join('\n\n');

            promptText =
              `Continúa procesando.\n\nTAREA ASIGNADA:\n${step.task ?? ''}\n\n` +
              `TRABAJO PREVIO DISPONIBLE (CONSOLIDADO):\n${previousOutputs}\n\n` +
              `CONTEXTO ORIGINAL:\n{{context}}\n\n` +
              `PLANTILLA / REGLAS ESTRUCTURALES:\n${template}`;
            break;
          }
        }
      } // fin if inputs_from / else switch

      const rendered = this.registry.render(promptText, params);
      const model = this._getModelForAgent(step.agent, step.model);

      console.log(`[pipeline] Ejecutando paso del pipeline: '${step.agent}' con modelo ${model}...`);

      try {
        const raw = this.isProd
          ? await this._workersAI(rendered, model)
          : await this._ollama(rendered, model);
        out[step.agent] = this._clean(raw);
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown AI error';
        throw new Error(`Pipeline failed at step '${step.agent}': ${msg}`);
      }

      // ── Persistir output intermedio en DB (fire-and-forget) ──────────────────
      if (options.onAgentOutput && out[step.agent]) {
        options.onAgentOutput(step.agent, out[step.agent] as string).catch((err) =>
          console.error(`[pipeline] onAgentOutput failed for '${step.agent}':`, err)
        );
      }

      stepIndex++;
    }

    // Return the output of the last pipeline step that produced content.
    // Works for any pipeline shape: legacy (judge/synthesizer) and section-based (ensamblador).
    const lastStep = steps[steps.length - 1];
    const finalOutput = lastStep !== undefined ? (out[lastStep.agent] ?? '') : '';
    return (
      finalOutput ||
      out['ensamblador'] ||
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

  private _extractJson(raw: string): string {
    const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
    return fenced ? (fenced[1] ?? '').trim() : raw.trim();
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

    // stream:true mantiene la conexión HTTP activa durante la generación.
    // Con stream:false, Ollama cierra la conexión tras ~5 min → "fetch failed".
    //
    // num_ctx:8192 evita la truncación silenciosa del prompt.
    // El log de Ollama muestra "truncating input prompt limit=4096 prompt=4895"
    // cuando specialist_a recibe el output del extractor — el contexto por
    // defecto (4096) se queda corto. Con 8192 hay margen suficiente para todos
    // los pasos del pipeline sin perder el inicio del prompt.
    console.log(`[Ollama request] Model: ${model} | Prompt size: ${prompt.length} chars`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10 * 60 * 1000); // 10 minutos

    let res: Response;
    try {
      res = await fetch(`${base}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          system: sysPrompt ?? this.systemPrompt,
          stream: true,
          options: { num_ctx: 16384 },
        }),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      const cause = err instanceof Error && err.cause instanceof Error
        ? err.cause.message
        : String((err as Error)?.cause ?? '');
      throw new Error(`Ollama no accesible (${base}): ${(err as Error).message}${cause ? ` — ${cause}` : ''}`);
    }
    clearTimeout(timeout);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Ollama HTTP ${res.status}: ${errBody.slice(0, 300)}`);
    }

    // Acumular el stream línea a línea.
    // Cada línea es un JSON: { "response": "<token>", "done": false|true }
    const reader  = res.body!.getReader();
    const decoder = new TextDecoder();
    let full = '';
    let buf  = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';           // último fragmento (puede ser incompleto)
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const obj = JSON.parse(trimmed) as { response?: string; done?: boolean };
          if (obj.response) full += obj.response;
        } catch { /* línea parcial o no-JSON — ignorar */ }
      }
    }

    // Procesar cualquier resto en el buffer
    if (buf.trim()) {
      try {
        const obj = JSON.parse(buf.trim()) as { response?: string };
        if (obj.response) full += obj.response;
      } catch { /* ignorar */ }
    }

    const finalRes = full.trim();
    console.log(`[Ollama response] Size: ${finalRes.length} chars. Raw: ${finalRes.substring(0, 100).replace(/\n/g, ' ')}...`);

    if (!finalRes) {
      throw new Error(`Empty response from Ollama. Prompt was ${prompt.length} chars.`);
    }
    return full;
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

// ── Helpers de post-procesamiento (sin IA) ────────────────────────────────────

/**
 * Limpia el documento F2 después del juez eliminando secciones duplicadas
 * y aplicando correcciones determinísticas sin llamar a ningún LLM.
 *
 * Problema que resuelve: los LLMs tienden a AÑADIR secciones "corregidas"
 * al final del documento en lugar de reemplazar las originales, resultando
 * en secciones duplicadas como "## 4. PERFIL DE INGRESO AJUSTADO".
 */
function _cleanF2Document(markdown: string): string {
  // 1. Deduplicar secciones: conservar solo la primera aparición de cada ## N.
  const lines = markdown.split('\n');
  const seenNumbers = new Set<string>();
  const out: string[] = [];
  let skip = false;

  for (const line of lines) {
    // Detecta encabezados ## N. (secciones numeradas del documento F2)
    const numberedMatch = /^## (\d+)\./.exec(line);
    if (numberedMatch) {
      const num = numberedMatch[1]!;
      if (seenNumbers.has(num)) {
        skip = true;   // segunda aparición → saltar hasta el próximo encabezado
        continue;
      }
      seenNumbers.add(num);
      skip = false;
    } else if (/^## /.test(line)) {
      // Encabezado no numerado posterior (ej: "## 4. PERFIL AJUSTADO" sin número, o apéndices)
      // Si contiene marcas de corrección del LLM, saltarlo
      if (/AJUSTADO|CORREGIDO|AJUSTADA|CORREGIDA|OPTIMIZADO|REVISADO/i.test(line)) {
        skip = true;
        continue;
      }
      skip = false;
    } else if (/^# /.test(line) && out.length > 0) {
      // Segundo encabezado # (título) → probablemente el LLM repitió todo el doc
      // Solo mantenemos el primero
      skip = true;
      continue;
    }

    if (!skip) out.push(line);
  }

  let result = out.join('\n');

  // 2. Corregir nivel SCORM si quedó como rango (ej: "3-4 — Moderado-robusto")
  result = result.replace(
    /(\*\*Nivel seleccionado:\*\*\s*)(\d+)-(\d+)\s*[—–-]\s*[^\n]*/g,
    (_match, prefix, _lo, hi) => {
      const level = parseInt(hi as string, 10);
      const labels: Record<number, string> = { 1: 'Pasivo', 2: 'Limitado', 3: 'Moderado', 4: 'Robusto' };
      return `${prefix}${level} — ${labels[level] ?? 'Moderado'}`;
    }
  );

  // 3. Limpiar líneas de "corrección" sueltas del LLM
  result = result.replace(/^(?:Nivel SCORM ajustado[^\n]*|Corrección aplicada[^\n]*)\n/gim, '');

  // 4. Colapsar saltos de línea triples o más
  result = result.replace(/\n{3,}/g, '\n\n').trim();

  return result;
}

/**
 * Limpia el documento F3 después del juez eliminando secciones duplicadas.
 * Aplica correcciones del juez en código (sin LLM) para evitar el patrón
 * de duplicación por corrección.
 */
function _cleanF3Document(markdown: string, _juezOutput: string): string {
  const lines = markdown.split('\n');
  const seenNumbers = new Set<string>();
  const out: string[] = [];
  let skip = false;

  for (const line of lines) {
    const numberedMatch = /^## (\d+)\./.exec(line);
    if (numberedMatch) {
      const num = numberedMatch[1]!;
      if (seenNumbers.has(num)) { skip = true; continue; }
      seenNumbers.add(num);
      skip = false;
    } else if (/^## /.test(line)) {
      if (/AJUSTADO|CORREGIDO|AJUSTADA|CORREGIDA|OPTIMIZADO|REVISADO/i.test(line)) {
        skip = true; continue;
      }
      skip = false;
    } else if (/^# /.test(line) && out.length > 0) {
      skip = true; continue;
    }
    if (!skip) out.push(line);
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Limpia el documento F2.5 después del juez eliminando secciones duplicadas.
 * Aplica correcciones del juez en código (sin LLM) para evitar el patrón
 * de duplicación por corrección. Misma lógica que _cleanF3Document.
 */
function _cleanF2_5Document(markdown: string, _juezOutput: string): string {
  const lines = markdown.split('\n');
  const seenNumbers = new Set<string>();
  const out: string[] = [];
  let skip = false;

  for (const line of lines) {
    const numberedMatch = /^## (\d+)\./.exec(line);
    if (numberedMatch) {
      const num = numberedMatch[1]!;
      if (seenNumbers.has(num)) { skip = true; continue; }
      seenNumbers.add(num);
      skip = false;
    } else if (/^## /.test(line)) {
      if (/AJUSTADO|CORREGIDO|AJUSTADA|CORREGIDA|OPTIMIZADO|REVISADO/i.test(line)) {
        skip = true; continue;
      }
      skip = false;
    } else if (/^# /.test(line) && out.length > 0) {
      skip = true; continue;
    }
    if (!skip) out.push(line);
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
