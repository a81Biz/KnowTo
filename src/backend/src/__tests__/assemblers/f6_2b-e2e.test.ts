import { describe, it, expect, vi } from 'vitest';
import { handleF6Events } from '../../dcfl/handlers/phases/f6.phase';
import type { PipelineEvent } from '../../dcfl/types/pipeline-event.types';

function buildServices(outputs: Record<string, string> = {}) {
  return {
    supabase: {
      saveDocument: vi.fn().mockResolvedValue({ documentId: 'doc-f6_2b-test' }),
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
    jobId: 'job-f6_2b-test',
    projectId: 'proj-f6_2b-test',
    promptId: 'F6_2b',
    agentName: 'ensamblador_f6_2b',
    output: '',
    body: {
      context: {
        projectName: 'Curso de Prueba',
        clientName: 'Pedro Torres',
        folioSugerido: 'EXP-2026-0099',
        _frozen: { estandar_norma: 'EC0366', idioma_requerido: 'es' },
      },
      userInputs: {},
    },
    services,
  };
}

const VALID_OUTPUTS: Record<string, string> = {
  juez_declaracion: '{"seleccion":"A","razon":"datos más precisos del contexto"}',
  agente_declaracion_A: '{"resumen_declaracion":{"datos_curso":{"nombre":"Curso de Soldadura Industrial","industria":"Manufactura","duracion":"40 horas","modalidad":"Presencial","plataforma":"Moodle","scorm":"SCORM 1.2","modulos":"4 módulos","videos":"8 videos producidos","fecha_inicio":"15/01/2026"},"logros":"El candidato desarrolló exitosamente un curso de soldadura industrial que resuelve la brecha de capacitación detectada en la evaluación inicial.","observaciones_organismo":"El curso pasó por una revisión de ajustes post-evaluación y ha sido optimizado según los hallazgos del piloto.","declaracion_adicional":"Ver declaración final en documento"}}',
  agente_declaracion_B: '{"resumen_declaracion":{"datos_curso":{"nombre":"Soldadura","industria":"Metal","duracion":"40h","modalidad":"Presencial","plataforma":"Moodle","scorm":"No especificado","modulos":"4","videos":"8","fecha_inicio":"No especificado"},"logros":"Se desarrolló el curso.","observaciones_organismo":"Sin observaciones.","declaracion_adicional":""}}',
};

describe('handleF6Events — F6_2b Declaración assembler', () => {
  it('returns non-empty markdown string with valid outputs', async () => {
    const services = buildServices(VALID_OUTPUTS);
    const result = await handleF6Events(buildEvent(services));
    expect(typeof result).toBe('string');
    expect(result as string).toContain('RESUMEN EJECUTIVO');
  });

  it('calls saveDocument with phaseId F6_2b', async () => {
    const services = buildServices(VALID_OUTPUTS);
    await handleF6Events(buildEvent(services));
    expect(services.supabase.saveDocument).toHaveBeenCalledWith(
      expect.objectContaining({ phaseId: 'F6_2b' }),
    );
  });

  it('does not throw when juez returns invalid JSON', async () => {
    const outputs = { ...VALID_OUTPUTS, juez_declaracion: '{seleccion: "B"}' };
    const services = buildServices(outputs);
    await expect(handleF6Events(buildEvent(services))).resolves.not.toThrow();
  });

  it('handles empty agent outputs without crashing', async () => {
    const services = buildServices({});
    const result = await handleF6Events(buildEvent(services));
    expect(typeof result).toBe('string');
  });

  it('includes declaracion final section', async () => {
    const services = buildServices(VALID_OUTPUTS);
    const result = await handleF6Events(buildEvent(services)) as string;
    expect(result).toContain('DECLARACIÓN FINAL');
  });

  it('includes resumen de datos del curso table', async () => {
    const services = buildServices(VALID_OUTPUTS);
    const result = await handleF6Events(buildEvent(services)) as string;
    expect(result).toContain('Soldadura Industrial');
  });
});
