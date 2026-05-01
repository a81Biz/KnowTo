import { PipelineEvent } from '../types/pipeline-event.types';
import { JudgeSectionMap } from '../constants/agents.constants';
import { parseJsonSafely } from '../helpers/json-cleaner';

/**
 * Maneja la lógica de guardado de las decisiones de los jueces.
 * Utiliza el JudgeSectionMap para determinar la sección correspondiente en la base de datos.
 */
export const handleJudgeDecision = async (event: PipelineEvent) => {
  const { agentName, output, jobId, promptId, services } = event;
  const { supabase } = services;

  const section = JudgeSectionMap[agentName];
  if (!section) return;

  try {
    const decisionObj = parseJsonSafely(output || '{}', { seleccion: 'A', razon: '' });

    if (promptId === 'F0') {
      await supabase.saveF0JuezDecision(jobId, section, {
        seleccion: decisionObj.seleccion || 'A',
        razon: decisionObj.razon || ''
      });
    } else if (promptId === 'F2') {
      await supabase.saveF2JuezDecision(jobId, section, decisionObj);
    }
  } catch (err) {
    console.warn(`[pipeline] handleJudgeDecision failed for ${agentName}:`, err);
  }
};
