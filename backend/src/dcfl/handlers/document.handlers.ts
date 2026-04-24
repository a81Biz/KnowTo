import { Context } from 'hono';
import { SupabaseService } from '../services/supabase.service';
import { PipelineJobsService } from '../../core/services/pipeline-jobs.service';
import { createAIService } from '../services/ai.factory';
import { ProjectRepository } from '../repositories/project.repository';
import { PipelineRepository } from '../repositories/pipeline.repository';
import { ProjectService } from '../services/project.service';
import { PipelineService } from '../services/pipeline.service';
import { parseInformeNecesidades } from '../services/informe.parser';
import { parseAnalisisF2 } from '../services/informe.parser.f2';
import { parseEspecificacionesF3 } from '../services/informe.parser.f3';
import { handleF0Assembler } from './f0.handler';
import { handleF2Assembler } from './f2.handler';
import { handleF2_5Assembler } from './f2_5.handler';
import { parseJsonSafely } from '../helpers/json-cleaner';
import { Env } from '../../core/types/env';
import { WebSearchService } from '../../core/services/web-search.service';
import { PromptId } from '../types/wizard.types';

export async function handleGenerate(c: Context) {
  const body = (c.req as any).valid('json');
  const supabase = new SupabaseService(c.env);
  const ai = createAIService(c.env);

  const content = await ai.generate({
    promptId: body.promptId as PromptId,
    context: body.context as any,
    userInputs: body.userInputs as any,
  });
  const { documentId } = await supabase.saveDocument({
    projectId: body.projectId,
    stepId: body.stepId,
    phaseId: body.phaseId,
    title: `${body.phaseId} - ${body.context.projectName}`,
    content,
  });

  return c.json({ success: true, data: { documentId, content }, timestamp: new Date().toISOString() } as const, 200 as 200);
}

export async function handleGenerateForm(c: Context) {
  const { promptId, context } = (c.req as any).valid('json');
  const ai = createAIService(c.env);

  const rawJson = await ai.generate({
    promptId: promptId as PromptId,
    context,
    userInputs: {},
  });

  // Extraer el bloque JSON de la respuesta (el prompt devuelve markdown con ```json)
  const jsonMatch = rawJson.match(/```json\s*([\s\S]*?)```/) ?? rawJson.match(/(\{[\s\S]*\})/);
  const jsonStr = jsonMatch?.[1]?.trim() ?? rawJson.trim();

  let formSchema: Record<string, unknown>;
  try {
    formSchema = JSON.parse(jsonStr) as Record<string, unknown>;
  } catch {
    // Si el modelo no devolvió JSON válido, devolver schema de fallback
    formSchema = {
      formTitle: 'Ajustes Post-Evaluación',
      description: 'Describe los ajustes realizados al curso.',
      fields: [
        { id: 'courseVersion', label: 'Versión del curso', type: 'text', required: true, placeholder: 'Ej: 1.1' },
        { id: 'observationSummary', label: 'Resumen de observaciones', type: 'textarea', required: true, placeholder: 'Describe las observaciones recibidas.' },
        { id: 'adjustmentsDetail', label: 'Detalle de ajustes realizados', type: 'textarea', required: true, placeholder: 'Describe qué cambios realizaste y cómo los verificaste.' },
        { id: 'completionDate', label: 'Fecha de finalización de ajustes', type: 'text', required: true, placeholder: 'DD/MM/AAAA' },
      ],
    };
  }

  return c.json({ success: true, data: { formSchema }, timestamp: new Date().toISOString() }, 200 as 200);
}

export async function handleGetJob(c: Context) {
  const { jobId } = (c.req as any).valid('param');
  const jobsSvc = new PipelineJobsService(c.env);
  const job = await jobsSvc.getJob(jobId);

  if (!job) throw new Error(`Job not found: ${jobId}`);

  return c.json({
    success: true,
    data: {
      jobId: job.id,
      status: job.status as "pending" | "running" | "completed" | "failed",
      result: job.result as Record<string, any> | undefined,
      error: job.error,
    },
    timestamp: new Date().toISOString(),
  } as const, 200 as any);
}

