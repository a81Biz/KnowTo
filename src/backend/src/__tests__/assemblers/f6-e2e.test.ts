import { describe, it, expect, vi } from 'vitest';
import { handleF6Events } from '../../dcfl/handlers/phases/f6.phase';
import type { PipelineEvent } from '../../dcfl/types/pipeline-event.types';

function buildServices(outputs: Record<string, string> = {}) {
  return {
    supabase: {
      saveDocument: vi.fn().mockResolvedValue({ documentId: 'doc-f6-test' }),
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
    jobId: 'job-f6-test',
    projectId: 'proj-f6-test',
    promptId: 'F6',
    agentName: 'ensamblador_f6',
    output: '',
    body: {
      context: { projectName: 'Curso de Prueba', clientName: 'Candidato Test', _frozen: { estandar_norma: 'EC0366', idioma_requerido: 'es' } },
      userInputs: {},
    },
    services,
  };
}

const VALID_OUTPUTS: Record<string, string> = {
  juez_ajustes: '{"seleccion":"A","razon":"verificaciones más objetivas"}',
  agente_ajustes_A: '{"ajustes":{"observaciones_recibidas":"Se detectaron problemas de navegación en móviles y falta de claridad en instrucciones del módulo 2.","clasificacion":[{"numero":1,"observacion":"Botones de navegación no funcionan en iOS","tipo":"Técnico","prioridad":"Alta","responsable":"Candidato","plazo":"30/06/2026"}],"plan_detallado":[{"nombre":"Corrección navegación móvil","problema":"Botones iOS incompatibles","solucion":"Actualizar CSS a compatible con Safari","archivos":"estilos.css","responsable":"Candidato","fecha_limite":"30/06/2026","verificacion":"Prueba en iPhone con Safari 16+"}],"control_versiones":[{"version":"1.0","fecha":"01/01/2026","cambios":"Versión inicial","responsable":"Candidato"},{"version":"1.1","fecha":"30/06/2026","cambios":"Corrección navegación móvil","responsable":"Candidato"}]}}',
  agente_ajustes_B: '{"ajustes":{"observaciones_recibidas":"Observaciones menores de formato.","clasificacion":[{"numero":1,"observacion":"Formato de PDF","tipo":"Administrativo","prioridad":"Baja","responsable":"Candidato","plazo":"01/07/2026"}],"plan_detallado":[],"control_versiones":[{"version":"1.0","fecha":"01/01/2026","cambios":"Inicial","responsable":"Candidato"}]}}',
};

describe('handleF6Events — F6 Ajustes assembler', () => {
  it('returns non-empty markdown string with valid outputs', async () => {
    const services = buildServices(VALID_OUTPUTS);
    const result = await handleF6Events(buildEvent(services));
    expect(typeof result).toBe('string');
    expect(result as string).toContain('AJUSTES POST-EVALUACIÓN');
  });

  it('calls saveDocument with phaseId F6', async () => {
    const services = buildServices(VALID_OUTPUTS);
    await handleF6Events(buildEvent(services));
    expect(services.supabase.saveDocument).toHaveBeenCalledWith(
      expect.objectContaining({ phaseId: 'F6' }),
    );
  });

  it('does not throw when juez returns invalid JSON', async () => {
    const outputs = { ...VALID_OUTPUTS, juez_ajustes: '{seleccion: "B"}' };
    const services = buildServices(outputs);
    await expect(handleF6Events(buildEvent(services))).resolves.not.toThrow();
  });

  it('throws when agent outputs produce placeholder-only document (PT-155)', async () => {
    const services = buildServices({});
    await expect(handleF6Events(buildEvent(services))).rejects.toThrow('placeholders no resueltos');
  });

  it('includes control de versiones section', async () => {
    const services = buildServices(VALID_OUTPUTS);
    const result = await handleF6Events(buildEvent(services)) as string;
    expect(result).toContain('CONTROL DE VERSIONES');
  });

  it('includes declaracion de conformidad section', async () => {
    const services = buildServices(VALID_OUTPUTS);
    const result = await handleF6Events(buildEvent(services)) as string;
    expect(result).toContain('DECLARACIÓN DE CONFORMIDAD');
  });
});
