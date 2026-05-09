import { Context } from 'hono';
import { SupabaseService } from '../services/supabase.service';
import { PipelineJobsService } from '../../core/services/pipeline-jobs.service';
import { runPipelineAsync } from './document.handlers';
import { Env } from '../../core/types/env';

// ── Config ─────────────────────────────────────────────────────────────────

interface ProductConfig {
  code: string;
  promptId: string;
  keyPrefix?: string;   // present → multi-module product
  nameKey?: string;     // userInputs key for the human-readable module name
  labelStrip?: RegExp;  // strip from schema label to get clean module name
}

// Order matches frontend PRODUCTS array. P4 before P3/P2 because P3/P2 need P4 content.
const PRODUCTS_ORDER: ProductConfig[] = [
  { code: 'P1', promptId: 'F4_P1_GENERATE_DOCUMENT' },
  { code: 'P4', promptId: 'F4_P4_GENERATE_DOCUMENT' },
  { code: 'P3', promptId: 'F4_P3_GENERATE_DOCUMENT', keyPrefix: 'guion_unidad_',       nameKey: '_nombre_video',      labelStrip: /^(Configuración de Producción|Ficha Técnica de Producción):\s*/i },
  { code: 'P2', promptId: 'F4_P2_GENERATE_DOCUMENT', keyPrefix: 'presentacion_unidad_', nameKey: '_nombre_modulo',    labelStrip: /^Presentación:\s*/i },
  { code: 'P5', promptId: 'F4_P5_GENERATE_DOCUMENT', keyPrefix: 'actividad_unidad_',   nameKey: '_nombre_actividad',  labelStrip: /^(Configuración de Actividad|Actividad):\s*/i },
  { code: 'P6', promptId: 'F4_P6_GENERATE_DOCUMENT', keyPrefix: 'sesion_unidad_',      nameKey: '_nombre_sesion',     labelStrip: /^(Programación de Sesión|Sesión):\s*/i },
  { code: 'P7', promptId: 'F4_P7_GENERATE_DOCUMENT', keyPrefix: 'informacion_unidad_', nameKey: '_nombre_tema',       labelStrip: /^(Información General|Tema):\s*/i },
  { code: 'P8', promptId: 'F4_P8_GENERATE_DOCUMENT', keyPrefix: 'cronograma_unidad_',  nameKey: '_nombre_modulo',     labelStrip: /^(Cronograma de Módulo|Desarrollo):\s*/i },
];

const DEV_USER_ID = '00000000-0000-0000-0000-000000000001';
const POLL_MS = 5_000;
const JOB_TIMEOUT_MS = 30 * 60 * 1_000; // 30 min per job

// ── Helpers ────────────────────────────────────────────────────────────────

