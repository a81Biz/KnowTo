// src/__tests__/services/pipeline-jobs.service.test.ts
//
// Tests unitarios de PipelineJobsService.
//
// Cubre:
//   • Creación de jobs (dev = in-memory, prod = Supabase)
//   • Transición de estados: pending → completed / failed
//   • Notificador en desarrollo (polling con vi.waitFor)
//   • Simulación de pipeline asíncrono con transiciones de estado observables
//   • Comportamiento en producción (Supabase mock)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PipelineJobsService, setGlobalNotifier } from '../../core/services/pipeline-jobs.service';
import type { Env } from '../../core/types/env';

// ── Mock de @supabase/supabase-js (nivel módulo para que vi.mock pueda referenciarlo)
// vi.mock se hoistea al top — las variables deben estar en scope de módulo.
const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockEq     = vi.fn().mockResolvedValue({ error: null });
const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom   = vi.fn().mockReturnValue({ insert: mockInsert, update: mockUpdate });

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockImplementation(() => ({ from: mockFrom })),
}));

// ── Envs ─────────────────────────────────────────────────────────────────────

const DEV_ENV: Env  = { ENVIRONMENT: 'development' }  as Env;
const PROD_ENV: Env = {
  ENVIRONMENT:               'production',
  SUPABASE_URL:              'https://fake.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'fake-key',
} as Env;

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeJob(overrides: Partial<Parameters<PipelineJobsService['createJob']>[0]> = {}) {
  return {
    siteId:     'dcfl',
    projectId:  'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
    stepId:     'bbbbbbbb-cccc-4ddd-eeee-ffffffffffff',
    phaseId:    'F0',
    promptId:   'F0',
    context:    { projectName: 'Test', clientName: 'Ana' },
    userInputs: { topic: 'Seguridad' },
    userId:     'dev-user-local',
    ...overrides,
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ─────────────────────────────────────────────────────────────────────────────
// DESARROLLO — in-memory
// ─────────────────────────────────────────────────────────────────────────────

describe('PipelineJobsService — desarrollo (in-memory)', () => {
  let svc: PipelineJobsService;
  const notifier = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    setGlobalNotifier(notifier);
    svc = new PipelineJobsService(DEV_ENV);
  });

  // ── createJob ──────────────────────────────────────────────────────────────

  it('createJob devuelve un UUID válido', async () => {
    const id = await svc.createJob(makeJob());
    expect(id).toMatch(UUID_RE);
  });

  it('cada createJob genera un ID único', async () => {
    const [id1, id2] = await Promise.all([
      svc.createJob(makeJob()),
      svc.createJob(makeJob()),
    ]);
    expect(id1).not.toBe(id2);
  });

  // ── completeJob ────────────────────────────────────────────────────────────

  it('completeJob invoca el notificador con status completed', async () => {
    const id = await svc.createJob(makeJob());
    await svc.completeJob(id, { documentId: 'doc-1', content: '# Doc' });

    expect(notifier).toHaveBeenCalledOnce();
    const [userId, payload] = notifier.mock.calls[0] as [
      string,
      { job_id: string; status: string; result: { documentId: string } }
    ];
    expect(userId).toBe('dev-user-local');
    expect(payload.job_id).toBe(id);
    expect(payload.status).toBe('completed');
    expect(payload.result.documentId).toBe('doc-1');
  });

  it('completeJob no lanza si el jobId no existe', async () => {
    await expect(
      svc.completeJob('00000000-0000-4000-8000-000000000000', { content: 'x' })
    ).resolves.toBeUndefined();
    expect(notifier).not.toHaveBeenCalled();
  });

  // ── failJob ────────────────────────────────────────────────────────────────

  it('failJob invoca el notificador con status failed y el mensaje de error', async () => {
    const id = await svc.createJob(makeJob());
    await svc.failJob(id, 'Ollama no responde');

    expect(notifier).toHaveBeenCalledOnce();
    const [, payload] = notifier.mock.calls[0] as [string, { status: string; error: string }];
    expect(payload.status).toBe('failed');
    expect(payload.error).toBe('Ollama no responde');
  });

  it('failJob no lanza si el jobId no existe', async () => {
    await expect(
      svc.failJob('00000000-0000-4000-8000-000000000000', 'error')
    ).resolves.toBeUndefined();
  });

  // ── setGlobalNotifier ──────────────────────────────────────────────────────

  it('cambia el notificador en runtime y el nuevo recibe las notificaciones', async () => {
    const notifier2 = vi.fn();
    setGlobalNotifier(notifier2);

    const id = await svc.createJob(makeJob());
    await svc.completeJob(id, { content: 'ok' });

    expect(notifier).not.toHaveBeenCalled();
    expect(notifier2).toHaveBeenCalledOnce();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SIMULACIÓN DE PIPELINE ASÍNCRONO — polling con vi.waitFor
// ─────────────────────────────────────────────────────────────────────────────

describe('PipelineJobsService — simulación de pipeline asíncrono (polling)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('el notificador se recibe después de un delay (pipeline tardío)', async () => {
    const notifier = vi.fn();
    setGlobalNotifier(notifier);
    const svc = new PipelineJobsService(DEV_ENV);

    const id = await svc.createJob(makeJob());

    // Simula un pipeline que tarda 80ms (p.ej. llamada a Ollama)
    setTimeout(async () => {
      await svc.completeJob(id, { documentId: 'doc-async', content: '# Generado' });
    }, 80);

    // El notificador no debe haberse llamado todavía
    expect(notifier).not.toHaveBeenCalled();

    // Polling: espera hasta que llegue la notificación
    await vi.waitFor(
      () => {
        expect(notifier).toHaveBeenCalledOnce();
        const [, payload] = notifier.mock.calls[0] as [string, { status: string }];
        expect(payload.status).toBe('completed');
      },
      { timeout: 500, interval: 20 }
    );
  });

  it('polling detecta transición pending → failed en pipeline con error', async () => {
    const notifier = vi.fn();
    setGlobalNotifier(notifier);
    const svc = new PipelineJobsService(DEV_ENV);

    const id = await svc.createJob(makeJob());

    setTimeout(async () => {
      await svc.failJob(id, 'Timeout de Ollama');
    }, 60);

    await vi.waitFor(
      () => {
        const [, payload] = notifier.mock.calls[0] as [string, { status: string; error: string }];
        expect(payload.status).toBe('failed');
        expect(payload.error).toBe('Timeout de Ollama');
      },
      { timeout: 500, interval: 20 }
    );
  });

  it('múltiples jobs en paralelo se notifican de forma independiente', async () => {
    const received: Array<{ jobId: string; status: string }> = [];
    setGlobalNotifier((_userId, payload) => {
      received.push({ jobId: payload.job_id, status: payload.status });
    });

    const svc = new PipelineJobsService(DEV_ENV);
    const [idA, idB, idC] = await Promise.all([
      svc.createJob(makeJob({ userId: 'user-A' })),
      svc.createJob(makeJob({ userId: 'user-B' })),
      svc.createJob(makeJob({ userId: 'user-C' })),
    ]);

    // Completan en distinto orden y con diferente delay
    setTimeout(() => void svc.completeJob(idC, { content: 'C' }), 30);
    setTimeout(() => void svc.failJob(idA, 'error A'), 50);
    setTimeout(() => void svc.completeJob(idB, { content: 'B' }), 70);

    await vi.waitFor(
      () => expect(received).toHaveLength(3),
      { timeout: 500, interval: 20 }
    );

    const byId = Object.fromEntries(received.map((r) => [r.jobId, r.status]));
    expect(byId[idA]).toBe('failed');
    expect(byId[idB]).toBe('completed');
    expect(byId[idC]).toBe('completed');
  });

  it('el polling no resuelve hasta que el pipeline termine (timing check)', async () => {
    const notifier = vi.fn();
    setGlobalNotifier(notifier);
    const svc = new PipelineJobsService(DEV_ENV);

    const id   = await svc.createJob(makeJob());
    const DELAY = 120;

    setTimeout(() => void svc.completeJob(id, { content: 'listo' }), DELAY);

    const t0 = Date.now();
    await vi.waitFor(
      () => expect(notifier).toHaveBeenCalledOnce(),
      { timeout: 1000, interval: 20 }
    );
    const elapsed = Date.now() - t0;

    // La resolución no debe ser instantánea — debe haber esperado el delay
    expect(elapsed).toBeGreaterThanOrEqual(DELAY - 20);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCCIÓN — Supabase mock
// ─────────────────────────────────────────────────────────────────────────────

describe('PipelineJobsService — producción (Supabase)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restaurar implementación de from() después de cada test
    mockEq.mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ insert: mockInsert, update: mockUpdate });
    mockInsert.mockResolvedValue({ error: null });
  });

  it('createJob llama a supabase.from("pipeline_jobs").insert con los campos correctos', async () => {
    const svc  = new PipelineJobsService(PROD_ENV);
    const data = makeJob();
    await svc.createJob(data);

    expect(mockFrom).toHaveBeenCalledWith('pipeline_jobs');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        site_id:    'dcfl',
        project_id: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
        step_id:    'bbbbbbbb-cccc-4ddd-eeee-ffffffffffff',
        phase_id:   'F0',
        prompt_id:  'F0',
        status:     'pending',
        user_id:    'dev-user-local',
      })
    );
  });

  it('el id insertado es un UUID válido generado internamente', async () => {
    const svc = new PipelineJobsService(PROD_ENV);
    const id  = await svc.createJob(makeJob());
    expect(id).toMatch(UUID_RE);
    const inserted = mockInsert.mock.calls[0][0] as { id: string };
    expect(inserted.id).toBe(id);
  });

  it('completeJob llama a update con status completed y el result correcto', async () => {
    const svc    = new PipelineJobsService(PROD_ENV);
    const id     = await svc.createJob(makeJob());
    const result = { documentId: 'doc-prod', content: '# Prod' };

    await svc.completeJob(id, result);

    // from('pipeline_jobs').update({ status:'completed', result }).eq('id', id)
    expect(mockFrom).toHaveBeenCalledWith('pipeline_jobs');
    expect(mockEq).toHaveBeenCalledWith('id', id);
  });

  it('failJob llama a update con status failed y el mensaje de error', async () => {
    const svc = new PipelineJobsService(PROD_ENV);
    const id  = await svc.createJob(makeJob());

    await svc.failJob(id, 'Error en Workers AI');

    expect(mockEq).toHaveBeenCalledWith('id', id);
  });

  it('el notificador NO es invocado en producción (Supabase Realtime toma el relevo)', async () => {
    const notifier = vi.fn();
    setGlobalNotifier(notifier);

    const svc = new PipelineJobsService(PROD_ENV);
    const id  = await svc.createJob(makeJob());
    await svc.completeJob(id, { content: 'ok' });

    expect(notifier).not.toHaveBeenCalled();
  });

  it('createJob lanza Error si Supabase devuelve error', async () => {
    mockInsert.mockResolvedValueOnce({ error: { message: 'duplicate key' } });

    const svc = new PipelineJobsService(PROD_ENV);
    await expect(svc.createJob(makeJob())).rejects.toThrow('duplicate key');
  });

  it('completeJob lanza Error si Supabase devuelve error', async () => {
    mockEq.mockResolvedValueOnce({ error: { message: 'row not found' } });

    const svc = new PipelineJobsService(PROD_ENV);
    const id  = await svc.createJob(makeJob());

    await expect(svc.completeJob(id, { content: 'x' })).rejects.toThrow('row not found');
  });
});
