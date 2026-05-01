import { ProductContext } from './product.types';
import { parseJsonSafely } from '../../../helpers/json-cleaner';
import { resolveJudge } from '../../../helpers/judge-resolver.helper';

export async function handleP2(context: ProductContext): Promise<string | void> {
  const { jobId, projectId, services } = context;

  const ganador = await resolveJudge(
    jobId, 'juez_p2', 'agente_p2_A', 'agente_p2_B',
    { presentacion: { titulo: '', diapositivas: [] } }, services
  );

  const data = ganador.presentacion || {};
  const slides = data.diapositivas || [];

  let finalDoc = `# PRESENTACIÓN ELECTRÓNICA\n\n`;
  finalDoc += `**Título:** ${data.titulo || 'Presentación del Curso'}\n\n`;
  finalDoc += `**Total de diapositivas:** ${slides.length}\n\n---\n\n`;

  slides.forEach((slide: any, idx: number) => {
    finalDoc += `## Diapositiva ${slide.numero || idx + 1}: ${slide.titulo || 'Sin título'}\n\n`;
    finalDoc += `${slide.contenido || ''}\n\n`;
    if (slide.notas) finalDoc += `*Notas del instructor:* ${slide.notas}\n\n`;
    if (slide.elementos_visuales) finalDoc += `*Elementos visuales:* ${slide.elementos_visuales}\n\n`;
    finalDoc += `---\n\n`;
  });

  await services.supabase.saveF4Producto({
    projectId, producto: 'P2', documentoFinal: finalDoc,
    borradorA: '', borradorB: '', validacionEstado: 'aprobado',
    jobId, validacionErrores: { passed: true }
  });

  return finalDoc;
}
