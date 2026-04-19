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
import { parseInformeNecesidades } from '../services/informe.parser';
import { parseAnalisisF2 } from '../services/informe.parser.f2';
import { parseEspecificacionesF3 } from '../services/informe.parser.f3';
import { parseRecomendacionesF2_5 } from '../services/informe.parser.f2_5';
import { detectDiscrepancias } from '../services/discrepancy-detector';
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
      courseTopic: z.string().optional(),
      experienceLevel: z.string().optional(),
      targetAudience: z.string().optional(),
      expectedOutcome: z.string().optional(),
      budget: z.string().optional(),
      courseDuration: z.string().optional(),
      deadline: z.string().optional(),
      constraints: z.string().optional(),
      currentDate: z.string().optional(),
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
      courseTopic: z.string().optional(),
      experienceLevel: z.string().optional(),
      targetAudience: z.string().optional(),
      expectedOutcome: z.string().optional(),
      budget: z.string().optional(),
      courseDuration: z.string().optional(),
      deadline: z.string().optional(),
      constraints: z.string().optional(),
      currentDate: z.string().optional(),
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
      courseTopic: z.string().optional(),
      experienceLevel: z.string().optional(),
      targetAudience: z.string().optional(),
      expectedOutcome: z.string().optional(),
      budget: z.string().optional(),
      courseDuration: z.string().optional(),
      deadline: z.string().optional(),
      constraints: z.string().optional(),
      currentDate: z.string().optional(),
      previousData: z.record(z.unknown()).optional(),
    }),
    userInputs: z.record(z.unknown()),
  })
  .openapi('GenerateAsyncBody');

const ProjectIdParam = z.object({ projectId: z.string().uuid() });

const PhaseDestinoParam = z.object({
  projectId:    z.string().uuid(),
  phaseDestino: z.coerce.number().int().min(1).max(9),
});

const PhaseAnswersBody = z
  .object({
    projectId:    z.string().uuid(),
    phaseDestino: z.number().int().min(1).max(9),
    answers: z.array(
      z.object({
        preguntaId: z.string().uuid(),
        respuesta:  z.string().min(1),
      }),
    ),
  })
  .openapi('PhaseAnswersBody');

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

const routeGetF1Informe = createRoute({
  method: 'get',
  path: '/project/{projectId}/fase1/informe',
  tags: TAG,
  summary: 'Obtener informe estructurado F1',
  description:
    'Devuelve los datos estructurados del Informe de Necesidades (F1) parseados desde el ' +
    'Markdown del sintetizador_final. Usado por F2 para mostrar el perfil y objetivos ' +
    'preliminares al cliente para su validación.',
  security: BEARER,
  request: { params: ProjectIdParam },
  responses: {
    200: {
      description: 'Informe F1 estructurado',
      content: {
        'application/json': {
          schema: z
            .object({
              success: z.literal(true),
              data: z.object({
                sintesis_contexto:      z.string().nullable(),
                preguntas_respuestas:   z.array(z.object({ pregunta: z.string(), respuesta: z.string() })).nullable(),
                brechas_competencia:    z.array(z.object({ tipo: z.string(), descripcion: z.string(), capacitable: z.string() })).nullable(),
                declaracion_problema:   z.string().nullable(),
                objetivos_aprendizaje:  z.array(z.object({ objetivo: z.string(), nivel_bloom: z.string(), tipo: z.string() })).nullable(),
                perfil_participante:    z.record(z.string()).nullable(),
                resultados_esperados:   z.array(z.string()).nullable(),
                recomendaciones_diseno: z.array(z.string()).nullable(),
              }).nullable(),
              timestamp: z.string(),
            })
            .openapi('F1InformeResponse'),
        },
      },
    },
  },
});

