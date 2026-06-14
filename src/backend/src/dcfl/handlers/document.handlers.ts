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
import { comprimirProductosPrevios } from '../helpers/context-compressor.helper';
import { dispatchAgentEvent } from '../helpers/pipeline-router.helper';
import { AgentName } from '../constants/agents.constants';
import { AIService } from '../../core/services/ai.service';
import { orchestrateP4Chapters } from '../helpers/p4-orchestrator.helper';
import { runP1WithRetry } from '../helpers/p1-retry.helper';
const globalJobLocks: Record<string, Promise<void>> = {};
let _startupCleanupDone = false;

// Exported for testing. Order: P4 → P1 → P3 → P2 → P5 → P7 → P6 → P8.
// P2 requires P3 first because juez_presentacion evaluates alignment with scripts.
export const F4_PREREQS: Record<string, { producto: string; label: string }[]> = {
  'F4_P1_GENERATE_DOCUMENT': [{ producto: 'P4', label: 'Manual del Participante (P4)' }],
  'F4_P3_GENERATE_DOCUMENT': [{ producto: 'P4', label: 'Manual del Participante (P4)' }],
  'F4_P2_GENERATE_DOCUMENT': [
    { producto: 'P4', label: 'Manual del Participante (P4)' },
    { producto: 'P3', label: 'Guiones Multimedia (P3)' },
  ],
  'F4_P5_GENERATE_DOCUMENT': [{ producto: 'P4', label: 'Manual del Participante (P4)' }],
  'F4_P6_GENERATE_DOCUMENT': [{ producto: 'P4', label: 'Manual del Participante (P4)' }],
  'F4_P7_GENERATE_DOCUMENT': [{ producto: 'P4', label: 'Manual del Participante (P4)' }],
  'F4_P8_GENERATE_DOCUMENT': [{ producto: 'P4', label: 'Manual del Participante (P4)' }],
};

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
  if (!_startupCleanupDone) {
    _startupCleanupDone = true;
    const _cleanupSvc = new SupabaseService(c.env);
    void _cleanupSvc.client
      ?.from('pipeline_jobs')
      .update({ status: 'failed', error: 'Backend restarted — job incomplete' })
      .eq('status', 'processing')
      .then(() => console.log('[startup] zombie jobs cleaned'))
      .catch((e: unknown) => console.warn('[startup] zombie cleanup failed:', e instanceof Error ? e.message : e));
  }

  const body: any = (c.req as any).valid('json');
  const userId = c.get('userId') ?? (
    c.env.ENVIRONMENT !== 'production' ? '00000000-0000-0000-0000-000000000001' : null
  );
  if (!userId) return c.json({ success: false, error: 'Unauthorized' }, 401);
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

  const lockKey = `${body.projectId}-${body.promptId}`;
  if (!globalJobLocks[lockKey]) {
    globalJobLocks[lockKey] = Promise.resolve();
  }
  const isP4WithoutChapters =
    body.promptId === 'F4_P4_GENERATE_DOCUMENT' &&
    !(body.context as any)?.capitulos_generados?.length;

  // PT-105: P1 retry orchestrator — intercept only the FIRST attempt (not sub-jobs from the orchestrator)
  const isP1FirstAttempt =
    body.promptId === 'F4_P1_GENERATE_DOCUMENT' &&
    !((body.context as any)?.p1_retry_count >= 0);

  globalJobLocks[lockKey] = globalJobLocks[lockKey].then(async () => {
    if (isP4WithoutChapters) {
      await runP4WithOrchestration(jobId, body as any, c.env, userId);
    } else if (isP1FirstAttempt) {
      await runP1WithRetry(jobId, body as any, c.env, userId, runPipelineAsync);
    } else {
      await runPipelineAsync(jobId, body as any, c.env);
    }
  }).catch((err) => {
    console.error(`[generate-async] unhandled error for job ${jobId}:`, err);
  }).finally(() => {
    delete globalJobLocks[lockKey];
  });

  return c.json({ success: true, data: { jobId, status: 'pending' as const }, timestamp: new Date().toISOString() }, 202);
}

