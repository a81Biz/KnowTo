import { Context } from 'hono';
import { SupabaseService } from '../services/supabase.service';
import { PipelineJobsService } from '../../core/services/pipeline-jobs.service';
import { runPipelineAsync } from './document.handlers';
import { orchestrateP4Chapters } from '../helpers/p4-orchestrator.helper';
import { Env } from '../../core/types/env';

// ── Config ─────────────────────────────────────────────────────────────────

interface ProductConfig {
  code: string;
  formPromptId: string;
  docPromptId: string;
  keyPrefix?: string;   // present → multi-module document generation
  nameKey?: string;     // userInputs key for the human-readable module name
  labelStrip?: RegExp;  // strip prefix from schema field label
}

// P4 (Manual) is the source of truth — must run first so P1/P3/P2 can reference its content.
// P3 (Guiones) must run before P2 (Presentación) so juez_presentacion can evaluate scene alignment.
// Correct order: P4, P1, P3, P2, P5, P7, P6, P8
const PRODUCTS_ORDER: ProductConfig[] = [
  {
    code: 'P4',
    formPromptId: 'F4_P4_FORM_SCHEMA',
    docPromptId:  'F4_P4_GENERATE_DOCUMENT',
  },
  {
    code: 'P1',
    formPromptId: 'F4_P1_FORM_SCHEMA',
    docPromptId:  'F4_P1_GENERATE_DOCUMENT',
  },
  {
    code: 'P3',
    formPromptId: 'F4_P3_FORM_SCHEMA',
    docPromptId:  'F4_P3_GENERATE_DOCUMENT',
    keyPrefix: 'guion_unidad_',
    nameKey:   '_nombre_video',
    labelStrip: /^(Configuración de Producción|Ficha Técnica de Producción):\s*/i,
  },
  {
    code: 'P2',
    formPromptId: 'F4_P2_FORM_SCHEMA',
    docPromptId:  'F4_P2_GENERATE_DOCUMENT',
    keyPrefix: 'presentacion_unidad_',
    nameKey:   '_nombre_modulo',
    labelStrip: /^Presentación:\s*/i,
  },
  {
    code: 'P5',
    formPromptId: 'F4_P5_FORM_SCHEMA',
    docPromptId:  'F4_P5_GENERATE_DOCUMENT',
    keyPrefix: 'actividad_unidad_',
    nameKey:   '_nombre_actividad',
    labelStrip: /^(Configuración de Actividad|Actividad):\s*/i,
  },
  {
    code: 'P7',
    formPromptId: 'F4_P7_FORM_SCHEMA',
    docPromptId:  'F4_P7_GENERATE_DOCUMENT',
    keyPrefix: 'informacion_unidad_',
    nameKey:   '_nombre_tema',
    labelStrip: /^(Información General|Tema):\s*/i,
  },
  {
    code: 'P6',
    formPromptId: 'F4_P6_FORM_SCHEMA',
    docPromptId:  'F4_P6_GENERATE_DOCUMENT',
    keyPrefix: 'sesion_unidad_',
    nameKey:   '_nombre_sesion',
    labelStrip: /^(Programación de Sesión|Sesión):\s*/i,
  },
  {
    code: 'P8',
    formPromptId: 'F4_P8_FORM_SCHEMA',
    docPromptId:  'F4_P8_GENERATE_DOCUMENT',
    keyPrefix: 'cronograma_unidad_',
    nameKey:   '_nombre_modulo',
    labelStrip: /^(Cronograma de Módulo|Desarrollo):\s*/i,
  },
];

const DEV_USER_ID    = '00000000-0000-0000-0000-000000000001';
const JOB_TIMEOUT_MS = 30 * 60 * 1_000; // 30 min per job (Realtime + 30s fallback poll)

// ── Helpers ────────────────────────────────────────────────────────────────

async function logTestStep(
  supabase: SupabaseService,
  runId: string,
  projectId: string,
  step: string,
  status: string,
  jobId?: string,
  detail: Record<string, any> = {},
): Promise<void> {
  if (!supabase.client) return;
  const { error } = await supabase.client
    .from('test_run_logs')
    .insert({ run_id: runId, project_id: projectId, step, status, job_id: jobId ?? null, detail });
  if (error) console.error('[TEST-RUN] logTestStep error:', error.message);
}

