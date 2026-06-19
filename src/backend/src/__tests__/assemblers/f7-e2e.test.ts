import { describe, it, expect, vi } from 'vitest';
import { handleF7Events } from '../../dcfl/handlers/phases/f7.phase';
import type { PipelineEvent } from '../../dcfl/types/pipeline-event.types';

function buildServices(outputs: Record<string, string> = {}) {
  return {
    supabase: {
      saveDocument: vi.fn().mockResolvedValue({ documentId: 'doc-f7-test' }),
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
    jobId: 'job-f7-test',
    projectId: 'proj-f7-test',
    promptId: 'F7',
    agentName: 'ensamblador_f7',
    output: '',
    body: {
      context: {
        projectName: 'Curso de Soldadura Industrial',
        folioSugerido: 'EXP-2026-0042',
        _frozen: { estandar_norma: 'EC0366', idioma_requerido: 'es' },
      },
      userInputs: {},
    },
    services,
  };
}

const VALID_OUTPUTS: Record<string, string> = {
  juez_resumen_proceso: '{"seleccion":"A","razon":"narrativa más profunda y corporativa"}',
  agente_resumen_A: '{"resumen_proceso":{"brecha_y_objetivo":"La empresa detectó que sus operadores carecían de certificación formal en soldadura industrial, lo que generaba inconsistencias en la calidad de las uniones metálicas. El objetivo fue desarrollar un curso certificable conforme a EC0366 que estandarizara las competencias del personal.","decisiones_pedagogicas":"Se optó por una estructura de 4 módulos con progresión desde conceptual hasta aplicación práctica. Las evaluaciones priorizaron el desempeño observable (listas de cotejo, guías de observación) sobre la memorización, alineando cada instrumento al nivel taxonómico Bloom correspondiente.","conclusion_valor":"El candidato cuenta ahora con un expediente completo que demuestra la calidad instruccional del curso y permite la certificación formal ante el organismo evaluador, generando valor tangible para la empresa al garantizar la competencia verificable de sus operadores."}}',
  agente_resumen_B: '{"resumen_proceso":{"brecha_y_objetivo":"Se identificó una brecha en competencias de soldadura.","decisiones_pedagogicas":"Se diseñó un curso con módulos.","conclusion_valor":"El curso fue desarrollado exitosamente."}}',
};

describe('handleF7Events — F7 Resumen assembler', () => {
  it('returns non-empty markdown string with valid outputs', async () => {
    const services = buildServices(VALID_OUTPUTS);
    const result = await handleF7Events(buildEvent(services));
    expect(typeof result).toBe('string');
    expect(result as string).toContain('RESUMEN CUALITATIVO');
  });

  it('calls saveDocument with phaseId F7', async () => {
    const services = buildServices(VALID_OUTPUTS);
    await handleF7Events(buildEvent(services));
    expect(services.supabase.saveDocument).toHaveBeenCalledWith(
      expect.objectContaining({ phaseId: 'F7' }),
    );
  });

  it('does not throw when juez returns invalid JSON', async () => {
    const outputs = { ...VALID_OUTPUTS, juez_resumen_proceso: 'texto libre sin JSON' };
    const services = buildServices(outputs);
    await expect(handleF7Events(buildEvent(services))).resolves.not.toThrow();
  });

  it('handles empty agent outputs without crashing', async () => {
    const services = buildServices({});
    const result = await handleF7Events(buildEvent(services));
    expect(typeof result).toBe('string');
    expect(result as string).toContain('RESUMEN CUALITATIVO');
  });

  it('includes all three narrative sections', async () => {
    const services = buildServices(VALID_OUTPUTS);
    const result = await handleF7Events(buildEvent(services)) as string;
    expect(result).toContain('BRECHA DE CAPACITACIÓN');
    expect(result).toContain('DECISIONES PEDAGÓGICAS');
    expect(result).toContain('CONCLUSIÓN Y VALOR APORTADO');
  });

  it('uses winner A narrative text in the document', async () => {
    const services = buildServices(VALID_OUTPUTS);
    const result = await handleF7Events(buildEvent(services)) as string;
    expect(result).toContain('operadores carecían de certificación');
  });

  it('returns void for unknown agentName', async () => {
    const services = buildServices({});
    const event: PipelineEvent = {
      jobId: 'job-f7-test',
      projectId: 'proj-f7-test',
      promptId: 'F7',
      agentName: 'agente_resumen_A',
      output: '',
      body: {},
      services,
    };
    const result = await handleF7Events(event);
    expect(result).toBeUndefined();
  });
});
