import { describe, it, expect } from 'vitest';
import { EC0249RulesEngine } from '../../cce/helpers/ec0249-rules.engine';
import type { CertificationArtifact, CertificationContext, F3Artifact } from '../../dcfl/types/certification.types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeF3 = (): F3Artifact => ({
  plataforma: 'Web',
  modalidad: 'presencial',
  criteriosAceptacion: [],
  reporteo: [],
  idioma: 'es',
});

const makeCtx = (): CertificationContext => ({
  f3Artifact: makeF3(),
  p4Artifact: undefined,
  requiredLang: null,
  estandarNorma: 'EC0249',
  roundingThreshold: 3,
});

/** EC0249 consulting artifact (loosely typed — no productCode from the union) */
const makeArtifact = (overrides: Record<string, any> = {}): CertificationArtifact =>
  ({
    instrumentos: ['Entrevista Director', 'Entrevista Área', 'Entrevista Colaboradores'],
    productos: ['PAC', 'Manual', 'DC5', 'Informe Diagnóstico', 'Plan de Acción', 'Informe Final', 'Presentación Ejecutiva'],
    criterios: [{ verbo: 'aplicar', descripcion: 'Aplica técnicas de consultoría' }],
    brechas: [{ descripcion: 'Brecha en habilidades de liderazgo', clasificacion: 'cognitiva' }],
    reporte: { secciones: ['diagnóstico', 'recomendaciones', 'plan de acción'] },
    ...overrides,
  } as any);

const engine = new EC0249RulesEngine();

// ── Diagnostic Coverage ───────────────────────────────────────────────────────

describe('EC0249RulesEngine — diagnostic coverage', () => {
  it('no violation when 3+ instruments present', () => {
    const art = makeArtifact({ instrumentos: ['Entrevista Director', 'Cuestionario', 'Observación'] });
    const { violaciones } = engine.runCertificationCheck(art, makeCtx());
    expect(violaciones.some(v => v.code === 'DIAGNOSTIC_COVERAGE_INSUFFICIENT')).toBe(false);
  });

  it('DIAGNOSTIC_COVERAGE_INSUFFICIENT when fewer than 3 instruments', () => {
    const art = makeArtifact({ instrumentos: ['Cuestionario'] });
    const { violaciones } = engine.runCertificationCheck(art, makeCtx());
    expect(violaciones.some(v => v.code === 'DIAGNOSTIC_COVERAGE_INSUFFICIENT')).toBe(true);
    expect(violaciones.find(v => v.code === 'DIAGNOSTIC_COVERAGE_INSUFFICIENT')?.severity).toBe('error');
  });

  it('DIAGNOSTIC_COVERAGE_INSUFFICIENT when instrumentos is empty', () => {
    const art = makeArtifact({ instrumentos: [] });
    const { violaciones } = engine.runCertificationCheck(art, makeCtx());
    expect(violaciones.some(v => v.code === 'DIAGNOSTIC_COVERAGE_INSUFFICIENT')).toBe(true);
  });
});

// ── Product Completeness ──────────────────────────────────────────────────────

describe('EC0249RulesEngine — product completeness', () => {
  it('no violation when PAC, Manual and DC5 all present', () => {
    const art = makeArtifact({ productos: ['PAC', 'Manual', 'DC5'] });
    const { violaciones } = engine.runCertificationCheck(art, makeCtx());
    expect(violaciones.some(v => v.code === 'PRODUCT_COMPLETENESS_MISSING')).toBe(false);
  });

  it('PRODUCT_COMPLETENESS_MISSING when DC5 absent', () => {
    const art = makeArtifact({ productos: ['PAC', 'Manual'] });
    const { violaciones } = engine.runCertificationCheck(art, makeCtx());
    const v = violaciones.find(v => v.code === 'PRODUCT_COMPLETENESS_MISSING');
    expect(v).toBeDefined();
    expect(v?.message).toContain('DC5');
    expect(v?.severity).toBe('error');
  });

  it('PRODUCT_COMPLETENESS_MISSING when productos is empty', () => {
    const art = makeArtifact({ productos: [] });
    const { violaciones } = engine.runCertificationCheck(art, makeCtx());
    expect(violaciones.some(v => v.code === 'PRODUCT_COMPLETENESS_MISSING')).toBe(true);
  });
});

// ── Andragogy Verbs ───────────────────────────────────────────────────────────

