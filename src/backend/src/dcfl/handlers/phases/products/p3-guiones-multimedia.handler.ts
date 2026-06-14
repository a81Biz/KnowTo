import { ProductContext } from './product.types';
import { parseJsonSafely } from '../../../helpers/json-cleaner';
import { resolveJudge } from '../../../helpers/judge-resolver.helper';

export async function handleP3(context: ProductContext): Promise<string | void> {
  const { jobId, projectId, services } = context;

  const ganador = await resolveJudge(
    jobId, 'juez_p3', 'agente_p3_A', 'agente_p3_B',
    { guiones: [] }, services
  );

  const guiones = ganador.guiones || [];

  let finalDoc = `# GUIONES MULTIMEDIA\n\n`;
  finalDoc += `**Tipo:** Videos instructivos\n\n`;
  finalDoc += `**Total de escenas:** ${guiones.length}\n\n---\n\n`;

  guiones.forEach((guion: any, idx: number) => {
    finalDoc += `## Escena ${guion.escena || idx + 1}: ${guion.titulo || 'Sin título'}\n\n`;
    finalDoc += `**Duración estimada:** ${guion.duracion || guion.tiempo || 'Por definir'}\n\n`;
    finalDoc += `**Visual:** ${guion.visual || ''}\n\n`;
    finalDoc += `**Audio/Locución:** ${guion.audio || guion.locucion || ''}\n\n`;
    if (guion.transiciones) finalDoc += `*Transición:* ${guion.transiciones}\n\n`;
    finalDoc += `---\n\n`;
  });

  await services.supabase.saveF4Producto({
    projectId, producto: 'P3', documentoFinal: finalDoc,
    borradorA: '', borradorB: '', validacionEstado: 'aprobado',
    jobId, validacionErrores: { passed: true }
  });

  return finalDoc;
}
