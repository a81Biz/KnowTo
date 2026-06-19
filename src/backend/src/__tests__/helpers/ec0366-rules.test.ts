import { describe, it, expect } from 'vitest';
import { EC0366RulesEngine } from '../../dcfl/helpers/ec0366-rules.engine';
import type {
  P1Artifact, P4Artifact, F3Artifact, CertificationContext, UnidadEvaluacion,
} from '../../dcfl/types/certification.types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeUnidad = (override: Partial<UnidadEvaluacion> = {}): UnidadEvaluacion => ({
  id: 'u1',
  nombre: 'Unidad 1',
  nivel_bloom: 'aplicar',
  instrumento: 'Lista de Cotejo',
  ponderacion: 50,
  reactivos: [],
  ...override,
});

const makeP1 = (unidades: UnidadEvaluacion[]): P1Artifact => ({
  productCode: 'P1',
  modalidad: 'presencial',
  idioma: 'es',
  unidades,
  criterios: [],
});

const makeF3 = (modalidad: 'presencial' | 'virtual' | 'mixto' = 'presencial'): F3Artifact => ({
  plataforma: 'Web',
  modalidad,
  criteriosAceptacion: [],
  reporteo: [],
  idioma: 'es',
});

const makeP4 = (numCapitulos: number): P4Artifact => ({
  productCode: 'P4',
  modalidad: 'presencial',
  idioma: 'es',
  titulo: 'Manual',
  capitulos: Array.from({ length: numCapitulos }, (_, i) => ({
    numero: i + 1,
    titulo: `Capítulo ${i + 1}`,
    secciones_json: [],
  })),
  referencias: [],
  glosario: [],
});

const makeCtx = (
  override: Partial<CertificationContext> = {},
): CertificationContext => ({
  f3Artifact: makeF3(),
  p4Artifact: undefined,
  requiredLang: null,
  estandarNorma: 'EC0366',
  roundingThreshold: 3,
  ...override,
});

const engine = new EC0366RulesEngine();

// ── Weight validation ─────────────────────────────────────────────────────────

describe('EC0366RulesEngine — weight validation', () => {
  it('no violations when weights sum to 100', () => {
    const p1 = makeP1([makeUnidad({ ponderacion: 60 }), makeUnidad({ id: 'u2', ponderacion: 40 })]);
    const { violaciones } = engine.runCertificationCheck(p1, makeCtx());
    expect(violaciones.filter(v => v.code.startsWith('WEIGHT'))).toHaveLength(0);
  });

  it('WEIGHT_ROUNDING when delta ≤ threshold (delta=2)', () => {
    const p1 = makeP1([makeUnidad({ ponderacion: 51 }), makeUnidad({ id: 'u2', ponderacion: 47 })]);
    const { violaciones } = engine.runCertificationCheck(p1, makeCtx());
    expect(violaciones.some(v => v.code === 'WEIGHT_ROUNDING')).toBe(true);
  });

  it('WEIGHT_PEDAGOGICAL_IMBALANCE when delta > threshold (delta=10)', () => {
    const p1 = makeP1([makeUnidad({ ponderacion: 60 }), makeUnidad({ id: 'u2', ponderacion: 30 })]);
    const { violaciones } = engine.runCertificationCheck(p1, makeCtx());
    expect(violaciones.some(v => v.code === 'WEIGHT_PEDAGOGICAL_IMBALANCE')).toBe(true);
  });

  it('WEIGHT_ROUNDING is auto-correctable; artifactCorregido must not be null', () => {
    const p1 = makeP1([makeUnidad({ ponderacion: 51 }), makeUnidad({ id: 'u2', ponderacion: 47 })]);
    const { artifactCorregido } = engine.runCertificationCheck(p1, makeCtx());
    expect(artifactCorregido).not.toBeNull();
  });

  it('WEIGHT_PEDAGOGICAL_IMBALANCE is NOT auto-correctable; artifactCorregido must be null', () => {
    const p1 = makeP1([makeUnidad({ ponderacion: 60 }), makeUnidad({ id: 'u2', ponderacion: 30 })]);
    const { artifactCorregido } = engine.runCertificationCheck(p1, makeCtx());
    expect(artifactCorregido).toBeNull();
  });

  it('auto-corrected artifact weights sum to exactly 100', () => {
    const p1 = makeP1([makeUnidad({ ponderacion: 51 }), makeUnidad({ id: 'u2', ponderacion: 47 })]);
    const { artifactCorregido } = engine.runCertificationCheck(p1, makeCtx());
    const correctedP1 = artifactCorregido as P1Artifact;
    const sum = correctedP1.unidades.reduce((s, u) => s + u.ponderacion, 0);
    expect(sum).toBe(100);
  });
});

