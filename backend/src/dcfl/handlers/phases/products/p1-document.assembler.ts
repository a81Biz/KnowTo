import { ProductContext } from './product.types';
import { parseJsonSafely } from '../../../helpers/json-cleaner';

export async function handleDocumentP1Assembler(context: ProductContext): Promise<string> {
  const { jobId, projectId, services } = context;

  // Resolve judge selection
  const rawJudge = (await services.pipelineService.getAgentOutput(jobId, 'juez_doc')) || '';
  const judgeMatch = rawJudge.match(/\{[\s\S]*\}/);
  const decision = judgeMatch ? parseJsonSafely(judgeMatch[0], null) : null;
  const seleccion: 'A' | 'B' = decision?.seleccion === 'B' ? 'B' : 'A';
  console.log(`[doc-p1-assembler] Juez eligió: ${seleccion} (${decision?.razon?.slice(0, 80) || 'sin razón'})`);

  // Read winner agent output
  const winnerAgent = seleccion === 'A' ? 'agente_doc_A' : 'agente_doc_B';
  const rawWinner = (await services.pipelineService.getAgentOutput(jobId, winnerAgent)) || '';
  const objMatch = rawWinner.match(/\{[\s\S]*\}/);
  const winnerData = objMatch ? parseJsonSafely(objMatch[0], {}) : {};
  const documentoMd: string = winnerData.documento_md || rawWinner || '# Instrumentos de Evaluación\n\n*Error al generar el documento.*';

  console.log(`[doc-p1-assembler] Documento generado: ${documentoMd.length} caracteres`);

  await services.supabase.saveF4Producto({
    projectId,
    producto: 'P1',
    documentoFinal: documentoMd,
    borradorA: '',
    borradorB: '',
    validacionEstado: 'aprobado',
    jobId,
    validacionErrores: { passed: true },
  });

  return documentoMd;
}
