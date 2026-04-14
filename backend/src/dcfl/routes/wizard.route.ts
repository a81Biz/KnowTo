// src/dcfl/routes/wizard.route.ts
//
// Patrón de respuestas con @hono/zod-openapi:
//   • Cada handler declara SOLO los códigos que él mismo devuelve (éxito).
//   • 401 → authMiddleware (documentado via security scheme)
//   • 400/422 → @hono/zod-openapi valida automáticamente el body/params
//   • 500 → errorMiddleware global (documentado en el spec raíz)
//
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../../core/middleware/auth.middleware';
import { SupabaseService } from '../services/supabase.service';
import { AIService } from '../../core/services/ai.service';
import { PipelineJobsService } from '../../core/services/pipeline-jobs.service';
import { getPromptRegistry } from '../prompts';

const DCFL_SYSTEM_PROMPT =
  'Eres un experto en diseño instruccional certificado en el estándar EC0366 del CONOCER.\n' +
  'Genera documentos profesionales SOLO en español.\n' +
  'Usa formato Markdown estricto con tablas y listas.\n' +
  'No inventes datos. Si no tienes información, indícalo explícitamente.\n' +
  'Responde únicamente con el documento solicitado, sin preámbulos ni explicaciones adicionales.';
import { ContextExtractorService } from '../../core/services/context-extractor.service';
import dcflFlowMap from '../prompts/flow-map.json';
import type { Env } from '../../core/types/env';
import type { PromptId } from '../types/wizard.types';

// ============================================================================
// ESQUEMAS DE PETICIÓN
// ============================================================================
const CreateProjectBody = z
  .object({
    name: z.string().min(3).max(200).openapi({ example: 'Curso de Seguridad Industrial' }),
    clientName: z.string().min(2).max(200).openapi({ example: 'Juan Pérez' }),
    industry: z.string().optional().openapi({ example: 'Manufactura' }),
    email: z.string().email().optional().openapi({ example: 'juan@empresa.com' }),
  })
  .openapi('CreateProjectBody');

const SaveStepBody = z
  .object({
    projectId: z.string().uuid().openapi({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }),
    stepNumber: z.number().int().min(0).max(11).openapi({ example: 0 }),
    inputData: z.record(z.unknown()).openapi({ example: { courseTopic: 'Seguridad industrial' } }),
  })
  .openapi('SaveStepBody');

const GenerateDocumentBody = z
  .object({
    projectId: z.string().uuid(),
    stepId: z.string().uuid(),
    phaseId: z.enum(['F0', 'F1', 'F2', 'F2.5', 'F3', 'F4', 'F5.1', 'F5.2', 'F6.1', 'F6.2a', 'F6.2b', 'CLOSE']),
    promptId: z.enum([
      'F0', 'F1', 'F2', 'F2_5', 'F3',
      'F4_P0', 'F4_P1', 'F4_P2', 'F4_P3', 'F4_P4', 'F4_P5', 'F4_P6', 'F4_P7',
      'F5', 'F5_2',
      'F6', 'F6_FORM', 'F6_2a', 'F6_2b',
    ]),
    context: z.object({
      projectName: z.string(),
      clientName: z.string(),
      industry: z.string().optional(),
      email: z.string().optional(),
      previousData: z.record(z.unknown()).optional(),
    }),
    userInputs: z.record(z.unknown()),
  })
  .openapi('GenerateDocumentBody');

const GenerateFormBody = z
  .object({
    projectId: z.string().uuid(),
    promptId: z.enum(['F6_FORM']),
    context: z.object({
      projectName: z.string(),
      clientName: z.string(),
      industry: z.string().optional(),
      email: z.string().optional(),
      previousData: z.record(z.unknown()).optional(),
    }),
  })
  .openapi('GenerateFormBody');

const GenerateAsyncBody = z
  .object({
    projectId:  z.string().uuid(),
    stepId:     z.string().uuid(),
    phaseId:    z.enum(['F0', 'F1', 'F2', 'F2.5', 'F3', 'F4', 'F5.1', 'F5.2', 'F6.1', 'F6.2a', 'F6.2b', 'CLOSE']),
    promptId:   z.enum([
      'F0', 'F1', 'F2', 'F2_5', 'F3',
      'F4_P0', 'F4_P1', 'F4_P2', 'F4_P3', 'F4_P4', 'F4_P5', 'F4_P6', 'F4_P7',
      'F5', 'F5_2',
      'F6', 'F6_FORM', 'F6_2a', 'F6_2b',
    ]),
    context:    z.object({
      projectName: z.string(),
      clientName:  z.string(),
      industry:    z.string().optional(),
      email:       z.string().optional(),
      previousData: z.record(z.unknown()).optional(),
    }),
    userInputs: z.record(z.unknown()),
  })
  .openapi('GenerateAsyncBody');

