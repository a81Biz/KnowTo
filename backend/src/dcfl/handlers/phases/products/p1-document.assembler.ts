import { ProductContext } from './product.types';
import { parseJsonSafely } from '../../../helpers/json-cleaner';

function extractReactivosSection(md: string): string {
  // Extract only rows from reactivo tables (| N | ... |) to scope PROHIBITED_WORDS check
  // Avoids false positives from Instrucciones Generales or Datos Generales sections
  const tableRows = (md.match(/\|\s*\d+\s*\|[^\n]+/g) || []).join('\n');
  return tableRows;
}

function validateDocumentoP1(md: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Rule 1: prohibited subjective words — scoped to reactivo table rows only (avoids false positives)
  const reactivosText = extractReactivosSection(md);
  if (/\b(adecuado|adecuada|correctamente|correcto|correcta|bien|efectivo|efectiva|notable|mejorado|mejorada|entendimiento|comprensión|comprension|conciencia)\b/i.test(reactivosText)) {
    errors.push('Reactivos contienen palabras subjetivas prohibidas (adecuado/correcto/bien/efectivo/entendimiento/comprensión)');
  }
  if (/de\s+(manera|forma)\s+(adecuada|correcta|efectiva|notable|apropiada)/i.test(reactivosText)) {
    errors.push('Reactivos contienen locuciones adverbiales subjetivas (de manera adecuada / de forma correcta / etc.)');
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

  // Rule 2b: ponderaciones written as text instead of digits
  if (/(?:Ponderaci[oó]n|Peso)\s*(?:Global|Final)?[:\s]+(cien|noventa|ochenta|setenta|sesenta|cincuenta|cuarenta|treinta|veinte|quince|diez|cinco)\s*(?:por\s+ciento)?/gi.test(md)) {
    errors.push('Ponderación escrita como texto (ej: "treinta por ciento") en lugar de número — verificar valor numérico manualmente');
  }

  // Rule 3: no combined instruments in a single unit
  if (/(?:Cuestionario|Lista de Cotejo|Gu[ií]a de Observaci[oó]n).{1,10}(?:y|\/|\+).{1,10}(?:Cuestionario|Lista de Cotejo|Gu[ií]a de Observaci[oó]n)/i.test(md)) {
    errors.push('Combina dos tipos de instrumento en la misma unidad');
  }

  // Rule 4: CLAVE DE RESPUESTAS row count must match reactivos count
  errors.push(...verifyClaveRowCounts(md));

  return { valid: errors.length === 0, errors };
}

function verifyClaveRowCounts(md: string): string[] {
  const errors: string[] = [];
  const parts = md.split(/###\s*CLAVE DE RESPUESTAS/i);

  for (let i = 1; i < parts.length; i++) {
    const beforeClave = parts[i - 1];
    const claveSection = parts[i];

    // Count numbered rows in CLAVE (stop at next ## heading)
    const claveEnd = claveSection.search(/\n##[^#]/);
    const claveText = claveEnd >= 0 ? claveSection.substring(0, claveEnd) : claveSection;
    const claveRows = (claveText.match(/\|\s*\d+\s*\|/g) || []).length;

    // Count numbered rows in the last table of the preceding text
    const lastSepIdx = beforeClave.lastIndexOf('|---|');
    const afterLastSep = lastSepIdx >= 0 ? beforeClave.substring(lastSepIdx) : beforeClave;
    const reactiveRows = (afterLastSep.match(/\|\s*\d+\s*\|/g) || []).length;

    const unitMatch = beforeClave.match(/##\s+Unidad[^\n]*/g);
    const unitName = unitMatch ? unitMatch[unitMatch.length - 1].trim() : 'unidad desconocida';

    if (reactiveRows > 0 && claveRows !== reactiveRows) {
      errors.push(`CLAVE DE RESPUESTAS tiene ${claveRows} filas pero hay ${reactiveRows} reactivos en "${unitName}"`);
    }
  }

  return errors;
}

function addInvariantInstitutionalFields(md: string): string {
  // Inject EC0366 mandatory institutional fields into Datos Generales section (P1-B)
  // These fields are required by CONOCER and must appear regardless of LLM output
  const datosGeneralesMarker = /## [12]\.\s*Datos Generales/i;
  if (!datosGeneralesMarker.test(md)) return md;

  // Only inject if not already present
  if (/Estándar de Competencia/.test(md) && /Centro de Evaluación/.test(md)) return md;

  const institutionalBlock = `- **Estándar de Competencia:** EC0366-SITTSA\n- **Centro de Evaluación CONOCER:** ____________________\n- **Fecha de evaluación planificada:** ____________________\n`;

  return md.replace(
    /(## [12]\.\s*Datos Generales\n)([\s\S]*?)(\n## )/i,
    (match, heading, content, next) => {
      if (/Estándar de Competencia/.test(content)) return match;
      return heading + institutionalBlock + content + next;
    }
  );
}

function addInvariantSignatureSection(md: string): string {
  // Remove any existing signature/validation section to avoid duplication
  const cleaned = md.replace(/\n---\n[\s\S]*##\s*Firmas[\s\S]*/i, '').trim();

  return cleaned + `

---

## Firmas de Validación

| Rol | Nombre Completo | Firma | Fecha |
|---|---|---|---|
| Diseñador Instruccional | | | |
| Experto en la Materia (SME) | | | |
| Evaluador Asignado | | | |
| Candidato (Toma de Conocimiento) | | | |

*Instrumento validado conforme al estándar EC0366 del CONOCER/SEP antes de su aplicación.*
`;
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
  documentoMd = addInvariantInstitutionalFields(documentoMd);
  documentoMd = addInvariantSignatureSection(documentoMd);

  const validation = validateDocumentoP1(documentoMd);
  let validacionEstado: string;
  let validacionErrores: object;

  if (!validation.valid) {
    console.warn(`[doc-p1-assembler] Validación fallida en ${winnerAgent}:`, validation.errors);
    const rawLoser = (await services.pipelineService.getAgentOutput(jobId, loserAgent)) || '';
    const loserMd = addInvariantSignatureSection(addInvariantInstitutionalFields(extractDocumentoMd(rawLoser, fallback)));
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
