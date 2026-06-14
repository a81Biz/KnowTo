import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleTemarioEvents } from '../../dcfl/handlers/phases/temario.phase';

describe('Temario Base Assembler', () => {
  let mockEvent: any;

  beforeEach(() => {
    mockEvent = {
      jobId: 'job-123',
      projectId: 'proj-123',
      agentName: 'ensamblador_temario',
      body: {
        promptId: 'TEMARIO_BASE',
      },
      services: {
        supabase: {
          getF2Analisis: vi.fn(),
          getF3Especificaciones: vi.fn(),
          saveTemarioBase: vi.fn(),
        },
        pipelineService: {
          getAgentOutput: vi.fn(),
        }
      }
    };
  });

  it('should ignore events not from ensamblador_temario', async () => {
    mockEvent.agentName = 'other_agent';
    const result = await handleTemarioEvents(mockEvent);
    expect(result).toBeUndefined();
  });

  it('should assemble temario successfully using getAgentOutput', async () => {
    mockEvent.services.pipelineService.getAgentOutput.mockImplementation(async (_jobId: string, agent: string) => {
      switch (agent) {
        case 'juez_estructura': return JSON.stringify({ seleccion: 'A' });
        case 'agente_estructura_A': return JSON.stringify({
          modulos: [
            { numero: 1, nombre: 'Modulo 1', unidades: [{ nombre: 'Unidad 1', objetivo_bloom: 'Aplica algo', tipo_evaluacion: 'Cuestionario' }] }
          ]
        });
        case 'juez_tiempos': return JSON.stringify({ seleccion: 'A' });
        case 'agente_tiempos_A': return JSON.stringify({
          modulos: [
            { numero: 1, nombre: 'Modulo 1', duracion_total_minutos: 60, unidades: [{ nombre: 'Unidad 1', duracion_minutos: 60 }] }
          ]
        });
        default: return '';
      }
    });

    const resultStr = await handleTemarioEvents(mockEvent);
    const result = JSON.parse(resultStr as string);

    expect(result.total_unidades).toBe(1);
    expect(result.duracion_total_minutos).toBe(60);
    expect(result.modulos).toHaveLength(1);

    expect(mockEvent.services.supabase.saveTemarioBase).toHaveBeenCalled();
  });
});
