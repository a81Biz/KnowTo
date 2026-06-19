// src/__tests__/routes/wizard.async.e2e.test.ts
//
// Tests E2E del endpoint POST /dcfl/wizard/generate-async.
//
// Estrategia:
//   • El endpoint responde 202 inmediatamente (fire-and-forget).
//   • El pipeline corre en background; se verifica con vi.waitFor() (polling)
//     que los servicios downstream (AIService, SupabaseService, PipelineJobsService)
//     sean llamados con los argumentos correctos sin bloquear el request.
//   • PipelineJobsService se usa SIN mock para los tests de notificación,
//     de modo que el notificador en memoria es invocado correctamente.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import app from '../../index';
import type { Env } from '../../core/types/env';
// PipelineJobsService: usamos la implementación real; solo inyectamos el notificador
import { setGlobalNotifier } from '../../core/services/pipeline-jobs.service';
import { DEV_USER_ID } from '../../core/middleware/auth.middleware';
import { F4_PREREQS } from '../../dcfl/handlers/document.handlers';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockCreateProject        = vi.fn().mockResolvedValue({ projectId: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee' });
const mockSaveStep             = vi.fn().mockResolvedValue({ stepId:    'bbbbbbbb-cccc-4ddd-eeee-ffffffffffff' });
const mockSaveDocument         = vi.fn().mockResolvedValue({ documentId: 'cccccccc-dddd-4eee-ffff-000000000000' });
const mockGetContext           = vi.fn().mockResolvedValue({ project: { name: 'Test' } });
const mockGetProjects          = vi.fn().mockResolvedValue([]);
const mockSaveExtractedContext = vi.fn().mockResolvedValue({ extractedContextId: 'dddddddd-eeee-4fff-aaaa-111111111111' });

const AI_CONTENT = '# Marco de Referencia\nContenido generado por IA en background.';
const mockAiGenerate = vi.fn().mockResolvedValue(AI_CONTENT);

vi.mock('../../dcfl/services/supabase.service', () => ({
  SupabaseService: vi.fn().mockImplementation(() => ({
    createProject:        mockCreateProject,
    saveStep:             mockSaveStep,
    saveDocument:         mockSaveDocument,
    getProjectContext:    mockGetContext,
    getUserProjects:      mockGetProjects,
    markStepError:        vi.fn(),
    saveExtractedContext: mockSaveExtractedContext,
    getTemarioBase:       vi.fn().mockResolvedValue(null),
    getProjectBrief:      vi.fn().mockResolvedValue(null),
    saveProjectBrief:     vi.fn().mockResolvedValue(undefined),
    getProjectSoul:          vi.fn().mockResolvedValue(null),
    getFase0Estructurado:    vi.fn().mockResolvedValue(null),
    getFaseAnswersDetailed:  vi.fn().mockResolvedValue(null),
    confirmarTemario:           vi.fn().mockResolvedValue(undefined),
    getF2_5Recomendaciones:    vi.fn().mockResolvedValue(null),
    getF3Especificaciones:     vi.fn().mockResolvedValue(null),
    getCanonicalSpecFrozen:    vi.fn().mockResolvedValue(false),
    client:               null,
  })),
}));

vi.mock('../../core/services/ai.service', () => {
  const MockAIService: any = vi.fn().mockImplementation(() => ({
    generate: mockAiGenerate,
    runAgent: vi.fn().mockResolvedValue('{}'),
  }));
  MockAIService.sanitizeOutput = (text: string) => text;
  return { AIService: MockAIService };
});

// Notificador mock — simula el rol que Supabase Realtime cumple en producción.
// En dev, PipelineJobsService invoca este notificador en memoria directamente.
const mockNotifier = vi.fn();

// ── Constantes ───────────────────────────────────────────────────────────────

const DEV_ENV: Env = { ENVIRONMENT: 'development' } as Env;
const AUTH         = { Authorization: 'Bearer dev-local-bypass' };
const JSON_HEADER  = { 'Content-Type': 'application/json' };

const VALID_PROJECT_ID = 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee';
const VALID_STEP_ID    = 'bbbbbbbb-cccc-4ddd-eeee-ffffffffffff';

const GENERATE_ASYNC_BODY = {
  projectId:  VALID_PROJECT_ID,
  stepId:     VALID_STEP_ID,
  phaseId:    'F0',
  promptId:   'F0',
  context:    { projectName: 'Seguridad Industrial', clientName: 'Juan Pérez', industry: 'Manufactura' },
  userInputs: { courseTopic: 'Manejo seguro de químicos' },
};

function post(path: string, body: unknown) {
  return app.request(path, {
    method: 'POST',
    headers: { ...AUTH, ...JSON_HEADER },
    body: JSON.stringify(body),
  }, DEV_ENV);
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /dcfl/wizard/generate-async — autenticación', () => {
  it('devuelve 401 sin Authorization header', async () => {
    const res = await app.request('/dcfl/wizard/generate-async', {
      method: 'POST',
      headers: JSON_HEADER,
      body: JSON.stringify(GENERATE_ASYNC_BODY),
    }, DEV_ENV);
    expect(res.status).toBe(401);
  });

  it('devuelve 401 con token incorrecto', async () => {
    const res = await app.request('/dcfl/wizard/generate-async', {
      method: 'POST',
      headers: { ...JSON_HEADER, Authorization: 'Bearer token-falso' },
      body: JSON.stringify(GENERATE_ASYNC_BODY),
    }, DEV_ENV);
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// VALIDACIÓN DE ESQUEMA
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /dcfl/wizard/generate-async — validación', () => {
  beforeEach(() => { vi.clearAllMocks(); setGlobalNotifier(mockNotifier); });

  it('devuelve 400 si projectId no es UUID', async () => {
    const res = await post('/dcfl/wizard/generate-async', {
      ...GENERATE_ASYNC_BODY,
      projectId: 'no-es-uuid',
    });
    expect(res.status).toBe(400);
  });

  it('devuelve 400 si stepId no es UUID', async () => {
    const res = await post('/dcfl/wizard/generate-async', {
      ...GENERATE_ASYNC_BODY,
      stepId: 'no-es-uuid',
    });
    expect(res.status).toBe(400);
  });

  it('devuelve 400 si phaseId no está en el enum', async () => {
    const res = await post('/dcfl/wizard/generate-async', {
      ...GENERATE_ASYNC_BODY,
      phaseId: 'FASE_INVALIDA',
    });
    expect(res.status).toBe(400);
  });

  it('devuelve 400 si promptId no está en el enum', async () => {
    const res = await post('/dcfl/wizard/generate-async', {
      ...GENERATE_ASYNC_BODY,
      promptId: 'PROMPT_INVALIDO',
    });
    expect(res.status).toBe(400);
  });

  it('devuelve 400 si falta context.projectName', async () => {
    const res = await post('/dcfl/wizard/generate-async', {
      ...GENERATE_ASYNC_BODY,
      context: { clientName: 'Juan Pérez' },
    });
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RESPUESTA INMEDIATA (202)
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /dcfl/wizard/generate-async — respuesta inmediata', () => {
  beforeEach(() => { vi.clearAllMocks(); setGlobalNotifier(mockNotifier); });

  // Drenar los pipelines en background antes de pasar al siguiente test
  // para evitar que llamen a mockNotifier durante otros describe.
  afterEach(async () => {
    await vi.waitFor(() => expect(mockNotifier).toHaveBeenCalled(), { timeout: 500, interval: 10 }).catch(() => {});
  });

  it('devuelve 202 con jobId UUID y status pending', async () => {
    const res = await post('/dcfl/wizard/generate-async', GENERATE_ASYNC_BODY);

    expect(res.status).toBe(202);
    const body = await res.json() as {
      success: boolean;
      data: { jobId: string; status: string };
      timestamp: string;
    };
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('pending');
    expect(body.data.jobId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('responde antes de que el pipeline termine (no bloquea en la IA)', async () => {
    // La IA tarda 50ms — la respuesta HTTP debe llegar antes de que termine
    mockAiGenerate.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve(AI_CONTENT), 50))
    );

    const start = Date.now();
    const res   = await post('/dcfl/wizard/generate-async', GENERATE_ASYNC_BODY);
    const elapsed = Date.now() - start;

    expect(res.status).toBe(202);
    // El endpoint debe responder prácticamente sin delay (< 30ms sin IA)
    expect(elapsed).toBeLessThan(40);
  });

  it('cada llamada genera un jobId diferente', async () => {
    const [res1, res2] = await Promise.all([
      post('/dcfl/wizard/generate-async', GENERATE_ASYNC_BODY),
      post('/dcfl/wizard/generate-async', GENERATE_ASYNC_BODY),
    ]);
    const b1 = await res1.json() as { data: { jobId: string } };
    const b2 = await res2.json() as { data: { jobId: string } };
    expect(b1.data.jobId).not.toBe(b2.data.jobId);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE EN BACKGROUND — notificación via notificador (Supabase Realtime en prod)
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /dcfl/wizard/generate-async — pipeline en background (notificación async)', () => {
  beforeEach(() => { vi.clearAllMocks(); setGlobalNotifier(mockNotifier); });

  it('el pipeline llama a AIService.generate con los parámetros correctos', async () => {
    await post('/dcfl/wizard/generate-async', GENERATE_ASYNC_BODY);

    // Polling: espera hasta que el pipeline haya invocado la IA.
    // context está enriquecido por buildEnrichedContext — se verifica con objectContaining.
    await vi.waitFor(
      () => expect(mockAiGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          promptId:   'F0',
          context:    expect.objectContaining(GENERATE_ASYNC_BODY.context),
          userInputs: GENERATE_ASYNC_BODY.userInputs,
        })
      ),
      { timeout: 10_000, interval: 50 }
    );
  });

  it('el pipeline guarda el documento en Supabase cuando la IA tiene éxito', async () => {
    await post('/dcfl/wizard/generate-async', GENERATE_ASYNC_BODY);

    await vi.waitFor(
      () => expect(mockSaveDocument).toHaveBeenCalledWith({
        projectId: VALID_PROJECT_ID,
        stepId:    VALID_STEP_ID,
        phaseId:   'F0',
        title:     'F0 - Seguridad Industrial',
        content:   AI_CONTENT,
      }),
      { timeout: 10_000, interval: 50 }
    );
  });

  it('el notificador es invocado con status completed y el documentId correcto', async () => {
    await post('/dcfl/wizard/generate-async', GENERATE_ASYNC_BODY);

    await vi.waitFor(
      () => {
        expect(mockNotifier).toHaveBeenCalledOnce();
        const [userId, payload] = mockNotifier.mock.calls[0] as [string, {
          job_id: string; status: string; result?: { documentId: string; content: string };
        }];
        expect(userId).toBe(DEV_USER_ID);
        expect(payload.status).toBe('completed');
        expect(payload.result?.documentId).toBe('cccccccc-dddd-4eee-ffff-000000000000');
        expect(payload.result?.content).toBe(AI_CONTENT);
      },
      { timeout: 10_000, interval: 50 }
    );
  });

  it('el notificador es invocado con status failed cuando la IA lanza error', async () => {
    mockAiGenerate.mockRejectedValueOnce(new Error('Ollama no disponible'));

    await post('/dcfl/wizard/generate-async', GENERATE_ASYNC_BODY);

    await vi.waitFor(
      () => {
        expect(mockNotifier).toHaveBeenCalledOnce();
        const [, payload] = mockNotifier.mock.calls[0] as [string, { status: string; error?: string }];
        expect(payload.status).toBe('failed');
        expect(payload.error).toContain('Ollama no disponible');
      },
      { timeout: 10_000, interval: 50 }
    );
  });

  it('el pipeline no guarda documento si la IA falla', async () => {
    mockAiGenerate.mockRejectedValueOnce(new Error('Error de modelo'));

    await post('/dcfl/wizard/generate-async', GENERATE_ASYNC_BODY);

    // Esperar a que el pipeline falle
    await vi.waitFor(
      () => expect(mockNotifier).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ status: 'failed' })
      ),
      { timeout: 10_000, interval: 50 }
    );

    expect(mockSaveDocument).not.toHaveBeenCalled();
  });

  it('el pipeline falla limpiamente si saveDocument lanza error', async () => {
    mockSaveDocument.mockRejectedValueOnce(new Error('DB no disponible'));

    await post('/dcfl/wizard/generate-async', GENERATE_ASYNC_BODY);

    await vi.waitFor(
      () => {
        const [, payload] = mockNotifier.mock.calls[0] as [string, { status: string; error?: string }];
        expect(payload.status).toBe('failed');
        expect(payload.error).toContain('DB no disponible');
      },
      { timeout: 10_000, interval: 50 }
    );
  });

  it('procesa múltiples jobs en paralelo de forma independiente', async () => {
    const bodyA = { ...GENERATE_ASYNC_BODY, promptId: 'F0' as const };
    const bodyB = { ...GENERATE_ASYNC_BODY, promptId: 'F1' as const, phaseId: 'F1' as const };

    const [resA, resB] = await Promise.all([
      post('/dcfl/wizard/generate-async', bodyA),
      post('/dcfl/wizard/generate-async', bodyB),
    ]);

    expect(resA.status).toBe(202);
    expect(resB.status).toBe(202);

    // Ambos pipelines deben completarse
    await vi.waitFor(
      () => expect(mockNotifier).toHaveBeenCalledTimes(2),
      { timeout: 10_000, interval: 50 }
    );

    const statuses = mockNotifier.mock.calls.map(
      (call) => (call[1] as { status: string }).status
    );
    expect(statuses.every((s) => s === 'completed')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// OPENAPI SPEC
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// GATE F4: estructura de prerequisitos (PT-038)
// ─────────────────────────────────────────────────────────────────────────────

describe('F4_PREREQS — configuración del gate F4', () => {
  it('F4_P2_GENERATE_DOCUMENT requiere P4 antes de ejecutarse', () => {
    const prereqs = F4_PREREQS['F4_P2_GENERATE_DOCUMENT'];
    expect(prereqs).toBeDefined();
    expect(prereqs.map(p => p.producto)).toContain('P4');
  });

  it('F4_P2_GENERATE_DOCUMENT requiere P3 (guiones) antes de la presentación', () => {
    const prereqs = F4_PREREQS['F4_P2_GENERATE_DOCUMENT'];
    expect(prereqs.map(p => p.producto)).toContain('P3');
  });

  it('F4_P1_GENERATE_DOCUMENT solo requiere P4', () => {
    const prereqs = F4_PREREQS['F4_P1_GENERATE_DOCUMENT'];
    expect(prereqs).toHaveLength(1);
    expect(prereqs[0].producto).toBe('P4');
  });

  it('F4_P3 no requiere P2 — P3 se genera antes que P2', () => {
    const prereqs = F4_PREREQS['F4_P3_GENERATE_DOCUMENT'];
    expect(prereqs.map(p => p.producto)).not.toContain('P2');
    expect(prereqs.map(p => p.producto)).toContain('P4');
  });

  it('el label del prereq P3 de P2 incluye texto legible para mensajes de error', () => {
    const prereqs = F4_PREREQS['F4_P2_GENERATE_DOCUMENT'];
    const p3entry = prereqs.find(p => p.producto === 'P3');
    expect(p3entry?.label).toContain('P3');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /openapi.json — generate-async incluido en spec', () => {
  it('incluye el path /dcfl/wizard/generate-async en la spec', async () => {
    const res  = await app.request('/openapi.json', {}, DEV_ENV);
    const spec = await res.json() as { paths: Record<string, unknown> };
    expect(spec.paths['/dcfl/wizard/generate-async']).toBeDefined();
  });

  it('el path generate-async requiere autenticación bearerAuth', async () => {
    const res  = await app.request('/openapi.json', {}, DEV_ENV);
    const spec = await res.json() as {
      paths: {
        '/dcfl/wizard/generate-async': {
          post: { security: Array<Record<string, unknown>> }
        }
      }
    };
    const security = spec.paths['/dcfl/wizard/generate-async']?.post?.security;
    expect(security).toEqual(expect.arrayContaining([{ bearerAuth: [] }]));
  });
});
