import { describe, it, expect, vi } from 'vitest';
import { handleF5Events } from '../../dcfl/handlers/phases/f5.phase';
import type { PipelineEvent } from '../../dcfl/types/pipeline-event.types';

function buildServices(outputs: Record<string, string> = {}) {
  return {
    supabase: {
      saveDocument: vi.fn().mockResolvedValue({ documentId: 'doc-f5-test' }),
    },
    pipelineService: {
      getAgentOutput: vi.fn().mockImplementation((_job: string, name: string) =>
        Promise.resolve(outputs[name] ?? ''),
      ),
    },
  };
}

function buildEvent(services: ReturnType<typeof buildServices>, agentName = 'ensamblador_f5', promptId = 'F5'): PipelineEvent {
  return {
    jobId: 'job-f5-test',
    projectId: 'proj-f5-test',
    promptId,
    agentName,
    output: '',
    body: {
      context: { projectName: 'Curso de Prueba', clientName: 'Cliente Test', _frozen: { estandar_norma: 'EC0366', idioma_requerido: 'es' } },
      userInputs: {},
    },
    services,
  };
}

const VALID_OUTPUTS_F5: Record<string, string> = {
  juez_verificacion: '{"seleccion":"A","razon":"más completo"}',
  agente_verificacion_A: '{"verificacion":{"checklist_tecnico":[{"item":"El curso carga correctamente en el LMS","resultado":"✅ Verificado","evidencia":"http://lms.test","observacion":""}],"checklist_pedagogico":[{"item":"Los objetivos son alcanzables","resultado":"✅ Verificado","observacion":"Alineados correctamente"}],"reporte_pruebas":{"participantes":5,"tasa_aprobacion":"80%","hallazgos":["Navegación fluida"],"ajustes_recomendados":[{"ajuste":"Ampliar instrucciones módulo 2","prioridad":"Media"}]}}}',
  agente_verificacion_B: '{"verificacion":{"checklist_tecnico":[{"item":"Los videos reproducen sin error","resultado":"✅ Verificado","evidencia":"[captura]","observacion":""}],"checklist_pedagogico":[{"item":"La secuencia didáctica es lógica","resultado":"✅ Verificado","observacion":""}],"reporte_pruebas":{"participantes":3,"tasa_aprobacion":"100%","hallazgos":[],"ajustes_recomendados":[]}}}',
};

describe('handleF5Events — F5 Verificación assembler', () => {
  it('returns non-empty markdown string with valid outputs', async () => {
    const services = buildServices(VALID_OUTPUTS_F5);
    const result = await handleF5Events(buildEvent(services));
    expect(typeof result).toBe('string');
    expect(result as string).toContain('VERIFICACIÓN Y EVALUACIÓN');
  });

  it('calls saveDocument with phaseId F5', async () => {
    const services = buildServices(VALID_OUTPUTS_F5);
    await handleF5Events(buildEvent(services));
    expect(services.supabase.saveDocument).toHaveBeenCalledWith(
      expect.objectContaining({ phaseId: 'F5' }),
    );
  });

  it('does not throw when juez returns invalid JSON', async () => {
    const outputs = { ...VALID_OUTPUTS_F5, juez_verificacion: '{seleccion: "A"}' };
    const services = buildServices(outputs);
    await expect(handleF5Events(buildEvent(services))).resolves.not.toThrow();
  });

  it('handles empty agent outputs without crashing', async () => {
    const services = buildServices({});
    const result = await handleF5Events(buildEvent(services));
    expect(typeof result).toBe('string');
    expect(result as string).toContain('VERIFICACIÓN');
  });

  it('includes fallback checklist when agent output has no checklist_tecnico', async () => {
    const outputs = { ...VALID_OUTPUTS_F5, agente_verificacion_A: '{"verificacion":{}}' };
    const services = buildServices(outputs);
    const result = await handleF5Events(buildEvent(services)) as string;
    expect(result).toContain('SCORM/xAPI');
  });

  it('returns void for unknown agentName', async () => {
    const services = buildServices({});
    const result = await handleF5Events(buildEvent(services, 'agente_verificacion_A', 'F5'));
    expect(result).toBeUndefined();
  });
});
