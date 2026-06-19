/**
 * EC0366RulesEngine — PT-071
 * Concrete implementation of ICertificationRulesEngine for CONOCER/SEP EC0366.
 * Validates: weights, coverage, bloom-instrument alignment, modality, language, observable verbs.
 */

import type { ICertificationRulesEngine } from './certification-rules.engine';
import type {
  CertificationArtifact,
  CertificationContext,
  CertResult,
  CorrectionLog,
  P1Artifact,
  UnidadEvaluacion,
  Violacion,
  FrozenProductionSpec,
} from '../types/certification.types';

// ── Bloom → valid instruments map (EC0366 taxonomy) ──────────────────────────

const BLOOM_INSTRUMENT_MAP: Record<string, string[]> = {
  recordar:    ['Examen Escrito', 'Lista de Cotejo'],
  comprender:  ['Examen Escrito', 'Lista de Cotejo', 'Estudio de Caso'],
  aplicar:     ['Lista de Cotejo', 'Guía de Observación', 'Portafolio de Evidencias', 'Proyecto'],
  analizar:    ['Guía de Observación', 'Estudio de Caso', 'Rúbrica', 'Proyecto'],
  evaluar:     ['Rúbrica', 'Estudio de Caso', 'Portafolio de Evidencias', 'Ensayo'],
  crear:       ['Proyecto', 'Portafolio de Evidencias', 'Ensayo', 'Rúbrica'],
};

// Vocabulary that must not appear in criteria, rubrics, or observable verbs
const PROHIBITED_VERBS = [
  'adecuado', 'correcto', 'bien', 'efectivo', 'entendimiento',
  'comprensión', 'apropiado', 'suficiente', 'necesario', 'importante',
];

export class EC0366RulesEngine implements ICertificationRulesEngine {

  runCertificationCheck(artifact: CertificationArtifact, ctx: CertificationContext): CertResult {
    const violaciones: Violacion[] = [];

    if (artifact.productCode === 'P1') {
      violaciones.push(...this._validateWeights(artifact, ctx));
      violaciones.push(...this._validateCoverage(artifact, ctx));
      violaciones.push(...this._validateBloom(artifact));
    }

    violaciones.push(...this._validateDuration(artifact, ctx.frozenSpec));
    violaciones.push(...this._validateModality(artifact, ctx));
    violaciones.push(...this._validateLanguage(artifact, ctx));

    if ('criterios' in artifact && Array.isArray((artifact as any).criterios)) {
      violaciones.push(...this._validateObservable(artifact as any));
    }

    // Auto-correction applies only to math rounding errors in P1
    const correctable = artifact.productCode === 'P1'
      && violaciones.some(v => v.code === 'WEIGHT_ROUNDING' && v.severity === 'error')
      && !violaciones.some(v => v.code === 'WEIGHT_PEDAGOGICAL_IMBALANCE');

    return {
      violaciones,
      artifactCorregido: correctable ? this.correct(artifact, ctx) : null,
    };
  }

  correct(artifact: CertificationArtifact, ctx: CertificationContext): CertificationArtifact {
    if (artifact.productCode !== 'P1') return artifact;
    const p1 = artifact as P1Artifact;
    const sum = p1.unidades.reduce((acc, u) => acc + u.ponderacion, 0);
    const delta = 100 - sum;
    if (delta === 0) return artifact;

    const correctedUnidades = this._applyWeightTieBreak([...p1.unidades], delta);
    return { ...p1, unidades: correctedUnidades };
  }

  // ── Private validators ────────────────────────────────────────────────────

