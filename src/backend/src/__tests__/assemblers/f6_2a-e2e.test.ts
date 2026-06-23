import { describe, it, expect, vi } from 'vitest';
import { handleF6Events } from '../../dcfl/handlers/phases/f6.phase';
import type { PipelineEvent } from '../../dcfl/types/pipeline-event.types';

function buildServices(outputs: Record<string, string> = {}) {
  return {
    supabase: {
      saveDocument: vi.fn().mockResolvedValue({ documentId: 'doc-f6_2a-test' }),
      getF4Productos: vi.fn().mockResolvedValue([]),
      getProjectDocuments: vi.fn().mockResolvedValue([]),
    },
    pipelineService: {
      getAgentOutput: vi.fn().mockImplementation((_job: string, name: string) =>
        Promise.resolve(outputs[name] ?? ''),
      ),
    },
  };
}

function buildEvent(services: ReturnType<typeof buildServices>): PipelineEvent {
  return {
    jobId: 'job-f6_2a-test',
    projectId: 'proj-f6_2a-test',
    promptId: 'F6_2a',
    agentName: 'ensamblador_f6_2a',
    output: '',
    body: {
      context: {
        projectName: 'Curso de Prueba',
        clientName: 'María García',
        folioSugerido: 'EXP-2026-0042',
        _frozen: { estandar_norma: 'EC0366', idioma_requerido: 'es' },
      },
      userInputs: {},
    },
    services,
  };
}

const VALID_OUTPUTS: Record<string, string> = {
  juez_inventario: '{"seleccion":"A","razon":"estados más precisos"}',
  agente_inventario_A: '{"inventario":{"documentos":[{"numero":1,"documento":"Marco de Referencia del Cliente","fase":"Diagnóstico","elemento":"REQ-A","estado":"Completado","paginas":"2","firma":"Candidato"},{"numero":2,"documento":"Informe de Necesidades","fase":"Análisis","elemento":"REQ-A","estado":"Completado","paginas":"4","firma":"Candidato"}],"firmas":{"candidato":{"nombre":"María García","curp":"GARM900101MDFR00"},"revisor":{"nombre":"","cargo":""},"coordinador":{"nombre":"","organismo":""}}}}',
  agente_inventario_B: '{"inventario":{"documentos":[{"numero":1,"documento":"Marco de Referencia","fase":"Diagnóstico","elemento":"REQ-A","estado":"Completado","paginas":"2","firma":"Candidato"}],"firmas":{"candidato":{"nombre":"","curp":""},"revisor":{"nombre":"","cargo":""},"coordinador":{"nombre":"","organismo":""}}}}',
};

describe('handleF6Events — F6_2a Inventario assembler', () => {
  it('returns non-empty markdown string with valid outputs', async () => {
    const services = buildServices(VALID_OUTPUTS);
    const result = await handleF6Events(buildEvent(services));
    expect(typeof result).toBe('string');
    expect(result as string).toContain('INVENTARIO');
  });

  it('calls saveDocument with phaseId F6_2a', async () => {
    const services = buildServices(VALID_OUTPUTS);
    await handleF6Events(buildEvent(services));
    expect(services.supabase.saveDocument).toHaveBeenCalledWith(
      expect.objectContaining({ phaseId: 'F6_2a' }),
    );
  });

  it('does not throw when juez returns invalid JSON', async () => {
    const outputs = { ...VALID_OUTPUTS, juez_inventario: 'texto libre sin JSON' };
    const services = buildServices(outputs);
    await expect(handleF6Events(buildEvent(services))).resolves.not.toThrow();
  });

  it('handles empty agent outputs without crashing', async () => {
    const services = buildServices({});
    const result = await handleF6Events(buildEvent(services));
    expect(typeof result).toBe('string');
    expect(result as string).toContain('INVENTARIO');
  });

  it('includes firmas de cierre section', async () => {
    const services = buildServices(VALID_OUTPUTS);
    const result = await handleF6Events(buildEvent(services)) as string;
    expect(result).toContain('FIRMAS DE CIERRE');
  });

  it('includes folio in document', async () => {
    const services = buildServices(VALID_OUTPUTS);
    const result = await handleF6Events(buildEvent(services)) as string;
    expect(result).toContain('EXP-2026-0042');
  });
});
