import { OpenAPIHono } from '@hono/zod-openapi';
import { Env } from '../../core/types/env';
import {
  routeCreateProject,
  routeGetProject,
  routeListProjects,
  routeGetF1Informe,
  routeGetF2Analisis,
  routeGetF2Discrepancias,
  routePostResolverDiscrepancias,
  routeGetF2Resolucion,
  routeGetF2_5Recomendaciones,
  routeGetF3Especificaciones,
  routeGetF4Productos,
  routeGetF0Context,
  routeGetPhaseQuestions,
  routePostPhaseAnswers,
  routeSaveStep,
  routeExtract,
  routeGenerate,
  routeGenerateForm,
  routeGetJob,
  routeGenerateAsync,
} from '../schemas/wizard.schemas';

import {
  handleCreateProject,
  handleGetProject,
  handleListProjects,
} from '../handlers/project.handlers';

import {
  handleGetF1Informe,
  handleGetF2Analisis,
  handleGetF2_5Recomendaciones,
  handleGetF3Especificaciones,
} from '../handlers/phase.handlers';

import {
  handleGetF2Discrepancias,
  handlePostResolverDiscrepancias,
  handleGetF2Resolucion,
} from '../handlers/discrepancy.handlers';

import {
  handleGetF4Productos,
} from '../handlers/f4.handlers';

import {
  handleGetF0Context,
  handleGetF0Estructurado,
} from '../handlers/f0.handlers';

import {
  handleGetPhaseQuestions,
  handlePostPhaseAnswers,
  handleGetFase1PreguntasRespuestas,
} from '../handlers/questions.handlers';

import {
  handleSaveStep,
  handleCompleteStep,
} from '../handlers/step.handlers';

import {
  handleExtract,
} from '../handlers/extract.handlers';

import {
  handleGenerate,
  handleGenerateForm,
  handleGetJob,
  handleGenerateAsync,
} from '../handlers/document.handlers';

const wizard = new OpenAPIHono<{ Bindings: Env; Variables: { userId: string } }>();

wizard.onError((err, c) => {
  const message = err instanceof Error ? err.message : 'Internal server error';
  console.error('[WIZARD ERROR]', message);
  return c.json({ success: false, error: message, timestamp: new Date().toISOString() }, 500);
});

// wizard.use('*', authMiddleware);

// Proyectos
wizard.openapi(routeCreateProject, handleCreateProject);
wizard.openapi(routeGetProject, handleGetProject);
wizard.get('/projects', handleListProjects);

// Fases
wizard.openapi(routeGetF1Informe, handleGetF1Informe);
wizard.openapi(routeGetF2Analisis, handleGetF2Analisis);
wizard.openapi(routeGetF2_5Recomendaciones, handleGetF2_5Recomendaciones);
wizard.openapi(routeGetF3Especificaciones, handleGetF3Especificaciones);

// Discrepancias
wizard.openapi(routeGetF2Discrepancias, handleGetF2Discrepancias);
wizard.openapi(routePostResolverDiscrepancias, handlePostResolverDiscrepancias);
wizard.openapi(routeGetF2Resolucion, handleGetF2Resolucion);

// Productos F4
wizard.openapi(routeGetF4Productos, handleGetF4Productos);

// F0 contexto
wizard.openapi(routeGetF0Context, handleGetF0Context);
wizard.get('/project/:projectId/f0-estructurado', handleGetF0Estructurado);

// Preguntas y respuestas
wizard.openapi(routeGetPhaseQuestions, handleGetPhaseQuestions);
wizard.openapi(routePostPhaseAnswers, handlePostPhaseAnswers);
wizard.get('/project/:projectId/fase1/preguntas-respuestas', handleGetFase1PreguntasRespuestas);

// Pasos
wizard.openapi(routeSaveStep, handleSaveStep);
wizard.post('/step/complete', handleCompleteStep);

// Extracción
wizard.openapi(routeExtract, handleExtract);

// Generación de documentos
wizard.openapi(routeGenerate, handleGenerate);
wizard.openapi(routeGenerateForm, handleGenerateForm);
wizard.openapi(routeGetJob, handleGetJob);
wizard.openapi(routeGenerateAsync, handleGenerateAsync);

export { wizard };
