import { PipelineEvent } from '../../types/pipeline-event.types';
import { handleF2Assembler } from '../f2.handler';
import { handleF2_5Assembler } from '../f2_5.handler';
import { parseAnalisisF2 } from '../../services/informe.parser.f2';

/**
 * Controlador de eventos para la Fase 2 y 2.5.
 */
export async function handleF2Events(event: PipelineEvent): Promise<string | void> {
  const { agentName, output, jobId, projectId, body, services, promptId } = event;

  // 1. Manejo del Sintetizador Final F2
  if (agentName === 'sintetizador_final_f2') {
    if (promptId !== 'F2') return;

    const borradorA = (await services.pipelineService.getAgentOutput(jobId, 'especialista_temario_a')) ?? '';
    const borradorB = (await services.pipelineService.getAgentOutput(jobId, 'especialista_temario_b')) ?? '';
    const parsed = parseAnalisisF2(output);

    return await handleF2Assembler({
      jobId,
      projectId,
      projectName: body.context.projectName,
      pipelineService: services.pipelineService,
      supabase: services.supabase,
      borradorA,
      borradorB,
      parsed
    });
  }

  // 2. Manejo del Sintetizador Final F2.5
  if (agentName === 'sintetizador_final_f2_5') {
    if (promptId !== 'F2_5') return;

    return await handleF2_5Assembler({
      jobId,
      projectId,
      projectName: body.context.projectName,
      pipelineService: services.pipelineService,
      supabase: services.supabase
    });
  }
}
