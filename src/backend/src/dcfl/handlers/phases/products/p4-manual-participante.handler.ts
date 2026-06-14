import { ProductContext } from './product.types';
import { parseJsonSafely } from '../../../helpers/json-cleaner';
import { resolveJudge } from '../../../helpers/judge-resolver.helper';

export async function handleP4(context: ProductContext): Promise<string | void> {
  const { jobId, projectId, services, event } = context;

  const rawExtractor = (await services.pipelineService.getAgentOutput(jobId, 'extractor_f4_p4')) || '{}';
  const ext = parseJsonSafely<any>(rawExtractor, {});
  
  const projectName = event.body?.context?.projectName || ext.projectName || 'Curso';
  const courseName = ext.courseName || 'Manual del Participante';

  const ganador = await resolveJudge(
    jobId,
    'juez_p4',
    'agente_p4_A',
    'agente_p4_B',
    { manual: { unidades: [], introduccion: '', bibliografia: [] } },
    services
  );

  const manualData = ganador.manual || {};
  const unidades = manualData.unidades || [];

  let finalDoc = `# MANUAL DEL PARTICIPANTE\n\n`;
  finalDoc += `**Curso:** ${courseName}\n`;
  finalDoc += `**Proyecto:** ${projectName}\n\n`;
  finalDoc += `---\n\n`;

  if (manualData.introduccion) {
    finalDoc += `## Introducción\n\n${manualData.introduccion}\n\n---\n\n`;
  } else if (manualData.bienvenida) {
    finalDoc += `## Bienvenida\n\n${manualData.bienvenida}\n\n---\n\n`;
  }

  for (const unidad of unidades) {
    const num = unidad.numero || 1;
    const titulo = unidad.titulo || 'Unidad';
    finalDoc += `## Unidad ${num}: ${titulo}\n\n`;

    if (unidad.objetivo_aprendizaje) {
      finalDoc += `**Objetivo:** ${unidad.objetivo_aprendizaje}\n\n`;
    }

    if (unidad.conceptos_clave?.length) {
      finalDoc += `### Conceptos clave\n`;
      unidad.conceptos_clave.forEach((c: string) => { finalDoc += `- **${c}**\n`; });
      finalDoc += `\n`;
    }

    if (unidad.teoria_sintetizada) {
      finalDoc += `### Teoría sintetizada\n\n${unidad.teoria_sintetizada}\n\n`;
    }

    if (unidad.ejemplos?.length) {
      finalDoc += `### Ejemplos\n`;
      unidad.ejemplos.forEach((e: string) => { finalDoc += `- ${e}\n`; });
      finalDoc += `\n`;
    }

    if (unidad.actividades_sugeridas?.length) {
      finalDoc += `### Actividades sugeridas\n`;
      unidad.actividades_sugeridas.forEach((a: string) => { finalDoc += `- ${a}\n`; });
      finalDoc += `\n`;
    }

    finalDoc += `---\n\n`;
  }

  if (manualData.bibliografia?.length) {
    finalDoc += `## Bibliografía\n\n`;
    manualData.bibliografia.forEach((b: string) => { finalDoc += `- ${b}\n`; });
    finalDoc += `\n`;
  }

  if (manualData.glosario?.length) {
    finalDoc += `## Glosario\n\n`;
    manualData.glosario.forEach((g: any) => {
      if (typeof g === 'object') {
        finalDoc += `- **${g.termino}:** ${g.definicion}\n`;
      }
    });
    finalDoc += `\n`;
  }

  await services.supabase.saveF4Producto({
    projectId,
    producto: 'P4',
    documentoFinal: finalDoc,
    borradorA: '',
    borradorB: '',
    validacionEstado: 'aprobado',
    jobId,
    validacionErrores: { passed: true }
  });

  return finalDoc;
}
