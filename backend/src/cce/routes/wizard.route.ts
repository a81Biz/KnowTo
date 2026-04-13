// src/cce/routes/wizard.route.ts
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../../core/middleware/auth.middleware';
import { SupabaseService } from '../services/supabase.service';
import { AIService } from '../services/ai.service';
import { ContextExtractorService } from '../services/context-extractor.service';
import { UploadService } from '../services/upload.service';
import { CrawlerService } from '../services/crawler.service';
import type { Env } from '../../core/types/env';
import type { PromptId } from '../types/wizard.types';

// ============================================================================
// ESQUEMAS DE PETICIÓN
// ============================================================================

const CreateProjectBody = z
  .object({
    name: z.string().min(3).max(200).openapi({ example: 'Consultoría TECHIC 2026' }),
    clientName: z.string().min(2).max(200).openapi({ example: 'María López' }),
    companyName: z.string().min(2).max(200).optional().openapi({ example: 'TECHIC Agencia Creativa' }),
    sector: z.string().optional().openapi({ example: 'Servicios creativos y producción' }),
    email: z.string().email().optional().openapi({ example: 'maria@techic.com' }),
  })
  .openapi('CceCreateProjectBody');

const SaveStepBody = z
  .object({
    projectId: z.string().uuid(),
    stepNumber: z.number().int().min(0).max(9).openapi({ example: 0 }),
    inputData: z.record(z.unknown()).openapi({ example: { companyName: 'TECHIC', sector: 'Servicios' } }),
  })
  .openapi('CceSaveStepBody');

const GenerateDocumentBody = z
  .object({
    projectId: z.string().uuid(),
    stepId: z.string().uuid(),
    phaseId: z.enum([
      'INTAKE', 'F0', 'F0_CLIENT_ANSWERS',
      'F1_1', 'F1_2_FIELDWORK', 'F1_2', 'F1_2_FIELDWORK_SYNTHESIS',
      'F2', 'F2_5', 'F3', 'F4', 'F5', 'F5_TEST_REPORT', 'F6', 'CLOSE',
    ]),
    promptId: z.enum([
      'F0', 'F0_CLIENT_QUESTIONS_FORM',
      'F1_1', 'F1_2', 'F1_2_FIELDWORK_SYNTHESIS',
      'F2', 'F2_5', 'F3', 'F4', 'F5', 'F5_TEST_REPORT_FORM', 'F6',
    ]),
    context: z.object({
      projectName: z.string(),
      clientName: z.string(),
      companyName: z.string().optional(),
      sector: z.string().optional(),
      email: z.string().optional(),
      previousData: z.record(z.unknown()).optional(),
    }).passthrough(),
    userInputs: z.record(z.unknown()),
  })
  .openapi('CceGenerateDocumentBody');

const GenerateFormBody = z
  .object({
    projectId: z.string().uuid(),
    promptId: z.enum(['F0_CLIENT_QUESTIONS_FORM', 'F5_TEST_REPORT_FORM']),
    context: z.object({
      projectName: z.string(),
      clientName: z.string(),
      companyName: z.string().optional(),
      sector: z.string().optional(),
      email: z.string().optional(),
      previousData: z.record(z.unknown()).optional(),
    }).passthrough(),
  })
  .openapi('CceGenerateFormBody');

const ProjectIdParam = z.object({ projectId: z.string().uuid() });

const ExtractContextBody = z
  .object({
    projectId: z.string().uuid(),
    extractorId: z.string().min(1).openapi({ example: 'EXTRACTOR_F1_2' }),
    sourceDocuments: z.record(z.string()).openapi({
      example: { F0: '# MARCO DE REFERENCIA...', F1_1: '# INSTRUMENTOS...' },
    }),
  })
  .openapi('CceExtractContextBody');

const UploadFileBody = z
  .object({
    projectId: z.string().uuid(),
    instrumentId: z.string().min(1).openapi({ example: 'entrevista-director' }),
    fileName: z.string().min(1).openapi({ example: 'instrumento-director.pdf' }),
    mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
    base64Content: z.string().min(1).openapi({ description: 'Contenido del archivo en base64' }),
  })
  .openapi('CceUploadFileBody');

const OcrBody = z
  .object({
    base64Content: z.string().min(1).openapi({ description: 'Imagen en base64 (JPG o PNG)' }),
    mimeType: z.enum(['image/jpeg', 'image/png']).openapi({ example: 'image/jpeg' }),
  })
  .openapi('CceOcrBody');

// ============================================================================
// DEFINICIONES DE RUTAS
// ============================================================================
const BEARER = [{ bearerAuth: [] }];
const TAG = ['cce'];

