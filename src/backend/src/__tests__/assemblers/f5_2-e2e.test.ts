import { describe, it, expect, vi } from 'vitest';
import { handleF5Events } from '../../dcfl/handlers/phases/f5.phase';
import type { PipelineEvent } from '../../dcfl/types/pipeline-event.types';

function buildServices(outputs: Record<string, string> = {}) {
  return {
    supabase: {
      saveDocument: vi.fn().mockResolvedValue({ documentId: 'doc-f5_2-test' }),
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
    jobId: 'job-f5_2-test',
    projectId: 'proj-f5_2-test',
    promptId: 'F5_2',
    agentName: 'ensamblador_f5_2',
    output: '',
    body: {
      context: { projectName: 'Curso de Prueba', clientName: 'Ana López', _frozen: { estandar_norma: 'EC0366', idioma_requerido: 'es' } },
      userInputs: {},
    },
    services,
  };
}

const VALID_OUTPUTS: Record<string, string> = {
  juez_evidencias: '{"seleccion":"A","razon":"instrucciones más claras"}',
  agente_evidencias_A: '{"evidencias":{"lista":[{"numero":1,"nombre":"Curso publicado en LMS","proposito":"Demostrar acceso activo","archivo":"evidencia-1-curso-publicado.png","instruccion_captura":"Captura de pantalla con título visible","formato":"PNG"},{"numero":2,"nombre":"Reporteo del LMS","proposito":"Demostrar seguimiento","archivo":"evidencia-2-reporteo-lms.png","instruccion_captura":"Captura del panel de reportes","formato":"PNG"}],"lista_verificacion":[{"numero":1,"archivo":"evidencia-1-curso-publicado.png"},{"numero":2,"archivo":"evidencia-2-reporteo-lms.png"}]}}',
  agente_evidencias_B: '{"evidencias":{"lista":[{"numero":1,"nombre":"Pantalla del curso","proposito":"Verificar publicación","archivo":"ev-1.png","instruccion_captura":"Captura completa","formato":"PNG"}],"lista_verificacion":[{"numero":1,"archivo":"ev-1.png"}]}}',
};

describe('handleF5Events — F5_2 Evidencias assembler', () => {
  it('returns non-empty markdown string with valid outputs', async () => {
    const services = buildServices(VALID_OUTPUTS);
    const result = await handleF5Events(buildEvent(services));
    expect(typeof result).toBe('string');
    expect(result as string).toContain('EVIDENCIAS');
  });

  it('calls saveDocument with phaseId F5_2', async () => {
    const services = buildServices(VALID_OUTPUTS);
    await handleF5Events(buildEvent(services));
    expect(services.supabase.saveDocument).toHaveBeenCalledWith(
      expect.objectContaining({ phaseId: 'F5_2' }),
    );
  });

  it('does not throw when juez returns invalid JSON', async () => {
    const outputs = { ...VALID_OUTPUTS, juez_evidencias: 'texto libre sin JSON' };
    const services = buildServices(outputs);
    await expect(handleF5Events(buildEvent(services))).resolves.not.toThrow();
  });

  it('handles empty agent outputs without crashing', async () => {
    const services = buildServices({});
    const result = await handleF5Events(buildEvent(services));
    expect(typeof result).toBe('string');
    expect(result as string).toContain('EVIDENCIAS');
  });

  it('includes declaracion de autenticidad section', async () => {
    const services = buildServices(VALID_OUTPUTS);
    const result = await handleF5Events(buildEvent(services)) as string;
    expect(result).toContain('DECLARACIÓN DE AUTENTICIDAD');
  });

  it('includes lista de verificacion final section', async () => {
    const services = buildServices(VALID_OUTPUTS);
    const result = await handleF5Events(buildEvent(services)) as string;
    expect(result).toContain('LISTA DE VERIFICACIÓN FINAL');
  });
});
