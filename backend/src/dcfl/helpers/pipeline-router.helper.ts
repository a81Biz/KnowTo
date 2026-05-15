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
 * Llaves globales que deben persistirse en la tabla `projects` cuando el
 * usuario las envía desde el formulario. Esto resuelve el desacoplamiento
 * entre la capa de presentación y la base de datos (caso "ICE México").
 */
const GLOBAL_PROJECT_KEYS: Record<string, string> = {
  certifierOrg:    'certifier_org',
  modality:        'modality',
  platform:        'platform',
  courseName:      'name',
  clientName:      'client_name',
  industry:        'industry',
};

/**
 * Persiste llaves globales de userInputs en la tabla projects.
 * Ejecutado antes de despachar al handler de fase para garantizar que
 * la IA siempre lea datos actualizados de la fuente de verdad (DB).
 */
async function persistGlobalInputs(event: PipelineEvent): Promise<void> {
  const userInputs = event.body?.userInputs;
  if (!userInputs || typeof userInputs !== 'object') return;

  const updates: Record<string, unknown> = {};
  for (const [uiKey, dbColumn] of Object.entries(GLOBAL_PROJECT_KEYS)) {
    const value = (userInputs as Record<string, unknown>)[uiKey];
    if (value && typeof value === 'string' && value.trim()) {
      updates[dbColumn] = value.trim();
    }
  }

  if (Object.keys(updates).length === 0) return;

  try {
    updates['updated_at'] = new Date().toISOString();
    await event.services.supabase.client
      ?.from('projects')
      .update(updates)
      .eq('id', event.projectId);

    // Si certifierOrg cambió, actualizar también el Project Soul
    if (updates['certifier_org']) {
      const currentSoul = await event.services.supabase.getProjectSoul(event.projectId);
      if (currentSoul && !currentSoul.includes(String(updates['certifier_org']))) {
        const updatedSoul = currentSoul + `\nOrganismo certificador: ${updates['certifier_org']}.`;
        await event.services.supabase.saveProjectSoul(event.projectId, updatedSoul);
      }
    }

    console.log(`[pipeline-router] Global inputs persisted for project ${event.projectId}: ${Object.keys(updates).join(', ')}`);
  } catch (err) {
    console.warn(`[pipeline-router] Failed to persist global inputs:`, err);
  }
}

/**
 * Despacha un evento de salida de agente a su handler correspondiente.
 * Utiliza un patrón de Phase Gateway para delegar la lógica.
 */
export async function dispatchAgentEvent(event: PipelineEvent): Promise<string | void> {
  const { jobId, agentName, output, services, promptId } = event;

  // 0. Persistir llaves globales del formulario ANTES de cualquier procesamiento
  await persistGlobalInputs(event);

  // A. Guardar SIEMPRE el output crudo primero
  await services.pipelineService.saveAgentOutput(jobId, agentName, output);

  // A.1 Validación de integridad JSON (para agentes que deben devolver JSON)
  // Si el output no es JSON válido y el agente es un especialista (A/B), logueamos warning.
  if (agentName.startsWith('agente_') && (agentName.includes('_A') || agentName.includes('_B'))) {
    const trimmed = output.trim();
    const looksLikeJson = trimmed.startsWith('{') || trimmed.startsWith('[');
    if (looksLikeJson) {
      try {
        JSON.parse(trimmed);
      } catch {
        console.warn(`[pipeline-router] ⚠️ Agente ${agentName} devolvió JSON malformado. El juez debería rechazar y forzar retry.`);
      }
    }
  }

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
