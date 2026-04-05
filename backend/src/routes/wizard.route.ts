// src/routes/wizard.route.ts
//
// Patrón de respuestas con @hono/zod-openapi:
//   • Cada handler declara SOLO los códigos que él mismo devuelve (éxito).
//   • 401 → authMiddleware (documentado via security scheme)
//   • 400/422 → @hono/zod-openapi valida automáticamente el body/params
//   • 500 → errorMiddleware global (documentado en el spec raíz)
//
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../middleware/auth.middleware';
import { SupabaseService } from '../services/supabase.service';
import { AIService } from '../services/ai.service';
import { ContextExtractorService } from '../services/context-extractor.service';
import type { Env } from '../types/env';
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
    stepNumber: z.number().int().min(0).max(9).openapi({ example: 0 }),
    inputData: z.record(z.unknown()).openapi({ example: { courseTopic: 'Seguridad industrial' } }),
  })
  .openapi('SaveStepBody');

const GenerateDocumentBody = z
  .object({
    projectId: z.string().uuid(),
    stepId: z.string().uuid(),
    phaseId: z.enum(['F0', 'F1', 'F2', 'F3', 'F4', 'F5.1', 'F5.2', 'F6.1', 'F6.2', 'CLOSE']),
    promptId: z.enum(['F0', 'F1', 'F2', 'F3', 'F4', 'F5', 'F5_2', 'F6', 'F6_2']),
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
const TAG = ['Wizard'];

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
  const extractor = new ContextExtractorService(c.env);
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
  const ai = new AIService(c.env);

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

export { wizard };