const routeCreateProject = createRoute({
  method: 'post', path: '/project', tags: TAG,
  summary: 'Crear proyecto de consultoría',
  description: 'Crea un nuevo proyecto EC0249 para el usuario autenticado.',
  security: BEARER,
  request: { body: { content: { 'application/json': { schema: CreateProjectBody } }, required: true } },
  responses: {
    201: {
      description: 'Proyecto creado',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({ projectId: z.string().uuid() }),
            timestamp: z.string(),
          }).openapi('CceCreateProjectResponse'),
        },
      },
    },
  },
});

const routeGetProject = createRoute({
  method: 'get', path: '/project/{projectId}', tags: TAG,
  summary: 'Obtener contexto del proyecto',
  security: BEARER,
  request: { params: ProjectIdParam },
  responses: {
    200: {
      description: 'Contexto del proyecto',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.record(z.unknown()),
            timestamp: z.string(),
          }).openapi('CceProjectContextResponse'),
        },
      },
    },
  },
});

const routeListProjects = createRoute({
  method: 'get', path: '/projects', tags: TAG,
  summary: 'Listar proyectos del usuario',
  security: BEARER,
  responses: {
    200: {
      description: 'Lista de proyectos',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.array(z.record(z.unknown())),
            timestamp: z.string(),
          }).openapi('CceListProjectsResponse'),
        },
      },
    },
  },
});

const routeSaveStep = createRoute({
  method: 'post', path: '/step', tags: TAG,
  summary: 'Guardar datos de un paso',
  security: BEARER,
  request: { body: { content: { 'application/json': { schema: SaveStepBody } }, required: true } },
  responses: {
    200: {
      description: 'Paso guardado',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({ stepId: z.string().uuid() }),
            timestamp: z.string(),
          }).openapi('CceSaveStepResponse'),
        },
      },
    },
  },
});

const routeExtract = createRoute({
  method: 'post', path: '/extract', tags: TAG,
  summary: 'Extraer contexto compacto de fases previas',
  security: BEARER,
  request: { body: { content: { 'application/json': { schema: ExtractContextBody } }, required: true } },
  responses: {
    200: {
      description: 'Contexto extraído',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              extractorId: z.string(),
              content: z.string(),
              parserUsed: z.record(z.boolean()),
              extractedContextId: z.string().uuid(),
            }),
            timestamp: z.string(),
          }).openapi('CceExtractContextResponse'),
        },
      },
    },
  },
});

const routeGenerate = createRoute({
  method: 'post', path: '/generate', tags: TAG,
  summary: 'Generar documento con IA',
  description: 'Genera el documento de la fase indicada usando Workers AI o Ollama.',
  security: BEARER,
  request: { body: { content: { 'application/json': { schema: GenerateDocumentBody } }, required: true } },
  responses: {
    200: {
      description: 'Documento generado',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({ documentId: z.string().uuid(), content: z.string() }),
            timestamp: z.string(),
          }).openapi('CceGenerateDocumentResponse'),
        },
      },
    },
  },
});

const routeGenerateForm = createRoute({
  method: 'post', path: '/generate-form', tags: TAG,
  summary: 'Generar formulario dinámico con IA',
  description:
    'Genera un FormSchema JSON basado en el contexto. ' +
    'Usado en F0_CLIENT_ANSWERS (preguntas del cliente) y F5_TEST_REPORT (reporte de pruebas).',
  security: BEARER,
  request: { body: { content: { 'application/json': { schema: GenerateFormBody } }, required: true } },
  responses: {
    200: {
      description: 'Formulario generado',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({ formSchema: z.record(z.unknown()) }),
            timestamp: z.string(),
          }).openapi('CceGenerateFormResponse'),
        },
      },
    },
  },
});

const routeOcr = createRoute({
  method: 'post', path: '/ocr', tags: TAG,
  summary: 'Extraer texto de imagen escaneada (OCR)',
  description: 'Usa un modelo de visión para transcribir el texto de un instrumento completado en papel.',
  security: BEARER,
  request: { body: { content: { 'application/json': { schema: OcrBody } }, required: true } },
  responses: {
    200: {
      description: 'Texto extraído',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({ extractedText: z.string() }),
            timestamp: z.string(),
          }).openapi('CceOcrResponse'),
        },
      },
    },
  },
});

const routeUpload = createRoute({
  method: 'post', path: '/upload', tags: TAG,
  summary: 'Subir archivo de instrumento completado',
  description: 'Almacena un instrumento de diagnóstico completado en papel (PDF/JPG/PNG en base64).',
  security: BEARER,
  request: { body: { content: { 'application/json': { schema: UploadFileBody } }, required: true } },
  responses: {
    200: {
      description: 'Archivo almacenado',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              fileId: z.string().uuid(),
              fileName: z.string(),
              instrumentId: z.string(),
            }),
            timestamp: z.string(),
          }).openapi('CceUploadFileResponse'),
        },
      },
    },
  },
});

// ============================================================================
// ROUTER
// ============================================================================
const wizard = new OpenAPIHono<{ Bindings: Env; Variables: { userId: string } }>();