async function waitForJob(
  jobsSvc: PipelineJobsService,
  jobId: string,
): Promise<'completed' | 'failed' | 'timeout'> {
  const deadline = Date.now() + JOB_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise(res => setTimeout(res, POLL_MS));
    const job = await jobsSvc.getJob(jobId);
    if (!job || job.status === 'failed') return 'failed';
    if (job.status === 'completed') return 'completed';
  }
  return 'timeout';
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
    projectName:      project?.name         || 'Curso',
    clientName:       project?.client_name  || '',
    industry:         cd.industry           || cd.sector         || '',
    courseTopic:      cd.courseTopic        || cd.tema           || '',
    experienceLevel:  cd.experienceLevel    || cd.nivel          || '',
    targetAudience:   cd.targetAudience     || cd.audiencia      || '',
    expectedOutcome:  cd.expectedOutcome    || '',
    fase3: {
      unidades:                 f2?.estructura_tematica          || [],
      calculo_duracion:         f3?.calculo_duracion             || {},
      duracion_promedio_minutos: f2_5?.duracion_promedio_minutos ?? null,
      total_videos:             f2_5?.total_videos               ?? null,
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

// ── Background runner ──────────────────────────────────────────────────────

async function runAllProductsSequentially(projectId: string, env: Env): Promise<void> {
  const supabase  = new SupabaseService(env);
  const jobsSvc   = new PipelineJobsService(env);
  const runTag    = `${projectId.slice(0, 8)}-${Date.now()}`;

  console.log(`[TEST-RUN] ══ Iniciando run ${runTag} ══`);

  let baseContext: Record<string, any>;
  try {
    baseContext = await buildBaseContext(supabase, projectId);
    console.log(`[TEST-RUN] Proyecto: "${baseContext.projectName}" | ${baseContext.fase3?.unidades?.length ?? 0} unidades`);
  } catch (err) {
    console.error('[TEST-RUN] Error cargando contexto base:', err);
    return;
  }

  const log: Array<{ product: string; jobId: string; status: string }> = [];

  for (const product of PRODUCTS_ORDER) {
    console.log(`[TEST-RUN] ── ${product.code} ──────────────────────`);

    const { data: schema } = await supabase.client!
      .from('producto_form_schemas')
      .select('schema_json, valores_usuario')
      .eq('project_id', projectId)
      .eq('producto', product.code)
      .maybeSingle();

    const valoresUsuario = (schema?.valores_usuario || {}) as Record<string, any>;

    if (Object.keys(valoresUsuario).length === 0) {
      console.warn(`[TEST-RUN] ${product.code}: sin valores_usuario — saltando`);
      log.push({ product: product.code, jobId: '', status: 'skipped:no-form-values' });
      continue;
    }

    // Build label map from schema fields for human-readable module names
    const labelMap: Record<string, string> = {};
    for (const field of ((schema?.schema_json?.fields || []) as any[])) {
      if (field.name && field.label) {
        const clean = product.labelStrip
          ? String(field.label).replace(product.labelStrip, '').trim()
          : String(field.label).trim();
        labelMap[field.name] = clean || String(field.label);
      }
    }

    // Reload productos_previos fresh so each product sees predecessors just generated
    const productosPrevios = await loadProductosPrevios(supabase, projectId);
    const context = { ...baseContext, ...(Object.keys(productosPrevios).length ? { productos_previos: productosPrevios } : {}) };

    if (product.keyPrefix) {
      // ── Multi-module ────────────────────────────────────────────────────
      const moduloKeys = Object.keys(valoresUsuario)
        .filter(k => k.startsWith(product.keyPrefix!))
        .sort();

      if (moduloKeys.length === 0) {
        console.warn(`[TEST-RUN] ${product.code}: no hay campos ${product.keyPrefix}* — saltando`);
        log.push({ product: product.code, jobId: '', status: 'skipped:no-module-keys' });
        continue;
      }

      console.log(`[TEST-RUN] ${product.code}: ${moduloKeys.length} módulos`);

      for (const key of moduloKeys) {
        const moduloNum = parseInt(key.replace(product.keyPrefix!, ''), 10);
        const nombreModulo = labelMap[key] || `Módulo ${moduloNum}`;

        const userInputs: Record<string, any> = {
          [key]:            valoresUsuario[key],
          _modulo_actual:   moduloNum,
          [product.nameKey!]: nombreModulo,
          _producto:        product.code,
          productos_previos: productosPrevios,
        };

        console.log(`[TEST-RUN] ${product.code} mód.${moduloNum}: "${nombreModulo}"`);

        const jobId = await jobsSvc.createJob({
          siteId:    'dcfl',
          projectId,
          phaseId:   'F4',
          promptId:  product.promptId,
          context,
          userInputs,
          userId:    DEV_USER_ID,
        });

        runPipelineAsync(jobId, { projectId, stepId: '', phaseId: 'F4', promptId: product.promptId, context, userInputs }, env)
          .catch(err => console.error(`[TEST-RUN] ${product.code} mód.${moduloNum}:`, err));

        const outcome = await waitForJob(jobsSvc, jobId);
        log.push({ product: `${product.code}-mod${moduloNum}`, jobId, status: outcome });
        console.log(`[TEST-RUN] ${product.code} mód.${moduloNum}: ${outcome} (job ${jobId})`);
      }
    } else {
      // ── Single job ──────────────────────────────────────────────────────
      const userInputs: Record<string, any> = {
        ...valoresUsuario,
        _producto:        product.code,
        productos_previos: productosPrevios,
      };

      const jobId = await jobsSvc.createJob({
        siteId:    'dcfl',
        projectId,
        phaseId:   'F4',
        promptId:  product.promptId,
        context,
        userInputs,
        userId:    DEV_USER_ID,
      });

      runPipelineAsync(jobId, { projectId, stepId: '', phaseId: 'F4', promptId: product.promptId, context, userInputs }, env)
        .catch(err => console.error(`[TEST-RUN] ${product.code}:`, err));

      const outcome = await waitForJob(jobsSvc, jobId);
      log.push({ product: product.code, jobId, status: outcome });
      console.log(`[TEST-RUN] ${product.code}: ${outcome} (job ${jobId})`);
    }
  }

  const ran      = log.filter(r => !r.status.startsWith('skipped'));
  const passed   = ran.filter(r => r.status === 'completed').length;
  console.log(`[TEST-RUN] ══ Completado ${runTag}: ${passed}/${ran.length} productos OK ══`);
  console.log(`[TEST-RUN] Detalle:\n${JSON.stringify(log, null, 2)}`);
}

// ── HTTP handlers ──────────────────────────────────────────────────────────

export async function handleTestRunAll(c: Context) {
  const body = await c.req.json().catch(() => ({})) as any;
  const projectId: string | undefined = body?.projectId;

  if (!projectId || projectId === 'undefined') {
    return c.json({ success: false, error: 'Se requiere { projectId } en el body JSON' }, 400);
  }

  const runId = `${projectId.slice(0, 8)}-${Date.now()}`;

  runAllProductsSequentially(projectId, c.env as Env).catch(err =>
    console.error(`[TEST-RUN] Error crítico en run ${runId}:`, err)
  );

  return c.json({
    success: true,
    runId,
    projectId,
    message: 'Test run iniciado. 8 productos se generarán secuencialmente en background.',
    order: 'P1 → P4 → P3 (por módulo) → P2 (por módulo) → P5 → P6 → P7 → P8',
    prereq: 'Deben existir producto_form_schemas con valores_usuario para cada producto.',
    monitor: {
      logs:     'docker logs knowto-backend -f 2>&1 | grep TEST-RUN',
      products: `SELECT producto, validacion_estado, created_at FROM fase4_productos WHERE project_id='${projectId}' ORDER BY producto, created_at DESC;`,
      jobs:     `SELECT prompt_id, status, LEFT(error,80) FROM pipeline_jobs WHERE project_id='${projectId}' AND phase_id='F4' ORDER BY created_at DESC LIMIT 20;`,
    },
  }, 202);
}

export async function handleTestReset(c: Context) {
  const { projectId } = c.req.param() as { projectId: string };

  if (!projectId || projectId === 'undefined') {
    return c.json({ success: false, error: 'Se requiere projectId en la URL' }, 400);
  }

  const supabase = new SupabaseService(c.env);

  const [r1, r2, r3] = await Promise.all([
    supabase.client!.from('fase4_productos').delete().eq('project_id', projectId),
    supabase.client!.from('producto_form_schemas').delete().eq('project_id', projectId),
    supabase.client!.from('pipeline_jobs').delete().eq('project_id', projectId).eq('phase_id', 'F4'),
  ]);

  const errors = [r1.error, r2.error, r3.error].filter(Boolean);
  if (errors.length > 0) {
    return c.json({ success: false, errors: errors.map(e => (e as any)?.message) }, 500);
  }

  return c.json({
    success: true,
    projectId,
    deleted: [
      'fase4_productos (todos los productos generados)',
      'producto_form_schemas (formularios y valores)',
      'pipeline_jobs F4 (jobs y agent_outputs en cascada)',
    ],
    next: `Ahora genera los form schemas vía el wizard o espera a que el frontend los cree al abrir Step 4.`,
  });
}
