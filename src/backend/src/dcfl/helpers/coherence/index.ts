/**
 * coherence/index.ts — PT-158
 * Unified canonical coherence enforcement for all F4 product documents.
 *
 * Aggregates post-assembly pure-TS invariants into a single call:
 *   sanitizeProductDocument → enforceModalidad → validateSemanticAnchor → deduplicarGlosario
 *
 * All functions remain exported from their original files for backwards
 * compatibility with existing tests and direct callers. This module provides
 * the aggregate entrypoint for assemblers (replacing dispersed individual calls).
 *
 * Usage in assemblers (before saveF4Produto):
 *   const { doc, warnings } = enforceCanonicalCoherence(documentoFinal, 'P5', {
 *     canonicalModalidad,
 *     dominioTecnico: brief?.dominioTecnico,
 *     glossaryDedup: productCode === 'P7',
 *     blockOnAnchorDenylist: productCode === 'P1' || productCode === 'P5',
 *   });
 */

import { sanitizeProductDocument, enforceModalidad, deduplicarGlosario } from '../doc-sanitizer.helper';
import { validateSemanticAnchor } from '../assembler-utils.helper';

export interface CoherenceOptions {
  /** Canonical modality from F3 (e.g. 'virtual'). Pass null to skip modality enforcement. */
  canonicalModalidad?: string | null;
  /** Domain string from project_brief.dominioTecnico — used for semantic anchor check. */
  dominioTecnico?: string;
  /** Set true for P7 (glossary product) to deduplicate repeated glossary rows. */
  glossaryDedup?: boolean;
  /** Set true for P1/P5 to treat denylist hallucinations as a hard error. */
  blockOnAnchorDenylist?: boolean;
}

export interface CoherenceResult {
  doc: string;
  warnings: string[];
  anchorValid: boolean;
  anchorCobertura: number;
  anchorDenylistHit?: string;
}

/**
 * Apply all canonical coherence invariants to a product document in a single call.
 * Returns the transformed document and an audit trail of warnings.
 * Throws only if `blockOnAnchorDenylist` is true AND a hallucination denylist pattern matches.
 */
export function enforceCanonicalCoherence(
  doc: string,
  productCode: string,
  options: CoherenceOptions = {},
): CoherenceResult {
  const warnings: string[] = [];
  let result = doc;

  // 1. Placeholder scan + ISO date fix (always applied)
  const { doc: sanitized, warnings: sanitizerWarnings } = sanitizeProductDocument(result, productCode);
  result = sanitized;
  warnings.push(...sanitizerWarnings);

  // 2. Modality enforcement (only when canonical modality is provided)
  if (options.canonicalModalidad) {
    const { doc: modalityDoc, changed } = enforceModalidad(result, options.canonicalModalidad);
    result = modalityDoc;
    if (changed) warnings.push(`[${productCode}] Modalidad corregida a "${options.canonicalModalidad}"`);
  }

  // 3. Semantic anchor check
  let anchorValid = true;
  let anchorCobertura = 1;
  let anchorDenylistHit: string | undefined;

  if (options.dominioTecnico) {
    const anchor = validateSemanticAnchor(
      result,
      options.dominioTecnico,
      { blockOnDenylistHit: options.blockOnAnchorDenylist },
    );
    anchorValid = anchor.valido;
    anchorCobertura = anchor.cobertura;
    anchorDenylistHit = anchor.denylistHit;

    if (anchor.denylistHit && options.blockOnAnchorDenylist) {
      throw new Error(
        `[${productCode}] Contenido fuera de dominio detectado: "${anchor.denylistHit}". ` +
        `El documento contiene patrones de alucinación incompatibles con el dominio técnico.`
      );
    }
    if (!anchor.valido) {
      warnings.push(
        `[${productCode}] Ancla semántica: cobertura=${anchor.cobertura}` +
        (anchor.denylistHit ? `, denylist="${anchor.denylistHit}"` : '') +
        (anchor.ausentes.length ? `, ausentes=[${anchor.ausentes.slice(0, 5).join(', ')}]` : '')
      );
    }
  }

  // 4. Glossary deduplication (only for P7)
  if (options.glossaryDedup) {
    result = deduplicarGlosario(result);
  }

  return { doc: result, warnings, anchorValid, anchorCobertura, anchorDenylistHit };
}

// Re-export individual utilities for callers that need fine-grained control
export {
  sanitizeProductDocument,
  enforceModalidad,
  deduplicarGlosario,
} from '../doc-sanitizer.helper';

export {
  validateSemanticAnchor,
  validateBloomInstrumentAlignment,
  validateUnitCoverage,
  validateMaterialsByModule,
  pickWinnerOutput,
  extractAny,
} from '../assembler-utils.helper';
