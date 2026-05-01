import { ProductContext } from './product.types';
import { parseJsonSafely } from '../../../helpers/json-cleaner';

export async function handleDocumentGenericAssembler(context: ProductContext): Promise<string> {
  const { jobId, projectId, services, event } = context;
  const producto: string = (event?.body?.userInputs?._producto as string) || 'P2';

  const rawJudge = (await services.pipelineService.getAgentOutput(jobId, 'juez_doc_generic')) || '';
  const judgeMatch = rawJudge.match(/\{[\s\S]*\}/);
  const decision = judgeMatch ? parseJsonSafely(judgeMatch[0], null) : null;
  const seleccion: 'A' | 'B' = decision?.seleccion === 'B' ? 'B' : 'A';
  console.log(`[doc-generic-assembler] Juez eligió: ${seleccion} para ${producto} (${decision?.razon?.slice(0, 80) || 'sin razón'})`);

  const winnerAgent = seleccion === 'A' ? 'agente_doc_generic_A' : 'agente_doc_generic_B';
  const rawWinner = (await services.pipelineService.getAgentOutput(jobId, winnerAgent)) || '';
  const objMatch = rawWinner.match(/\{[\s\S]*\}/);
  const winnerData = objMatch ? parseJsonSafely(objMatch[0], {}) : {};
  const documentoMd: string = winnerData.documento_md || rawWinner || `# Producto ${producto}\n\n*Error al generar el documento.*`;

  console.log(`[doc-generic-assembler] Documento ${producto} generado: ${documentoMd.length} caracteres`);

  await services.supabase.saveF4Producto({
    projectId,
    producto,
    documentoFinal: documentoMd,
    borradorA: '',
    borradorB: '',
    validacionEstado: 'aprobado',
    jobId,
    validacionErrores: { passed: true },
  });

  return documentoMd;
}