async function buildBaseContext(
  supabase: SupabaseService,
  projectId: string,
): Promise<Record<string, any>> {
  const { data: project } = await supabase.client!
    .from('projects')
    .select('name, client_name, data')
    .eq('id', projectId)
    .single();

  const { data: f2 } = await supabase.client!
    .from('fase2_analisis_alcance')
    .select('estructura_tematica')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: f3 } = await supabase.client!
    .from('fase3_especificaciones')
    .select('calculo_duracion')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: f2_5 } = await supabase.client!
    .from('fase2_5_recomendaciones')
    .select('duracion_promedio_minutos, total_videos')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const cd = (project?.data || {}) as Record<string, any>;

  return {
    projectName:       project?.name        || 'Curso',
    clientName:        project?.client_name || '',
    industry:          cd.industry          || cd.sector       || '',
    courseTopic:       cd.courseTopic       || cd.tema         || '',
    experienceLevel:   cd.experienceLevel   || cd.nivel        || '',
    targetAudience:    cd.targetAudience    || cd.audiencia    || '',
    expectedOutcome:   cd.expectedOutcome   || '',
    fase3: {
      unidades:                  f2?.estructura_tematica          || [],
      calculo_duracion:          f3?.calculo_duracion             || {},
      duracion_promedio_minutos: f2_5?.duracion_promedio_minutos  ?? null,
      total_videos:              f2_5?.total_videos               ?? null,
    },
  };
}

async function loadProductosPrevios(
  supabase: SupabaseService,
  projectId: string,
): Promise<Record<string, any>> {
  const productos = await supabase.getF4Productos(projectId);
  const map: Record<string, any> = {};
  for (const p of productos) {
    if (p.datos_producto) map[p.producto] = p.datos_producto;
  }
  return map;
}

/**
 * Build form values from schema field suggested_value.
 * Falls back to valores_usuario if the user has already filled the form.
 */
function buildValoresDesdeSchema(
  schemaJson: any,
  valoresUsuario: Record<string, any>,
): Record<string, any> {
  // If user already filled the form, prefer those values
  if (valoresUsuario && Object.keys(valoresUsuario).length > 0) {
    return valoresUsuario;
  }
  // Otherwise use AI-suggested values from each field
  const values: Record<string, any> = {};
  for (const field of (schemaJson?.fields || []) as any[]) {
    if (field.name && field.suggested_value !== undefined) {
      values[field.name] = field.suggested_value;
    }
  }
  return values;
}

/**
 * Generate the form schema for a product if it doesn't already exist.
 * Returns the schema_json from the DB after generation.
 */
async function ensureFormSchema(
  supabase: SupabaseService,
  jobsSvc: PipelineJobsService,
  projectId: string,
  product: ProductConfig,
  baseContext: Record<string, any>,
  env: Env,
  runId?: string,
): Promise<{ schemaJson: any; valoresUsuario: Record<string, any> }> {
  // Check existing
  const { data: existing } = await supabase.client!
    .from('producto_form_schemas')
    .select('schema_json, valores_usuario')
    .eq('project_id', projectId)
    .eq('producto', product.code)
    .maybeSingle();

  if (existing?.schema_json?.fields?.length > 0) {
    console.log(`[TEST-RUN] ${product.code} form: ya existe (${existing.schema_json.fields.length} campos)`);
    return {
      schemaJson: existing.schema_json,
      valoresUsuario: (existing.valores_usuario || {}) as Record<string, any>,
    };
  }

  // Generate form schema
  console.log(`[TEST-RUN] ${product.code} form: generando ${product.formPromptId}...`);
  const formContext = { ...baseContext, producto: product.code };
  const formUserInputs = { producto: product.code };

  const jobId = await jobsSvc.createJob({
    siteId:    'dcfl',
    projectId,
    phaseId:   'F4',
    promptId:  product.formPromptId,
    context:   formContext,
    userInputs: formUserInputs,
    userId:    DEV_USER_ID,
  });

  if (runId) await logTestStep(supabase, runId, projectId, `${product.code}:form`, 'running', jobId);

  runPipelineAsync(jobId, {
    projectId,
    stepId:   '',
    phaseId:  'F4',
    promptId: product.formPromptId,
    context:  formContext,
    userInputs: formUserInputs,
  }, env).catch(err => console.error(`[TEST-RUN] ${product.code} form error:`, err));

  const outcome = await jobsSvc.waitForJob(jobId, JOB_TIMEOUT_MS);
  console.log(`[TEST-RUN] ${product.code} form: ${outcome} (job ${jobId})`);
  if (runId) await logTestStep(supabase, runId, projectId, `${product.code}:form`, outcome, jobId);

  if (outcome !== 'completed') {
    return { schemaJson: { fields: [] }, valoresUsuario: {} };
  }

  // Read what was saved by the assembler
  const { data: generated } = await supabase.client!
    .from('producto_form_schemas')
    .select('schema_json, valores_usuario')
    .eq('project_id', projectId)
    .eq('producto', product.code)
    .maybeSingle();

  return {
    schemaJson:     generated?.schema_json || { fields: [] },
    valoresUsuario: (generated?.valores_usuario || {}) as Record<string, any>,
  };
}

