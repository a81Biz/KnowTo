import { JudgeSectionMap } from '../constants/agents.constants';
import { PipelineEvent, PipelineHandler } from '../types/pipeline-event.types';
import { handleJudgeDecision } from '../handlers/judges.handler';
import { handleF0Events } from '../handlers/phases/f0.phase';
import { handleF1Events } from '../handlers/phases/f1.phase';
import { handleF2Events } from '../handlers/phases/f2.phase';
import { handleF3Events } from '../handlers/phases/f3.phase';
import { handleF4Events } from '../handlers/phases/f4.phase';

/**
 * Mapeo de manejadores por Fase.
 * Cumple con el Principio Abierto/Cerrado (OCP).
 */
const PhaseRouters: Record<string, PipelineHandler> = {
  'F0': handleF0Events,
  'F1': handleF1Events,
  'F2': handleF2Events,
  'F2_5': handleF2Events, // Delega al mismo handler de F2 que ya maneja ambos
  'F3': handleF3Events,
};

/**
 * Rutas basadas en patrones (Jueces globales).
 */
const PatternRoutes = [
  {
    condition: (event: PipelineEvent) => !!JudgeSectionMap[event.agentName],
    handler: handleJudgeDecision
  }
];

/**
 * Despacha un evento de salida de agente a su handler correspondiente.
 * Utiliza un patrón de Phase Gateway para delegar la lógica.
 */
export async function dispatchAgentEvent(event: PipelineEvent): Promise<string | void> {
  const { jobId, agentName, output, services, promptId } = event;

  // A. Guardar SIEMPRE el output crudo primero
  await services.pipelineService.saveAgentOutput(jobId, agentName, output);

  // B. Evaluar rutas por patrón (Jueces globales)
  for (const route of PatternRoutes) {
    if (route.condition(event)) {
      return await route.handler(event);
    }
  }

  // C. Manejo especial para prefijos (Fase 4)
  // Las F4 usan sus propios assemblers (ensamblador_doc_pN) que guardan en fase4_productos.
  // Re-persistir el resultado en pipeline_agent_outputs para trazabilidad y auditoría.
  if (promptId.startsWith('F4_') || promptId === 'F4_P4') {
    const result = await handleF4Events(event);
    if (typeof result === 'string') {
      await services.pipelineService.saveAgentOutput(jobId, agentName, result);
    }
    return result;
  }

  // D. Ruteo por Fase
  const phaseHandler = PhaseRouters[promptId];
  if (phaseHandler) {
    const result = await phaseHandler(event);
    
    // Si el handler devuelve un string (override), persistirlo como el output final del agente
    if (typeof result === 'string') {
      await services.pipelineService.saveAgentOutput(jobId, agentName, result);
    }
    
    // E. Notificar reactivamente actualizando el job (dispara Websocket)
    await services.supabase.client
      ?.from('pipeline_jobs')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', jobId);
    
    return result;
  }

  // F. Fallback: Notificar incluso si no hay handler de fase específico
  await services.supabase.client
    ?.from('pipeline_jobs')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', jobId);
}