// ── Coverage validation ───────────────────────────────────────────────────────

describe('EC0366RulesEngine — P4 coverage', () => {
  it('COVERAGE_INCOMPLETE when P1 units !== P4 chapters', () => {
    const p1 = makeP1([makeUnidad()]);
    const ctx = makeCtx({ p4Artifact: makeP4(3) });
    const { violaciones } = engine.runCertificationCheck(p1, ctx);
    expect(violaciones.some(v => v.code === 'COVERAGE_INCOMPLETE')).toBe(true);
  });

  it('no coverage violation when P1 units === P4 chapters', () => {
    const p1 = makeP1([makeUnidad(), makeUnidad({ id: 'u2' }), makeUnidad({ id: 'u3' })]);
    const p1Balanced = makeP1(p1.unidades.map((u, i) => ({ ...u, ponderacion: i === 0 ? 34 : 33 })));
    const ctx = makeCtx({ p4Artifact: makeP4(3) });
    const { violaciones } = engine.runCertificationCheck(p1Balanced, ctx);
    expect(violaciones.some(v => v.code === 'COVERAGE_INCOMPLETE')).toBe(false);
  });

  it('coverage check skipped when p4Artifact is undefined', () => {
    const p1 = makeP1([makeUnidad()]);
    const ctx = makeCtx({ p4Artifact: undefined });
    const { violaciones } = engine.runCertificationCheck(p1, ctx);
    expect(violaciones.some(v => v.code === 'COVERAGE_INCOMPLETE')).toBe(false);
  });
});

// ── Bloom-instrument validation ───────────────────────────────────────────────

describe('EC0366RulesEngine — Bloom-instrument alignment', () => {
  it('no violation when instrument is valid for Bloom level', () => {
    const p1 = makeP1([makeUnidad({ nivel_bloom: 'aplicar', instrumento: 'Lista de Cotejo' })]);
    const { violaciones } = engine.runCertificationCheck(p1, makeCtx());
    expect(violaciones.some(v => v.code === 'BLOOM_INSTRUMENT_MISMATCH')).toBe(false);
  });

  it('BLOOM_INSTRUMENT_MISMATCH when instrument is invalid for Bloom level', () => {
    const p1 = makeP1([makeUnidad({ nivel_bloom: 'recordar', instrumento: 'Rúbrica' })]);
    const { violaciones } = engine.runCertificationCheck(p1, makeCtx());
    expect(violaciones.some(v => v.code === 'BLOOM_INSTRUMENT_MISMATCH')).toBe(true);
  });

  it('Bloom mismatch message names the valid instruments', () => {
    const p1 = makeP1([makeUnidad({ nivel_bloom: 'recordar', instrumento: 'Rúbrica' })]);
    const { violaciones } = engine.runCertificationCheck(p1, makeCtx());
    const v = violaciones.find(v => v.code === 'BLOOM_INSTRUMENT_MISMATCH');
    expect(v?.message).toContain('Examen Escrito');
  });
});

// ── Modality validation ───────────────────────────────────────────────────────