const routeGetF2Analisis = createRoute({
  method: 'get',
  path: '/project/{projectId}/fase2/analisis',
  tags: TAG,
  summary: 'Obtener análisis estructurado F2',
  description:
    'Devuelve los datos estructurados del documento de Especificaciones de Análisis y Diseño (F2) ' +
    'parseados desde el Markdown del sintetizador_final_f2. Usado por F3 para pasar contexto de ' +
    'plataforma, SCORM, estructura y perfil de ingreso.',
  security: BEARER,
  request: { params: ProjectIdParam },
  responses: {
    200: {
      description: 'Análisis F2 estructurado',
      content: {
        'application/json': {
          schema: z
            .object({
              success: z.literal(true),
              data: z.object({
                modalidad:              z.record(z.string()).nullable(),
                interactividad:         z.record(z.unknown()).nullable(),
                estructura_tematica:    z.array(z.object({ modulo: z.string(), nombre: z.string(), objetivo: z.string(), horas: z.string() })).nullable(),
                perfil_ingreso:         z.array(z.object({ categoria: z.string(), requisito: z.string(), fuente: z.string() })).nullable(),
                estrategias:            z.array(z.object({ estrategia: z.string(), descripcion: z.string(), modulos: z.string(), bloom: z.string() })).nullable(),
                supuestos_restricciones: z.object({ supuestos: z.array(z.string()), restricciones: z.array(z.string()) }).nullable(),
                perfil_ajustado:        z.record(z.string()).nullable(),
              }).nullable(),
              timestamp: z.string(),
            })
            .openapi('F2AnalisisResponse'),
        },
      },
    },
  },
});

const routeGetF2Discrepancias = createRoute({
  method: 'get',
  path: '/project/{projectId}/fase2/discrepancias',
  tags: TAG,
  summary: 'Detectar discrepancias F1↔F2',
  description:
    'Compara campo por campo el Informe de Necesidades (F1) con las Especificaciones de Análisis (F2) ' +
    'y devuelve un array de discrepancias con opciones de resolución. Solo aparecen aspectos donde ambos ' +
    'documentos tienen valor y difieren.',
  security: BEARER,
  request: { params: ProjectIdParam },
  responses: {
    200: {
      description: 'Lista de discrepancias detectadas',
      content: {
        'application/json': {
          schema: z
            .object({
              success: z.literal(true),
              data: z.object({
                discrepancias: z.array(
                  z.object({
                    aspecto:           z.string(),
                    descripcion:       z.string(),
                    valor_f1:          z.string(),
                    justificacion_f1:  z.string(),
                    valor_f2:          z.string(),
                    justificacion_f2:  z.string(),
                    opciones: z.array(z.object({
                      id:    z.enum(['f1', 'f2', 'intermedio']),
                      label: z.string(),
                      valor: z.string(),
                    })),
                  }),
                ),
                total: z.number(),
              }),
              timestamp: z.string(),
            })
            .openapi('F2DiscrepanciasResponse'),
        },
      },
    },
  },
});

const ResolverDiscrepanciasBody = z
  .object({
    resoluciones: z.array(
      z.object({
        aspecto:       z.string(),
        decision:      z.enum(['f1', 'f2', 'intermedio']),
        valor_elegido: z.string(),
      }),
    ),
    discrepancias: z.array(z.record(z.unknown())).optional(),
  })
  .openapi('ResolverDiscrepanciasBody');

const routePostResolverDiscrepancias = createRoute({
  method: 'post',
  path: '/project/{projectId}/fase2/resolver',
  tags: TAG,
  summary: 'Guardar resolución de discrepancias F1↔F2',
  description:
    'Persiste las decisiones del cliente para cada discrepancia detectada entre F1 y F2. ' +
    'Marca el proyecto como listo para generar F3.',
  security: BEARER,
  request: {
    params: ProjectIdParam,
    body: { content: { 'application/json': { schema: ResolverDiscrepanciasBody } }, required: true },
  },
  responses: {
    200: {
      description: 'Resolución guardada',
      content: {
        'application/json': {
          schema: z
            .object({ success: z.literal(true), timestamp: z.string() })
            .openapi('ResolverDiscrepanciasResponse'),
        },
      },
    },
  },
});

