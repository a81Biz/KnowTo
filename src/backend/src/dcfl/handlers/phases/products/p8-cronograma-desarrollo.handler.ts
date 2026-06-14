import { ProductContext } from './product.types';
import { parseJsonSafely } from '../../../helpers/json-cleaner';
import { resolveJudge } from '../../../helpers/judge-resolver.helper';

export async function handleP8(context: ProductContext): Promise<string | void> {
  const { jobId, projectId, services, event } = context;

  const ganador = await resolveJudge(
    jobId, 'juez_p8', 'agente_p8_A', 'agente_p8_B',
    { cronograma: { fases: [] } }, services
  );

  const data = ganador.cronograma || {};
  const fases = data.fases || [];

  const rawExtractor = (await services.pipelineService.getAgentOutput(jobId, 'extractor_f4_p8')) || '{}';
  const ext = parseJsonSafely<any>(rawExtractor, {});

  const projectName = event.body?.context?.projectName || ext.projectName || 'Curso';
  const instructorName = event.body?.userInputs?.instructorName || ext.instructorName || 'Instructor';
  const reviewerName = event.body?.userInputs?.reviewerName || ext.reviewerName || 'Revisor';

  let rawDate = event.body?.userInputs?.startDate || ext.startDate;
  let validStartDate = new Date();
  if (rawDate && typeof rawDate === 'string' && rawDate.toLowerCase() !== 'por definir') {
    const testDate = new Date(rawDate);
    if (!isNaN(testDate.getTime())) validStartDate = testDate;
  }
  
  const safeStartDateStr = validStartDate.toISOString().split('T')[0];
  let currentDate = new Date(validStartDate.getTime());
  let totalDias = 0;

  let finalDoc = `# CRONOGRAMA DE DESARROLLO\n\n`;
  finalDoc += `**Proyecto:** ${projectName}\n`;
  finalDoc += `**Instructor/Desarrollador:** ${instructorName}\n`;
  finalDoc += `**Revisor:** ${reviewerName}\n`;
  finalDoc += `**Fecha de inicio:** ${safeStartDateStr}\n\n---\n\n`;

  fases.forEach((fase: any) => {
    finalDoc += `## ${fase.nombre || 'Fase de Desarrollo'}\n\n`;
    finalDoc += `| Actividad | Responsable | Duración (días) | Fecha inicio | Fecha fin | Entregable |\n`;
    finalDoc += `|:---|:---|:---:|:---|:---|:---|\n`;
    
    const actividades = fase.actividades || fase.tareas || [];
    actividades.forEach((act: any) => {
      const actividad = act.actividad || act.tarea || 'Actividad';
      const entregable = act.entregable || act.resultado || 'Evidencia';
      const duracion = parseInt(String(act.duracion_dias || act.dias || 1)) || 1;
      totalDias += duracion;
      
      const startStr = currentDate.toISOString().split('T')[0];
      currentDate.setDate(currentDate.getDate() + duracion);
      const endStr = currentDate.toISOString().split('T')[0];

      let responsable = act.responsable || act.encargado || instructorName;
      if (responsable.toLowerCase().includes('revisor')) responsable = reviewerName;

      finalDoc += `| ${actividad} | ${responsable} | ${duracion} | ${startStr} | ${endStr} | ${entregable} |\n`;
    });
    finalDoc += `\n`;
  });

  finalDoc += `## RESUMEN EJECUTIVO\n\n`;
  finalDoc += `| Dato | Valor |\n|:---|:---|\n`;
  finalDoc += `| Duración total del proyecto | ${totalDias} días hábiles |\n`;
  finalDoc += `| Fecha estimada de entrega | ${currentDate.toISOString().split('T')[0]} |\n`;

  await services.supabase.saveF4Producto({
    projectId, producto: 'P8', documentoFinal: finalDoc,
    borradorA: '', borradorB: '', validacionEstado: 'aprobado',
    jobId, validacionErrores: { passed: true }
  });

  return finalDoc;
}
