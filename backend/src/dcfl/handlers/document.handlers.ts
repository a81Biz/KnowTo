import { Context } from 'hono';
import { SupabaseService } from '../services/supabase.service';
import { PipelineJobsService } from '../../core/services/pipeline-jobs.service';
import { createAIService } from '../services/ai.factory';
import { ProjectRepository } from '../repositories/project.repository';
import { PipelineRepository } from '../repositories/pipeline.repository';
import { ProjectService } from '../services/project.service';
import { PipelineService } from '../services/pipeline.service';
import { Env } from '../../core/types/env';
import { WebSearchService } from '../../core/services/web-search.service';
import { PromptId } from '../types/wizard.types';
import { enrichContextWithOSINT } from '../helpers/osint.helper';
import { dispatchAgentEvent } from '../helpers/pipeline-router.helper';
import { AgentName } from '../constants/agents.constants';

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

  if (!job) {
    console.warn(`[REALTIME-DEBUG] Job solicitado no existe: ${jobId}. Forzando invalidación en cliente.`);
    return c.json({ success: false, error: 'Job not found', code: 'JOB_GONE' }, 404);
  }

  return c.json({
    success: true,
    data: {
      jobId: job.id,
      status: job.status as "pending" | "running" | "completed" | "failed",
      result: job.result as Record<string, any> | undefined,
      error: job.error,
    },
    timestamp: new Date().toISOString(),
  }, 200 as any);
}

export async function handleGenerateAsync(c: Context) {
  const body: any = (c.req as any).valid('json');
  const userId = c.get('userId') || '00000000-0000-0000-0000-000000000000';
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

  runPipelineAsync(jobId, body as any, c.env).catch((err) =>
    console.error(`[generate-async] unhandled error for job ${jobId}:`, err)
  );

  return c.json({ success: true, data: { jobId, status: 'pending' as const }, timestamp: new Date().toISOString() }, 202);
}

/**
 * Orquestador limpio de la pipeline DCFL.
 * Exportado para reutilización desde otros handlers (ej. form-schema.routes.ts).
 */
export async function runPipelineAsync(
  jobId: string,
  body: {
    projectId: string;
    stepId: string;
    phaseId: string;
    promptId: string;
    context: Record<string, any>;
    userInputs: Record<string, unknown>;
  },
  env: Env
): Promise<void> {
  const jobsSvc = new PipelineJobsService(env);
  const supabase = new SupabaseService(env);
  const ai = createAIService(env);
  const webSearch = new WebSearchService(env);

  const projectRepository = new ProjectRepository(supabase.client!);
  const pipelineRepository = new PipelineRepository(supabase.client!);
  const projectService = new ProjectService(projectRepository);
  const pipelineService = new PipelineService(pipelineRepository, supabase);

  const services = { pipelineService, supabase, projectService, ai, webSearch };

  console.log(`[pipeline] START job=${jobId} phase=${body.phaseId} prompt=${body.promptId}`);
  console.log(`[FLOW-BE] Iniciando Pipeline para ${body.userInputs?.producto || 'Desconocido'}. Contexto Fase 3 cargado: ${body.context?.fase3?.unidades?.length || 0} unidades.`);

  // Marca el job como 'running' para que el frontend deje de mostrar "pending"
  await jobsSvc.startJob(jobId);

  try {
    // PASO 1: Cargar contexto histórico (Inyección de datos de fases previas)
    let enrichedContext = { ...body.context };
    
    // === INYECCIÓN DE CONTEXTO PARA FASE 1 (DNC - EC0249) ===
    if (body.phaseId === 'F1') {
      try {
        if (!enrichedContext.previousData) enrichedContext.previousData = {};
        
        // 1. Obtener F0 estructurado desde la tabla de negocio (NO desde agent_outputs crudo)
        const f0Componentes = await supabase.getFase0Estructurado(body.projectId);
        
        // 2. Obtener Q&A del cliente desde respuestas_preguntas_fase
        const qaEstructurado = await (supabase as any).getFaseAnswersDetailed(body.projectId, 1);
        
        // 3. Inyectar en previousData con las keys exactas que espera el prompt F1
        enrichedContext.previousData.f0_estructurado = f0Componentes;
        enrichedContext.previousData.preguntas_respuestas_estructuradas = qaEstructurado;
        
        console.log(`[context-injection] F1: injected f0_estructurado (${JSON.stringify(f0Componentes).length} chars) + ${qaEstructurado?.length || 0} Q&A items`);
      } catch (err) {
        console.error(`[context-injection] F1 failed:`, err);
        // Fallback seguro: no romper el pipeline, pero loguear
      }
    }

    if (body.phaseId === 'F2') {
      try {
        const f0Data = await supabase.getF0AgentOutputs(body.projectId);
        const f1Data = await supabase.getF1Informe(body.projectId);
        if (!enrichedContext.previousData) enrichedContext.previousData = {};
        enrichedContext.previousData.f0_estructurado = f0Data;
        enrichedContext.previousData.f1_estructurado = f1Data;
      } catch (err) {
        console.warn('[F2] No se pudieron inyectar datos estructurados:', err);
      }
    }

    if (body.phaseId === 'F3') {
      try {
        const f2Data = await supabase.getF2Analisis(body.projectId);
        const f2_5Data = await supabase.getF2_5Recomendaciones(body.projectId);
        if (!enrichedContext.previousData) enrichedContext.previousData = {};

        const numModulos = f2Data?.estructura_tematica?.length ?? 3;
        enrichedContext.previousData.f2_estructurado = f2Data;
        enrichedContext.previousData.f2_5_estructurado = {
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

    // PASO 2: Enriquecer con OSINT (Solo si es F0)
    if (body.promptId === 'F0') {
      enrichedContext = await enrichContextWithOSINT(
        enrichedContext,
        jobId,
        body.projectId,
        services
      );
    }

    // PASO 3: Llamar a ai.generate() con el nuevo Pipeline Router
    const content = await ai.generate({
      promptId: body.promptId as PromptId,
      context: enrichedContext as Record<string, unknown>,
      userInputs: body.userInputs,
      onProgress: async (progress) => {
        await jobsSvc.updateJobProgress(jobId, progress);
      },
      onAgentOutput: async (agentName, output): Promise<string | void> => {
        console.log(`[AI-SENSING] Agente [${agentName}] respondió con ${output?.length || 0} caracteres.`);
        return await dispatchAgentEvent({
          jobId,
          projectId: body.projectId,
          promptId: body.promptId,
          agentName: agentName as AgentName,
          output,
          body,
          services: { pipelineService, supabase, projectService }
        });
      }
    });

    // PASO 4: Completar el Job y guardar documento
    // F4 products are persisted by their assembler in f4_productos_finales.
    // Calling saveDocument here would mark wizard_step 5 as 'completed' after just
    // the first product — the step should only complete when all 8 products are done.
    const isF4Product = body.promptId.startsWith('F4_P');
    let documentId: string | undefined;
    if (body.stepId && !isF4Product) {
      const saved = await supabase.saveDocument({
        projectId: body.projectId,
        stepId: body.stepId,
        phaseId: body.phaseId,
        title: `${body.phaseId} - ${enrichedContext.projectName}`,
        content,
      });
      documentId = saved.documentId;
    }

    await jobsSvc.completeJob(jobId, { documentId, content });
    console.log(`[pipeline] SUCCESS job=${jobId}`);

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Pipeline error';
    console.error(`[pipeline] FAILED job=${jobId}:`, err);
    await jobsSvc.failJob(jobId, msg);
  }
}