const routeGetF2Resolucion = createRoute({
  method: 'get',
  path: '/project/{projectId}/fase2/resolucion',
  tags: TAG,
  summary: 'Obtener resolución de discrepancias F1↔F2',
  description:
    'Devuelve la última resolución guardada de discrepancias F1↔F2 para el proyecto. ' +
    'Usado por el pipeline F3 para pasar los valores resueltos como contexto al extractor_f3.',
  security: BEARER,
  request: { params: ProjectIdParam },
  responses: {
    200: {
      description: 'Resolución guardada (null si no existe)',
      content: {
        'application/json': {
          schema: z
            .object({
              success: z.literal(true),
              data: z
                .object({
                  resoluciones: z.array(
                    z.object({
                      aspecto:       z.string(),
                      decision:      z.string(),
                      valor_elegido: z.string(),
                    }),
                  ),
                  listo_para_f3: z.boolean(),
                })
                .nullable(),
              timestamp: z.string(),
            })
            .openapi('F2ResolucionResponse'),
        },
      },
    },
  },
});

const routeGetF3Especificaciones = createRoute({
  method: 'get',
  path: '/project/{projectId}/fase3/especificaciones',
  tags: TAG,
  summary: 'Obtener especificaciones estructuradas F3',
  description:
    'Devuelve los datos estructurados de las Especificaciones Técnicas (F3) parseados desde el ' +
    'Markdown del sintetizador_final_f3. Usado por F4 para pasar contexto de plataforma, multimedia y duración.',
  security: BEARER,
  request: { params: ProjectIdParam },
  responses: {
    200: {
      description: 'Especificaciones F3 estructuradas',
      content: {
        'application/json': {
          schema: z
            .object({
              success: z.literal(true),
              data: z.object({
                plataforma_navegador: z.record(z.unknown()).nullable(),
                reporteo:             z.record(z.unknown()).nullable(),
                formatos_multimedia:  z.record(z.unknown()).nullable(),
                navegacion_identidad: z.record(z.unknown()).nullable(),
                criterios_aceptacion: z.record(z.unknown()).nullable(),
                calculo_duracion:     z.record(z.unknown()).nullable(),
                documento_final:      z.string().nullable(),
                juez_decision:        z.string().nullable(),
                juez_similitud:       z.number().nullable(),
              }).nullable(),
              timestamp: z.string(),
            })
            .openapi('F3EspecificacionesResponse'),
        },
      },
    },
  },
});

const routeGetF0Context = createRoute({
  method: 'get',
  path: '/project/{projectId}/f0-context',
  tags: TAG,
  summary: 'Obtener preguntas y brechas generadas en F0',
  description:
    'Lee los outputs de los agentes seccion_5_preguntas y seccion_5_gaps del job F0 ' +
    'más reciente del proyecto. Usado por el formulario F1 para mostrar las preguntas ' +
    'al usuario y pre-rellenar las brechas.',
  security: BEARER,
  request: { params: ProjectIdParam },
  responses: {
    200: {
      description: 'Preguntas y brechas del F0',
      content: {
        'application/json': {
          schema: z
            .object({
              success: z.literal(true),
              data: z.object({
                questions: z.array(z.string()),
                gaps: z.string(),
              }),
              timestamp: z.string(),
            })
            .openapi('F0ContextResponse'),
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

const routeGetPhaseQuestions = createRoute({
  method: 'get',
  path: '/project/{projectId}/phase-questions/{phaseDestino}',
  tags: TAG,
  summary: 'Obtener preguntas generadas para una fase',
  description:
    'Devuelve las preguntas que la IA generó al final de la fase anterior ' +
    'dirigidas a la fase indicada (ej: phaseDestino=2 → preguntas generadas en F1 para F2).',
  security: BEARER,
  request: { params: PhaseDestinoParam },
  responses: {
    200: {
      description: 'Preguntas de la fase',
      content: {
        'application/json': {
          schema: z
            .object({
              success: z.literal(true),
              data: z.object({
                questions: z.array(
                  z.object({
                    id:            z.string().uuid(),
                    texto:         z.string(),
                    objetivo:      z.string().nullable(),
                    justificacion: z.string().nullable(),
                    opciones:      z.array(z.string()).nullable(),
                    orden:         z.number(),
                  }),
                ),
              }),
              timestamp: z.string(),
            })
            .openapi('PhaseQuestionsResponse'),
        },
      },
    },
  },
});

const routePostPhaseAnswers = createRoute({
  method: 'post',
  path: '/project/{projectId}/phase-answers',
  tags: TAG,
  summary: 'Guardar respuestas a preguntas de fase',
  description: 'Persiste las respuestas del cliente a las preguntas generadas por la IA para una fase.',
  security: BEARER,
  request: {
    params: ProjectIdParam,
    body: { content: { 'application/json': { schema: PhaseAnswersBody } }, required: true },
  },
  responses: {
    200: {
      description: 'Respuestas guardadas',
      content: {
        'application/json': {
          schema: z
            .object({ success: z.literal(true), timestamp: z.string() })
            .openapi('PhaseAnswersSavedResponse'),
        },
      },
    },
  },
});

const routeGetF2_5Recomendaciones = createRoute({
  method: 'get',
  path: '/project/{projectId}/fase2_5/recomendaciones',
  tags: TAG,
  summary: 'Obtener recomendaciones estructuradas F2.5',
  security: BEARER,
  request: { params: ProjectIdParam },
  responses: {
    200: {
      description: 'Recomendaciones F2.5 estructuradas',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              actividades:               z.unknown().nullable(),
              metricas:                  z.unknown().nullable(),
              frecuencia_revision:       z.string().nullable(),
              total_videos:              z.number().nullable(),
              duracion_promedio_minutos: z.number().nullable(),
              documento_final:           z.string().nullable(),
              juez_decision:             z.string().nullable(),
            }).nullable(),
            timestamp: z.string(),
          }).openapi('F2_5RecomendacionesResponse'),
        },
      },
    },
  },
});