describe('EC0249RulesEngine — andragogy verbs', () => {
  it('no violation when all criteria use andragogy verbs', () => {
    const art = makeArtifact({
      criterios: [
        { verbo: 'aplicar', descripcion: 'A' },
        { verbo: 'evaluar', descripcion: 'B' },
      ],
    });
    const { violaciones } = engine.runCertificationCheck(art, makeCtx());
    expect(violaciones.some(v => v.code === 'ANDRAGOGY_VERBS_MISSING')).toBe(false);
  });

  it('ANDRAGOGY_VERBS_MISSING (warning) when verbs are non-andragogy', () => {
    const art = makeArtifact({
      criterios: [
        { verbo: 'conocer', descripcion: 'Conocer el proceso' },
        { verbo: 'entender', descripcion: 'Entender la metodología' },
      ],
    });
    const { violaciones } = engine.runCertificationCheck(art, makeCtx());
    const v = violaciones.find(v => v.code === 'ANDRAGOGY_VERBS_MISSING');
    expect(v).toBeDefined();
    expect(v?.severity).toBe('warning');
  });

  it('no violation when criterios is empty', () => {
    const art = makeArtifact({ criterios: [] });
    const { violaciones } = engine.runCertificationCheck(art, makeCtx());
    expect(violaciones.some(v => v.code === 'ANDRAGOGY_VERBS_MISSING')).toBe(false);
  });
});

// ── Gap Analysis ──────────────────────────────────────────────────────────────

describe('EC0249RulesEngine — gap analysis', () => {
  it('no violation when brechas has valid classification', () => {
    const art = makeArtifact({
      brechas: [{ descripcion: 'Brecha X', clasificacion: 'motora' }],
    });
    const { violaciones } = engine.runCertificationCheck(art, makeCtx());
    expect(violaciones.some(v => v.code.startsWith('GAP'))).toBe(false);
  });

  it('GAP_ANALYSIS_MISSING when brechas is empty', () => {
    const art = makeArtifact({ brechas: [] });
    const { violaciones } = engine.runCertificationCheck(art, makeCtx());
    expect(violaciones.some(v => v.code === 'GAP_ANALYSIS_MISSING')).toBe(true);
  });

  it('GAP_CLASSIFICATION_MISSING when brechas present but no valid classification', () => {
    const art = makeArtifact({
      brechas: [{ descripcion: 'Brecha de proceso', clasificacion: 'organizacional' }],
    });
    const { violaciones } = engine.runCertificationCheck(art, makeCtx());
    expect(violaciones.some(v => v.code === 'GAP_CLASSIFICATION_MISSING')).toBe(true);
  });
});

// ── Report Structure ──────────────────────────────────────────────────────────

describe('EC0249RulesEngine — report structure', () => {
  it('no violation when all 3 required sections present', () => {
    const art = makeArtifact({
      reporte: { secciones: ['diagnóstico', 'recomendaciones', 'plan de acción'] },
    });
    const { violaciones } = engine.runCertificationCheck(art, makeCtx());
    expect(violaciones.some(v => v.code === 'REPORT_STRUCTURE_INCOMPLETE')).toBe(false);
  });

  it('REPORT_STRUCTURE_INCOMPLETE when sections missing', () => {
    const art = makeArtifact({
      reporte: { secciones: ['diagnóstico'] },
    });
    const { violaciones } = engine.runCertificationCheck(art, makeCtx());
    const v = violaciones.find(v => v.code === 'REPORT_STRUCTURE_INCOMPLETE');
    expect(v).toBeDefined();
    expect(v?.message).toContain('recomendaciones');
    expect(v?.severity).toBe('error');
  });

  it('REPORT_STRUCTURE_INCOMPLETE when reporte is absent', () => {
    const art = makeArtifact({ reporte: undefined });
    const { violaciones } = engine.runCertificationCheck(art, makeCtx());
    expect(violaciones.some(v => v.code === 'REPORT_STRUCTURE_INCOMPLETE')).toBe(true);
  });
});

// ── correct() ────────────────────────────────────────────────────────────────

describe('EC0249RulesEngine — correct()', () => {
  it('returns the same artifact reference unchanged', () => {
    const art = makeArtifact();
    const result = engine.correct(art, makeCtx());
    expect(result).toBe(art);
  });
});

// ── getExpectedForViolation() ─────────────────────────────────────────────────

describe('EC0249RulesEngine — getExpectedForViolation()', () => {
  it('returns all 6 diagnostic instruments for DIAGNOSTIC_COVERAGE_INSUFFICIENT', () => {
    const expected = engine.getExpectedForViolation({
      code: 'DIAGNOSTIC_COVERAGE_INSUFFICIENT',
      message: '',
      field: 'instrumentos',
      severity: 'error',
    });
    expect(expected).toHaveLength(6);
    expect(expected).toContain('Entrevista Director');
  });

  it('returns empty array for unknown code', () => {
    const expected = engine.getExpectedForViolation({
      code: 'UNKNOWN_CODE',
      message: '',
      field: '',
      severity: 'info',
    });
    expect(expected).toHaveLength(0);
  });
});
