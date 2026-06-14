import { ProductContext } from './product.types';
import { parseJsonSafely } from '../../../helpers/json-cleaner';
import { resolveJudge } from '../../../helpers/judge-resolver.helper';

export async function handleP7(context: ProductContext): Promise<string | void> {
  const { jobId, projectId, services } = context;

  const ganador = await resolveJudge(
    jobId, 'juez_p7', 'agente_p7_A', 'agente_p7_B',
    { syllabus: {} }, services
  );

  const data = ganador.syllabus || {};

  let finalDoc = `# DOCUMENTO DE INFORMACIÓN GENERAL (SYLLABUS)\n\n`;
  finalDoc += `## Datos del curso\n\n`;
  finalDoc += `| Campo | Valor |\n|:---|:---|\n`;
  finalDoc += `| Nombre del curso | ${data.nombre_curso || 'Por definir'} |\n`;
  finalDoc += `| Modalidad | ${data.modalidad || data.modalidad || 'Por definir'} |\n`;
  finalDoc += `| Duración | ${data.duracion || data.duracion_horas || 'Por definir'} |\n\n`;
  finalDoc += `## Perfil de ingreso\n\n${data.perfil_ingreso || data.requisitos_ingreso || ''}\n\n`;
  finalDoc += `## Objetivo general\n\n${data.objetivo_general || data.competencias || ''}\n\n`;
  finalDoc += `## Estructura temática\n\n${data.estructura_tematica || data.contenidos || ''}\n\n`;
  finalDoc += `## Evaluación\n\n${data.evaluacion || data.criterios_evaluacion || ''}\n\n`;
  finalDoc += `## Certificación\n\n${data.certificacion || data.certificacion_ec0366 || ''}\n\n`;

  await services.supabase.saveF4Producto({
    projectId, producto: 'P7', documentoFinal: finalDoc,
    borradorA: '', borradorB: '', validacionEstado: 'aprobado',
    jobId, validacionErrores: { passed: true }
  });

  return finalDoc;
}
