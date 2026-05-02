import { ProductContext } from './product.types';
import { parseJsonSafely } from '../../../helpers/json-cleaner';

const PROHIBITED_WORDS = /\b(adecuado|correctamente|correcto|bien|efectivo|notable|mejorado)\b/i;

export async function handleDocumentGenericAssembler(context: ProductContext): Promise<string> {
  const { jobId, projectId, services, event } = context;
  const producto: string = (event?.body?.userInputs?._producto as string) || 'P2';

  const rawJudge = (await services.pipelineService.getAgentOutput(jobId, 'juez_doc_generic')) || '';
  const judgeMatch = rawJudge.match(/\{[\s\S]*\}/);
  const decision = judgeMatch ? parseJsonSafely(judgeMatch[0], null) : null;
  const seleccion: 'A' | 'B' = decision?.seleccion === 'B' ? 'B' : 'A';
  console.log(`[doc-generic-assembler] Juez eligió: ${seleccion} para ${producto} (${decision?.razon?.slice(0, 80) || 'sin razón'})`);

  const winnerAgent = seleccion === 'A' ? 'agente_doc_generic_A' : 'agente_doc_generic_B';
  const loserAgent  = seleccion === 'A' ? 'agente_doc_generic_B' : 'agente_doc_generic_A';
  const fallback = `# Producto ${producto}\n\n*Error al generar el documento.*`;

  const rawWinner = (await services.pipelineService.getAgentOutput(jobId, winnerAgent)) || '';
  const objMatch = rawWinner.match(/\{[\s\S]*\}/);
  const winnerData = objMatch ? parseJsonSafely(objMatch[0], {}) : {};
  let documentoMd: string = (winnerData as any).documento_md || rawWinner || fallback;

  let validacionEstado = 'aprobado';
  let validacionErrores: object = { passed: true };

  if (PROHIBITED_WORDS.test(documentoMd)) {
    console.warn(`[doc-generic-assembler] Palabras prohibidas en ${winnerAgent} — intentando fallback`);
    const rawLoser = (await services.pipelineService.getAgentOutput(jobId, loserAgent)) || '';
    const loserMatch = rawLoser.match(/\{[\s\S]*\}/);
    const loserData = loserMatch ? parseJsonSafely(loserMatch[0], {}) : {};
    const loserMd: string = (loserData as any).documento_md || rawLoser || fallback;
    if (!PROHIBITED_WORDS.test(loserMd)) {
      documentoMd = loserMd;
      validacionEstado = 'aprobado_por_fallback';
      validacionErrores = { passed: true, note: 'fallback al perdedor' };
    } else {
      validacionEstado = 'aprobado_con_errores';
      validacionErrores = { passed: false, errors: ['Palabras subjetivas prohibidas detectadas'] };
    }
  }

  console.log(`[doc-generic-assembler] ${producto} estado: ${validacionEstado}, ${documentoMd.length} caracteres`);

  await services.supabase.saveF4Producto({
    projectId,
    producto,
    documentoFinal: documentoMd,
    borradorA: '',
    borradorB: '',
    validacionEstado,
    jobId,
    validacionErrores,
  });

  return documentoMd;
}
