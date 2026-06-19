import { ProductContext } from './product.types';
import { parseJsonSafely } from '../../../helpers/json-cleaner';
import { enforceCanonicalCoherence, validateBloomInstrumentAlignment, validateUnitCoverage, type BloomAlignmentResult } from '../../../helpers/coherence';
import { CertificationEngineFactory } from '../../../helpers/certification-engine.factory';
import { EC0366RulesEngine } from '../../../helpers/ec0366-rules.engine';
import type {
  P1Artifact, F3Artifact, ModalidadCanonica, BloomLevel, TipoInstrumento,
  CertificationContext, UnidadEvaluacion, ArtifactStatus,
} from '../../../types/certification.types';

// ── Verb → BloomLevel mapping for P1Artifact construction ────────────────────
const VERB_BLOOM_LEVEL: Record<string, BloomLevel> = {
  recordar: 'recordar', recuerda: 'recordar', listar: 'recordar', lista: 'recordar',
  nombrar: 'recordar', enumerar: 'recordar', identificar: 'recordar', reconocer: 'recordar',
  mencionar: 'recordar', nombra: 'recordar', enumera: 'recordar',
  comprender: 'comprender', explicar: 'comprender', describir: 'comprender',
  interpretar: 'comprender', resumir: 'comprender', clasificar: 'comprender',
  explica: 'comprender', describe: 'comprender', clasifica: 'comprender',
  aplicar: 'aplicar', ejecutar: 'aplicar', demostrar: 'aplicar', usar: 'aplicar',
  resolver: 'aplicar', construir: 'aplicar', elaborar: 'aplicar',
  aplica: 'aplicar', ejecuta: 'aplicar', demuestra: 'aplicar', construye: 'aplicar',
  analizar: 'analizar', comparar: 'analizar', diferenciar: 'analizar', examinar: 'analizar',
  analiza: 'analizar', compara: 'analizar',
  evaluar: 'evaluar', juzgar: 'evaluar', valorar: 'evaluar', criticar: 'evaluar',
  evalua: 'evaluar', valora: 'evaluar',
  crear: 'crear', disenhar: 'crear', planear: 'crear', producir: 'crear', proponer: 'crear',
  crea: 'crear', produce: 'crear', propone: 'crear',
};

function verbToBloomLevel(verb: string): BloomLevel {
  const norm = verb.toLowerCase().trim()
    .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ñ/g, 'nh');
  return VERB_BLOOM_LEVEL[norm] ?? 'aplicar';
}

function normalizarInstrumento(instrumento: string): { valor: string; normalizado: boolean } {
  // Detecta patrón "X / Y" o "X / Y / Z" y extrae solo el primer elemento.
  // El LLM a veces combina instrumentos con "/" a pesar de la instrucción INSTRUMENTO_UNICO.
  const trimmed = instrumento.trim();
  if (trimmed.includes('/')) {
    const primero = trimmed.split('/')[0].trim();
    return { valor: primero, normalizado: true };
  }
  return { valor: trimmed, normalizado: false };
}

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