// ── Prerequisite helpers ───────────────────────────────────────────────────

/**
 * Ensures temario_base.confirmado_por_usuario = true before F4 product runs.
 * Three branches:
 *   1. Already confirmed → no-op.
 *   2. Record exists, not confirmed → confirm directly (no regeneration).
 *   3. No record → run TEMARIO_BASE pipeline, then confirm if completed.
 * A failed pipeline is non-fatal: run continues in degraded mode (consistent
 * with the pre-fix behavior for projects that had no temario).
 */
async function ensureTemarioConfirmado(
  supabase: SupabaseService,
  jobsSvc: PipelineJobsService,
  projectId: string,
  baseContext: Record<string, any>,
  env: Env,
  runId?: string,
): Promise<void> {
  const temario = await supabase.getTemarioBase(projectId);

  if (temario?.confirmado_por_usuario === true) {
    console.log('[TEST-RUN] prereq:temario — ya confirmado');
    if (runId) await logTestStep(supabase, runId, projectId, 'prereq:temario', 'skipped', undefined, { reason: 'already-confirmed' });
    return;
  }

  if (temario) {
    // Record exists but not yet confirmed — confirm without regenerating
    console.log('[TEST-RUN] prereq:temario — registro existente no confirmado, confirmando...');
    if (runId) await logTestStep(supabase, runId, projectId, 'prereq:temario', 'running');
    await supabase.confirmarTemario(projectId);
    console.log('[TEST-RUN] prereq:temario — confirmado (registro existente)');
    if (runId) await logTestStep(supabase, runId, projectId, 'prereq:temario', 'completed');
    return;
  }

  // No record — run pipeline then confirm
  console.log('[TEST-RUN] prereq:temario — sin registro; generando TEMARIO_BASE...');
  if (runId) await logTestStep(supabase, runId, projectId, 'prereq:temario', 'running');

  const body = {
    projectId,
    stepId:    '',
    phaseId:   'TEMARIO_BASE',   // must NOT be 'F4' — avoids CANONICAL_SPEC_FREEZE gate
    promptId:  'TEMARIO_BASE',
    context:   baseContext,
    userInputs: {},
  };

  const jobId = await jobsSvc.createJob({
    siteId:    'dcfl',
    projectId,
    phaseId:   body.phaseId,
    promptId:  body.promptId,
    context:   body.context,
    userInputs: body.userInputs,
    userId:    DEV_USER_ID,
  });

  runPipelineAsync(jobId, body, env)
    .catch(err => console.error('[TEST-RUN] prereq:temario pipeline error:', err));

  const outcome = await jobsSvc.waitForJob(jobId, JOB_TIMEOUT_MS);
  console.log(`[TEST-RUN] prereq:temario — pipeline ${outcome} (job ${jobId})`);

  if (outcome === 'completed') {
    await supabase.confirmarTemario(projectId);
    console.log('[TEST-RUN] prereq:temario — generado y confirmado');
    if (runId) await logTestStep(supabase, runId, projectId, 'prereq:temario', 'completed', jobId);
  } else {
    console.warn(`[TEST-RUN] prereq:temario — pipeline ${outcome}; continuando con calidad degradada`);
    if (runId) await logTestStep(supabase, runId, projectId, 'prereq:temario', outcome, jobId, { reason: 'pipeline-failed-degraded' });
  }
}

/**
 * Ensures projects.canonical_spec_frozen = true before F4 product runs.
 * Idempotent: if already frozen, returns immediately.
 * Throws on DB error — without this flag all F4 jobs will fail anyway.
 */
