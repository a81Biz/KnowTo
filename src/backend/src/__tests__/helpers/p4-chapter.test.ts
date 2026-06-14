import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleChapterAssembler } from '../../dcfl/helpers/p4-chapter.helper';

describe('handleChapterAssembler', () => {
  let mockContext: any;
  let savedOutputs: Record<string, string>;

  beforeEach(() => {
    savedOutputs = {};
    mockContext = {
      jobId: 'job-chapter-test',
      projectId: 'proj-test',
      projectName: 'Test Course',
      promptId: 'F4_P4_CHAPTER',
      event: {
        body: {
          context: { capitulo_index: 2 },
        },
      },
      services: {
        pipelineService: {
          getAgentOutput: vi.fn(),
          saveAgentOutput: vi.fn(async (jobId: string, name: string, val: string) => {
            savedOutputs[name] = val;
          }),
        },
      },
    };
  });

  it('falls back to agent A when juez JSON is malformed', async () => {
    mockContext.services.pipelineService.getAgentOutput.mockImplementation(async (_jobId: string, agent: string) => {
      if (agent === 'agente_contenido_A') return '{"documento_md": "## Capítulo 3: Unidad A\\n\\n### Introducción\\nContenido A."}';
      if (agent === 'agente_contenido_B') return '{"documento_md": "## Capítulo 3: Unidad B\\n\\n### Introducción\\nContenido B."}';
      if (agent === 'juez_capitulo') return '{seleccion: "B", razon: "B es mejor"}'; // invalid JSON
      return null;
    });

    const result = await handleChapterAssembler(mockContext);

    // malformed JSON → fallback to A
    expect(result).toContain('Unidad A');
    expect(savedOutputs['capitulo_ensamblado_cap2']).toContain('Unidad A');
  });

  it('selects agent B when juez returns seleccion B', async () => {
    mockContext.services.pipelineService.getAgentOutput.mockImplementation(async (_jobId: string, agent: string) => {
      if (agent === 'agente_contenido_A') return '{"documento_md": "## Capítulo 3: Unidad A\\n\\n### Introducción\\nContenido A."}';
      if (agent === 'agente_contenido_B') return '{"documento_md": "## Capítulo 3: Unidad B\\n\\n### Introducción\\nContenido B."}';
      if (agent === 'juez_capitulo') return '{"seleccion": "B", "razon": "B es mas completo"}';
      return null;
    });

    const result = await handleChapterAssembler(mockContext);

    expect(result).toContain('Unidad B');
    expect(savedOutputs['capitulo_ensamblado_cap2']).toContain('Unidad B');
  });

  it('saves result with key capitulo_ensamblado_cap{N} using capitulo_index from context', async () => {
    mockContext.event.body.context.capitulo_index = 5;
    mockContext.services.pipelineService.getAgentOutput.mockImplementation(async (_jobId: string, agent: string) => {
      if (agent === 'agente_contenido_A') return '{"documento_md": "## Capítulo 6: Unidad\\n\\n### Introducción\\nContenido."}';
      if (agent === 'agente_contenido_B') return null;
      if (agent === 'juez_capitulo') return '{"seleccion": "A", "razon": "A es correcto"}';
      return null;
    });

    await handleChapterAssembler(mockContext);

    expect(mockContext.services.pipelineService.saveAgentOutput).toHaveBeenCalledWith(
      'job-chapter-test',
      'capitulo_ensamblado_cap5',
      expect.any(String),
    );
    expect(savedOutputs['capitulo_ensamblado_cap5']).toBeDefined();
  });

  it('returns empty string and saves empty when both agents return null', async () => {
    mockContext.services.pipelineService.getAgentOutput.mockResolvedValue(null);

    const result = await handleChapterAssembler(mockContext);

    expect(result).toBe('');
    expect(savedOutputs['capitulo_ensamblado_cap2']).toBe('');
  });

  it('falls back to A when juez returns RECHAZADO', async () => {
    mockContext.services.pipelineService.getAgentOutput.mockImplementation(async (_jobId: string, agent: string) => {
      if (agent === 'agente_contenido_A') return '{"documento_md": "## Capítulo 3: Unidad A\\n\\n### Introducción\\nContenido A."}';
      if (agent === 'agente_contenido_B') return '{"documento_md": "## Capítulo 3: Unidad B\\n\\n### Introducción\\nContenido B."}';
      if (agent === 'juez_capitulo') return '{"seleccion": "RECHAZADO", "razon": "Ambos con domain violation"}';
      return null;
    });

    const result = await handleChapterAssembler(mockContext);

    // RECHAZADO → not 'B' → falls back to A
    expect(result).toContain('Unidad A');
  });
});
