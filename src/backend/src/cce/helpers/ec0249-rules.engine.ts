/**
 * EC0249RulesEngine — PT-130
 * Concrete implementation of ICertificationRulesEngine for EC0249 (Consultoría Empresarial).
 * Validates: diagnostic instruments, product completeness, andragogy verbs, gap analysis,
 * and report structure. No auto-correction: consulting artifacts require human review.
 */

import type { ICertificationRulesEngine } from '../../dcfl/helpers/certification-rules.engine';
import type {
  CertificationArtifact,
  CertificationContext,
  CertResult,
  FrozenProductionSpec,
  Violacion,
} from '../../dcfl/types/certification.types';

const EC0249_DIAGNOSTIC_INSTRUMENTS = [
  'Entrevista Director',
  'Entrevista Área',
  'Entrevista Colaboradores',
  'Cuestionario',
  'Observación',
  'Checklist',
] as const;

const EC0249_REQUIRED_PRODUCTS = ['PAC', 'Manual', 'DC5'] as const;

const ANDRAGOGY_VERBS = ['aplicar', 'resolver', 'analizar', 'evaluar', 'diseñar'] as const;

const REPORT_SECTIONS = ['diagnóstico', 'recomendaciones', 'plan de acción'] as const;

const GAP_CLASSIFICATIONS = ['cognitiva', 'motora', 'afectiva'] as const;

export class EC0249RulesEngine implements ICertificationRulesEngine {

  runCertificationCheck(artifact: CertificationArtifact, ctx: CertificationContext): CertResult {
    const art = artifact as any;
    const violaciones: Violacion[] = [];

    violaciones.push(...this._validateDiagnosticCoverage(art));
    violaciones.push(...this._validateProductCompleteness(art));
    violaciones.push(...this._validateAndragogy(art));
    violaciones.push(...this._validateGapAnalysis(art));
    violaciones.push(...this._validateReportStructure(art));
    violaciones.push(...this._validateDuration(artifact, ctx.frozenSpec));

    return { violaciones, artifactCorregido: null };
  }

  // EC0249 has no auto-correctable math violations; consulting artifacts require human review.
  correct(artifact: CertificationArtifact, _ctx: CertificationContext): CertificationArtifact {
    return artifact;
  }

  getExpectedForViolation(violacion: Violacion): string[] {
    switch (violacion.code) {
      case 'DIAGNOSTIC_COVERAGE_INSUFFICIENT':
        return [...EC0249_DIAGNOSTIC_INSTRUMENTS];
      case 'PRODUCT_COMPLETENESS_MISSING':
        return [...EC0249_REQUIRED_PRODUCTS];
      case 'ANDRAGOGY_VERBS_MISSING':
        return [...ANDRAGOGY_VERBS];
      case 'GAP_ANALYSIS_MISSING':
      case 'GAP_CLASSIFICATION_MISSING':
        return [...GAP_CLASSIFICATIONS];
      case 'REPORT_STRUCTURE_INCOMPLETE':
        return [...REPORT_SECTIONS];
      default:
        return [];
    }
  }

  // ── Private validators ────────────────────────────────────────────────────

  private _validateDiagnosticCoverage(artifact: any): Violacion[] {
    const instrumentos: string[] = Array.isArray(artifact.instrumentos) ? artifact.instrumentos : [];
    const matched = EC0249_DIAGNOSTIC_INSTRUMENTS.filter(i => instrumentos.includes(i));
    if (matched.length >= 3) return [];
    return [{
      code: 'DIAGNOSTIC_COVERAGE_INSUFFICIENT',
      message: `Solo ${matched.length} de 6 instrumentos de diagnóstico detectados (mínimo 3). Presentes: ${matched.join(', ') || 'ninguno'}.`,
      field: 'instrumentos',
      severity: 'error',
    }];
  }

  private _validateProductCompleteness(artifact: any): Violacion[] {
    const productos: string[] = Array.isArray(artifact.productos) ? artifact.productos : [];
    const missing = EC0249_REQUIRED_PRODUCTS.filter(p => !productos.includes(p));
    if (missing.length === 0) return [];
    return [{
      code: 'PRODUCT_COMPLETENESS_MISSING',
      message: `Productos EC0249 obligatorios faltantes: ${missing.join(', ')}.`,
      field: 'productos',
      severity: 'error',
    }];
  }

  private _validateAndragogy(artifact: any): Violacion[] {
    const criterios: any[] = Array.isArray(artifact.criterios) ? artifact.criterios : [];
    if (criterios.length === 0) return [];
    const withoutAndragogy = criterios.filter(c => {
      const verbo = (c.verbo ?? '').toLowerCase();
      return !ANDRAGOGY_VERBS.some(v => verbo.includes(v));
    });
    if (withoutAndragogy.length === 0) return [];
    return [{
      code: 'ANDRAGOGY_VERBS_MISSING',
      message: `${withoutAndragogy.length} criterio(s) no usan verbos de aprendizaje adulto (${ANDRAGOGY_VERBS.join(', ')}).`,
      field: 'criterios[*].verbo',
      severity: 'warning',
    }];
  }

  private _validateGapAnalysis(artifact: any): Violacion[] {
    const brechas: any[] = Array.isArray(artifact.brechas) ? artifact.brechas : [];
    if (brechas.length === 0) {
      return [{
        code: 'GAP_ANALYSIS_MISSING',
        message: 'El análisis de brechas (brechas[]) está vacío. EC0249 requiere al menos una brecha identificada.',
        field: 'brechas',
        severity: 'error',
      }];
    }
    const hasClassification = brechas.some(b => {
      const cls = (b.clasificacion ?? '').toLowerCase();
      return GAP_CLASSIFICATIONS.some(g => cls.includes(g));
    });
    if (!hasClassification) {
      return [{
        code: 'GAP_CLASSIFICATION_MISSING',
        message: 'Ninguna brecha tiene clasificación válida (cognitiva / motora / afectiva).',
        field: 'brechas[*].clasificacion',
        severity: 'error',
      }];
    }
    return [];
  }

  /**
   * PT-152 mirror: EC0249 consulting artifacts don't have a module-per-module structure,
   * so this validator is a no-op stub that preserves interface symmetry with EC0366.
   */
  private _validateDuration(_artifact: CertificationArtifact, _spec?: FrozenProductionSpec): Violacion[] {
    return [];
  }

  private _validateReportStructure(artifact: any): Violacion[] {
    const secciones: string[] = Array.isArray(artifact.reporte?.secciones)
      ? artifact.reporte.secciones.map((s: string) => (s ?? '').toLowerCase())
      : [];
    const missing = REPORT_SECTIONS.filter(r => !secciones.some(s => s.includes(r)));
    if (missing.length === 0) return [];
    return [{
      code: 'REPORT_STRUCTURE_INCOMPLETE',
      message: `Secciones del reporte faltantes: ${missing.join(', ')}.`,
      field: 'reporte.secciones',
      severity: 'error',
    }];
  }
}
