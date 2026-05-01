import { Agent } from '../../constants/agents.constants';
import { PipelineEvent } from '../../types/pipeline-event.types';
import { handleF0Assembler } from '../f0.handler';

/**
 * Controlador de eventos para la Fase 0.
 */
export async function handleF0Events(event: PipelineEvent): Promise<string | void> {
  const { agentName, jobId, projectId, services, promptId, output } = event;

  // 1. Manejo del Ensamblador F0
  if (agentName === Agent.ENSAMBLADOR_F0) {
    const finalDoc = await handleF0Assembler({
      jobId,
      projectId,
      pipelineService: services.pipelineService,
      supabase: services.supabase,
      projectService: services.projectService
    });

    // PASO 1: Reparar la Escritura (Guardar las preguntas de F0)
    // Recuperamos los componentes guardados por el ensamblador para obtener las preguntas limpias
    const componentes = await services.supabase.getF0Componentes(projectId);
    if (componentes?.preguntas && Array.isArray(componentes.preguntas) && componentes.preguntas.length > 0) {
      await services.supabase.saveFaseQuestions({
        projectId,
        faseDestino: 1,
        preguntas: componentes.preguntas
      });
      console.log(`[f0.phase] ${componentes.preguntas.length} preguntas persistidas en preguntas_fase`);
    }

    return finalDoc;
  }
}
