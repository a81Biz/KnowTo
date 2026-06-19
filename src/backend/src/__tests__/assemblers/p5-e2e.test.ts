import { describe, it, expect, vi } from 'vitest';
import { handleDocumentP5Assembler } from '../../dcfl/handlers/phases/products/p5-document.assembler';
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

function buildContext(services: ReturnType<typeof buildServices>, extra: Record<string, any> = {}): ProductContext {
  return {
    jobId: 'job-p5-test',
    projectId: 'proj-p5-test',
    projectName: 'Curso de Prueba',
    promptId: 'F4_P5_GENERATE_DOCUMENT',
    services,
    event: {
      type: 'agent_output',
      body: {
        userId: 'test-user',
        context: { _frozen: { estandar_norma: null, idioma_requerido: 'es', modalidad: 'presencial' } },
        userInputs: { _modulo_actual: 1, _nombre_actividad: 'Práctica de Soldadura', productos_previos: {}, previousData: {}, ...extra },
      } as any,
    } as any,
  };
}

const VALID_OUTPUTS: Record<string, string> = {
  juez_ficha: '{"seleccion":"A","razon":"mejor estructura"}',
  agente_ficha_A: '{"ficha":{"objetivo":"Aplicar técnica de soldadura","duracion":"2 horas","modalidad":"presencial","tipo":"práctica"}}',
  agente_ficha_B: '{"ficha":{"objetivo":"Practicar soldadura B","duracion":"2 horas","modalidad":"presencial","tipo":"práctica"}}',
  juez_materiales: '{"seleccion":"A","razon":"más completo"}',
  agente_materiales_A: '{"logistica":{"materiales":["Electrodo E6013"],"herramientas":["Máquina de soldar"],"consumibles":[]}}',
  agente_materiales_B: '{"logistica":{"materiales":["Material B"],"herramientas":[],"consumibles":[]}}',
  juez_procedimiento: '{"seleccion":"A","razon":"mejor secuencia"}',
  agente_procedimiento_A: '{"procedimiento":{"preparacion":["Preparar puesto de trabajo"],"ejecucion":["Ajustar amperaje","Realizar cordón de soldadura"],"cierre_limpieza":["Limpiar área","Apagar equipo"]}}',
  agente_procedimiento_B: '{}',
  juez_evaluacion: '{"seleccion":"A","razon":"rúbrica más clara"}',
  agente_evaluacion_A: '{"evaluacion":{"evidencia_producto":"Pieza soldada","rubrica":[{"criterio":"Continuidad del cordón","puntos":50,"indicador_exito":"Cordón continuo sin poros"}]}}',
  agente_evaluacion_B: '{}',
};

describe('handleDocumentP5Assembler — handler E2E', () => {
  it('returns a non-empty markdown string with valid agent outputs', async () => {
    const services = buildServices(VALID_OUTPUTS);
    const result = await handleDocumentP5Assembler(buildContext(services));
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(100);
    expect(result).toContain('Guías de Actividades');
  });

  it('calls saveF4Producto with producto=P5', async () => {
    const services = buildServices(VALID_OUTPUTS);
    await handleDocumentP5Assembler(buildContext(services));
    expect(services.supabase.saveF4Producto).toHaveBeenCalledWith(
      expect.objectContaining({ producto: 'P5' }),
    );
  });

  it('does not throw when juez returns invalid JSON (fault tolerance)', async () => {
    const outputs = {
      ...VALID_OUTPUTS,
      juez_ficha: '{seleccion: "A"}', // unquoted key — invalid JSON
    };
    const services = buildServices(outputs);
    await expect(handleDocumentP5Assembler(buildContext(services))).resolves.not.toThrow();
  });

  it('handles entirely empty agent outputs without crashing', async () => {
    const services = buildServices({});
    const result = await handleDocumentP5Assembler(buildContext(services));
    expect(typeof result).toBe('string');
  });

  it('injects defensive fallback logistica when agente_materiales returns no JSON', async () => {
    const outputs = { ...VALID_OUTPUTS, agente_materiales_A: 'sin JSON aquí', agente_materiales_B: '' };
    const services = buildServices(outputs);
    const result = await handleDocumentP5Assembler(buildContext(services));
    expect(result).toContain('Logística');
  });
});
