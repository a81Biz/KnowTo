import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PipelineOrchestratorService } from '../../../cce/services/pipeline-orchestrator.service';
import { AIService } from '../../../cce/services/ai.service';
import { SupabaseService } from '../../../cce/services/supabase.service';

vi.mock('../../../cce/services/ai.service');
vi.mock('../../../cce/services/supabase.service');

// Node.js mock to intercept reading flow-map.yaml since tests might not have the correct PWD or file
import * as fs from 'fs';
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    readFileSync: (path: string, encoding: string) => {
      if (path.includes('flow-map.yaml')) {
        return `
version: "2.0.0"
pipelines:
  F0:
    description: "Mock F0 Pipeline"
    stages:
      - id: extractor_web
        agent: extractor
        prompt_id: EXTRACTOR_MOCK
        inputs: ["crawlerData"]
        output_guard: sector_raw
        next: validation

      - id: validation
        agent: judge
        prompt_id: JUDGE_MOCK
        inputs: ["sector_raw"]
        output_guard: resultado_final
        max_retries: 2
        fallthrough_on_error: true
`;
      }
      return actual.readFileSync(path, encoding);
    }
  };
});

describe('PipelineOrchestratorService', () => {
  let supabaseMock: vi.Mocked<SupabaseService>;
  let aiMock: vi.Mocked<AIService>;
  let orchestrator: PipelineOrchestratorService;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Configurar Mocks
    supabaseMock = new SupabaseService({} as any) as vi.Mocked<SupabaseService>;
    supabaseMock.getStepOutputs = vi.fn().mockResolvedValue({});
    supabaseMock.saveStepOutput = vi.fn().mockResolvedValue(true);
    supabaseMock.getPrompt = vi.fn().mockImplementation(async (id: string) => {
      if (id === 'JUDGE_MOCK') {
        return {
          id,
          agent_type: 'judge',
          model: 'test-model',
          system_prompt: 'Judge system prompt',
          user_prompt_template: 'Judge Template {{sector_raw}}'
        };
      }
      return {
        id,
        agent_type: 'extractor',
        model: 'test-model',
        system_prompt: 'System prompt',
        user_prompt_template: 'Template {{crawlerData}}'
      };
    });

    aiMock = new AIService({} as any) as vi.Mocked<AIService>;
    aiMock.runAgent = vi.fn().mockImplementation(async (promptText, model, sysPrompt) => {
      if (sysPrompt === 'Judge system prompt') {
         return JSON.stringify({ status: 'ok', output_final: 'Validado' });
      }
      if (promptText.includes('Template')) {
        return 'Mock sector raw data';
      }
      return 'Generic Mock Response';
    });

    orchestrator = new PipelineOrchestratorService(aiMock, supabaseMock);
  });

  it('ejecuta un pipeline secuencial (extractor -> judge) adecuadamente', async () => {
    const context = await orchestrator.executePipeline('project-123', 'F0', {
      crawlerData: 'Mock Crawler Content'
    });

    expect(context.sector_raw).toBe('Mock sector raw data');
    expect(context.resultado_final).toBe('Validado');
    expect(aiMock.runAgent).toHaveBeenCalledTimes(2);
    expect(supabaseMock.saveStepOutput).toHaveBeenCalledTimes(2);
  });

  it('lanza error si el pipeline no existe', async () => {
    await expect(orchestrator.executePipeline('project-123', 'NOT_FOUND')).rejects.toThrow(/no encontrado en flow-map/);
  });
});