  private _validateWeights(p1: P1Artifact, ctx: CertificationContext): Violacion[] {
    const sum = p1.unidades.reduce((acc, u) => acc + u.ponderacion, 0);
    const delta = Math.abs(100 - sum);
    if (delta === 0) return [];

    const isPedagogical = delta > ctx.roundingThreshold;
    return [{
      code: isPedagogical ? 'WEIGHT_PEDAGOGICAL_IMBALANCE' : 'WEIGHT_ROUNDING',
      message: isPedagogical
        ? `Las ponderaciones suman ${sum}% (delta=${delta}%). Revisión pedagógica requerida; no es auto-corregible.`
        : `Las ponderaciones suman ${sum}% (delta=${delta}%). Se aplicará corrección de redondeo.`,
      field: 'unidades[*].ponderacion',
      severity: 'error',
    }];
  }

  private _validateCoverage(p1: P1Artifact, ctx: CertificationContext): Violacion[] {
    const p1Units = p1.unidades.length;

    // PT-152: frozenSpec.total_unidades is the authoritative unit count (from temario_base).
    // Fall back to P4 chapter count when frozenSpec is absent.
    const expectedUnits = ctx.frozenSpec?.total_unidades ?? ctx.p4Artifact?.capitulos.length;
    if (expectedUnits == null) return [];

    if (p1Units === expectedUnits) return [];
    const source = ctx.frozenSpec?.total_unidades != null ? 'temario_base' : 'P4';
    return [{
      code: 'COVERAGE_INCOMPLETE',
      message: `P1 cubre ${p1Units} unidades pero ${source} tiene ${expectedUnits}. Deben coincidir.`,
      field: 'unidades',
      severity: 'error',
    }];
  }

  /**
   * PT-152: Validates that the module referenced in a multi-module artifact exists
   * in the frozen production spec (temario_base). Prevents "phantom module" outputs
   * where the LLM generates content for a module that was never declared.
   */
  private _validateDuration(artifact: CertificationArtifact, spec?: FrozenProductionSpec): Violacion[] {
    if (!spec?.tiempos_por_modulo?.length) return [];
    const art = artifact as any;
    if (typeof art.modulo !== 'string' || !art.modulo.trim()) return [];

    const moduloNorm = art.modulo.toLowerCase().trim();
    const found = spec.tiempos_por_modulo.some(
      t => t.modulo.toLowerCase().trim() === moduloNorm,
    );
    if (found) return [];
    return [{
      code: 'DURATION_MODULE_NOT_IN_SPEC',
      message: `El módulo "${art.modulo}" no existe en el temario_base congelado. Módulos válidos: ${spec.tiempos_por_modulo.map(t => t.modulo).join(', ')}.`,
      field: 'modulo',
      severity: 'error',
    }];
  }

  private _validateBloom(p1: P1Artifact): Violacion[] {
    const violations: Violacion[] = [];
    p1.unidades.forEach((u, i) => {
      const validInstruments = BLOOM_INSTRUMENT_MAP[u.nivel_bloom];
      if (!validInstruments) return;
      if (!validInstruments.includes(u.instrumento)) {
        violations.push({
          code: 'BLOOM_INSTRUMENT_MISMATCH',
          message: `Unidad "${u.nombre}": instrumento "${u.instrumento}" no es válido para nivel Bloom "${u.nivel_bloom}". Válidos: ${validInstruments.join(', ')}.`,
          field: `unidades[${i}].instrumento`,
          severity: 'error',
        });
      }
    });
    return violations;
  }

  private _validateModality(artifact: CertificationArtifact, ctx: CertificationContext): Violacion[] {
    if (!('modalidad' in artifact)) return [];
    const artModality = (artifact as any).modalidad as string;
    if (!artModality || !ctx.f3Artifact?.modalidad) return [];
    if (artModality === ctx.f3Artifact.modalidad) return [];
    return [{
      code: 'MODALITY_INCONSISTENCY',
      message: `El artifact tiene modalidad "${artModality}" pero F3 especifica "${ctx.f3Artifact.modalidad}".`,
      field: 'modalidad',
      severity: 'error',
    }];
  }

