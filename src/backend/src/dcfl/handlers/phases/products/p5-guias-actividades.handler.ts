import { ProductContext } from './product.types';
import { parseJsonSafely } from '../../../helpers/json-cleaner';
import { resolveJudge } from '../../../helpers/judge-resolver.helper';

export async function handleP5(context: ProductContext): Promise<string | void> {
  const { jobId, projectId, services } = context;

  const ganador = await resolveJudge(
    jobId, 'juez_p5', 'agente_p5_A', 'agente_p5_B',
    { guias: [] }, services
  );

  const guias = ganador.guias || [];

  let finalDoc = `# GUÍAS DE ACTIVIDADES\n\n`;
  finalDoc += `**Tipo:** Prácticas por módulo\n\n`;
  finalDoc += `**Total de actividades:** ${guias.length}\n\n---\n\n`;

  guias.forEach((guia: any, idx: number) => {
    finalDoc += `## Actividad ${idx + 1}: ${guia.nombre || 'Sin título'}\n\n`;
    finalDoc += `**Objetivo:** ${guia.objetivo || ''}\n\n`;
    finalDoc += `**Instrucciones paso a paso:**\n${guia.instrucciones || guia.actividades || ''}\n\n`;
    finalDoc += `**Recursos necesarios:** ${guia.recursos || guia.materiales || ''}\n\n`;
    finalDoc += `**Entregable esperado:** ${guia.entregable || guia.evaluacion || ''}\n\n`;
    finalDoc += `**Tiempo estimado:** ${guia.tiempo || guia.duracion || 'Por definir'}\n\n`;
    finalDoc += `---\n\n`;
  });

  await services.supabase.saveF4Producto({
    projectId, producto: 'P5', documentoFinal: finalDoc,
    borradorA: '', borradorB: '', validacionEstado: 'aprobado',
    jobId, validacionErrores: { passed: true }
  });

  return finalDoc;
}
