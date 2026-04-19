import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PipelineOrchestratorService } from '../../../core/services/pipeline-orchestrator.service';
import type { SiteConfig } from '../../../core/types/pipeline.types';

// SiteConfig con flow-map mock inyectado directamente (no se necesita mockear fs)
const MOCK_SITE_CONFIG: SiteConfig = {
  site_id: 'cce',
  flow_map: {
    version: '2.0.0',
    pipelines: {
      F0: {
        description: 'Mock F0 Pipeline',
        stages: [
          {
            id: 'extractor_web',
            agent: 'extractor',
            prompt_id: 'EXTRACTOR_MOCK',
            inputs: ['crawlerData'],
            output_guard: 'sector_raw',
            next: 'validation',
          },
          {
            id: 'validation',
            agent: 'judge',
            prompt_id: 'JUDGE_MOCK',
            inputs: ['sector_raw'],
            output_guard: 'resultado_final',
            max_retries: 2,
            fallthrough_on_error: true,
          },
        ],
      },
    },
  },
};

describe('PipelineOrchestratorService', () => {
  let supabaseMock: {
    getStepOutputs: ReturnType<typeof vi.fn>;
    saveStepOutput: ReturnType<typeof vi.fn>;
    getPrompt: ReturnType<typeof vi.fn>;
  };
  let aiMock: { runAgent: ReturnType<typeof vi.fn> };
  let orchestrator: PipelineOrchestratorService;

  beforeEach(() => {
    vi.clearAllMocks();

    supabaseMock = {
      getStepOutputs: vi.fn().mockResolvedValue({}),
      saveStepOutput: vi.fn().mockResolvedValue(undefined),
      getPrompt: vi.fn().mockImplementation(async (id: string) => {
        if (id === 'JUDGE_MOCK') {
          return {
            id,
            agent_type:            'judge',
            model:                 'test-model',
            system_prompt:         'Judge system prompt',
            user_prompt_template:  'Judge Template {{sector_raw}}',
          };
        }
        return {
          id,
          agent_type:           'extractor',
          model:                'test-model',
          system_prompt:        'System prompt',
          user_prompt_template: 'Template {{crawlerData}}',
        };
      }),
    };

    aiMock = {
      runAgent: vi.fn().mockImplementation(async (_promptText: string, _model: string, sysPrompt: string) => {
        if (sysPrompt === 'Judge system prompt') {
          return JSON.stringify({ status: 'ok', output_final: 'Validado' });
        }
        return 'Mock sector raw data';
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    orchestrator = new PipelineOrchestratorService(MOCK_SITE_CONFIG, aiMock as any, supabaseMock as any);
  });

  it('ejecuta un pipeline secuencial (extractor -> judge) adecuadamente', async () => {
    const context = await orchestrator.executePipeline('project-123', 'F0', {
      crawlerData: 'Mock Crawler Content',
    });

    expect(context['sector_raw']).toBe('Mock sector raw data');
    expect(context['resultado_final']).toBe('Validado');
    expect(aiMock.runAgent).toHaveBeenCalledTimes(2);
    expect(supabaseMock.saveStepOutput).toHaveBeenCalledTimes(2);
  });

  it('lanza error si el pipeline no existe', async () => {
    await expect(orchestrator.executePipeline('project-123', 'NOT_FOUND'))
      .rejects.toThrow(/no encontrado en flow-map/);
  });
});