const routeGetF4Productos = createRoute({
  method: 'get',
  path: '/project/{projectId}/fase4/productos',
  tags: TAG,
  summary: 'Obtener productos de producción F4',
  description: 'Devuelve los 8 productos EC0366 generados para el proyecto. Permite reanudar el sub-wizard F4 desde el último producto aprobado.',
  security: BEARER,
  request: { params: ProjectIdParam },
  responses: {
    200: {
      description: 'Lista de productos F4',
      content: {
        'application/json': {
          schema: z.object({
            success:   z.literal(true),
            data: z.object({
              productos: z.array(z.object({
                id:                 z.string().uuid(),
                producto:           z.string(),
                documento_final:    z.string().nullable(),
                validacion_estado:  z.string(),
                validacion_errores: z.unknown().nullable(),
                datos_producto:     z.unknown().nullable(),
                job_id:             z.string().uuid().nullable(),
                created_at:         z.string(),
                approved_at:        z.string().nullable(),
              })),
            }),
            timestamp: z.string(),
          }).openapi('F4ProductosResponse'),
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

wizard.openapi(routeGetF1Informe, async (c) => {
  const { projectId } = c.req.valid('param');
  const supabase = new SupabaseService(c.env);
  const data = await supabase.getF1Informe(projectId);
  return c.json({ success: true as const, data, timestamp: new Date().toISOString() });
});

wizard.openapi(routeGetF2Analisis, async (c) => {
  const { projectId } = c.req.valid('param');
  const supabase = new SupabaseService(c.env);
  const raw = await supabase.getF2Analisis(projectId);
  const data = raw ? { ...raw, perfil_ajustado: raw.perfil_ajustado ?? null } : null;
  return c.json({ success: true as const, data, timestamp: new Date().toISOString() });
});

wizard.openapi(routeGetF2Discrepancias, async (c) => {
  const { projectId } = c.req.valid('param');
  const supabase = new SupabaseService(c.env);

  const [f1Data, f2Data] = await Promise.all([
    supabase.getF1Informe(projectId),
    supabase.getF2Analisis(projectId),
  ]);

  if (!f1Data || !f2Data) {
    return c.json({
      success: true as const,
      data: { discrepancias: [], total: 0 },
      timestamp: new Date().toISOString(),
    });
  }

  const discrepancias = detectDiscrepancias(f1Data, f2Data);
  return c.json({
    success: true as const,
    data: { discrepancias, total: discrepancias.length },
    timestamp: new Date().toISOString(),
  });
});

wizard.openapi(routePostResolverDiscrepancias, async (c) => {
  const { projectId } = c.req.valid('param');
  const { resoluciones, discrepancias } = c.req.valid('json');
  const supabase = new SupabaseService(c.env);

  await supabase.saveResolucionDiscrepancias({
    projectId,
    discrepancias: discrepancias ?? [],
    resoluciones,
    listoParaF3: true,
  });

  return c.json({ success: true as const, timestamp: new Date().toISOString() });
});

wizard.openapi(routeGetF2Resolucion, async (c) => {
  const { projectId } = c.req.valid('param');
  const supabase = new SupabaseService(c.env);
  const raw = await supabase.getResolucionDiscrepancias(projectId);
  const data = raw
    ? { resoluciones: raw.resoluciones, listo_para_f3: raw.listo_para_f3 }
    : null;
  return c.json({ success: true as const, data, timestamp: new Date().toISOString() });
});

wizard.openapi(routeGetF2_5Recomendaciones, async (c) => {
  const { projectId } = c.req.valid('param');
  const supabase = new SupabaseService(c.env);
  const data = await supabase.getF2_5Recomendaciones(projectId);
  return c.json({ success: true as const, data, timestamp: new Date().toISOString() });
});

wizard.openapi(routeGetF3Especificaciones, async (c) => {
  const { projectId } = c.req.valid('param');
  const supabase = new SupabaseService(c.env);
  const raw = await supabase.getF3Especificaciones(projectId);
  // Cast JSONB unknowns to Record<string, unknown> for the OpenAPI response schema
  const data = raw ? {
    plataforma_navegador: raw.plataforma_navegador as Record<string, unknown> | null,
    reporteo:             raw.reporteo             as Record<string, unknown> | null,
    formatos_multimedia:  raw.formatos_multimedia  as Record<string, unknown> | null,
    navegacion_identidad: raw.navegacion_identidad as Record<string, unknown> | null,
    criterios_aceptacion: raw.criterios_aceptacion as Record<string, unknown> | null,
    calculo_duracion:     raw.calculo_duracion     as Record<string, unknown> | null,
    documento_final:      raw.documento_final,
    juez_decision:        raw.juez_decision,
    juez_similitud:       raw.juez_similitud,
  } : null;
  return c.json({ success: true as const, data, timestamp: new Date().toISOString() });
});

wizard.openapi(routeGetF4Productos, async (c) => {
  const { projectId } = c.req.valid('param');
  const supabase = new SupabaseService(c.env);
  const productos = await supabase.getF4Productos(projectId);
  return c.json({ success: true as const, data: { productos }, timestamp: new Date().toISOString() });
});

wizard.openapi(routeGetF0Context, async (c) => {
  const { projectId } = c.req.valid('param');
  const supabase = new SupabaseService(c.env);
  const data = await supabase.getF0AgentOutputs(projectId);
  return c.json({ success: true as const, data, timestamp: new Date().toISOString() });
});

wizard.openapi(routeGetPhaseQuestions, async (c) => {
  const { projectId, phaseDestino } = c.req.valid('param');
  const supabase = new SupabaseService(c.env);
  const questions = await supabase.getFaseQuestions(projectId, phaseDestino);
  return c.json({ success: true as const, data: { questions }, timestamp: new Date().toISOString() });
});

wizard.openapi(routePostPhaseAnswers, async (c) => {
  const { projectId } = c.req.valid('param');
  const { answers } = c.req.valid('json');
  const supabase = new SupabaseService(c.env);
  await supabase.saveFaseAnswers({ projectId, answers });
  return c.json({ success: true as const, timestamp: new Date().toISOString() });
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

  console.log('[CONTEXTO RECIBIDO]', {
    industry: (body.context as any)?.industry,
    experienceLevel: (body.context as any)?.experienceLevel,
    budget: (body.context as any)?.budget,
    targetAudience: (body.context as any)?.targetAudience,
    courseDuration: (body.context as any)?.courseDuration
  });

  // Fire-and-forget: no await
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _runPipelineAsync(jobId, body as any, c.env).catch((err) =>
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
    context: {
      projectName: string;
      clientName: string;
      industry?: string;
      email?: string;
      courseTopic?: string;
      experienceLevel?: string;
      targetAudience?: string;
      expectedOutcome?: string;
      budget?: string;
      courseDuration?: string;
      deadline?: string;
      constraints?: string;
      currentDate?: string;
      previousData?: Record<string, unknown>;
    };
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
      context:    body.context as Record<string, unknown>,
      userInputs: body.userInputs,
      onProgress: async (progress) => {
        await jobsSvc.updateJobProgress(jobId, progress);
      },
      onAgentOutput: async (agentName, output) => {
        await jobsSvc.saveAgentOutput(jobId, agentName, output);
        if (agentName === 'sintetizador_final' && body.promptId === 'F1') {
          try {
            const parsed = parseInformeNecesidades(output);

            // Enriquecer con datos autoritativos del extractor (más fiables que el parsing del documento)
            const extractorRaw = await jobsSvc.getAgentOutput(jobId, 'extractor').catch(() => null);
            if (extractorRaw) {
              try {
                const extractorData = JSON.parse(extractorRaw) as {
                  qa?: Array<{ pregunta: string; respuesta: string }>;
                  perfilParticipante?: Record<string, string>;
                };
                // Q&A desde extractor — cubre todos los pares aunque el doc los trunque
                if (extractorData.qa && extractorData.qa.length > 0) {
                  parsed.preguntas_respuestas = extractorData.qa
                    .filter(p => p.pregunta?.trim())
                    .map(p => ({ pregunta: p.pregunta, respuesta: p.respuesta ?? 'No especificada' }));
                }
                // Perfil desde extractor — no depende del formato del doc generado
                if (extractorData.perfilParticipante && Object.keys(extractorData.perfilParticipante).length > 0) {
                  parsed.perfil_participante = extractorData.perfilParticipante;
                }
              } catch { /* JSON inválido del extractor — usa parsed del documento */ }
            }

            await supabase.saveF1Informe({ projectId: body.projectId, jobId, ...parsed });
            console.log(`[pipeline] sintetizador_final F1 → informe estructurado guardado (${parsed.preguntas_respuestas?.length ?? 0} Q&A, perfil: ${!!parsed.perfil_participante})`);
          } catch (err) {
            console.warn('[pipeline] saveF1Informe failed (no aborta pipeline):', err);
          }
        }
        if (agentName === 'sintetizador_final_f2' && body.promptId === 'F2') {
          try {
            const parsed = parseAnalisisF2(output);
            // Extract perfil_ajustado from userInputs (sent as JSON string by the frontend)
            let perfilAjustado: Record<string, string> | null = null;
            const rawPerfil = body.userInputs['perfilAjustado'];
            if (typeof rawPerfil === 'string') {
              try { perfilAjustado = JSON.parse(rawPerfil) as Record<string, string>; } catch { /* ignore */ }
            } else if (rawPerfil && typeof rawPerfil === 'object') {
              perfilAjustado = rawPerfil as Record<string, string>;
            }
            await supabase.saveF2Analisis({
              projectId:              body.projectId,
              jobId,
              documento_final:        output,
              perfil_ajustado:        perfilAjustado,
              ...parsed,
            });
            console.log(`[pipeline] sintetizador_final_f2 F2 → análisis estructurado guardado`);
          } catch (err) {
            console.warn('[pipeline] saveF2Analisis failed (no aborta pipeline):', err);
          }
        }
        if (agentName === 'sintetizador_final_f3' && body.promptId === 'F3') {
          try {
            const parsed   = parseEspecificacionesF3(output);
            const borradorA = (await jobsSvc.getAgentOutput(jobId, 'agente_doble_A_f3')) ?? '';
            const borradorB = (await jobsSvc.getAgentOutput(jobId, 'agente_doble_B_f3')) ?? '';
            const juezRaw   = (await jobsSvc.getAgentOutput(jobId, 'agente_juez_f3')) ?? '';
            const decMatch  = juezRaw.match(/"decision"\s*:\s*"([^"]+)"/i);
            const simMatch  = juezRaw.match(/"similitud_general"\s*:\s*(\d+)/i);
            await supabase.saveF3Especificaciones({
              projectId:            body.projectId,
              jobId,
              documento_final:      output,
              borrador_A:           borradorA,
              borrador_B:           borradorB,
              juez_decision:        decMatch?.[1] ?? 'ok',
              juez_similitud:       simMatch?.[1] ? parseInt(simMatch[1]) : 0,
              ...parsed,
            });
            console.log(`[pipeline] sintetizador_final_f3 F3 → especificaciones estructuradas guardadas`);
          } catch (err) {
            console.warn('[pipeline] saveF3Especificaciones failed (no aborta pipeline):', err);
          }
        }
        if (agentName === 'sintetizador_final_f2_5' && body.promptId === 'F2_5') {
          try {
            const parsed = parseRecomendacionesF2_5(output);
            const borradorA = (await jobsSvc.getAgentOutput(jobId, 'agente_doble_A_f2_5')) ?? '';
            const borradorB = (await jobsSvc.getAgentOutput(jobId, 'agente_doble_B_f2_5')) ?? '';
            const juezRaw = (await jobsSvc.getAgentOutput(jobId, 'agente_juez_f2_5')) ?? '';
            const decMatch = juezRaw.match(/"borrador_elegido"\s*:\s*"([^"]+)"/i);
            await supabase.saveF2_5Recomendaciones({
              projectId: body.projectId,
              jobId,
              documento_final: output,
              borrador_A: borradorA,
              borrador_B: borradorB,
              juez_decision: decMatch?.[1] ?? 'ok',
              ...parsed,
            });
            console.log(`[pipeline] sintetizador_final_f2_5 F2_5 → recomendaciones estructuradas guardadas`);
          } catch (err) {
            console.warn('[pipeline] saveF2_5Recomendaciones failed (no aborta pipeline):', err);
          }
        }
        // ── F4_Px: persiste cada producto en fase4_productos ──────────────────
        if (agentName === 'sintetizador_final_f4' && body.promptId.startsWith('F4_P')) {
          try {
            const producto = body.promptId.replace('F4_', '');             // 'P0'..'P7'
            const px       = producto.toLowerCase();                       // 'p0'..'p7'
            const borradorA = (await jobsSvc.getAgentOutput(jobId, `agente_a_${px}`)) ?? '';
            const borradorB = (await jobsSvc.getAgentOutput(jobId, `agente_b_${px}`)) ?? '';
            const juezRaw   = (await jobsSvc.getAgentOutput(jobId, `juez_${px}`)) ?? '';
            const validRaw  = (await jobsSvc.getAgentOutput(jobId, `validador_${px}`)) ?? '{}';
            let juezDecision: object = {};
            let validacionErrores: object | null = null;
            let validacionEstado = 'aprobado';
            try { juezDecision = JSON.parse(juezRaw) as object; } catch { /* */ }
            try {
              const vd = JSON.parse(validRaw) as { passed?: boolean };
              validacionErrores = vd;
              if (vd.passed === false) validacionEstado = 'revision_humana';
            } catch { /* */ }
            const saveParams: Parameters<typeof supabase.saveF4Producto>[0] = {
              projectId:        body.projectId,
              producto,
              documentoFinal:   output,
              borradorA,
              borradorB,
              juezDecision,
              validacionEstado,
              jobId,
            };
            if (validacionErrores !== null) saveParams.validacionErrores = validacionErrores;
            await supabase.saveF4Producto(saveParams);
            console.log(`[pipeline] sintetizador_final_f4 ${body.promptId} → fase4_productos guardado (estado=${validacionEstado})`);
          } catch (err) {
            console.warn('[pipeline] saveF4Producto failed (no aborta pipeline):', err);
          }
        }
      },
      getAgentOutput: async (agentName) => {
        return jobsSvc.getAgentOutput(jobId, agentName);
      },
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

function _extractJsonRoute(raw: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
  return fenced ? (fenced[1] ?? '').trim() : raw.trim();
}

export { wizard };
