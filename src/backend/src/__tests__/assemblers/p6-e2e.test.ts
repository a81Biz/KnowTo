import { describe, it, expect, vi } from 'vitest';
import { handleDocumentP6Assembler } from '../../dcfl/handlers/phases/products/p6-document.assembler';
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
    jobId: 'job-p6-test',
    projectId: 'proj-p6-test',
    projectName: 'Curso de Prueba',
    promptId: 'F4_P6_GENERATE_DOCUMENT',
    services,
    event: {
      type: 'agent_output',
      body: {
        userId: 'test-user',
        context: { _frozen: { estandar_norma: null, idioma_requerido: 'es', modalidad: 'presencial' } },
        userInputs: { _modulo_actual: 1, _nombre_sesion: 'Sesión 1', productos_previos: {}, previousData: {} },
      } as any,
    } as any,
  };
}

const VALID_OUTPUTS: Record<string, string> = {
  juez_horas: '{"seleccion":"A","razon":"distribución correcta"}',
  agente_horas_A: '{"horario":{"horas_teoricas":2,"horas_practicas":4,"total_horas":6,"modalidad":"presencial"}}',
  agente_horas_B: '{"horario":{"horas_teoricas":3,"horas_practicas":3,"total_horas":6,"modalidad":"presencial"}}',
  juez_plan: '{"seleccion":"A","razon":"más detallado"}',
  agente_plan_A: '{"plan":{"actividades":[{"hora":"09:00","actividad":"Bienvenida","duracion":"30 min","tipo":"apertura"}],"recursos":["Proyector","Material impreso"]}}',
  agente_plan_B: '{"plan":{"actividades":[],"recursos":[]}}',
  juez_entrega: '{"seleccion":"A","razon":"criterios claros"}',
  agente_entrega_A: '{"entregables":{"producto":"Reporte de práctica","instrumento":"Rúbrica","criterio_aceptacion":"Calificación mínima 80%"}}',
  agente_entrega_B: '{}',
};

describe('handleDocumentP6Assembler — handler E2E', () => {
  it('returns a non-empty markdown string with valid agent outputs', async () => {
    const services = buildServices(VALID_OUTPUTS);
    const result = await handleDocumentP6Assembler(buildContext(services));
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(100);
  });

  it('calls saveF4Producto with producto=P6', async () => {
    const services = buildServices(VALID_OUTPUTS);
    await handleDocumentP6Assembler(buildContext(services));
    expect(services.supabase.saveF4Producto).toHaveBeenCalledWith(
      expect.objectContaining({ producto: 'P6' }),
    );
  });

  it('does not throw when juez returns invalid JSON (fault tolerance)', async () => {
    const outputs = { ...VALID_OUTPUTS, juez_horas: '{seleccion: "B"}' };
    const services = buildServices(outputs);
    await expect(handleDocumentP6Assembler(buildContext(services))).resolves.not.toThrow();
  });

  it('handles entirely empty agent outputs without crashing', async () => {
    const services = buildServices({});
    const result = await handleDocumentP6Assembler(buildContext(services));
    expect(typeof result).toBe('string');
  });
});