export async function handleGenerateAsync(c: Context) {
  const body: any = (c.req as any).valid('json');
  const userId = c.get('userId');
  const jobsSvc = new PipelineJobsService(c.env);

  const jobId = await jobsSvc.createJob({
    siteId: 'dcfl',
    projectId: body.projectId,
    stepId: body.stepId,
    phaseId: body.phaseId,
    promptId: body.promptId,
    context: body.context,
    userInputs: body.userInputs,
    userId,
  });

  _runPipelineAsync(jobId, body as any, c.env).catch((err) =>
    console.error(`[generate-async] unhandled error for job ${jobId}:`, err)
  );

  return c.json({ success: true, data: { jobId, status: 'pending' as const }, timestamp: new Date().toISOString() }, 202);
}

async function _runPipelineAsync(
  jobId: string,
  body: {
    projectId: string;
    stepId: string;
    phaseId: string;
    promptId: string;
    context: {
      projectName: string;
      clientName: string;
      industry?: string;
      email?: string;
      courseTopic?: string;
      experienceLevel?: string;
      targetAudience?: string;
      expectedOutcome?: string;
      budget?: string;
      courseDuration?: string;
      deadline?: string;
      constraints?: string;
      currentDate?: string;
      previousData?: Record<string, unknown>;
    };
    userInputs: Record<string, unknown>;
  },
  env: Env
): Promise<void> {
  const jobsSvc = new PipelineJobsService(env);
  const supabase = new SupabaseService(env);
  const ai = createAIService(env);

  const projectRepository = new ProjectRepository(supabase.client!);
  const pipelineRepository = new PipelineRepository(supabase.client!);
  const projectService = new ProjectService(projectRepository);
  const pipelineService = new PipelineService(pipelineRepository, supabase);

  console.log(`[pipeline] START job=${jobId} phase=${body.phaseId} prompt=${body.promptId}`);

  if (body.phaseId === 'F2') {
    try {
      const f0Data = await supabase.getF0AgentOutputs(body.projectId);
      const f1Data = await supabase.getF1Informe(body.projectId);
      const context = body.context;
      if (!context.previousData) context.previousData = {};
      context.previousData.f0_estructurado = f0Data;
      context.previousData.f1_estructurado = f1Data;
    } catch (err) {
      console.warn('[F2] No se pudieron inyectar datos estructurados:', err);
    }
  }

  if (body.phaseId === 'F3') {
    try {
      const f2Data = await supabase.getF2Analisis(body.projectId);
      const f2_5Data = await supabase.getF2_5Recomendaciones(body.projectId);
      const context = body.context;
      if (!context.previousData) context.previousData = {};

      const numModulos = f2Data?.estructura_tematica?.length ?? 3;

      context.previousData.f2_estructurado = f2Data;
      context.previousData.f2_5_estructurado = {
        total_videos: f2_5Data?.total_videos ?? (numModulos * 2 + 2),
        duracion_promedio_video: f2_5Data?.duracion_promedio_minutos ?? 5,
        estructura_videos: (f2_5Data as any)?.estructura_videos ?? null,
        actividades: f2_5Data?.actividades ?? null,
        metricas: f2_5Data?.metricas ?? null,
        num_modulos: numModulos
      };
    } catch (err) {
      console.warn('[F3] No se pudieron inyectar datos de F2.5:', err);
    }
  }

  // PASO 0: Enriquecer contexto con búsqueda web (código puro)
  let enrichedContext = { ...body.context };

  // Helper para estructurar resultados de Tavily como array de objetos (VERSIÓN PROFUNDA)
  const extractStructured = (tavilyRes: any): any[] => {
    if (!tavilyRes || !tavilyRes.results) return [];
    
    return tavilyRes.results.slice(0, 2).map((r: any, index: number) => ({
      i: index + 1,
      t: r.title ? r.title.substring(0, 120) : 'Sin título',
      u: r.url || '',
      c: r.content ? r.content.substring(0, 800) : '',
      f: r.score || 0
    }));
  };

  if (body.promptId === 'F0') {
    console.log('[F0-ENRICH] ========== EJECUTANDO BÚSQUEDA WEB (OPTIMIZADA) ==========');

    const webSearch = new WebSearchService(env);

    // Cambio 4: Extraer variables ANTES de enriquecer
    let topic = enrichedContext.courseTopic || enrichedContext.projectName || '';
    let industry = enrichedContext.industry || '';
    let projectName = enrichedContext.projectName || '';

    try {
      console.log('[F0-ENRICH] Pre-extrayendo variables del proyecto...');
      const extractorPrompt = `
Extrae del contexto: projectName, industry, courseTopic.
Devuelve SOLO JSON: {"projectName": "...", "industry": "...", "courseTopic": "..."}
Contexto: ${JSON.stringify({ projectName, industry, courseTopic })}
`;
      const extractionRes = await ai.runAgent(extractorPrompt, 'qwen2.5:14b', '');
      const parsed = JSON.parse(extractionRes.replace(/```json\n?|```\n?/g, '').trim());
      projectName = parsed.projectName || projectName;
      industry = parsed.industry || industry;
      topic = parsed.courseTopic || topic;
      
      // Actualizar contexto con valores normalizados
      enrichedContext.projectName = projectName;
      enrichedContext.industry = industry;
      enrichedContext.courseTopic = topic;
    } catch (e) {
      console.warn('[F0-ENRICH] Error en pre-extracción, usando valores originales');
    }

    // Generar queries dinámicas (solo una vez al inicio)
    const queriesPrompt = `
You are an OSINT expert. Generate 7 search queries for Tavily.

Project context:
- Topic: ${topic}
- Industry: ${industry}

For COMPETITORS, USE SITE SEARCH (dorking) with specific platforms:
- site:udemy.com "${topic}" course
- site:skillshare.com "${topic}"
- site:coursera.org "${topic}"

For other categories, use boolean logic with industry terms.

Return ONLY JSON with 7 keys:
{
  "market_size": "string",
  "trends": "string",
  "regulations": "string",
  "certifications": "string",
  "competitors": "string",
  "practices": "string",
  "references": "string"
}
`;
    const queriesResponse = await ai.runAgent(queriesPrompt, 'qwen2.5:14b', '');

    let searchQueries = {
      market_size: `${projectName} market size revenue`,
      trends: `${projectName} industry trends shifts`,
      regulations: `${projectName} regulations laws compliance`,
      certifications: `${projectName} professional certifications standards`,
      competitors: `${projectName} online courses platforms`,
      practices: `${projectName} instructional design best practices`,
      references: `${projectName} bibliography books`
    };

    try {
      const cleanJson = queriesResponse.replace(/```json\n?|```\n?/g, '').trim();
      searchQueries = JSON.parse(cleanJson);
    } catch (e) {
      console.warn('[F0-ENRICH] Error parseando queries, usando fallback');
    }

    console.log('[F0-ENRICH] Queries generadas:', searchQueries);
    await pipelineService.saveAgentOutput(jobId, 'generador_queries', JSON.stringify(searchQueries));

    // EJECUTAR TODAS LAS BÚSQUEDAS EN PARALELO (Cambio 3)
    console.log('[F0-ENRICH] Ejecutando 7 búsquedas principales en paralelo...');
    const [
      marketResults,
      trendsResults,
      regulationsResults,
      certificationsResults,
      competitorResults,
      practicesResults,
      referencesResults
    ] = await Promise.all([
      webSearch.search(searchQueries.market_size, { maxResults: 3 }),
      webSearch.search(searchQueries.trends, { maxResults: 3 }),
      webSearch.search(searchQueries.regulations, { maxResults: 3 }),
      webSearch.search(searchQueries.certifications, { maxResults: 3 }),
      webSearch.search(searchQueries.competitors, { maxResults: 3 }),
      webSearch.search(searchQueries.practices, { maxResults: 3 }),
      webSearch.search(searchQueries.references, { maxResults: 3 })
    ]);

    // Ejecutar búsqueda de desafíos por separado (no está en searchQueries)
    const challengesQuery = `"${enrichedContext.courseTopic || enrichedContext.projectName}" AND (common mistakes OR why is it so hard OR beginner struggles OR flat contrast OR bad blending OR frustrating)`;
    console.log('[F0-ENRICH] Ejecutando búsqueda de desafíos:', challengesQuery);
    const challengesResults = await webSearch.search(challengesQuery, { maxResults: 3 });

    console.log('[F0-ENRICH] Todas las búsquedas completadas');

    const fullTavilyResults = {
      market_size: marketResults,
      trends: trendsResults,
      regulations: regulationsResults,
      certifications: certificationsResults,
      competitors: competitorResults,
      practices: practicesResults,
      references: referencesResults,
      challenges: challengesResults
    };
    await pipelineService.saveAgentOutput(jobId, 'tavily_results', JSON.stringify(fullTavilyResults));


    // Almacenar resultados como arrays estructurados
    (enrichedContext as any).webSearchResults = {
      market_size: extractStructured(marketResults),
      trends: extractStructured(trendsResults),
      regulations: extractStructured(regulationsResults),
      certifications: extractStructured(certificationsResults),
      competitors: extractStructured(competitorResults),
      practices: extractStructured(practicesResults),
      references: extractStructured(referencesResults),
      challenges: extractStructured(challengesResults)
    };

    // Guardar contexto enriquecido para referencia
    await supabase.saveEnrichedContext(body.projectId, 'F0', enrichedContext);
    console.log('[F0-ENRICH] Contexto guardado en BD');
    console.log('[F0-ENRICH] ========== FIN BÚSQUEDA ==========');
  }


  try {
    const content = await ai.generate({
      promptId: body.promptId as PromptId,
      context: enrichedContext as Record<string, unknown>,
      userInputs: body.userInputs,
      onProgress: async (progress) => {
        await jobsSvc.updateJobProgress(jobId, progress);
      },
      onAgentOutput: async (agentName, output, _out): Promise<string | void> => {
        await pipelineService.saveAgentOutput(jobId, agentName, output);

        if (agentName === 'agente_preguntas' && body.promptId === 'F0') {
          try {
            const lines = output
              .split('\n')
              .map((l: string) => l.replace(/^[-\d.*)\s]+/, '').replace(/^\*\*|\*\*$/g, '').trim())
              .filter((l: string) => l.includes('?') && l.length > 5);

            if (lines.length > 0) {
              await supabase.saveFaseQuestions({
                projectId: body.projectId,
                faseDestino: 1,
                preguntas: lines
              });
            }
          } catch (err) {
            console.warn('[pipeline] saveFaseQuestions F0 failed:', err);
          }
        }
        if (agentName === 'ensamblador_f0' && body.promptId === 'F0') {
          return await handleF0Assembler({
            jobId,
            projectId: body.projectId,
            pipelineService,
            supabase,
            projectService
          });
        }

        if (agentName.startsWith('juez_') && (body.promptId === 'F0' || body.promptId === 'F2')) {
          try {
            const decisionObj = parseJsonSafely(output || '{}', { seleccion: 'A', razon: '' });
            const seccion = agentName.replace('juez_', '');

            if (body.promptId === 'F0') {
              await supabase.saveF0JuezDecision(jobId, seccion, {
                seleccion: decisionObj.seleccion || 'A',
                razon: decisionObj.razon || ''
              });
            } else {
              await supabase.saveF2JuezDecision(jobId, seccion, decisionObj);
            }
          } catch (err) {
            console.warn(`[pipeline] saveJuezDecision failed for ${agentName}:`, err);
          }
        }

        if (agentName === 'sintetizador_final' && body.promptId === 'F1') {
          try {
            const parsed = parseInformeNecesidades(output);
            const extractorRaw = await pipelineService.getAgentOutput(jobId, 'extractor').catch(() => null);
            if (extractorRaw) {
              const extractorData = parseJsonSafely(extractorRaw, null as any);
              if (extractorData) {
                if (extractorData.qa && extractorData.qa.length > 0) {
                  parsed.preguntas_respuestas = extractorData.qa
                    .filter((p: any) => p.pregunta?.trim())
                    .map((p: any) => ({ pregunta: p.pregunta, respuesta: p.respuesta ?? 'No especificada' }));
                }
                if (extractorData.perfilParticipante && Object.keys(extractorData.perfilParticipante).length > 0) {
                  parsed.perfil_participante = extractorData.perfilParticipante;
                }
              }
            }
            await supabase.saveF1Informe({ projectId: body.projectId, jobId, ...parsed });
          } catch (err) {
            console.warn('[pipeline] saveF1Informe failed:', err);
          }
        }
        if (agentName === 'sintetizador_final_f2' && body.promptId === 'F2') {
          const borradorA = (await pipelineService.getAgentOutput(jobId, 'sintetizador_a_f2')) ?? '';
          const borradorB = (await pipelineService.getAgentOutput(jobId, 'sintetizador_b_f2')) ?? '';
          const parsed = parseAnalisisF2(output);

          return await handleF2Assembler({
            jobId,
            projectId: body.projectId,
            projectName: body.context.projectName,
            pipelineService,
            supabase,
            borradorA,
            borradorB,
            parsed
          });
        }
        if (agentName === 'sintetizador_final_f3' && body.promptId === 'F3') {
          try {
            const parsed = parseEspecificacionesF3(output);
            const borradorA = (await pipelineService.getAgentOutput(jobId, 'agente_doble_A_f3')) ?? '';
            const borradorB = (await pipelineService.getAgentOutput(jobId, 'agente_doble_B_f3')) ?? '';
            const juezRaw = (await pipelineService.getAgentOutput(jobId, 'agente_juez_f3')) ?? '';
            const decMatch = juezRaw.match(/"decision"\s*:\s*"([^"]+)"/i);
            const simMatch = juezRaw.match(/"similitud_general"\s*:\s*(\d+)/i);
            await supabase.saveF3Especificaciones({
              projectId: body.projectId,
              jobId,
              documento_final: output,
              borrador_A: borradorA,
              borrador_B: borradorB,
              juez_decision: decMatch?.[1] ?? 'ok',
              juez_similitud: simMatch?.[1] ? parseInt(simMatch[1]) : 0,
              ...parsed,
            });
          } catch (err) {
            console.warn('[pipeline] saveF3Especificaciones failed:', err);
          }
        }
        if (agentName === 'sintetizador_final_f2_5' && body.promptId === 'F2_5') {
          return await handleF2_5Assembler({
            jobId,
            projectId: body.projectId,
            projectName: body.context.projectName,
            pipelineService,
            supabase
          });
        }
        if (agentName === 'sintetizador_final_f4' && body.promptId.startsWith('F4_P')) {
          try {
            const producto = body.promptId.replace('F4_', '');
            const px = producto.toLowerCase();
            const borradorA = (await pipelineService.getAgentOutput(jobId, `agente_a_${px}`)) ?? '';
            const borradorB = (await pipelineService.getAgentOutput(jobId, `agente_b_${px}`)) ?? '';
            const juezRaw = (await pipelineService.getAgentOutput(jobId, `juez_${px}`)) ?? '';
            const validRaw = (await pipelineService.getAgentOutput(jobId, `validador_${px}`)) ?? '{}';
            const juezDecision = parseJsonSafely(juezRaw, {});
            const vd = parseJsonSafely(validRaw, { passed: true });
            let validacionEstado = 'aprobado';
            if (vd.passed === false) validacionEstado = 'revision_humana';

            const saveParams: any = {
              projectId: body.projectId,
              producto,
              documentoFinal: output,
              borradorA,
              borradorB,
              juezDecision,
              validacionEstado,
              jobId,
              validacionErrores: vd
            };
            await supabase.saveF4Producto(saveParams);
          } catch (err) {
            console.warn('[pipeline] saveF4Producto failed:', err);
          }
        }
      },
      getAgentOutput: async (agentName) => {
        return pipelineService.getAgentOutput(jobId, agentName);
      },
    });

    const { documentId } = await supabase.saveDocument({
      projectId: body.projectId,
      stepId: body.stepId,
      phaseId: body.phaseId,
      title: `${body.phaseId} - ${body.context.projectName}`,
      content,
    });

    await jobsSvc.completeJob(jobId, { documentId, content });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Pipeline error';
    await jobsSvc.failJob(jobId, msg);
  }
}

/**
 * Extrae la industria de los resultados de búsqueda
 */
function extractIndustryFromResults(results: string): string {
  const patterns = [
    /industria[:\s]+([^\n\.]+)/i,
    /sector[:\s]+([^\n\.]+)/i,
    /ámbito[:\s]+([^\n\.]+)/i,
    /campo[:\s]+([^\n\.]+)/i,
  ];
  for (const pattern of patterns) {
    const match = results.match(pattern);
    if (match && match[1]) return match[1].trim();
  }
  return '';
}