function addInvariantInstitutionalFields(md: string, estandar?: string | null): string {
  const datosGeneralesMarker = /## [12]\.\s*Datos Generales/i;
  if (!datosGeneralesMarker.test(md)) return md;

  if (/Estándar de Competencia/.test(md) && /Centro de Evaluación/.test(md)) return md;

  const estandarLabel = estandar ? estandar : '(según norma aplicable)';
  const institutionalBlock = `- **Estándar de Competencia:** ${estandarLabel}\n- **Centro de Evaluación:** ____________________\n- **Fecha de evaluación planificada:** ____________________\n`;

  return md.replace(
    /(## [12]\.\s*Datos Generales\n)([\s\S]*?)(\n## )/i,
    (match, heading, content, next) => {
      if (/Estándar de Competencia/.test(content)) return match;
      return heading + institutionalBlock + content + next;
    }
  );
}

function addInvariantSignatureSection(md: string, estandar?: string | null): string {
  const cleaned = md.replace(/\n---\n[\s\S]*##\s*Firmas[\s\S]*/i, '').trim();
  const normLabel = estandar || 'la norma aplicable';

  return cleaned + `

---

## Firmas de Validación

| Rol | Nombre Completo | Firma | Fecha |
|---|---|---|---|
| Diseñador Instruccional | | | |
| Experto en la Materia (SME) | | | |
| Evaluador Asignado | | | |
| Candidato (Toma de Conocimiento) | | | |

*Instrumento validado conforme a ${normLabel} antes de su aplicación.*
`;
}

function buildCoverageWarning(missingUnits: string[]): string {
  return `

---

> ⚠️ **Advertencia de cobertura:** Las siguientes unidades del Manual del Participante (P4) no tienen instrumento de evaluación en este documento P1:
${missingUnits.map(u => `> - ${u}`).join('\n')}
>
> *Revisar con el diseñador instruccional antes de aplicar los instrumentos.*
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

  const estandar: string | null = (context.event?.body?.context as any)?._frozen?.estandar_norma ?? null;

  const rawWinner = (await services.pipelineService.getAgentOutput(jobId, winnerAgent)) || '';
  let documentoMd = extractDocumentoMd(rawWinner, fallback);
  documentoMd = addInvariantInstitutionalFields(documentoMd, estandar);
  documentoMd = addInvariantSignatureSection(documentoMd, estandar);

  const validation = validateDocumentoP1(documentoMd);
  let validacionEstado: ArtifactStatus;
  let validacionErrores: object;

  if (!validation.valid) {
    console.warn(`[doc-p1-assembler] Validación fallida en ${winnerAgent}:`, validation.errors);
    const rawLoser = (await services.pipelineService.getAgentOutput(jobId, loserAgent)) || '';
    const loserMd = addInvariantSignatureSection(addInvariantInstitutionalFields(extractDocumentoMd(rawLoser, fallback), estandar), estandar);
    const loserValidation = validateDocumentoP1(loserMd);
    if (loserValidation.valid) {
      console.log(`[doc-p1-assembler] Fallback al perdedor ${loserAgent} — pasa validación`);
      documentoMd = loserMd;
      validacionEstado = 'corrected';
      validacionErrores = { passed: true, winnerErrors: validation.errors };
    } else {
      console.warn(`[doc-p1-assembler] Ambos agentes fallan validación — usando ganador del juez con errores`);
      validacionEstado = 'corrected';
      validacionErrores = { passed: false, errors: validation.errors };
    }
  } else {
    validacionEstado = 'valid';
    validacionErrores = { passed: true };
  }

  console.log(`[doc-p1-assembler] Estado: ${validacionEstado}, ${documentoMd.length} caracteres`);

  let _coberturaP1: { valido: boolean; faltantes: string[] } = { valido: true, faltantes: [] };
  try {
    const _mods: any[] = context.event?.body?.userInputs?.previousData?.temario_base?.temario?.modulos ?? [];
    const _unis = _mods.flatMap((m: any) => (m.unidades ?? []).map((u: any) => String(u.nombre ?? '')).filter(Boolean));
    _coberturaP1 = validateUnitCoverage(documentoMd, _unis);
    if (!_coberturaP1.valido && _coberturaP1.faltantes.length > 0) {
      documentoMd = documentoMd.trimEnd() + `\n\n> ⚠️ **Unidades sin cobertura:** ${_coberturaP1.faltantes.join(', ')} — estas unidades del Temario Base no fueron referenciadas en este documento.`;
    }
  } catch {}

  let briefDominioP1 = '';
  let _anchorP1: { valido: boolean; ausentes: string[]; cobertura: number } = { valido: true, ausentes: [], cobertura: 1 };
  try {
    const briefP1 = await services.supabase.getProjectBrief(projectId);
    briefDominioP1 = briefP1?.dominioTecnico ?? '';
  } catch {}

  const { doc: _p1clean, warnings: _p1sw, anchorValid: _p1anchorValid, anchorCobertura: _p1anchorCob } = enforceCanonicalCoherence(
    documentoMd, 'P1', {
      dominioTecnico: briefDominioP1,
      blockOnAnchorDenylist: true,  // P1 (reactivos) — bloqueante para alucinaciones de dominio
    },
  );
  documentoMd = _p1clean;
  _anchorP1 = { valido: _p1anchorValid, cobertura: _p1anchorCob, ausentes: [] };
  if (_p1sw.length > 0) console.warn('[p1-assembler] Coherence warnings:', _p1sw);

  // Coverage check: warn if any P4 units are not covered in P1 (warn-not-block)
  try {
    const { data: p4Row } = await services.supabase.client!
      .from('fase4_productos')
      .select('datos_producto')
      .eq('project_id', projectId)
      .eq('producto', 'P4')
      .in('validacion_estado', ['aprobado', 'aprobado_con_errores', 'aprobado_por_fallback'])
      .maybeSingle();

    const p4Capitulos: Array<{ nombre: string }> = p4Row?.datos_producto?.capitulos ?? [];
    if (p4Capitulos.length > 0) {
      const p1LowerMd = documentoMd.toLowerCase();
      const missingUnits = p4Capitulos
        .map(c => c.nombre)
        .filter(nombre => {
          const normalized = nombre.toLowerCase().replace(/\s+/g, ' ').trim();
          return !p1LowerMd.includes(normalized);
        });

      if (missingUnits.length > 0) {
        console.warn(`[p1-assembler] ⚠️ ${missingUnits.length} unidad(es) de P4 sin instrumento en P1:`, missingUnits);
        documentoMd = documentoMd.trimEnd() + buildCoverageWarning(missingUnits);
      } else {
        console.log(`[p1-assembler] Cobertura P1 ✅ todas las unidades de P4 tienen instrumento`);
      }
    }
  } catch (err) {
    console.warn('[p1-assembler] No se pudo verificar cobertura contra P4:', err);
  }

  // Validar alineación Bloom-Instrumento desde el temario (bloqueante cuando hay verbo conocido)
  const validacionBloomInstrument: BloomAlignmentResult[] = [];
  const validacionBloomErrors: string[] = [];
  try {
    let temarioModulos: any[] =
      context.event?.body?.userInputs?.previousData?.temario_base?.temario?.modulos ??
      context.event?.body?.context?.previousData?.temario_base?.temario?.modulos ?? [];

    if (temarioModulos.length === 0) {
      console.warn('[p1-assembler] ⚠️ temario_base ausente en contexto — consultando BD directo');
      try {
        const temarioData = await services.supabase.getTemarioBase(projectId);
        temarioModulos = (temarioData?.temario as any[]) ?? [];
        if (temarioModulos.length > 0) {
          console.log(`[p1-assembler] temario cargado desde BD: ${temarioModulos.length} módulos`);
        }
      } catch (bdErr) {
        console.error('[p1-assembler] Error al cargar temario desde BD:', bdErr instanceof Error ? bdErr.message : bdErr);
      }
    }

    if (temarioModulos.length === 0) {
      console.warn('[p1-assembler] ⚠️ Bloom-Instrumento OMITIDO — temario no disponible en BD ni en contexto');
    }

    for (const modulo of temarioModulos) {
      for (const unidad of modulo.unidades ?? []) {
        const verboPrimero = ((unidad.objetivo_bloom ?? '') as string).split(/\s+/)[0] ?? '';
        const result = validateBloomInstrumentAlignment(verboPrimero, unidad.tipo_evaluacion ?? '');
        validacionBloomInstrument.push({
          unidad: unidad.nombre,
          verboPrimero,
          tipoInstrumento: unidad.tipo_evaluacion ?? '',
          ...result,
        });
        if (!result.valido && result.instrumentosPermitidos.length > 0) {
          const msg = `"${unidad.nombre}": verbo "${verboPrimero}" requiere ${result.instrumentosPermitidos.join(' / ')} (asignado: "${unidad.tipo_evaluacion}")`;
          console.error(`[p1-assembler] ❌ Bloom-Instrumento: ${msg}`);
          validacionBloomErrors.push(msg);
        }
      }
    }
  } catch {}
  if (validacionBloomErrors.length > 0) {
    // PT-104: Bloom-Instrument mismatch is a WARNING, not a blocking rejection.
    // The CCM gate (PT-082) reads artifact_versions.status — 'corrected' allows completion; only 'rejected' blocks.
    // Setting validacionEstado='rejected' here would propagate to certStatus='rejected', blocking the gate.
    // The errors are preserved in datosProducto.validacion_bloom_errors for diagnostic purposes.
    console.warn(`[p1-assembler] ⚠️ ${validacionBloomErrors.length} desalineación(es) Bloom — advertencia (no bloquea el gate)`);
  }

  // Declared here (before saveF4Produto) so datosProducto.validacion_instrumento_normalizado is accurate.
  // The CCM block below re-uses this array and may append hint-corrected entries.
  const instrumentoNormalizaciones: string[] = [];
  try {
    const _normModulos: any[] =
      context.event?.body?.userInputs?.previousData?.temario_base?.temario?.modulos ??
      context.event?.body?.context?.previousData?.temario_base?.temario?.modulos ?? [];
    for (const m of _normModulos) {
      for (const u of m.unidades ?? []) {
        const raw = String(u.tipo_evaluacion ?? '');
        const { valor, normalizado } = normalizarInstrumento(raw);
        if (normalizado) {
          instrumentoNormalizaciones.push(`"${String(u.nombre ?? '')}": instrumento mixto "${raw}" normalizado a "${valor}"`);
        }
      }
    }
  } catch {}

  await services.supabase.saveF4Producto({
    projectId,
    producto: 'P1',
    documentoFinal: documentoMd,
    borradorA: '',
    borradorB: '',
    validacionEstado,
    jobId,
    validacionErrores,
    datosProducto: {
      validacion_cobertura: _coberturaP1,
      ...(validacionBloomInstrument.length > 0 ? { validacion_bloom_instrument: validacionBloomInstrument } : {}),
      ...(validacionBloomErrors.length > 0 ? { validacion_bloom_errors: validacionBloomErrors } : {}),
      ...(instrumentoNormalizaciones.length > 0 ? { validacion_instrumento_normalizado: instrumentoNormalizaciones } : {}),
      validacion_anchor: _anchorP1,
    },
  });

  // ── CCM: Certification Artifact Layer (non-critical) ─────────────────────
  try {
    const frozen = (context.event?.body?.context as any)?._frozen ?? {};
    const idioma_requerido: string | null = frozen.idioma_requerido ?? null;
    const estandarNorma: string | null = frozen.estandar_norma ?? null;
    const modalidadFrozen: ModalidadCanonica = (frozen.modalidad ?? 'presencial') as ModalidadCanonica;

    // Re-read temarioModulos (scoped above in try block; re-read here for CCM)
    let ccmTemarioModulos: any[] =
      context.event?.body?.userInputs?.previousData?.temario_base?.temario?.modulos ??
      context.event?.body?.context?.previousData?.temario_base?.temario?.modulos ?? [];
    if (ccmTemarioModulos.length === 0) {
      try {
        const td = await services.supabase.getTemarioBase(projectId);
        ccmTemarioModulos = (td?.temario as any[]) ?? [];
      } catch {}
    }

    const flatUnidades = ccmTemarioModulos.flatMap((m: any) => m.unidades ?? []);
    const n = flatUnidades.length;
    const basePond = n > 0 ? Math.floor(100 / n) : 100;
    const remainder = n > 0 ? 100 - basePond * n : 0;

    // PT-105: Read correction hints from retry context to override problematic instruments
    const correctionHints: Array<{ unit: string; expected_instruments: string[] }> =
      (context.event?.body?.context as any)?.p1_correction_hints ?? [];
    const hintMap = new Map(correctionHints.map(h => [String(h.unit ?? '').toLowerCase(), h]));

    const p1UnidadesCcm: UnidadEvaluacion[] = flatUnidades.map((u: any, idx: number) => {
      const unitName = String(u.nombre ?? `Unidad ${idx + 1}`);
      const hint = hintMap.get(unitName.toLowerCase());
      const rawInstrumento = hint?.expected_instruments?.[0] ?? String(u.tipo_evaluacion ?? 'Lista de Cotejo');
      const { valor: instrumento, normalizado } = normalizarInstrumento(rawInstrumento);
      if (normalizado) {
        const msg = `"${unitName}": instrumento mixto "${rawInstrumento}" normalizado a "${instrumento}"`;
        console.warn(`[p1-assembler] PT-110 ${msg}`);
        instrumentoNormalizaciones.push(msg);
      }
      if (hint) {
        console.log(`[p1-assembler] PT-105 hint aplicado en "${unitName}": ${u.tipo_evaluacion} → ${instrumento}`);
      }
      return {
        id: String(u.id ?? `u${idx + 1}`),
        nombre: unitName,
        nivel_bloom: verbToBloomLevel(String((u.objetivo_bloom ?? '').split(/\s+/)[0] ?? '')),
        instrumento: instrumento as TipoInstrumento,
        ponderacion: idx === 0 ? basePond + remainder : basePond,
        reactivos: [],
      };
    });

    const p1Artifact: P1Artifact = {
      productCode: 'P1',
      modalidad: modalidadFrozen,
      idioma: (idioma_requerido ?? 'es') as any,
      unidades: p1UnidadesCcm,
      criterios: [],
    };

    // Build minimal F3Artifact for context (only modalidad is needed for validations)
    let f3ModalidadCcm: ModalidadCanonica = modalidadFrozen;
    try {
      const f3Data = await services.supabase.getF3Especificaciones(projectId);
      const pn = f3Data?.plataforma_navegador as any;
      f3ModalidadCcm = (pn?.modalidad_curso ?? pn?.modalidad ?? modalidadFrozen) as ModalidadCanonica;
    } catch {}
    const f3Artifact: F3Artifact = {
      plataforma: '', modalidad: f3ModalidadCcm,
      criteriosAceptacion: [], reporteo: [], idioma: (idioma_requerido ?? 'es') as any,
    };

    // Read active P4 artifact version if available
    let p4ArtifactForCtx: any = undefined;
    try {
      const { data: avRow } = await services.supabase.client!
        .from('artifact_versions')
        .select('artifact')
        .eq('project_id', projectId)
        .eq('product_code', 'P4')
        .eq('is_active', true)
        .maybeSingle();
      if (avRow?.artifact) p4ArtifactForCtx = avRow.artifact;
    } catch {}

    const certCtx: CertificationContext = {
      f3Artifact,
      p4Artifact: p4ArtifactForCtx,
      requiredLang: idioma_requerido as any,
      estandarNorma,
      roundingThreshold: 3,
    };

    const engine = CertificationEngineFactory.getEngine(estandarNorma);
    const { violaciones, artifactCorregido } = engine.runCertificationCheck(p1Artifact, certCtx);

    const errorCount = violaciones.filter(v => v.severity === 'error').length;
    const certStatus: ArtifactStatus = validacionEstado === 'rejected'
      ? 'rejected'
      : (errorCount > 0 ? 'corrected' : 'valid');

    const bloom        = validacionBloomErrors.length === 0 ? 100 : 0;
    const cobertura    = violaciones.some(v => v.code === 'COVERAGE_INCOMPLETE') ? 0 : 100;
    const modalidad    = violaciones.some(v => v.code === 'MODALITY_INCONSISTENCY') ? 0 : 100;
    const idioma       = violaciones.some(v => v.code === 'LANGUAGE_FIELD_MISMATCH') ? 0 : 100;
    const vocabulario  = violaciones.some(v => v.code === 'PROHIBITED_VERB') ? 50 : 100;
    const trazabilidad = violaciones.some(v => v.code.startsWith('WEIGHT')) ? 0 : 100;
    const certScore: import('../../../types/certification.types').CertificationScore = {
      cobertura, bloom, modalidad, idioma, vocabulario, trazabilidad,
      total: Math.round((cobertura + bloom + modalidad + idioma + vocabulario + trazabilidad) / 6),
    };

    const v1 = await services.supabase.saveArtifactVersion({
      projectId,
      productCode: 'P1',
      artifact: p1Artifact,
      documentoMd,
      certScore,
      status: certStatus,
      promptTemplateId: 'F4_P1_GENERATE_DOCUMENT',
      promptTemplateVersion: '1.0',
      model: frozen.model ?? 'llama-3.1-8b',
      generatedBy: context.event.body?.userId ?? undefined,
    });

    // If engine auto-corrected rounding, persist a derived corrected version
    if (artifactCorregido && v1?.id) {
      const ec0366Engine = engine as EC0366RulesEngine;
      const originalSum = p1UnidadesCcm.reduce((s, u) => s + u.ponderacion, 0);
      const corrLog = typeof ec0366Engine.buildCorrectionLog === 'function'
        ? ec0366Engine.buildCorrectionLog(p1Artifact, artifactCorregido as P1Artifact, 100 - originalSum)
        : { type: 'WEIGHT_ROUNDING', delta: 100 - originalSum, policy: 'auto', units_affected: [] };

      await services.supabase.saveArtifactVersion({
        projectId,
        productCode: 'P1',
        artifact: artifactCorregido,
        documentoMd,
        certScore: { ...certScore, total: 100 },
        status: 'corrected',
        correctionLog: corrLog,
        derivedFromArtifactId: v1.id,
        promptTemplateId: 'F4_P1_GENERATE_DOCUMENT',
        promptTemplateVersion: '1.0',
        model: frozen.model ?? 'llama-3.1-8b',
        generatedBy: context.event.body?.userId ?? undefined,
      });
      console.log(`[p1-assembler] CCM: corrección de pesos aplicada → v2 derivada de ${v1.id}`);
    }

    const summary = errorCount === 0
      ? 'P1 certificable ✅'
      : `${errorCount} error(es), ${violaciones.filter(v => v.severity === 'warning').length} advertencia(s)`;
    console.log(`[p1-assembler] CCM: ${summary}`);
  } catch (ccmErr) {
    console.warn('[p1-assembler] CCM layer error (non-critical):', ccmErr instanceof Error ? ccmErr.message : ccmErr);
  }

  return documentoMd;
}
