import { describe, it, expect, vi } from 'vitest';
import { handleDocumentP8Assembler } from '../../dcfl/handlers/phases/products/p8-document.assembler';
import type { ProductContext } from '../../dcfl/handlers/phases/products/product.types';

function buildClientMock() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return { from: vi.fn().mockReturnValue(chain) };
}

function buildServices(outputs: Record<string, string> = {}) {
  return {
    supabase: {
      client: buildClientMock(),
      getF2Analisis: vi.fn().mockResolvedValue(null),
      getProjectBrief: vi.fn().mockResolvedValue(null),
      getF3Especificaciones: vi.fn().mockResolvedValue(null),
      saveF4Producto: vi.fn().mockResolvedValue(undefined),
      saveArtifactVersion: vi.fn().mockResolvedValue(undefined),
    },
    pipelineService: {
      getAgentOutput: vi.fn().mockImplementation((_job: string, name: string) =>
        Promise.resolve(outputs[name] ?? ''),
      ),
    },
  };
}

function buildContext(services: ReturnType<typeof buildServices>): ProductContext {
  return {
    jobId: 'job-p8-test',
    projectId: 'proj-p8-test',
    projectName: 'Curso de Prueba',
    promptId: 'F4_P8_GENERATE_DOCUMENT',
    services,
    event: {
      type: 'agent_output',
      body: {
        userId: 'test-user',
        context: { _frozen: { estandar_norma: null, idioma_requerido: 'es', modalidad: 'presencial' } },
        userInputs: { _modulo_actual: 1, productos_previos: {}, previousData: {} },
      } as any,
    } as any,
  };
}

const VALID_OUTPUTS: Record<string, string> = {
  juez_hitos: '{"seleccion":"A","razon":"cronograma más realista"}',
  agente_hitos_A: '{"hitos":[{"tarea":"Diseño instruccional","inicio":"01/07/2026","entrega":"15/07/2026","responsable":"Diseñador"},{"tarea":"Producción de materiales","inicio":"16/07/2026","entrega":"31/07/2026","responsable":"Desarrollador"}]}',
  agente_hitos_B: '{"hitos":[{"tarea":"Fase de análisis","inicio":"01/07/2026","entrega":"10/07/2026","responsable":"Líder"}]}',
  juez_riesgos: '{"seleccion":"A","razon":"mitiga mejor"}',
  agente_riesgos_A: '{"riesgos_calidad":{"riesgos":[{"riesgo":"Retrasos del cliente","mitigacion":"Sesiones de revisión semanales","impacto":"Alto","probabilidad":"Media"}],"compuertas_calidad":["Revisión de bocetos — Semana 2","Piloto con grupo muestra — Semana 5"]}}',
  agente_riesgos_B: '{"riesgos_calidad":{"riesgos":[],"compuertas_calidad":[]}}',
};

describe('handleDocumentP8Assembler — handler E2E', () => {
  it('returns a non-empty markdown string with valid agent outputs', async () => {
    const services = buildServices(VALID_OUTPUTS);
    const result = await handleDocumentP8Assembler(buildContext(services));
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(100);
  });

  it('calls saveF4Producto with producto=P8', async () => {
    const services = buildServices(VALID_OUTPUTS);
    await handleDocumentP8Assembler(buildContext(services));
    expect(services.supabase.saveF4Producto).toHaveBeenCalledWith(
      expect.objectContaining({ producto: 'P8' }),
    );
  });

  it('does not throw when juez returns invalid JSON (fault tolerance)', async () => {
    const outputs = { ...VALID_OUTPUTS, juez_hitos: '{seleccion: "A"}' };
    const services = buildServices(outputs);
    await expect(handleDocumentP8Assembler(buildContext(services))).resolves.not.toThrow();
  });

  it('handles entirely empty agent outputs without crashing', async () => {
    const services = buildServices({});
    const result = await handleDocumentP8Assembler(buildContext(services));
    expect(typeof result).toBe('string');
  });

  it('includes all hitos from agente A in the assembled document', async () => {
    const services = buildServices(VALID_OUTPUTS);
    const result = await handleDocumentP8Assembler(buildContext(services));
    expect(result).toContain('Diseño instruccional');
    expect(result).toContain('Producción de materiales');
  });
});