async function ensureCanonicalSpecFrozen(
  supabase: SupabaseService,
  projectId: string,
  runId?: string,
): Promise<void> {
  const isFrozen = await supabase.getCanonicalSpecFrozen(projectId);
  if (isFrozen) {
    console.log('[TEST-RUN] prereq:canonical-spec — ya frozen');
    if (runId) await logTestStep(supabase, runId, projectId, 'prereq:canonical-spec', 'skipped', undefined, { reason: 'already-frozen' });
    return;
  }
  await supabase.confirmCanonicalSpecFrozen(projectId);
  console.log('[TEST-RUN] prereq:canonical-spec — confirmado');
  if (runId) await logTestStep(supabase, runId, projectId, 'prereq:canonical-spec', 'completed');
}

// ── Background runner ──────────────────────────────────────────────────────

async function runAllProductsSequentially(projectId: string, runId: string, env: Env): Promise<void> {
  const supabase = new SupabaseService(env);
  const jobsSvc  = new PipelineJobsService(env);
  const runTag   = runId.slice(0, 8);

  // PT-003: Validar que el proyecto existe antes de lanzar cualquier job
  const { data: projectCheck } = await supabase.client!
    .from('projects')
    .select('id, name')
    .eq('id', projectId)
    .maybeSingle();

  if (!projectCheck) {
    console.error(`[TEST-RUN] ABORT — projectId "${projectId}" no existe en la tabla projects.`);
    console.error(`[TEST-RUN] Proyectos disponibles: ejecutar "SELECT id, name FROM projects ORDER BY created_at DESC;"`);
    return;
  }

  console.log(`[TEST-RUN] ══ Iniciando run ${runTag} ══`);
  console.log(`[TEST-RUN] Proyecto validado: "${projectCheck.name}"`);

  let baseContext: Record<string, any>;
  try {
    baseContext = await buildBaseContext(supabase, projectId);
    console.log(`[TEST-RUN] Contexto: ${baseContext.fase3?.unidades?.length ?? 0} unidades cargadas`);
  } catch (err) {
    console.error('[TEST-RUN] Error cargando contexto base:', err);
    return;
  }

  // ── Prerequisites (simulate manual wizard confirmations) ──────────────────
  // Order is mandatory: temario first (provides _frozen.total_unidades),
  // then canonical_spec (gates every F4 job).
  await ensureTemarioConfirmado(supabase, jobsSvc, projectId, baseContext, env, runId);
  await ensureCanonicalSpecFrozen(supabase, projectId, runId);

  const log: Array<{ step: string; jobId: string; status: string }> = [];

  for (const product of PRODUCTS_ORDER) {
    console.log(`[TEST-RUN] ════ ${product.code} ════`);

    // STEP 1: Form schema
    const { schemaJson, valoresUsuario } = await ensureFormSchema(
      supabase, jobsSvc, projectId, product, baseContext, env, runId,
    );

    if (!schemaJson?.fields?.length) {
      console.warn(`[TEST-RUN] ${product.code}: form schema vacío — saltando documento`);
      log.push({ step: `${product.code}:form`, jobId: '', status: 'failed:empty-schema' });
      await logTestStep(supabase, runId, projectId, `${product.code}:form`, 'failed', undefined, { reason: 'empty-schema' });
      continue;
    }

    // STEP 2: Build form values (suggested if user hasn't filled them)
    const valoresParaDoc = buildValoresDesdeSchema(schemaJson, valoresUsuario);

    if (Object.keys(valoresParaDoc).length === 0) {
      console.warn(`[TEST-RUN] ${product.code}: sin valores para el documento — saltando`);
      log.push({ step: `${product.code}:doc`, jobId: '', status: 'skipped:no-values' });
      await logTestStep(supabase, runId, projectId, `${product.code}:doc`, 'skipped', undefined, { reason: 'no-values' });
      continue;
    }

    // Label map for human-readable module names
    const labelMap: Record<string, string> = {};
    for (const field of (schemaJson.fields || []) as any[]) {
      if (field.name && field.label) {
        const clean = product.labelStrip
          ? String(field.label).replace(product.labelStrip, '').trim()
          : String(field.label).trim();
        labelMap[field.name] = clean || String(field.label);
      }
    }

    // Reload productos_previos fresh (previous products may now be generated)
    const productosPrevios = await loadProductosPrevios(supabase, projectId);
    const context = {
      ...baseContext,
      ...(Object.keys(productosPrevios).length ? { productos_previos: productosPrevios } : {}),
    };

    // STEP 3: Skip si el documento ya existe en BD (evita timeout en P4)
    const { data: existingDoc } = await supabase.client!
      .from('fase4_productos')
      .select('validacion_estado')
      .eq('project_id', projectId)
      .eq('producto', product.code)
      .in('validacion_estado', ['aprobado', 'aprobado_con_errores', 'aprobado_por_fallback'])
      .maybeSingle();

    if (existingDoc) {
      console.log(`[TEST-RUN] ${product.code} doc: ya existe (${existingDoc.validacion_estado}) — saltando generación`);
      log.push({ step: product.code, jobId: 'skip', status: 'skipped:already-exists' });
      await logTestStep(supabase, runId, projectId, `${product.code}:doc`, 'skipped', undefined, { reason: 'already-exists', estado: existingDoc.validacion_estado });
      continue;
    }

    // STEP 4: Generate document(s)
    if (product.keyPrefix) {
      // ── Multi-module: one job per module key ──────────────────────────
      const moduloKeys = Object.keys(valoresParaDoc)
        .filter(k => k.startsWith(product.keyPrefix!))
        .sort();

      if (moduloKeys.length === 0) {
        console.warn(`[TEST-RUN] ${product.code}: no hay campos ${product.keyPrefix}* en el schema`);
        log.push({ step: `${product.code}:doc`, jobId: '', status: 'skipped:no-module-keys' });
        await logTestStep(supabase, runId, projectId, `${product.code}:doc`, 'skipped', undefined, { reason: 'no-module-keys', keyPrefix: product.keyPrefix });
        continue;
      }

      console.log(`[TEST-RUN] ${product.code}: ${moduloKeys.length} módulos`);

      for (const key of moduloKeys) {
        const moduloNum    = parseInt(key.replace(product.keyPrefix!, ''), 10);
        const nombreModulo = labelMap[key] || `Módulo ${moduloNum}`;

        const userInputs: Record<string, any> = {
          [key]:              valoresParaDoc[key],
          _modulo_actual:     moduloNum,
          [product.nameKey!]: nombreModulo,
          _producto:          product.code,
          productos_previos:  productosPrevios,
        };

        console.log(`[TEST-RUN] ${product.code} mód.${moduloNum}: "${nombreModulo}"`);

        const jobId = await jobsSvc.createJob({
          siteId:    'dcfl',
          projectId,
          phaseId:   'F4',
          promptId:  product.docPromptId,
          context,
          userInputs,
          userId:    DEV_USER_ID,
        });

        await logTestStep(supabase, runId, projectId, `${product.code}:mod${moduloNum}`, 'running', jobId, { modulo: nombreModulo });

        runPipelineAsync(jobId, { projectId, stepId: '', phaseId: 'F4', promptId: product.docPromptId, context, userInputs }, env)
          .catch(err => console.error(`[TEST-RUN] ${product.code} mód.${moduloNum}:`, err));

        const outcome = await jobsSvc.waitForJob(jobId, JOB_TIMEOUT_MS);
        log.push({ step: `${product.code}-mod${moduloNum}`, jobId, status: outcome });
        console.log(`[TEST-RUN] ${product.code} mód.${moduloNum}: ${outcome} (job ${jobId})`);
        await logTestStep(supabase, runId, projectId, `${product.code}:mod${moduloNum}`, outcome, jobId, { modulo: nombreModulo });
      }
    } else {
      // ── Single job ────────────────────────────────────────────────────

      // P4 requires per-chapter jobs first so the final assembler reads pre-generated chapters.
      // Orchestration is shared with the interactive flow via p4-orchestrator.helper.ts.
      let finalContext = context;
      if (product.code === 'P4') {
        const capitulos_generados = await orchestrateP4Chapters(
          projectId,
          context,
          valoresParaDoc,
          env,
          DEV_USER_ID,
          (chapterJobId, chapterBody, e) => runPipelineAsync(chapterJobId, chapterBody, e),
        );
        finalContext = { ...context, capitulos_generados };
        console.log(`[TEST-RUN] P4: ${capitulos_generados.length} capítulos listos para ensamblado final`);
      }

      const userInputs: Record<string, any> = {
        ...valoresParaDoc,
        _producto:         product.code,
        productos_previos: productosPrevios,
      };

      const jobId = await jobsSvc.createJob({
        siteId:    'dcfl',
        projectId,
        phaseId:   'F4',
        promptId:  product.docPromptId,
        context:   finalContext,
        userInputs,
        userId:    DEV_USER_ID,
      });

      await logTestStep(supabase, runId, projectId, `${product.code}:doc`, 'running', jobId);

      runPipelineAsync(jobId, { projectId, stepId: '', phaseId: 'F4', promptId: product.docPromptId, context: finalContext, userInputs }, env)
        .catch(err => console.error(`[TEST-RUN] ${product.code}:`, err));

      const outcome = await jobsSvc.waitForJob(jobId, JOB_TIMEOUT_MS);
      log.push({ step: product.code, jobId, status: outcome });
      console.log(`[TEST-RUN] ${product.code}: ${outcome} (job ${jobId})`);
      await logTestStep(supabase, runId, projectId, `${product.code}:doc`, outcome, jobId);
    }
  }

  const ran    = log.filter(r => !r.status.startsWith('skipped') && !r.status.startsWith('failed:'));
  const passed = ran.filter(r => r.status === 'completed').length;
  console.log(`[TEST-RUN] ══ Completado ${runTag}: ${passed}/${ran.length} pasos OK ══`);
  console.log(`[TEST-RUN] Detalle:\n${JSON.stringify(log, null, 2)}`);
}