describe('EC0366RulesEngine — modality consistency', () => {
  it('no violation when artifact modalidad matches F3', () => {
    const p1 = makeP1([makeUnidad()]);
    const ctx = makeCtx({ f3Artifact: makeF3('presencial') });
    const { violaciones } = engine.runCertificationCheck(p1, ctx);
    expect(violaciones.some(v => v.code === 'MODALITY_INCONSISTENCY')).toBe(false);
  });

  it('MODALITY_INCONSISTENCY when artifact modalidad differs from F3', () => {
    const p1: P1Artifact = { ...makeP1([makeUnidad()]), modalidad: 'virtual' };
    const ctx = makeCtx({ f3Artifact: makeF3('presencial') });
    const { violaciones } = engine.runCertificationCheck(p1, ctx);
    expect(violaciones.some(v => v.code === 'MODALITY_INCONSISTENCY')).toBe(true);
  });
});

// ── Language validation ───────────────────────────────────────────────────────

describe('EC0366RulesEngine — language compliance', () => {
  it('no violation when requiredLang is null (non-EC0366 project)', () => {
    const p1 = makeP1([makeUnidad()]);
    const ctx = makeCtx({ requiredLang: null });
    const { violaciones } = engine.runCertificationCheck(p1, ctx);
    expect(violaciones.some(v => v.code === 'LANGUAGE_FIELD_MISMATCH')).toBe(false);
  });

  it('no violation when artifact idioma matches requiredLang', () => {
    const p1: P1Artifact = { ...makeP1([makeUnidad()]), idioma: 'es' };
    const ctx = makeCtx({ requiredLang: 'es' });
    const { violaciones } = engine.runCertificationCheck(p1, ctx);
    expect(violaciones.some(v => v.code === 'LANGUAGE_FIELD_MISMATCH')).toBe(false);
  });

  it('LANGUAGE_FIELD_MISMATCH when artifact idioma differs from requiredLang', () => {
    const p1: P1Artifact = { ...makeP1([makeUnidad()]), idioma: 'en' };
    const ctx = makeCtx({ requiredLang: 'es' });
    const { violaciones } = engine.runCertificationCheck(p1, ctx);
    expect(violaciones.some(v => v.code === 'LANGUAGE_FIELD_MISMATCH')).toBe(true);
  });
});

// ── Duration / module validation (PT-152) ────────────────────────────────────

describe('EC0366RulesEngine — _validateDuration (module in frozen spec)', () => {
  it('no violation when artifact has no modulo field (P1)', () => {
    const p1 = makeP1([makeUnidad()]);
    const ctx = makeCtx({
      frozenSpec: {
        tiempos_por_modulo: [{ modulo: 'Módulo 1', duracion_total_minutos: 60 }],
      },
    });
    const { violaciones } = engine.runCertificationCheck(p1, ctx);
    expect(violaciones.some(v => v.code === 'DURATION_MODULE_NOT_IN_SPEC')).toBe(false);
  });

  it('no violation when frozenSpec has no tiempos_por_modulo', () => {
    // A P2-like artifact with modulo field
    const p2 = { productCode: 'P2', modalidad: 'presencial', idioma: 'es', modulo: 'Módulo 5', slides: [] } as any;
    const ctx = makeCtx({ frozenSpec: {} });
    const { violaciones } = engine.runCertificationCheck(p2, ctx);
    expect(violaciones.some(v => v.code === 'DURATION_MODULE_NOT_IN_SPEC')).toBe(false);
  });

  it('DURATION_MODULE_NOT_IN_SPEC when artifact.modulo not in frozen spec', () => {
    const p2 = { productCode: 'P2', modalidad: 'presencial', idioma: 'es', modulo: 'Módulo Fantasma', slides: [] } as any;
    const ctx = makeCtx({
      frozenSpec: {
        tiempos_por_modulo: [{ modulo: 'Módulo 1', duracion_total_minutos: 60 }],
      },
    });
    const { violaciones } = engine.runCertificationCheck(p2, ctx);
    expect(violaciones.some(v => v.code === 'DURATION_MODULE_NOT_IN_SPEC')).toBe(true);
  });

  it('no violation when artifact.modulo matches frozen spec (case-insensitive)', () => {
    const p2 = { productCode: 'P2', modalidad: 'presencial', idioma: 'es', modulo: 'módulo 1', slides: [] } as any;
    const ctx = makeCtx({
      frozenSpec: {
        tiempos_por_modulo: [{ modulo: 'Módulo 1', duracion_total_minutos: 60 }],
      },
    });
    const { violaciones } = engine.runCertificationCheck(p2, ctx);
    expect(violaciones.some(v => v.code === 'DURATION_MODULE_NOT_IN_SPEC')).toBe(false);
  });
});

