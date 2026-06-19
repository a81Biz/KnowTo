import { describe, it, expect, vi } from 'vitest';
import { handleDocumentP7Assembler } from '../../dcfl/handlers/phases/products/p7-document.assembler';
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
    jobId: 'job-p7-test',
    projectId: 'proj-p7-test',
    projectName: 'Curso de Prueba',
    promptId: 'F4_P7_GENERATE_DOCUMENT',
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

// agente_descripcion_A → extractAny(raw, 'descripcion') reads the 'descripcion' key
const DESCRIPCION_JSON = '{"descripcion":{"que_es":"Técnica de unión de metales","para_que_sirve":"Aplicar en fabricación","relacion_puesto":"El operador realiza uniones metálicas diariamente en la línea de producción bajo supervisión de calidad"}}';
// agente_conceptos_A → CLAVE_PARTE['conceptos'] = 'tecnico', so extractAny(raw, 'tecnico') reads 'tecnico' key
const TECNICO_JSON = '{"tecnico":{"conceptos":[{"termino":"Soldadura","definicion":"Unión de metales por fusión","ejemplo":"Cordón de soldadura E6013"},{"termino":"Electrodo","definicion":"Conductor metálico para la soldadura","ejemplo":"Electrodo E6013"}],"normativa":["NOM-022-STPS-2015"]}}';

const VALID_OUTPUTS: Record<string, string> = {
  juez_descripcion: '{"seleccion":"A","razon":"más preciso"}',
  agente_descripcion_A: DESCRIPCION_JSON,
  agente_descripcion_B: '{"descripcion":{"que_es":"Otro concepto","para_que_sirve":"Otro uso","relacion_puesto":"Otro puesto con contexto de trabajo extenso que supere los ochenta caracteres requeridos"}}',
  juez_conceptos: '{"seleccion":"A","razon":"más términos"}',
  agente_conceptos_A: TECNICO_JSON,
  agente_conceptos_B: '{"tecnico":{"conceptos":[{"termino":"Metal","definicion":"Material conductor","ejemplo":"Acero"}],"normativa":[]}}',
};

describe('handleDocumentP7Assembler — handler E2E', () => {
  it('returns a non-empty markdown string with valid agent outputs', async () => {
    const services = buildServices(VALID_OUTPUTS);
    const result = await handleDocumentP7Assembler(buildContext(services));
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(100);
  });

  it('calls saveF4Producto with producto=P7', async () => {
    const services = buildServices(VALID_OUTPUTS);
    await handleDocumentP7Assembler(buildContext(services));
    expect(services.supabase.saveF4Producto).toHaveBeenCalledWith(
      expect.objectContaining({ producto: 'P7' }),
    );
  });

  it('does not throw when juez returns invalid JSON (fault tolerance)', async () => {
    const outputs = { ...VALID_OUTPUTS, juez_descripcion: 'texto libre sin JSON' };
    const services = buildServices(outputs);
    await expect(handleDocumentP7Assembler(buildContext(services))).resolves.not.toThrow();
  });

  it('handles entirely empty agent outputs without crashing', async () => {
    const services = buildServices({});
    const result = await handleDocumentP7Assembler(buildContext(services));
    expect(typeof result).toBe('string');
  });

  it('deduplicates glossary terms — glosario section present and handler does not crash', async () => {
    const duplicateConceptos = '{"tecnico":{"conceptos":[{"termino":"TerminoUnico","definicion":"Def A","ejemplo":"Ej A"},{"termino":"TerminoUnico","definicion":"Def B","ejemplo":"Ej B"}],"normativa":[]}}';
    const outputs = { ...VALID_OUTPUTS, agente_conceptos_A: duplicateConceptos };
    const services = buildServices(outputs);
    const result = await handleDocumentP7Assembler(buildContext(services));
    expect(typeof result).toBe('string');
    expect(result).toContain('Glosario Consolidado');
    // The glosario section has only one row per term (internal deduplication via !glosario[term])
    const glosarioStart = result.indexOf('## Glosario Consolidado');
    const nextSection = result.indexOf('\n## ', glosarioStart + 1);
    const glosarioSection = result.slice(glosarioStart, nextSection === -1 ? undefined : nextSection);
    const termMatches = (glosarioSection.match(/TerminoUnico/g) ?? []).length;
    expect(termMatches).toBe(1);
  });
});
