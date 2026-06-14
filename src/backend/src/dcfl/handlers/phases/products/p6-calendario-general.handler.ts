import { ProductContext } from './product.types';
import { parseJsonSafely } from '../../../helpers/json-cleaner';
import { resolveJudge } from '../../../helpers/judge-resolver.helper';

export async function handleP6(context: ProductContext): Promise<string | void> {
  const { jobId, projectId, services } = context;

  const ganador = await resolveJudge(
    jobId, 'juez_p6', 'agente_p6_A', 'agente_p6_B',
    { calendario: { semanas: [] } }, services
  );

  const data = ganador.calendario || {};
  const semanas = data.semanas || [];

  let finalDoc = `# CALENDARIO GENERAL DE ACTIVIDADES\n\n`;
  finalDoc += `**Curso:** ${data.nombre_curso || 'Por definir'}\n\n`;
  finalDoc += `**Duración total:** ${data.duracion_total || 'Por definir'}\n\n`;
  finalDoc += `**Total de semanas:** ${semanas.length}\n\n---\n\n`;

  semanas.forEach((semana: any) => {
    finalDoc += `## Semana ${semana.numero || '?'}: ${semana.titulo || semana.nombre || ''}\n\n`;
    finalDoc += `| Día | Actividad | Tipo | Duración | Entregable |\n`;
    finalDoc += `|:---|:---|:---|:---:|:---|\n`;
    
    (semana.actividades || []).forEach((act: any) => {
      finalDoc += `| ${act.dia || '-'} | ${act.nombre || act.tarea || '-'} | ${act.tipo || '-'} | ${act.duracion || act.horas || '-'} | ${act.entregable || act.meta || '-'} |\n`;
    });
    finalDoc += `\n---\n\n`;
  });

  await services.supabase.saveF4Producto({
    projectId, producto: 'P6', documentoFinal: finalDoc,
    borradorA: '', borradorB: '', validacionEstado: 'aprobado',
    jobId, validacionErrores: { passed: true }
  });

  return finalDoc;
}
