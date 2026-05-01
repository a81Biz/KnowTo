import { createRoute, z } from '@hono/zod-openapi';

// ============================================================================
// ESQUEMAS DE PETICIÓN
// ============================================================================
export const CreateProjectBody = z
  .object({
    name: z.string().min(3).max(200).openapi({ example: 'Curso de Seguridad Industrial' }),
    clientName: z.string().min(2).max(200).openapi({ example: 'Juan Pérez' }),
    industry: z.string().optional().openapi({ example: 'Manufactura' }),
    email: z.string().email().optional().openapi({ example: 'juan@empresa.com' }),
  })
  .openapi('CreateProjectBody');

export const SaveStepBody = z
  .object({
    projectId: z.string().uuid().openapi({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }),
    stepNumber: z.number().int().min(0).max(11).openapi({ example: 0 }),
    inputData: z.record(z.unknown()).openapi({ example: { courseTopic: 'Seguridad industrial' } }),
  })
  .openapi('SaveStepBody');

export const GenerateDocumentBody = z
  .object({
    projectId: z.string().uuid(),
    stepId: z.string().uuid(),
    phaseId: z.enum(['F0', 'F1', 'F2', 'F2.5', 'F3', 'F4', 'F5.1', 'F5.2', 'F6.1', 'F6.2a', 'F6.2b', 'CLOSE']),
    promptId: z.enum([
      'F0', 'F1', 'F2', 'F2_5', 'F3',
      'F4_P1', 'F4_P2', 'F4_P3', 'F4_P4', 'F4_P5', 'F4_P6', 'F4_P7', 'F4_P8',
      'F4_P1_GENERATE_DOCUMENT',
      'F4_P2_GENERATE_DOCUMENT', 'F4_P3_GENERATE_DOCUMENT', 'F4_P4_GENERATE_DOCUMENT',
      'F4_P5_GENERATE_DOCUMENT', 'F4_P6_GENERATE_DOCUMENT', 'F4_P7_GENERATE_DOCUMENT', 'F4_P8_GENERATE_DOCUMENT',
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

export const GenerateFormBody = z
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

export const GenerateAsyncBody = z
  .object({
    projectId:  z.string().uuid(),
    stepId:     z.string().uuid(),
    phaseId:    z.enum(['F0', 'F1', 'F2', 'F2.5', 'F3', 'F4', 'F5.1', 'F5.2', 'F6.1', 'F6.2a', 'F6.2b', 'CLOSE']),
    promptId:   z.enum([
      'F0', 'F1', 'F2', 'F2_5', 'F3',
      'F4_P1', 'F4_P2', 'F4_P3', 'F4_P4', 'F4_P5', 'F4_P6', 'F4_P7', 'F4_P8',
      'F4_P1_GENERATE_DOCUMENT',
      'F4_P2_GENERATE_DOCUMENT', 'F4_P3_GENERATE_DOCUMENT', 'F4_P4_GENERATE_DOCUMENT',
      'F4_P5_GENERATE_DOCUMENT', 'F4_P6_GENERATE_DOCUMENT', 'F4_P7_GENERATE_DOCUMENT', 'F4_P8_GENERATE_DOCUMENT',
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

export const ProjectIdParam = z.object({ projectId: z.string().uuid() });

export const PhaseDestinoParam = z.object({
  projectId:    z.string().uuid(),
  phaseDestino: z.coerce.number().int().min(1).max(9),
});

export const PhaseAnswersBody = z
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

export const ExtractContextBody = z
  .object({
    projectId: z.string().uuid(),
    extractorId: z.string().min(1).openapi({ example: 'EXTRACTOR_F2' }),
    sourceDocuments: z.record(z.string()).openapi({
      example: { F0: '# MARCO DE REFERENCIA...', F1: '# INFORME DE NECESIDADES...' },
    }),
  })
  .openapi('ExtractContextBody');

export const ResolverDiscrepanciasBody = z
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

// ============================================================================
// RUTAS
// ============================================================================
const BEARER = [{ bearerAuth: [] }];
const TAG = ['dcfl'];

export const routeCreateProject = createRoute({
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

export const routeGetProject = createRoute({
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

export const routeListProjects = createRoute({
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

export const routeGetF1Informe = createRoute({
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

export const routeGetF2Analisis = createRoute({
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

export const routeGetF2Discrepancias = createRoute({
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

export const routePostResolverDiscrepancias = createRoute({
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

export const routeGetF2Resolucion = createRoute({
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

export const routeGetF2_5Recomendaciones = createRoute({
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

export const routeGetF3Especificaciones = createRoute({
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

export const routeGetF4Productos = createRoute({
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

export const routeGetF0Context = createRoute({
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

export const routeGetPhaseQuestions = createRoute({
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

export const routePostPhaseAnswers = createRoute({
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

export const routeSaveStep = createRoute({
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

export const routeExtract = createRoute({
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

export const routeGenerate = createRoute({
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

export const routeGenerateForm = createRoute({
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

export const routeGetJob = createRoute({
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

export const routeGenerateAsync = createRoute({
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