export async function buildEnrichedContext(
  body: { projectId: string; phaseId: string; promptId: string; context: Record<string, any> },
  supabase: SupabaseService,
  jobId: string,
  services: any
): Promise<Record<string, any>> {
  let ctx = { ...body.context };

  // ── Semantic Anchor Layer (inyectado primero, nunca sobreescrito por fases posteriores) ──
  try {
    const brief = await supabase.getProjectBrief(body.projectId);
    if (brief) {
      ctx._projectBrief = brief;
      ctx._frozen = {
        nombre_oficial_curso: brief.nombreOficialCurso ?? '',
        dominio_tecnico: brief.dominioTecnico ?? '',
        resultado_central: brief.resultadoCentral ?? '',
        audiencia_primaria: brief.audienciaPrimaria ?? '',
        estandar_norma: (brief as any).estandarNorma ?? null,
        // Null means no language constraint — validateLanguage is skipped by the Rules Engine
        idioma_requerido: (brief as any).idioma_requerido ?? null,
      };
      console.log(`[pipeline] Project Brief inyectado (anclas semánticas: ${Object.keys(brief).join(', ')})`);
    }
  } catch (err) {
    console.warn('[pipeline] No se pudo recuperar Project Brief:', err);
  }

  ctx._fecha_hoy = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Pre-LLM substitution variables — available as {{estandarNorma}} and {{folioSugerido}} in all templates
  ctx.estandarNorma = (ctx._frozen as any)?.estandar_norma ?? 'No especificado';
  ctx.folioSugerido = `${(ctx._frozen as any)?.estandar_norma ?? 'FORM'}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    const projectSoul = await supabase.getProjectSoul(body.projectId);
    if (projectSoul) {
      ctx._projectSoul = projectSoul;
      console.log(`[pipeline] Project Soul inyectado (${projectSoul.length} chars)`);
    }
  } catch (err) {
    console.warn('[pipeline] No se pudo recuperar Project Soul:', err);
  }

  ctx._reglas_globales = [
    'El estándar de certificación aplicable (si existe) está en _frozen.estandar_norma. Si es null, el proyecto no tiene estándar de certificación asignado. No confundas el estándar con el TEMA DEL CURSO.',
    'El TEMA DEL CURSO es lo que está en courseName / nombre_curso. Nunca confundas la norma con el tema.',
    'PROHIBIDO inventar referencias bibliográficas, normas, autores o fechas. Solo cita fuentes que aparezcan explícitamente en el contexto inyectado.',
    'PROHIBIDO dejar marcadores sin resolver: {{variable}}, [PENDIENTE], [INSERTAR], [TODO], TBD, XXX.',
    'PROHIBIDO usar fechas en formato YYYY-MM-DD en documentos finales. Usa DD/MM/YYYY o "mes de YYYY".',
    'Las fechas de producción deben ser futuras (año 2026 o posterior). Nunca inventes fechas pasadas.',
    'PROHIBIDO en reactivos de evaluación, criterios y preguntas de diagnóstico: adecuado, correcto, bien, efectivo, entendimiento, comprensión, apropiado, suficiente, necesario, importante. Usa únicamente verbos de acción medible y verificable: identifica, lista, define, clasifica, explica, aplica, demuestra, ejecuta, resuelve, analiza, compara, diferencia, evalúa, juzga, diseña, crea, construye, produce.',
  ].join('\n');

  if (body.phaseId === 'F1') {
    try {
      if (!ctx.previousData) ctx.previousData = {};
      const f0Componentes = await supabase.getFase0Estructurado(body.projectId);
      const qaEstructurado = await (supabase as any).getFaseAnswersDetailed(body.projectId, 1);
      ctx.previousData.f0_estructurado = f0Componentes;
      ctx.previousData.preguntas_respuestas_estructuradas = qaEstructurado;
      console.log(`[context-injection] F1: injected f0_estructurado (${JSON.stringify(f0Componentes).length} chars) + ${qaEstructurado?.length || 0} Q&A items`);
    } catch (err) {
      console.error('[context-injection] F1 failed:', err);
    }
  }

  if (body.phaseId === 'F2') {
    try {
      const f0Data = await supabase.getF0AgentOutputs(body.projectId);
      const f1Data = await supabase.getF1Informe(body.projectId);
      if (!ctx.previousData) ctx.previousData = {};
      ctx.previousData.f0_estructurado = f0Data;
      ctx.previousData.f1_estructurado = f1Data;
    } catch (err) {
      console.warn('[F2] No se pudieron inyectar datos estructurados:', err);
    }
  }

  if (body.phaseId === 'F3') {
    try {
      const f2Data = await supabase.getF2Analisis(body.projectId);
      const f2_5Data = await supabase.getF2_5Recomendaciones(body.projectId);
      if (!ctx.previousData) ctx.previousData = {};
      ctx.previousData.f2_estructurado = f2Data;
      ctx.previousData.f2_5_estructurado = f2_5Data || {};
    } catch (err) {
      console.warn('[F3] No se pudieron inyectar datos de F2.5:', err);
    }
  }

  if (body.phaseId === 'TEMARIO_BASE') {
    try {
      const f2Data = await supabase.getF2Analisis(body.projectId);
      const f3Data = await supabase.getF3Especificaciones(body.projectId);
      if (!ctx.previousData) ctx.previousData = {};
      ctx.previousData.f2_estructurado = f2Data;
      ctx.previousData.f3_estructurado = f3Data;
    } catch (err) {
      console.warn('[TEMARIO_BASE] No se pudieron inyectar datos F2/F3:', err);
    }
  }

  if (body.promptId?.includes('FORM_SCHEMA')) {
    try {
      if (!ctx.previousData) ctx.previousData = {};
      const [f0Data, f1Data, f2Data] = await Promise.all([
        supabase.getFase0Estructurado(body.projectId),
        supabase.getF1Informe(body.projectId),
        supabase.getF2Analisis(body.projectId),
      ]);
      if (f0Data) {
        ctx.previousData.f0_sector = (f0Data as any).industry || (f0Data as any).analisis_sector?.sector || null;
      }
      if (f1Data) {
        ctx.previousData.f1_perfil = {
          perfil_ingreso: f1Data.perfil_participante || null,
          nivel_educativo: (f1Data.perfil_participante as any)?.nivel_educativo || null,
        };
      }
      if (f2Data) {
        ctx.previousData.f2_modalidad = f2Data.modalidad
          ? (Object.values(f2Data.modalidad)[0] ?? null)
          : null;
      }
      console.log(`[context-injection] FORM_SCHEMA: f0_sector=${ctx.previousData.f0_sector}, f2_modalidad=${ctx.previousData.f2_modalidad}`);
    } catch (err) {
      console.warn('[FORM_SCHEMA] No se pudieron inyectar datos de contexto previo:', err);
    }
  }

  if (body.promptId && (body.promptId.startsWith('F6') || body.promptId === 'F7')) {
    try {
      if (!ctx.previousData) ctx.previousData = {};
      const f0 = await supabase.getFase0Estructurado(body.projectId);
      const f1 = await supabase.getF1Informe(body.projectId);
      const f2 = await supabase.getF2Analisis(body.projectId);
      const f3 = await supabase.getF3Especificaciones(body.projectId);
      const f2_5 = await supabase.getF2_5Recomendaciones(body.projectId);
      ctx.previousData.f0_estructurado = f0;
      ctx.previousData.f1_estructurado = f1;
      ctx.previousData.f2_estructurado = f2;
      ctx.previousData.f3_estructurado = f3;
      ctx.previousData.f2_5_estructurado = f2_5;
      const prevProducts = await supabase.getF4Productos(body.projectId);
      ctx.productosTerminados = prevProducts.map(p => p.producto);
      const prevDocs = await supabase.client!.from('documents').select('phase_id').eq('project_id', body.projectId);
      ctx.documentosAdicionalesTerminados = (prevDocs.data || []).map((d: any) => d.phase_id);
      ctx.resumen_datos = {
        titulo: f0?.nombre_curso || f1?.nombre_curso || 'No especificado',
        industria: f0?.industria || 'No especificado',
        duracion: f3?.calculo_duracion || 'No especificado',
        modalidad: f2?.modalidad || 'No especificado',
        plataforma: f3?.plataforma || 'No especificado',
        scorm: f3?.formato || 'No especificado',
        modulos: f2?.estructura_tematica?.length || 'No especificado',
        videos: f2_5?.total_videos || 'No especificado',
        fecha_inicio_proceso: f0?.created_at ? new Date(f0.created_at).toLocaleDateString('es-MX') : 'No especificado',
        folio_sugerido: `${ctx._frozen?.estandar_norma || 'FORM'}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      };
      console.log('[context-injection] F6_2b: Injected comprehensive project data from DB.');
    } catch (err) {
      console.error('[context-injection] F6_2b failed:', err);
    }
  }

  const needsPrevProducts = [
    'F4_P1_GENERATE_DOCUMENT',
    'F4_P2_FORM_SCHEMA',
    'F4_P3_FORM_SCHEMA',
    'F4_P7_FORM_SCHEMA',
    'F4_P8_FORM_SCHEMA',
    'F4_P7_GENERATE_DOCUMENT',
    'F4_P8_GENERATE_DOCUMENT',
    'F6_2a',
    'F6_2b',
    'F7',
  ].includes(body.promptId);

  if (needsPrevProducts) {
    try {
      const prevProducts = await supabase.getF4Productos(body.projectId);
      const productos_previos: Record<string, any> = {};
      for (const p of prevProducts) {
        if (['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'].includes(p.producto) && p.datos_producto) {
          productos_previos[p.producto] = p.datos_producto;
        }
      }
      if (Object.keys(productos_previos).length > 0) {
        ctx.productos_previos = comprimirProductosPrevios(productos_previos);
      }
    } catch (err) {
      console.warn(`[F4 ${body.promptId}] No se pudieron inyectar productos previos:`, err);
    }
  }

  if (body.promptId?.startsWith('F4_') || body.phaseId === 'F4') {
    // PT-029.10: Para F4, no inyectar f2_estructurado.estructura_tematica (dato potencialmente stale).
    // La fuente de verdad es temario_base (confirmado por usuario).
    // Fuente canónica del perfil del participante: f2_estructurado.perfil_ingreso.
    // F0 genera un perfil tentativo; F1 lo refina. F2 consolida y valida.
    // P4 y P7 leen este campo vía services.supabase.getF2Analisis(projectId).perfil_ingreso.
    if (ctx.previousData?.f2_estructurado) {
      delete ctx.previousData.f2_estructurado;
    }

    try {
      const temarioData = await supabase.getTemarioBase(body.projectId);
      if (temarioData?.confirmado_por_usuario === true) {
        if (!ctx.previousData) ctx.previousData = {};
        ctx.previousData.temario_base = {
          temario: temarioData.temario,
          tiempos: temarioData.tiempos,
          duracion_total_minutos: temarioData.duracion_total_minutos,
          total_unidades: temarioData.total_unidades,
        };
      } else {
        // Fallback de calidad degradada: sin temario confirmado, inyectar advertencia
        if (!ctx.previousData) ctx.previousData = {};
        ctx.previousData.f2_estructura_fallback = {
          advertencia: '⚠ El Temario Base no ha sido confirmado por el usuario. La calidad de este documento puede ser inferior al no contar con la estructura temática validada.',
        };
        console.warn(`[TEMARIO_BASE] No confirmado para proyecto ${body.projectId} — inyectando f2_estructura_fallback`);
      }
    } catch (err) {
      console.warn('[TEMARIO_BASE] Error al inyectar temario en pipeline F4:', err);
    }
  }

  if (body.promptId === 'F0' || body.promptId === 'F4_P4_GENERATE_DOCUMENT') {
    try {
      ctx = await enrichContextWithOSINT(ctx, jobId, body.projectId, services);
    } catch (err) {
      console.warn('[pipeline] enrichContextWithOSINT falló — continuando sin OSINT:', err instanceof Error ? err.message : err);
    }
  }

  return ctx;
}

