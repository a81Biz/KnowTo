// src/__tests__/helpers/p1-retry.test.ts
//
// PT-106 — Tests for the P1 retry orchestrator logic (PT-105).
//
// Coverage:
//   1. EC0366RulesEngine.getExpectedForViolation: returns instrument list for BLOOM_INSTRUMENT_MISMATCH
//   2. EC0366RulesEngine.getExpectedForViolation: returns ['100%'] for WEIGHT_ROUNDING
//   3. EC0366RulesEngine.getExpectedForViolation: returns [] for COVERAGE_INCOMPLETE
//   4. NullRulesEngine.getExpectedForViolation always returns []
//   5. Factory returns NullRulesEngine for unknown standard (no throw)
//   6. P1CorrectionHint shape matches engine output (contract test)
//   7. Hint map construction: unit names are lowercased for comparison

import { describe, it, expect } from 'vitest';
import { EC0366RulesEngine } from '../../dcfl/helpers/ec0366-rules.engine';
import { CertificationEngineFactory } from '../../dcfl/helpers/certification-engine.factory';
import type { P1CorrectionHint } from '../../dcfl/helpers/p1-retry.helper';
import type { Violacion, P1Artifact } from '../../dcfl/types/certification.types';

// ── Tests 1-3: EC0366RulesEngine.getExpectedForViolation ────────────────────

describe('EC0366RulesEngine.getExpectedForViolation', () => {
  const engine = new EC0366RulesEngine();

  it('Test 1: returns instrument list for BLOOM_INSTRUMENT_MISMATCH', () => {
    const v: Violacion = {
      code: 'BLOOM_INSTRUMENT_MISMATCH',
      message: 'Unidad "Aplicar procedimiento": instrumento "Cuestionario" no es válido para nivel Bloom "aplicar". Válidos: Lista de Cotejo, Guía de Observación, Portafolio de Evidencias, Proyecto.',
      field: 'unidades[0].instrumento',
      severity: 'error',
    };
    const result = engine.getExpectedForViolation(v);
    expect(result).toContain('Lista de Cotejo');
    expect(result).toContain('Guía de Observación');
    expect(result.length).toBeGreaterThan(1);
  });

  it('Test 2: returns ["100%"] for WEIGHT_ROUNDING', () => {
    const v: Violacion = {
      code: 'WEIGHT_ROUNDING',
      message: 'Las ponderaciones suman 97% (delta=3%). Se aplicará corrección de redondeo.',
      field: 'unidades[*].ponderacion',
      severity: 'error',
    };
    expect(engine.getExpectedForViolation(v)).toEqual(['100%']);
  });

  it('Test 3: returns [] for COVERAGE_INCOMPLETE', () => {
    const v: Violacion = {
      code: 'COVERAGE_INCOMPLETE',
      message: 'P1 cubre 3 unidades pero P4 tiene 4 capítulos.',
      field: 'unidades',
      severity: 'error',
    };
    expect(engine.getExpectedForViolation(v)).toEqual([]);
  });

  it('returns [] for unknown violation code', () => {
    const v: Violacion = { code: 'UNKNOWN', message: 'x', field: 'x', severity: 'warning' };
    expect(engine.getExpectedForViolation(v)).toEqual([]);
  });
});

// ── Tests 4-5: NullRulesEngine + Factory ────────────────────────────────────

describe('NullRulesEngine.getExpectedForViolation', () => {
  it('Test 4: always returns [] regardless of violation code', () => {
    const engine = CertificationEngineFactory.getEngine(null);
    const v: Violacion = {
      code: 'BLOOM_INSTRUMENT_MISMATCH',
      message: 'any mismatch',
      field: 'unidades[0].instrumento',
      severity: 'error',
    };
    expect(engine.getExpectedForViolation(v)).toEqual([]);
  });

  it('Test 5: factory returns engine with getExpectedForViolation for unknown standard', () => {
    const engine = CertificationEngineFactory.getEngine('UNKNOWN_STANDARD_XYZ');
    expect(typeof engine.getExpectedForViolation).toBe('function');
    const v: Violacion = { code: 'ANY', message: 'x', field: 'x', severity: 'error' };
    expect(() => engine.getExpectedForViolation(v)).not.toThrow();
    expect(engine.getExpectedForViolation(v)).toEqual([]);
  });
});