const ProjectIdParam = z.object({ projectId: z.string().uuid() });

const ExtractContextBody = z
  .object({
    projectId: z.string().uuid(),
    extractorId: z.string().min(1).openapi({ example: 'EXTRACTOR_F2' }),
    sourceDocuments: z.record(z.string()).openapi({
      example: { F0: '# MARCO DE REFERENCIA...', F1: '# INFORME DE NECESIDADES...' },
    }),
  })
  .openapi('ExtractContextBody');

// ============================================================================
// RUTAS
// ============================================================================
const BEARER = [{ bearerAuth: [] }];
const TAG = ['dcfl'];

const routeCreateProject = createRoute({
  method: 'post',
  path: '/project',
  tags: TAG,
  summary: 'Crear proyecto',
  description: 'Crea un nuevo proyecto de certificación EC0366 para el usuario autenticado.',
  security: BEARER,
  request: {
    body: { content: { 'application/json': { schema: CreateProjectBody } }, required: true },
  },
  responses: {
    201: {
      description: 'Proyecto creado',
      content: {
        'application/json': {
          schema: z
            .object({
              success: z.literal(true),
              data: z.object({ projectId: z.string().uuid() }),
              timestamp: z.string(),
            })
            .openapi('CreateProjectResponse'),
        },
      },
    },
  },
});

const routeGetProject = createRoute({
  method: 'get',
  path: '/project/{projectId}',
  tags: TAG,
  summary: 'Obtener contexto del proyecto',
  security: BEARER,
  request: { params: ProjectIdParam },
  responses: {
    200: {
      description: 'Contexto del proyecto',
      content: {
        'application/json': {
          schema: z
            .object({
              success: z.literal(true),
              data: z.record(z.unknown()),
              timestamp: z.string(),
            })
            .openapi('ProjectContextResponse'),
        },
      },
    },
  },
});

const routeListProjects = createRoute({
  method: 'get',
  path: '/projects',
  tags: TAG,
  summary: 'Listar proyectos del usuario',
  security: BEARER,
  responses: {
    200: {
      description: 'Lista de proyectos',
      content: {
        'application/json': {
          schema: z
            .object({
              success: z.literal(true),
              data: z.array(z.record(z.unknown())),
              timestamp: z.string(),
            })
            .openapi('ListProjectsResponse'),
        },
      },
    },
  },
});

const routeSaveStep = createRoute({
  method: 'post',
  path: '/step',
  tags: TAG,
  summary: 'Guardar datos de un paso',
  description: 'Registra los datos de entrada de un paso del wizard.',
  security: BEARER,
  request: {
    body: { content: { 'application/json': { schema: SaveStepBody } }, required: true },
  },
  responses: {
    200: {
      description: 'Paso guardado',
      content: {
        'application/json': {
          schema: z
            .object({
              success: z.literal(true),
              data: z.object({ stepId: z.string().uuid() }),
              timestamp: z.string(),
            })
            .openapi('SaveStepResponse'),
        },
      },
    },
  },
});

const routeExtract = createRoute({
  method: 'post',
  path: '/extract',
  tags: TAG,
  summary: 'Extraer contexto compacto de fases previas',
  description:
    'Lee los documentos de fases anteriores y extrae solo las secciones necesarias para la siguiente fase, evitando overflow del contexto del LLM.',
  security: BEARER,
  request: {
    body: { content: { 'application/json': { schema: ExtractContextBody } }, required: true },
  },
  responses: {
    200: {
      description: 'Contexto extraído',
      content: {
        'application/json': {
          schema: z
            .object({
              success: z.literal(true),
              data: z.object({
                extractorId: z.string(),
                content: z.string(),
                parserUsed: z.record(z.boolean()),
                extractedContextId: z.string().uuid(),
              }),
              timestamp: z.string(),
            })
            .openapi('ExtractContextResponse'),
        },
      },
    },
  },
});

const routeGenerate = createRoute({
  method: 'post',
  path: '/generate',
  tags: TAG,
  summary: 'Generar documento con IA',
  description:
    'Usa Workers AI (Llama 3.2) para generar el documento de la fase indicada y lo persiste en Supabase.',
  security: BEARER,
  request: {
    body: { content: { 'application/json': { schema: GenerateDocumentBody } }, required: true },
  },
  responses: {
    200: {
      description: 'Documento generado',
      content: {
        'application/json': {
          schema: z
            .object({
              success: z.literal(true),
              data: z.object({ documentId: z.string().uuid(), content: z.string() }),
              timestamp: z.string(),
            })
            .openapi('GenerateDocumentResponse'),
        },
      },
    },
  },
});

