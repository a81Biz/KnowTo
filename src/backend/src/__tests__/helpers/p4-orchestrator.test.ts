import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Env } from '../../core/types/env';

// ── Mocks de módulos (hoistados) ─────────────────────────────────────────────

const mockGetTemarioBase = vi.fn();
const mockCreateJob      = vi.fn();
const mockGetJob         = vi.fn();
const mockWaitForJob     = vi.fn();
const mockGetAgentOutput = vi.fn();
const mockSearchUnit     = vi.fn().mockResolvedValue(null);

vi.mock('../../dcfl/services/supabase.service', () => ({
  SupabaseService: vi.fn().mockImplementation(() => ({
    client: {},
    getTemarioBase: mockGetTemarioBase,
  })),
}));

vi.mock('../../core/services/pipeline-jobs.service', () => ({
  PipelineJobsService: vi.fn().mockImplementation(() => ({
    createJob:  mockCreateJob,
    getJob:     mockGetJob,
    waitForJob: mockWaitForJob,
  })),
}));

vi.mock('../../dcfl/repositories/pipeline.repository', () => ({
  PipelineRepository: vi.fn().mockImplementation(() => ({
    getAgentOutput: mockGetAgentOutput,
  })),
}));

vi.mock('../../core/services/web-search.service', () => ({
  WebSearchService: vi.fn().mockImplementation(() => ({
    searchUnitTopic: mockSearchUnit,
  })),
}));

// ── Import bajo test (después de los mocks) ──────────────────────────────────

import { orchestrateP4Chapters } from '../../dcfl/helpers/p4-orchestrator.helper';

// ── Helpers ───────────────────────────────────────────────────────────────────

const DEV_ENV = { ENVIRONMENT: 'development' } as Env;

function makeTemario(n: number) {
  return {
    temario: [{
      modulo: 'Módulo 1',
      unidades: Array.from({ length: n }, (_, i) => ({
        nombre: `Unidad ${i + 1}`,
        objetivo_bloom: `objetivo ${i + 1}`,
      })),
    }],
  };
}

const runPipeline = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  vi.clearAllMocks();
  runPipeline.mockResolvedValue(undefined);
  mockSearchUnit.mockResolvedValue(null);
  mockWaitForJob.mockResolvedValue('completed'); // default: job completes
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('orchestrateP4Chapters', () => {
  it('returns 3 CapituloGenerado when all 3 chapters complete successfully', async () => {
    mockGetTemarioBase.mockResolvedValue(makeTemario(3));
    mockCreateJob
      .mockResolvedValueOnce('job-cap-0')
      .mockResolvedValueOnce('job-cap-1')
      .mockResolvedValueOnce('job-cap-2');
    mockWaitForJob.mockResolvedValue('completed');
    mockGetAgentOutput
      .mockResolvedValueOnce('# Capítulo 1 contenido')
      .mockResolvedValueOnce('# Capítulo 2 contenido')
      .mockResolvedValueOnce('# Capítulo 3 contenido');

    const result = await orchestrateP4Chapters(
      'proj-abc',
      { projectName: 'Curso Test' },
      {},
      DEV_ENV,
      'user-1',
      runPipeline,
    );

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ index: 0, md: '# Capítulo 1 contenido' });
    expect(result[1]).toEqual({ index: 1, md: '# Capítulo 2 contenido' });
    expect(result[2]).toEqual({ index: 2, md: '# Capítulo 3 contenido' });
  });

  it('throws with missing chapter list when chapter 1 fails (PT-153 coverage gate)', async () => {
    mockGetTemarioBase.mockResolvedValue(makeTemario(3));
    mockCreateJob
      .mockResolvedValueOnce('job-cap-0')
      .mockResolvedValueOnce('job-cap-1')
      .mockResolvedValueOnce('job-cap-2');
    mockWaitForJob
      .mockResolvedValueOnce('completed') // cap 0
      .mockResolvedValueOnce('failed')    // cap 1 — triggers gate
      .mockResolvedValueOnce('completed'); // cap 2
    mockGetAgentOutput
      .mockResolvedValueOnce('# Capítulo 1')
      .mockResolvedValueOnce('# Capítulo 3');

    await expect(
      orchestrateP4Chapters('proj-abc', {}, {}, DEV_ENV, 'user-1', runPipeline),
    ).rejects.toThrow('Cobertura incompleta');
  });

  it('throws with missing chapter on timeout (PT-153 coverage gate)', async () => {
    mockGetTemarioBase.mockResolvedValue(makeTemario(1));
    mockCreateJob.mockResolvedValueOnce('job-cap-0');
    mockWaitForJob.mockResolvedValue('timeout');

    await expect(
      orchestrateP4Chapters('proj-abc', {}, {}, DEV_ENV, 'user-1', runPipeline),
    ).rejects.toThrow('Cobertura incompleta');
  });

  it('returns empty array when temario has no units', async () => {
    mockGetTemarioBase.mockResolvedValue({ temario: [] });

    const result = await orchestrateP4Chapters(
      'proj-empty',
      {},
      {},
      DEV_ENV,
      'user-1',
      runPipeline,
    );

    expect(result).toHaveLength(0);
    expect(mockCreateJob).not.toHaveBeenCalled();
  });

  it('continues without crash when Tavily search throws', async () => {
    mockSearchUnit.mockRejectedValue(new Error('Tavily timeout'));
    mockGetTemarioBase.mockResolvedValue(makeTemario(1));
    mockCreateJob.mockResolvedValueOnce('job-cap-0');
    mockWaitForJob.mockResolvedValue('completed');
    mockGetAgentOutput.mockResolvedValueOnce('# Capítulo sin OSINT');

    const result = await orchestrateP4Chapters(
      'proj-abc',
      {},
      {},
      DEV_ENV,
      'user-1',
      runPipeline,
    );

    expect(result).toHaveLength(1);
    expect(result[0].md).toBe('# Capítulo sin OSINT');
  });
});