// ── Test 6: P1CorrectionHint shape ───────────────────────────────────────────

describe('P1CorrectionHint contract', () => {
  it('Test 6: hint shape includes required fields for assembler override', () => {
    const engine = new EC0366RulesEngine();
    const violacion: Violacion = {
      code: 'BLOOM_INSTRUMENT_MISMATCH',
      message: 'Unidad "Aplicar técnica": instrumento "Examen Escrito" no es válido para nivel Bloom "aplicar". Válidos: Lista de Cotejo, Guía de Observación, Portafolio de Evidencias, Proyecto.',
      field: 'unidades[1].instrumento',
      severity: 'error',
    };

    const unitMatch = violacion.message.match(/Unidad "([^"]+)"/);
    const currentMatch = violacion.message.match(/instrumento "([^"]+)"/);

    const hint: P1CorrectionHint = {
      unit: unitMatch?.[1] ?? violacion.field,
      violation_code: violacion.code,
      current_instrument: currentMatch?.[1] ?? '',
      expected_instruments: engine.getExpectedForViolation(violacion),
      estandar_norma: 'EC0366',
    };

    expect(hint.unit).toBe('Aplicar técnica');
    expect(hint.current_instrument).toBe('Examen Escrito');
    expect(hint.expected_instruments).toContain('Lista de Cotejo');
    expect(hint.estandar_norma).toBe('EC0366');
  });
});

// ── Test 7: Hint map construction for assembler ───────────────────────────────

describe('Correction hint map (assembler side)', () => {
  it('Test 7: unit name lookup is case-insensitive (assembler lowercases before lookup)', () => {
    const hints: P1CorrectionHint[] = [
      {
        unit: 'Aplicar la Técnica de Soldadura',
        violation_code: 'BLOOM_INSTRUMENT_MISMATCH',
        current_instrument: 'Examen Escrito',
        expected_instruments: ['Lista de Cotejo', 'Guía de Observación'],
        estandar_norma: 'EC0366',
      },
    ];

    const hintMap = new Map(hints.map(h => [h.unit.toLowerCase(), h]));

    // Simulate the assembler lookup (both exact and case-variant)
    const lookupExact = hintMap.get('aplicar la técnica de soldadura');
    const lookupUpperCase = hintMap.get('APLICAR LA TÉCNICA DE SOLDADURA'.toLowerCase());

    expect(lookupExact).toBeDefined();
    expect(lookupUpperCase).toBeDefined();
    expect(lookupExact?.expected_instruments[0]).toBe('Lista de Cotejo');
  });
});

// ── Bonus: runCertificationCheck still finds BLOOM_INSTRUMENT_MISMATCH ────────

describe('EC0366RulesEngine.runCertificationCheck — Bloom validation', () => {
  it('detects BLOOM_INSTRUMENT_MISMATCH for aplicar-level unit with Cuestionario', () => {
    const engine = new EC0366RulesEngine();
    const artifact: P1Artifact = {
      productCode: 'P1',
      modalidad: 'presencial',
      idioma: 'es',
      criterios: [],
      unidades: [{
        id: 'u1',
        nombre: 'Aplicar técnica',
        nivel_bloom: 'aplicar',
        instrumento: 'Examen Escrito', // invalid for 'aplicar'
        ponderacion: 100,
        reactivos: [],
      }],
    };

    const f3 = { plataforma: '', modalidad: 'presencial' as const, criteriosAceptacion: [], reporteo: [], idioma: 'es' as const };
    const { violaciones } = engine.runCertificationCheck(artifact, { f3Artifact: f3, requiredLang: null, estandarNorma: 'EC0366', roundingThreshold: 3 });

    const bloomViolation = violaciones.find(v => v.code === 'BLOOM_INSTRUMENT_MISMATCH');
    expect(bloomViolation).toBeDefined();
    // The violation message contains the valid instrument list for getExpectedForViolation to parse
    expect(bloomViolation?.message).toContain('Válidos:');
    // And getExpectedForViolation extracts them correctly
    const expected = engine.getExpectedForViolation(bloomViolation!);
    expect(expected).toContain('Lista de Cotejo');
  });
});