const routeGenerateForm = createRoute({
  method: 'post',
  path: '/generate-form',
  tags: TAG,
  summary: 'Generar formulario dinámico con IA',
  description:
    'Genera un formulario dinámico en JSON basado en el contexto del proyecto. ' +
    'Usado actualmente en F6 (ajustes post-evaluación) para crear campos específicos según ' +
    'las observaciones del checklist de F5. Reutilizable para cualquier fase que requiera formularios adaptativos.',
  security: BEARER,
  request: {
    body: { content: { 'application/json': { schema: GenerateFormBody } }, required: true },
  },
  responses: {
    200: {
      description: 'Formulario generado',
      content: {
        'application/json': {
          schema: z
            .object({
              success: z.literal(true),
              data: z.object({ formSchema: z.record(z.unknown()) }),
              timestamp: z.string(),
            })
            .openapi('GenerateFormResponse'),
        },
      },
    },
  },
});

const routeGetJob = createRoute({
  method: 'get',
  path: '/job/:jobId',
  tags: TAG,
  summary: 'Consultar estado de un job asíncrono',
  description: 'Polling endpoint para desarrollo. Devuelve el estado actual del job y su resultado si ya completó.',
  security: BEARER,
  request: { params: z.object({ jobId: z.string().uuid() }) },
  responses: {
    200: {
      description: 'Estado del job',
      content: {
        'application/json': {
          schema: z
            .object({
              success: z.literal(true),
              data: z.object({
                jobId:  z.string().uuid(),
                status: z.enum(['pending', 'running', 'completed', 'failed']),
                result: z.record(z.unknown()).optional(),
                error:  z.string().optional(),
              }),
              timestamp: z.string(),
            })
            .openapi('GetJobResponse'),
        },
      },
    },
  },
});

const routeGenerateAsync = createRoute({
  method: 'post',
  path: '/generate-async',
  tags: TAG,
  summary: 'Iniciar generación asíncrona de documento',
  description:
    'Encola el pipeline de IA y responde inmediatamente con un jobId. ' +
    'El cliente recibe el resultado por WebSocket (dev) o Supabase Realtime (prod).',
  security: BEARER,
  request: {
    body: { content: { 'application/json': { schema: GenerateAsyncBody } }, required: true },
  },
  responses: {
    202: {
      description: 'Job encolado',
      content: {
        'application/json': {
          schema: z
            .object({
              success: z.literal(true),
              data: z.object({ jobId: z.string().uuid(), status: z.literal('pending') }),
              timestamp: z.string(),
            })
            .openapi('GenerateAsyncResponse'),
        },
      },
    },
  },
});

// ============================================================================
// ROUTER
// ============================================================================
const wizard = new OpenAPIHono<{ Bindings: Env; Variables: { userId: string } }>();

// Errores no capturados en los handlers → JSON 500 (no plain-text de Hono)
wizard.onError((err, c) => {
  const message = err instanceof Error ? err.message : 'Internal server error';
  console.error('[WIZARD ERROR]', message);
  return c.json({ success: false as const, error: message, timestamp: new Date().toISOString() }, 500);
});

wizard.use('*', authMiddleware);

wizard.openapi(routeCreateProject, async (c) => {
  const { name, clientName, industry, email } = c.req.valid('json');
  const supabase = new SupabaseService(c.env);
  const data = await supabase.createProject({ userId: c.get('userId'), name, clientName, industry, email });
  return c.json({ success: true as const, data, timestamp: new Date().toISOString() }, 201);
});

wizard.openapi(routeGetProject, async (c) => {
  const { projectId } = c.req.valid('param');
  const supabase = new SupabaseService(c.env);
  const data = await supabase.getProjectContext(projectId);
  return c.json({ success: true as const, data, timestamp: new Date().toISOString() });
});

wizard.openapi(routeListProjects, async (c) => {
  const supabase = new SupabaseService(c.env);
  const data = await supabase.getUserProjects(c.get('userId'));
  return c.json({ success: true as const, data, timestamp: new Date().toISOString() });
});

wizard.openapi(routeSaveStep, async (c) => {
  const { projectId, stepNumber, inputData } = c.req.valid('json');
  const supabase = new SupabaseService(c.env);
  const data = await supabase.saveStep({ projectId, stepNumber, inputData });
  return c.json({ success: true as const, data, timestamp: new Date().toISOString() });
});