/**
 * Orquestación de P4 (Manual del Participante) desde el flujo interactivo.
 * Lanza N jobs F4_P4_CHAPTER antes del job final del assembler para satisfacer
 * el gate que requiere capitulos_generados en el contexto.
 */
async function runP4WithOrchestration(
  jobId: string,
  body: any,
  env: Env,
  userId: string,
): Promise<void> {
  const jobsSvc = new PipelineJobsService(env);
  try {
    const capitulos = await orchestrateP4Chapters(
      body.projectId,
      body.context,
      body.userInputs || {},
      env,
      userId,
      runPipelineAsync,
    );
    if (capitulos.length === 0) {
      await jobsSvc.failJob(
        jobId,
        'No se generaron capítulos para P4. Verifique que el temario base esté confirmado.',
      );
      return;
    }
    const enrichedBody = {
      ...body,
      context: { ...body.context, capitulos_generados: capitulos },
    };
    await runPipelineAsync(jobId, enrichedBody, env);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error en orquestación de capítulos P4';
    console.error('[p4-orchestration]', err);
    await jobsSvc.failJob(jobId, msg);
  }
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

  const services = { pipelineService, supabase, projectService, ai, webSearch, osint: webSearch };

  console.log(`[pipeline] START job=${jobId} phase=${body.phaseId} prompt=${body.promptId}`);
  console.log(`[FLOW-BE] Iniciando Pipeline para ${body.userInputs?.producto || 'Desconocido'}. Contexto Fase 3 cargado: ${body.context?.fase3?.unidades?.length || 0} unidades.`);

  // Persiste estandarNorma e idioma_requerido en project_brief cuando se procesa F0.
  if (body.phaseId === 'F0' && body.userInputs) {
    const ui = body.userInputs as Record<string, string>;
    const f0Brief: Record<string, string> = {};
    if (ui['estandarNorma']    !== undefined) f0Brief.estandarNorma    = ui['estandarNorma'];
    if (ui['idioma_requerido'] !== undefined) f0Brief.idioma_requerido = ui['idioma_requerido'];
    if (Object.keys(f0Brief).length > 0) {
      try { await supabase.saveProjectBrief(body.projectId, f0Brief); } catch { /* no crítico */ }
    }
  }

  // Persiste las anclas semánticas en projects.project_brief cuando se procesa F1 (validadas por el usuario).
  if (body.phaseId === 'F1' && body.userInputs) {
    const ui = body.userInputs as Record<string, string>;
    const brief: Record<string, string> = {};
    if (ui['nombreOficialCurso']) brief.nombreOficialCurso = ui['nombreOficialCurso'];
    if (ui['dominioTecnico'])     brief.dominioTecnico     = ui['dominioTecnico'];
    if (ui['resultadoCentral'])   brief.resultadoCentral   = ui['resultadoCentral'];
    if (ui['audienciaPrimaria'])  brief.audienciaPrimaria  = ui['audienciaPrimaria'];
    if (ui['estandarNorma'])      brief.estandarNorma      = ui['estandarNorma'];
    if (ui['idioma_requerido'])   brief.idioma_requerido   = ui['idioma_requerido'];
    if (Object.keys(brief).length > 0) {
      try { await supabase.saveProjectBrief(body.projectId, brief); } catch { /* no crítico */ }
    }
  }

  // GATE F4_P4_GENERATE_DOCUMENT: requires pre-generated chapters in context
  if (body.promptId === 'F4_P4_GENERATE_DOCUMENT') {
    const caps = (body.context as any)?.capitulos_generados;
    if (!caps || !Array.isArray(caps) || caps.length === 0) {
      await jobsSvc.failJob(jobId, 'P4 requiere capítulos generados. Lance F4_P4_CHAPTER por cada unidad del temario primero.');
      return;
    }
  }

  // GATE TEMARIO_BASE: bloquear regeneración si ya existen productos aprobados
  if (body.promptId === 'TEMARIO_BASE') {
    try {
      const { data: productosAprobados } = await supabase.client!
        .from('fase4_productos')
        .select('producto')
        .eq('project_id', body.projectId)
        .in('validacion_estado', ['aprobado', 'aprobado_con_errores', 'aprobado_por_fallback']);
      if (productosAprobados && productosAprobados.length > 0) {
        const lista = (productosAprobados as { producto: string }[]).map(r => r.producto).join(', ');
        await jobsSvc.failJob(jobId, `No se puede regenerar el Temario Base. Productos aprobados: ${lista}.`);
        return;
      }
    } catch (err) {
      console.warn('[TEMARIO_BASE] No se pudo verificar productos aprobados:', err);
    }
  }

  // Marca el job como 'running' para que el frontend deje de mostrar "pending"
  await jobsSvc.startJob(jobId);

  // GATE F4: verify prerequisites. See module-level F4_PREREQS for full map.
  // validacion_estado must be a success state — 'rechazado_bloom' intentionally excluded.
  const prereqs = F4_PREREQS[body.promptId];
  if (prereqs) {
    for (const prereq of prereqs) {
      const { data: row } = await supabase
        .client!.from('fase4_productos')
        .select('id')
        .eq('project_id', body.projectId)
        .eq('producto', prereq.producto)
        .in('validacion_estado', ['aprobado', 'aprobado_con_errores', 'aprobado_por_fallback'])
        .maybeSingle();
      if (!row) {
        await jobsSvc.failJob(jobId, `${prereq.label} debe generarse antes de producir este documento.`);
        return;
      }
    }
  }

  try {
    // PASO 1 + 2: Construir contexto enriquecido (inyección histórica + OSINT)
    const enrichedContext = await buildEnrichedContext(body, supabase, jobId, services);

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
          services
        });
      }
    });

    // PASO 4: Completar el Job y guardar documento
    // F4 products and TEMARIO_BASE are persisted by their assemblers — do not call
    // saveDocument here. saveDocument marks wizard_step 5 as 'completed', which must
    // only happen after all 8 F4 products exist, not after temario confirmation.
    const isF4Product = body.promptId.startsWith('F4_P') || body.promptId === 'TEMARIO_BASE';
    
    // Sanitizar el contenido final antes de persistirlo (anti Prompt Bleeding)
    const sanitizedContent = AIService.sanitizeOutput(content);
    
    let documentId: string | undefined;
    if (body.stepId && !isF4Product) {
      const saved = await supabase.saveDocument({
        projectId: body.projectId,
        stepId: body.stepId,
        phaseId: body.phaseId,
        title: `${body.phaseId} - ${enrichedContext.projectName}`,
        content: sanitizedContent,
      });
      documentId = saved.documentId;
    }

    await jobsSvc.completeJob(jobId, { documentId, content: sanitizedContent });
    console.log(`[pipeline] SUCCESS job=${jobId}`);

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Pipeline error';
    console.error(`[pipeline] FAILED job=${jobId}:`, err);
    await jobsSvc.failJob(jobId, msg);
  }
}