// ── HTTP handlers ──────────────────────────────────────────────────────────

export async function handleTestRunAll(c: Context) {
  const body = await c.req.json().catch(() => ({})) as any;
  const projectId: string | undefined = body?.projectId;

  if (!projectId || projectId === 'undefined') {
    return c.json({ success: false, error: 'Se requiere { projectId } en el body JSON' }, 400);
  }

  // PT-003: Validar que el proyecto existe antes de lanzar el run background
  const supabase = new SupabaseService(c.env);
  const { data: projectCheck } = await supabase.client!
    .from('projects')
    .select('id, name, client_name')
    .eq('id', projectId)
    .maybeSingle();

  if (!projectCheck) {
    const { data: allProjects } = await supabase.client!
      .from('projects')
      .select('id, name')
      .order('created_at', { ascending: false })
      .limit(5);

    return c.json({
      success: false,
      error: `projectId "${projectId}" no existe en la tabla projects.`,
      proyectos_disponibles: allProjects ?? [],
      hint: 'Usa uno de los IDs de proyectos_disponibles en tu llamada.',
    }, 404);
  }

  const runId = crypto.randomUUID();

  runAllProductsSequentially(projectId, runId, c.env as Env).catch(err =>
    console.error(`[TEST-RUN] Error crítico en run ${runId}:`, err)
  );

  return c.json({
    success: true,
    runId,
    projectId,
    projectName: projectCheck.name,
    clientName:  projectCheck.client_name,
    message: 'Test run iniciado. Prerequisitos (temario + canonical spec) y ciclo completo de productos: form schema → documento.',
    order: 'TEMARIO_BASE (prereq, si necesario) → canonical_spec (prereq, si necesario) → P4 → P1 → P3 → P2 → P5 → P7 → P6 → P8',
    realtime: {
      table:  'test_run_logs',
      filter: `run_id=eq.${runId}`,
      hint:   'Suscríbete a postgres_changes en test_run_logs WHERE run_id=eq.<runId> para ver progreso en tiempo real',
    },
    monitor: {
      logs:     'docker logs knowto-backend -f 2>&1 | grep TEST-RUN',
      steps:    `SELECT step, status, job_id, created_at FROM test_run_logs WHERE run_id='${runId}' ORDER BY created_at;`,
      products: `SELECT producto, validacion_estado, created_at FROM fase4_productos WHERE project_id='${projectId}' ORDER BY producto, created_at DESC;`,
      jobs:     `SELECT prompt_id, status, LEFT(error,80) FROM pipeline_jobs WHERE project_id='${projectId}' AND phase_id='F4' ORDER BY created_at DESC LIMIT 30;`,
    },
  }, 202);
}

export async function handleTestReset(c: Context) {
  const { projectId } = c.req.param() as { projectId: string };

  if (!projectId || projectId === 'undefined') {
    return c.json({ success: false, error: 'Se requiere projectId en la URL' }, 400);
  }

  const supabase = new SupabaseService(c.env);

  const { error } = await supabase.client!.rpc('reset_project', { p_project_id: projectId });

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({
    success: true,
    projectId,
    message: 'Proyecto y todos sus datos eliminados. CASCADE activo en todas las tablas hijo.',
  });
}