wizard.openapi(routeExtract, async (c) => {
  const { projectId, extractorId, sourceDocuments } = c.req.valid('json');
  const extractor = new ContextExtractorService(c.env, dcflFlowMap as Record<string, unknown>);
  const supabase = new SupabaseService(c.env);

  const result = await extractor.extract({ projectId, extractorId, sourceDocuments });

  // Derivar fromPhases y toPhase desde el extractorId (ej: EXTRACTOR_F2 → to = F2)
  const toPhase = extractorId.replace(/^EXTRACTOR_/, '');
  const fromPhases = Object.keys(sourceDocuments);

  await supabase.saveExtractedContext({
    projectId,
    extractorId,
    fromPhases,
    toPhase,
    content: result.content,
    parserUsed: result.parserUsed,
  });

  return c.json({ success: true as const, data: result, timestamp: new Date().toISOString() });
});

wizard.openapi(routeGenerate, async (c) => {
  const body = c.req.valid('json');
  const supabase = new SupabaseService(c.env);
  const ai = new AIService(c.env, getPromptRegistry(), DCFL_SYSTEM_PROMPT);

  const content = await ai.generate({
    promptId: body.promptId as PromptId,
    context: body.context,
    userInputs: body.userInputs,
  });
  const { documentId } = await supabase.saveDocument({
    projectId: body.projectId,
    stepId: body.stepId,
    phaseId: body.phaseId,
    title: `${body.phaseId} - ${body.context.projectName}`,
    content,
  });

  return c.json({ success: true as const, data: { documentId, content }, timestamp: new Date().toISOString() });
});

wizard.openapi(routeGenerateForm, async (c) => {
  const { promptId, context } = c.req.valid('json');
  const ai = new AIService(c.env, getPromptRegistry(), DCFL_SYSTEM_PROMPT);

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

  return c.json({ success: true as const, data: { formSchema }, timestamp: new Date().toISOString() });
});

wizard.openapi(routeGetJob, async (c) => {
  const { jobId } = c.req.valid('param');
  const jobsSvc = new PipelineJobsService(c.env);
  const job = await jobsSvc.getJob(jobId);

  if (!job) throw new Error(`Job not found: ${jobId}`);

  return c.json({
    success: true as const,
    data: {
      jobId:  job.id,
      status: job.status,
      result: job.result,
      error:  job.error,
    },
    timestamp: new Date().toISOString(),
  });
});

wizard.openapi(routeGenerateAsync, async (c) => {
  const body    = c.req.valid('json');
  const userId  = c.get('userId');
  const jobsSvc = new PipelineJobsService(c.env);

  const jobId = await jobsSvc.createJob({
    siteId:     'dcfl',
    projectId:  body.projectId,
    stepId:     body.stepId,
    phaseId:    body.phaseId,
    promptId:   body.promptId,
    context:    body.context,
    userInputs: body.userInputs,
    userId,
  });

  // Fire-and-forget: no await
  _runPipelineAsync(jobId, body, c.env).catch((err) =>
    console.error(`[generate-async] unhandled error for job ${jobId}:`, err)
  );

  return c.json({ success: true as const, data: { jobId, status: 'pending' as const }, timestamp: new Date().toISOString() }, 202);
});

// ── Ejecución asíncrona del pipeline ─────────────────────────────────────────

async function _runPipelineAsync(
  jobId: string,
  body: {
    projectId: string;
    stepId: string;
    phaseId: string;
    promptId: string;
    context: { projectName: string; clientName: string; industry?: string; email?: string; previousData?: Record<string, unknown> };
    userInputs: Record<string, unknown>;
  },
  env: Env
): Promise<void> {
  const jobsSvc  = new PipelineJobsService(env);
  const supabase = new SupabaseService(env);
  const ai       = new AIService(env, getPromptRegistry(), DCFL_SYSTEM_PROMPT);

  console.log(`[pipeline] START job=${jobId} phase=${body.phaseId} prompt=${body.promptId}`);

  try {
    console.log(`[pipeline] Llamando a AI...`);
    const content = await ai.generate({
      promptId:   body.promptId as PromptId,
      context:    body.context,
      userInputs: body.userInputs,
    });
    console.log(`[pipeline] AI completada, chars=${content.length}. Guardando documento...`);

    const { documentId } = await supabase.saveDocument({
      projectId: body.projectId,
      stepId:    body.stepId,
      phaseId:   body.phaseId,
      title:     `${body.phaseId} - ${body.context.projectName}`,
      content,
    });
    console.log(`[pipeline] Documento guardado documentId=${documentId}. Completando job...`);

    await jobsSvc.completeJob(jobId, { documentId, content });
    console.log(`[pipeline] DONE job=${jobId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Pipeline error';
    console.error(`[pipeline] FAILED job=${jobId}:`, msg);
    await jobsSvc.failJob(jobId, msg);
  }
}

export { wizard };