  private _validateLanguage(artifact: CertificationArtifact, ctx: CertificationContext): Violacion[] {
    if (!ctx.requiredLang) return [];

    const violations: Violacion[] = [];

    // Hard check: artifact.idioma field must match required language
    if ('idioma' in artifact) {
      const artLang = (artifact as any).idioma as string;
      if (artLang && artLang !== ctx.requiredLang) {
        violations.push({
          code: 'LANGUAGE_FIELD_MISMATCH',
          message: `artifact.idioma es "${artLang}" pero el proyecto requiere "${ctx.requiredLang}".`,
          field: 'idioma',
          severity: 'error',
        });
      }
    }

    return violations;
  }

  private _validateObservable(artifact: { criterios: Array<{ verbo: string; descripcion: string }> }): Violacion[] {
    const violations: Violacion[] = [];
    artifact.criterios.forEach((c, i) => {
      const verboLower = c.verbo.toLowerCase();
      const prohibited = PROHIBITED_VERBS.find(p => verboLower.includes(p));
      if (prohibited) {
        violations.push({
          code: 'PROHIBITED_VERB',
          message: `Criterio ${i + 1}: el verbo "${c.verbo}" contiene término prohibido "${prohibited}". Usa verbos de acción medible.`,
          field: `criterios[${i}].verbo`,
          severity: 'warning',
        });
      }
    });
    return violations;
  }

  // ── Weight tie-break policy ───────────────────────────────────────────────

  private _applyWeightTieBreak(unidades: UnidadEvaluacion[], delta: number): UnidadEvaluacion[] {
    const absDelta = Math.abs(delta);
    const result = unidades.map(u => ({ ...u }));

    if (delta > 0) {
      // Add 1% to the N units with lowest ponderacion (stable order)
      const sorted = [...result].sort((a, b) => a.ponderacion - b.ponderacion || unidades.indexOf(a) - unidades.indexOf(b));
      for (let i = 0; i < absDelta && i < sorted.length; i++) {
        sorted[i]!.ponderacion += 1;
      }
    } else {
      // Subtract 1% from the N units with highest ponderacion (stable order)
      const sorted = [...result].sort((a, b) => b.ponderacion - a.ponderacion || unidades.indexOf(a) - unidades.indexOf(b));
      for (let i = 0; i < absDelta && i < sorted.length; i++) {
        sorted[i]!.ponderacion -= 1;
      }
    }
    return result;
  }

  /** PT-105: Returns the expected valid values for a given violation (for correction hints). */
  getExpectedForViolation(violacion: Violacion): string[] {
    if (violacion.code === 'BLOOM_INSTRUMENT_MISMATCH') {
      // Parse "nivel_bloom" from field path: unidades[N].instrumento → look up BLOOM_INSTRUMENT_MAP
      // Alternatively, extract from the violation message: "Válidos: X, Y, Z."
      const validosMatch = violacion.message.match(/Válidos:\s*(.+)\./);
      if (validosMatch?.[1]) return validosMatch[1].split(', ').map(s => s.trim());
    }
    if (violacion.code === 'WEIGHT_ROUNDING' || violacion.code === 'WEIGHT_PEDAGOGICAL_IMBALANCE') {
      return ['100%'];
    }
    if (violacion.code === 'COVERAGE_INCOMPLETE') {
      return [];
    }
    return [];
  }

  buildCorrectionLog(original: P1Artifact, corrected: P1Artifact, delta: number): CorrectionLog {
    const units_affected = original.unidades
      .map((u, i) => ({ id: u.id, old: u.ponderacion, new: corrected.unidades[i]!.ponderacion }))
      .filter(e => e.old !== e.new);

    return {
      type: 'WEIGHT_ROUNDING',
      delta,
      policy: delta > 0
        ? 'Added 1% to units with lowest ponderacion (stable order)'
        : 'Subtracted 1% from units with highest ponderacion (stable order)',
      units_affected,
    };
  }
}
