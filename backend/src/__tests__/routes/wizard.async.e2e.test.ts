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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../../index';
import type { Env } from '../../core/types/env';
// PipelineJobsService: usamos la implementación real; solo inyectamos el notificador
import { setGlobalNotifier } from '../../core/services/pipeline-jobs.service';

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
  })),
}));

vi.mock('../../core/services/ai.service', () => ({
  AIService: vi.fn().mockImplementation(() => ({
    generate: mockAiGenerate,
  })),
}));

// Notificador mock — se inyecta en PipelineJobsService vía setGlobalNotifier en beforeEach
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
// PIPELINE EN BACKGROUND — polling con vi.waitFor
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /dcfl/wizard/generate-async — pipeline en background (polling)', () => {
  beforeEach(() => { vi.clearAllMocks(); setGlobalNotifier(mockNotifier); });

  it('el pipeline llama a AIService.generate con los parámetros correctos', async () => {
    await post('/dcfl/wizard/generate-async', GENERATE_ASYNC_BODY);

    // Polling: espera hasta que el pipeline haya invocado la IA
    await vi.waitFor(
      () => expect(mockAiGenerate).toHaveBeenCalledWith({
        promptId:   'F0',
        context:    GENERATE_ASYNC_BODY.context,
        userInputs: GENERATE_ASYNC_BODY.userInputs,
      }),
      { timeout: 2000, interval: 50 }
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
      { timeout: 2000, interval: 50 }
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
        expect(userId).toBe('dev-user-local');
        expect(payload.status).toBe('completed');
        expect(payload.result?.documentId).toBe('cccccccc-dddd-4eee-ffff-000000000000');
        expect(payload.result?.content).toBe(AI_CONTENT);
      },
      { timeout: 2000, interval: 50 }
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
      { timeout: 2000, interval: 50 }
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
      { timeout: 2000, interval: 50 }
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
      { timeout: 2000, interval: 50 }
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
      { timeout: 3000, interval: 50 }
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