wizard.onError((err, c) => {
  const message = err instanceof Error ? err.message : 'Internal server error';
  console.error('[CCE WIZARD ERROR]', message);
  return c.json({ success: false as const, error: message, timestamp: new Date().toISOString() }, 500);
});

wizard.use('*', authMiddleware);

wizard.openapi(routeCreateProject, async (c) => {
  const { name, clientName, companyName, sector, email } = c.req.valid('json');
  const supabase = new SupabaseService(c.env);
  const data = await supabase.createProject({ userId: c.get('userId'), name, clientName, companyName, sector, email });
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

  const toPhase = extractorId.replace(/^EXTRACTOR_/, '');
  const fromPhases = Object.keys(sourceDocuments);

  await supabase.saveExtractedContext({
    projectId, extractorId, fromPhases, toPhase,
    content: result.content, parserUsed: result.parserUsed,
  });

  return c.json({ success: true as const, data: result, timestamp: new Date().toISOString() });
});

wizard.openapi(routeGenerate, async (c) => {
  const body = c.req.valid('json');
  const supabase = new SupabaseService(c.env);
  const ai = new AIService(c.env);

  console.log(`[CCE/generate] phaseId=${body.phaseId} promptId=${body.promptId} project=${body.projectId}`);

  if (body.promptId === 'F0' && body.userInputs && 'websiteUrl' in body.userInputs) {
    const url = String(body.userInputs['websiteUrl']);
    const crawlerData = await CrawlerService.scrape(url);
    if (crawlerData) {
      body.context.crawlerData = crawlerData;
    }
  }

  let content: string;
  try {
    content = await ai.generate({
      promptId: body.promptId as PromptId,
      context: body.context as import('../types/wizard.types').ProjectContext,
      userInputs: body.userInputs,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[CCE/generate] AI error: ${msg}`);
    return c.json(
      { success: false as const, error: `Error al generar el documento: ${msg}`, timestamp: new Date().toISOString() },
      500
    );
  }

  let documentId: string;
  try {
    const saved = await supabase.saveDocument({
      projectId: body.projectId,
      stepId: body.stepId,
      phaseId: body.phaseId,
      title: `${body.phaseId} - ${body.context.projectName}`,
      content,
    });
    documentId = saved.documentId;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[CCE/generate] DB save error: ${msg}`);
    // El documento se generó pero no se pudo guardar en BD — devolvemos igual con ID temporal
    documentId = `local-${Date.now()}`;
  }

  console.log(`[CCE/generate] OK documentId=${documentId} contentLen=${content.length}`);
  return c.json({ success: true as const, data: { documentId, content }, timestamp: new Date().toISOString() });
});

wizard.openapi(routeGenerateForm, async (c) => {
  const { promptId, context } = c.req.valid('json');
  const ai = new AIService(c.env);

  const rawJson = await ai.generate({
    promptId: promptId as PromptId,
    context: context as import('../types/wizard.types').ProjectContext,
    userInputs: {},
  });

  const jsonMatch = rawJson.match(/```json\s*([\s\S]*?)```/) ?? rawJson.match(/(\{[\s\S]*\})/);
  const jsonStr = jsonMatch?.[1]?.trim() ?? rawJson.trim();

  let formSchema: Record<string, unknown>;
  try {
    formSchema = JSON.parse(jsonStr) as Record<string, unknown>;
  } catch {
    // Fallback schema cuando la IA no devuelve JSON válido
    formSchema = {
      formTitle: promptId === 'F0_CLIENT_QUESTIONS_FORM'
        ? 'Respuestas del Cliente'
        : 'Reporte de Pruebas Funcionales',
      description: 'Complete los campos con la información solicitada.',
      sections: [
        {
          id: 'general',
          title: 'Información General',
          fields: [
            { id: 'response1', label: 'Respuesta 1', type: 'textarea', required: true, placeholder: 'Escribe la respuesta...' },
            { id: 'response2', label: 'Respuesta 2', type: 'textarea', required: false, placeholder: 'Escribe la respuesta...' },
            { id: 'observations', label: 'Observaciones adicionales', type: 'textarea', required: false, placeholder: 'Observaciones...' },
          ],
        },
      ],
    };
  }

  return c.json({ success: true as const, data: { formSchema }, timestamp: new Date().toISOString() });
});

wizard.openapi(routeUpload, async (c) => {
  const { projectId, instrumentId, fileName, mimeType, base64Content } = c.req.valid('json');
  const upload = new UploadService(c.env);
  const data = await upload.storeFile({ projectId, instrumentId, fileName, mimeType, base64Content });
  return c.json({ success: true as const, data, timestamp: new Date().toISOString() });
});

wizard.openapi(routeOcr, async (c) => {
  const { base64Content, mimeType } = c.req.valid('json');
  const ai = new AIService(c.env);
  const extractedText = await ai.extractTextFromImage({ base64Content, mimeType });
  return c.json({ success: true as const, data: { extractedText }, timestamp: new Date().toISOString() });
});

export { wizard };
