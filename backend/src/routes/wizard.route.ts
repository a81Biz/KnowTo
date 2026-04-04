// src/routes/wizard.route.ts
import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { SupabaseService } from '../services/supabase.service';
import { AIService } from '../services/ai.service';
import type { Env } from '../types/env';
import type { PromptId } from '../types/wizard.types';

// ============================================================================
// ZOD SCHEMAS (SSOT para validación)
// ============================================================================
const createProjectSchema = z.object({
  name: z.string().min(3).max(200),
  clientName: z.string().min(2).max(200),
  industry: z.string().optional(),
  email: z.string().email().optional(),
});

const generateDocumentSchema = z.object({
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
});

const saveStepSchema = z.object({
  projectId: z.string().uuid(),
  stepNumber: z.number().int().min(0).max(9),
  inputData: z.record(z.unknown()),
});

// ============================================================================
// ROUTER
// ============================================================================
const wizard = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

wizard.use('*', authMiddleware);

// POST /api/wizard/project - Crear proyecto
wizard.post(
  '/project',
  zValidator('json', createProjectSchema),
  async (c) => {
    const body = c.req.valid('json');
    const userId = c.get('userId');
    const supabase = new SupabaseService(c.env);

    const result = await supabase.createProject({
      userId,
      name: body.name,
      clientName: body.clientName,
      industry: body.industry,
      email: body.email,
    });

    return c.json({ success: true, data: result, timestamp: new Date().toISOString() }, 201);
  }
);

// GET /api/wizard/project/:projectId - Obtener contexto del proyecto
wizard.get('/project/:projectId', async (c) => {
  const projectId = c.req.param('projectId');
  const supabase = new SupabaseService(c.env);
  const context = await supabase.getProjectContext(projectId);

  return c.json({ success: true, data: context, timestamp: new Date().toISOString() });
});

// GET /api/wizard/projects - Listar proyectos del usuario
wizard.get('/projects', async (c) => {
  const userId = c.get('userId');
  const supabase = new SupabaseService(c.env);
  const projects = await supabase.getUserProjects(userId);

  return c.json({ success: true, data: projects, timestamp: new Date().toISOString() });
});

// POST /api/wizard/step - Guardar datos de un paso
wizard.post(
  '/step',
  zValidator('json', saveStepSchema),
  async (c) => {
    const body = c.req.valid('json');
    const supabase = new SupabaseService(c.env);

    const result = await supabase.saveStep({
      projectId: body.projectId,
      stepNumber: body.stepNumber,
      inputData: body.inputData,
    });

    return c.json({ success: true, data: result, timestamp: new Date().toISOString() });
  }
);

// POST /api/wizard/generate - Generar documento con IA
wizard.post(
  '/generate',
  zValidator('json', generateDocumentSchema),
  async (c) => {
    const body = c.req.valid('json');
    const supabase = new SupabaseService(c.env);
    const ai = new AIService(c.env);

    // Generar documento con IA
    const content = await ai.generate({
      promptId: body.promptId as PromptId,
      context: body.context,
      userInputs: body.userInputs,
    });

    // Persistir documento en Supabase
    const { documentId } = await supabase.saveDocument({
      projectId: body.projectId,
      stepId: body.stepId,
      phaseId: body.phaseId,
      title: `${body.phaseId} - ${body.context.projectName}`,
      content,
    });

    return c.json({
      success: true,
      data: { documentId, content },
      timestamp: new Date().toISOString(),
    });
  }
);

export { wizard };
