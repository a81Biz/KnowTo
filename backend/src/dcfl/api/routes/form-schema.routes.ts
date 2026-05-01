import { OpenAPIHono } from '@hono/zod-openapi';
import { SupabaseService } from '../../services/supabase.service';
import { PipelineJobsService } from '../../../core/services/pipeline-jobs.service';
import { runPipelineAsync } from '../../handlers/document.handlers';
import { PromptId } from '../../types/wizard.types';
import { Env } from '../../../core/types/env';

const router = new OpenAPIHono<{ Bindings: Env; Variables: { userId: string } }>();

// Ruta libre (sin middleware de autenticación)

// GET /api/form-schema/:projectId/:producto
router.get('/:projectId/:producto', async (c) => {
  try {
    const { projectId, producto } = c.req.param();
    console.log(`[GATEWAY-TRACE] Recibido projectId: "${projectId}", producto: "${producto}"`);

    if (projectId === 'undefined' || !projectId) {
      console.error('[GATEWAY-FATAL] El projectId llegó como "undefined". Abortando.');
      return c.json({ success: false, error: 'projectId is undefined' }, 400);
    }

    const refresh = c.req.query('refresh') === 'true';
    const supabase = new SupabaseService(c.env);

    const { data: existing, error } = await supabase.client!
      .from('producto_form_schemas')
      .select('schema_json, valores_sugeridos, valores_usuario')
      .eq('project_id', projectId)
      .eq('producto', producto)
      .single();

    console.log(`[DEBUG-F4-DATA] GET /form-schema/${projectId}/${producto}`);
    console.log(`[GATEWAY-INFO] GET Schema solicitado. ¿Existe en DB?: ${!!existing}.`);

    if (error || !existing || !existing.schema_json?.fields?.length) {
      const jobsSvc = new PipelineJobsService(c.env);
      
      // 1. Evitar múltiples jobs: Verificar si ya hay un job activo para este producto en este proyecto
      const { data: activeJob } = await supabase.client!
        .from('pipeline_jobs')
        .select('id, status, created_at')
        .eq('project_id', projectId)
        .eq('prompt_id', 'F4_GENERATE_FORM_SCHEMA')
        .contains('user_inputs', { producto })
        .in('status', ['pending', 'running'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeJob && !refresh) {
        const createdAt = new Date(activeJob.created_at).getTime();
        const now = new Date().getTime();
        const minutesDiff = (now - createdAt) / 1000 / 60;

        console.log(`[GATEWAY-INFO] Job Activo encontrado: ${activeJob.id} (Status: ${activeJob.status})`);

        if (minutesDiff > 15) {
          console.warn(`[DEBUG-F4-DATA] Job ${activeJob.id} detectado como ZOMBI (${minutesDiff.toFixed(1)} min). Invalidando...`);
          await supabase.client!
            .from('pipeline_jobs')
            .update({ status: 'failed', error: 'Job timeout - detectado como zombi' })
            .eq('id', activeJob.id);
          console.log(`[DEBUG-F4-DATA] Job Zombi ${activeJob.id} invalidado correctamente.`);
        } else {
          console.log(`[DEBUG-F4-DATA] Reutilizando job activo ${activeJob.id} para ${producto}`);
          return c.json({ 
            status: 'generating', 
            jobId: activeJob.id, 
            message: 'Generando esquema del formulario...' 
          });
        }
      }

      // 2. Obtener datos del proyecto y de las fases previas
      const { data: project } = await supabase.client!
        .from('projects')
        .select('user_id, name, client_name, data')
        .eq('id', projectId)
        .single();

      // Auditoría de datos: Buscar en Fase 2 (Temario) y Fase 3 (Especificaciones)
      const { data: f2 } = await supabase.client!
        .from('fase2_analisis_alcance')
        .select('estructura_tematica, perfil_ingreso')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: f3 } = await supabase.client!
        .from('fase3_especificaciones')
        .select('calculo_duracion, plataformas_navegador')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Solo enviamos unidades al pipeline — perfil_ingreso y duracion aumentan el prompt ~3×
      // sin aportar información útil para generar el formulario de campo
      const fase3Data = {
        unidades: f2?.estructura_tematica || (project?.data?.fase3?.unidades ?? []),
      };

      console.log(`[DEBUG-F4-DATA] Contexto podado → ${fase3Data.unidades.length} unidades`);

      const userId = c.get('userId') || project?.user_id || '00000000-0000-0000-0000-000000000000';

      if (!fase3Data.unidades?.length) {
        console.warn(`[DEBUG-F4-DATA] Intento de generar esquema para ${producto} sin datos de origen.`);
        return c.json({ 
          status: 'error', 
          message: 'No se encontraron los datos de la Fase 3 (Temario/Objetivos) necesarios para proponer el formulario. Por favor, completa la Fase 3 primero.' 
        }, 400);
      }

      // 3. Elegir el pipeline especializado por producto, con fallback al genérico
      const FORM_SCHEMA_PROMPT_BY_PRODUCT: Record<string, string> = {
        'P1': 'F4_P1_FORM_SCHEMA',
        'P2': 'F4_P2_FORM_SCHEMA',
        'P3': 'F4_P3_FORM_SCHEMA',
        'P4': 'F4_P4_FORM_SCHEMA',
        'P5': 'F4_P5_FORM_SCHEMA',
        'P6': 'F4_P6_FORM_SCHEMA',
        'P7': 'F4_P7_FORM_SCHEMA',
        'P8': 'F4_P8_FORM_SCHEMA',
      };
      const formSchemaPromptId = (FORM_SCHEMA_PROMPT_BY_PRODUCT[producto] ?? 'F4_GENERATE_FORM_SCHEMA') as PromptId;
      console.log(`[GATEWAY-INFO] Usando pipeline: ${formSchemaPromptId} para ${producto}`);

      // 4. Crear el nuevo Job
      const jobId = await jobsSvc.createJob({
        siteId: 'dcfl',
        projectId,
        stepId: undefined,
        phaseId: 'F4',
        promptId: formSchemaPromptId,
        userInputs: { producto },
        userId,
      });

      // 5. Disparar el pipeline asíncrono (Fire-and-forget)
      runPipelineAsync(
        jobId,
        {
          projectId,
          stepId: '',
          phaseId: 'F4',
          promptId: formSchemaPromptId,
          context: {
            projectName: project?.name || '',
            clientName: project?.client_name || '',
            producto,
            // Inyectar datos estructurados de Fase 3
            fase3: fase3Data,
          },
          userInputs: { producto },
        },
        c.env
      ).catch((err) =>
        console.error(`[form-schema] pipeline unhandled error for job ${jobId}:`, err)
      );

      return c.json({ 
        status: 'generating', 
        jobId, 
        message: 'Generando esquema del formulario...' 
      });
    }

    return c.json({
      status: 'ready',
      schema: existing.schema_json,
      valores_sugeridos: existing.valores_sugeridos || {},
      valores_usuario: existing.valores_usuario || {},
    });
  } catch (error: any) {
    console.error('[CRITICAL-ROUTE-ERROR]', error);
    return c.json({ 
      success: false, 
      error: error.message, 
      stack: error.stack,
      timestamp: new Date().toISOString() 
    }, 500);
  }
});

// POST /api/form-schema/:projectId/:producto
router.post('/:projectId/:producto', async (c) => {
  const { projectId, producto } = c.req.param();
  const { valores_usuario } = await c.req.json();

  const supabase = new SupabaseService(c.env);

  const { error } = await supabase.client!
    .from('producto_form_schemas')
    .upsert(
      {
        project_id: projectId,
        producto,
        valores_usuario,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'project_id,producto' }
    );

  if (error) {
    return c.json({ error: 'Error al guardar valores' }, 500);
  }

  return c.json({ success: true });
});

export default router;