// ── Coverage with frozenSpec.total_unidades (PT-152) ─────────────────────────

describe('EC0366RulesEngine — _validateCoverage uses frozenSpec.total_unidades', () => {
  it('COVERAGE_INCOMPLETE when P1 units != frozenSpec.total_unidades (no P4)', () => {
    const p1 = makeP1([makeUnidad()]);
    const ctx = makeCtx({ frozenSpec: { total_unidades: 3 }, p4Artifact: undefined });
    const { violaciones } = engine.runCertificationCheck(p1, ctx);
    expect(violaciones.some(v => v.code === 'COVERAGE_INCOMPLETE')).toBe(true);
    expect(violaciones.find(v => v.code === 'COVERAGE_INCOMPLETE')?.message).toContain('temario_base');
  });

  it('no COVERAGE_INCOMPLETE when P1 units === frozenSpec.total_unidades', () => {
    const p1 = makeP1([makeUnidad({ ponderacion: 50 }), makeUnidad({ id: 'u2', ponderacion: 50 })]);
    const ctx = makeCtx({ frozenSpec: { total_unidades: 2 }, p4Artifact: undefined });
    const { violaciones } = engine.runCertificationCheck(p1, ctx);
    expect(violaciones.some(v => v.code === 'COVERAGE_INCOMPLETE')).toBe(false);
  });

  it('frozenSpec.total_unidades takes precedence over P4 chapters when both present', () => {
    // P1 has 2 units, P4 has 2 chapters, but frozen spec says 3 → should error
    const p1 = makeP1([makeUnidad({ ponderacion: 50 }), makeUnidad({ id: 'u2', ponderacion: 50 })]);
    const ctx = makeCtx({
      frozenSpec: { total_unidades: 3 },
      p4Artifact: makeP4(2),
    });
    const { violaciones } = engine.runCertificationCheck(p1, ctx);
    expect(violaciones.some(v => v.code === 'COVERAGE_INCOMPLETE')).toBe(true);
  });
});

// ── Correction log ────────────────────────────────────────────────────────────

describe('EC0366RulesEngine — buildCorrectionLog', () => {
  it('identifies which units were modified', () => {
    const original = makeP1([makeUnidad({ ponderacion: 51 }), makeUnidad({ id: 'u2', ponderacion: 47 })]);
    const corrected = engine.correct(original, makeCtx()) as P1Artifact;
    const log = engine.buildCorrectionLog(original, corrected, 100 - 98);
    expect(log.units_affected.length).toBeGreaterThan(0);
    expect(log.type).toBe('WEIGHT_ROUNDING');
  });

  it('units_affected old ≠ new for changed units', () => {
    const original = makeP1([makeUnidad({ ponderacion: 51 }), makeUnidad({ id: 'u2', ponderacion: 47 })]);
    const corrected = engine.correct(original, makeCtx()) as P1Artifact;
    const log = engine.buildCorrectionLog(original, corrected, 2);
    log.units_affected.forEach(entry => {
      expect(entry.old).not.toBe(entry.new);
    });
  });
});
