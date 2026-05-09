import { ProductContext } from './product.types';
import { parseJsonSafely } from '../../../helpers/json-cleaner';

function validateDocumentoP1(md: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Rule 1: prohibited subjective words
  if (/\b(adecuado|correctamente|correcto|bien|efectivo|notable|mejorado)\b/i.test(md)) {
    errors.push('Contiene palabras subjetivas prohibidas (adecuado/correcto/bien/efectivo)');
  }

  // Rule 2: global unit ponderaciones must sum to 100%
  const globalPcts = [...md.matchAll(/(?:Ponderaci[oó]n Global|Peso en la Calificaci[oó]n Final)[:\s*]+(\d{1,3})\s*%/gi)]
    .map(m => parseInt(m[1]));
  if (globalPcts.length > 0) {
    const sum = globalPcts.reduce((a, b) => a + b, 0);
    if (sum !== 100) {
      errors.push(`Ponderaciones globales suman ${sum}% — debe ser exactamente 100%`);
    }
  }

  // Rule 3: no combined instruments in a single unit
  if (/(?:Cuestionario|Lista de Cotejo|Gu[ií]a de Observaci[oó]n).{1,10}(?:y|\/|\+).{1,10}(?:Cuestionario|Lista de Cotejo|Gu[ií]a de Observaci[oó]n)/i.test(md)) {
    errors.push('Combina dos tipos de instrumento en la misma unidad');
  }

  return { valid: errors.length === 0, errors };
}

function extractDocumentoMd(raw: string, fallback: string): string {
  // Legacy: agent output wrapped in {"documento_md": "..."}
  if (raw.includes('"documento_md"')) {
    // Try standard JSON parsing first
    const objMatch = raw.match(/\{[\s\S]*\}/);
    if (objMatch) {
      const data = parseJsonSafely(objMatch[0], {});
      const md = (data as any).documento_md;
      if (typeof md === 'string' && md.length > 100) return md;
    }
    // Fallback: scan char-by-char to handle raw newlines in the JSON string value
    const keyIdx = raw.indexOf('"documento_md"');
    if (keyIdx !== -1) {
      const colonIdx = raw.indexOf(':', keyIdx + 14);
      const quoteStart = raw.indexOf('"', colonIdx + 1);
      if (quoteStart !== -1) {
        let content = '';
        let i = quoteStart + 1;
        while (i < raw.length) {
          const ch = raw[i];
          if (ch === '\\' && i + 1 < raw.length) {
            const next = raw[i + 1];
            if (next === 'n') { content += '\n'; i += 2; }
            else if (next === 't') { content += '\t'; i += 2; }
            else if (next === '"') { content += '"'; i += 2; }
            else if (next === '\\') { content += '\\'; i += 2; }
            else { content += next; i += 2; }
          } else if (ch === '"') {
            break;
          } else {
            content += ch;
            i++;
          }
        }
        if (content.length > 100) return content;
      }
    }
  }
  // Pure markdown output (new format): return as-is
  const trimmed = raw.trim();
  return trimmed.length > 50 ? trimmed : fallback;
}

export async function handleDocumentP1Assembler(context: ProductContext): Promise<string> {
  const { jobId, projectId, services } = context;

  const rawJudge = (await services.pipelineService.getAgentOutput(jobId, 'juez_doc')) || '';
  const judgeMatch = rawJudge.match(/\{[\s\S]*\}/);
  const decision = judgeMatch ? parseJsonSafely(judgeMatch[0], null) : null;
  const seleccion: 'A' | 'B' = decision?.seleccion === 'B' ? 'B' : 'A';
  console.log(`[doc-p1-assembler] Juez eligió: ${seleccion} (${decision?.razon?.slice(0, 80) || 'sin razón'})`);

  const winnerAgent = seleccion === 'A' ? 'agente_doc_A' : 'agente_doc_B';
  const loserAgent  = seleccion === 'A' ? 'agente_doc_B' : 'agente_doc_A';
  const fallback = '# Instrumentos de Evaluación\n\n*Error al generar el documento.*';

  const rawWinner = (await services.pipelineService.getAgentOutput(jobId, winnerAgent)) || '';
  let documentoMd = extractDocumentoMd(rawWinner, fallback);

  const validation = validateDocumentoP1(documentoMd);
  let validacionEstado: string;
  let validacionErrores: object;

  if (!validation.valid) {
    console.warn(`[doc-p1-assembler] Validación fallida en ${winnerAgent}:`, validation.errors);
    const rawLoser = (await services.pipelineService.getAgentOutput(jobId, loserAgent)) || '';
    const loserMd = extractDocumentoMd(rawLoser, fallback);
    const loserValidation = validateDocumentoP1(loserMd);
    if (loserValidation.valid) {
      console.log(`[doc-p1-assembler] Fallback al perdedor ${loserAgent} — pasa validación`);
      documentoMd = loserMd;
      validacionEstado = 'aprobado_por_fallback';
      validacionErrores = { passed: true, winnerErrors: validation.errors };
    } else {
      console.warn(`[doc-p1-assembler] Ambos agentes fallan validación — usando ganador del juez con errores`);
      validacionEstado = 'aprobado_con_errores';
      validacionErrores = { passed: false, errors: validation.errors };
    }
  } else {
    validacionEstado = 'aprobado';
    validacionErrores = { passed: true };
  }

  console.log(`[doc-p1-assembler] Estado: ${validacionEstado}, ${documentoMd.length} caracteres`);

  await services.supabase.saveF4Producto({
    projectId,
    producto: 'P1',
    documentoFinal: documentoMd,
    borradorA: '',
    borradorB: '',
    validacionEstado,
    jobId,
    validacionErrores,
  });

  return documentoMd;
}
