import { PipelineEvent } from '../../types/pipeline-event.types';
import { Agent } from '../../constants/agents.constants';
import { handleF1Assembler } from '../f1.handler';

/**
 * Controlador de eventos para la Fase 1.
 */
export async function handleF1Events(event: PipelineEvent): Promise<string | void> {
  const { agentName, jobId, projectId, services } = event;

  if (agentName === Agent.ENSAMBLADOR_F1) {
    const finalDoc = await handleF1Assembler({
      jobId,
      projectId,
      pipelineService: services.pipelineService,
      supabase: services.supabase,
      projectService: services.projectService
    });

    return finalDoc;
  }
}
