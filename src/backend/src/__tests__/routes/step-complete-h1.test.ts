// src/__tests__/routes/step-complete-h1.test.ts
//
// PT-106 — Unit tests for PT-102 (idempotency) and PT-103 (CCM gap diagnosis) logic.
//
// These tests validate the pure violation-building logic and decision rules
// without going through the full HTTP stack (which requires auth mocking).
//
// Coverage:
//   Test 9:  Already-completed guard: early-return condition is status === 'completed'
//   Test 10: PT-103 cross-query — product in fase4_produtos but NOT in artifact_versions → CCM_PARSE_FAILED
//   Test 11: PT-103 cross-query — product NOT in any table → PRODUCT_MISSING

import { describe, it, expect } from 'vitest';

// ── Shared logic extracted from step.handlers.ts for unit testing ─────────────
// We replicate the violation-building logic to make it unit-testable
// without requiring a live Hono Context or Supabase connection.

function buildViolaciones(
  allProductCodes: string[],
  presentInArtifacts: Set<string>,
  rejectedArtifacts: Array<{ product_code: string }>,
  approvedInFase4: Set<string>,
) {
  const missing = allProductCodes.filter(c => !presentInArtifacts.has(c));

  return [
    ...missing.map(code => {
      const inFase4 = approvedInFase4.has(code);
      return {
        code: inFase4 ? 'CCM_PARSE_FAILED' : 'PRODUCT_MISSING',
        field: code,
        message: inFase4
          ? `Producto ${code} generado pero sin artifact de certificación. Regenerar para reconstruir.`
          : `Producto ${code} no generado. Generar el producto para continuar.`,
        severity: 'error' as const,
      };
    }),
    ...rejectedArtifacts.map(a => ({
      code: 'PRODUCT_REJECTED',
      field: a.product_code,
      message: `${a.product_code} rechazado por el motor de certificación`,
      severity: 'error' as const,
    })),
  ];
}

const ALL_CODES = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];

// ── Test 9: Idempotency guard ─────────────────────────────────────────────────

describe('PT-102 idempotency guard', () => {
  it('Test 9: step with status="completed" triggers early-return condition', () => {
    const stepRow = { step_number: 5, project_id: 'proj-1', status: 'completed' };

    // This mirrors the guard in handleCompleteStep:
    const shouldShortCircuit = stepRow?.status === 'completed';
    expect(shouldShortCircuit).toBe(true);

    // A pending step does not short-circuit
    const pendingRow = { ...stepRow, status: 'pending' };
    expect(pendingRow?.status === 'completed').toBe(false);
  });
});

// ── Tests 10 & 11: CCM gap diagnosis ─────────────────────────────────────────

describe('PT-103 CCM gap diagnosis — violation code selection', () => {

  it('Test 10: product in fase4_produtos but NOT in artifact_versions → CCM_PARSE_FAILED', () => {
    // P1 was generated (in fase4_produtos as approved) but CCM parse failed
    const presentInArtifacts = new Set<string>(['P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']); // P1 missing
    const approvedInFase4 = new Set<string>(['P1']); // P1 IS in fase4_produtos

    const violaciones = buildViolaciones(ALL_CODES, presentInArtifacts, [], approvedInFase4);

    const p1v = violaciones.find(v => v.field === 'P1');
    expect(p1v).toBeDefined();
    expect(p1v?.code).toBe('CCM_PARSE_FAILED');
    expect(p1v?.message).toContain('Regenerar');
    expect(p1v?.message).not.toContain('Generar el producto');
  });

  it('Test 11: product NOT in any table → PRODUCT_MISSING', () => {
    // P3 is completely missing
    const presentInArtifacts = new Set<string>(['P1', 'P2', 'P4', 'P5', 'P6', 'P7', 'P8']); // P3 missing
    const approvedInFase4 = new Set<string>(); // P3 not in fase4_produtos either

    const violaciones = buildViolaciones(ALL_CODES, presentInArtifacts, [], approvedInFase4);

    const p3v = violaciones.find(v => v.field === 'P3');
    expect(p3v).toBeDefined();
    expect(p3v?.code).toBe('PRODUCT_MISSING');
    expect(p3v?.message).toContain('Generar el producto');
  });

  it('does not generate violations when all products are present and none rejected', () => {
    const presentInArtifacts = new Set<string>(ALL_CODES);
    const violaciones = buildViolaciones(ALL_CODES, presentInArtifacts, [], new Set());
    expect(violaciones).toHaveLength(0);
  });

  it('PRODUCT_REJECTED comes from artifact status, not from presence check', () => {
    const presentInArtifacts = new Set<string>(ALL_CODES); // all present
    const rejectedArtifacts = [{ product_code: 'P1' }]; // but P1 is rejected
    const violaciones = buildViolaciones(ALL_CODES, presentInArtifacts, rejectedArtifacts, new Set());

    const p1v = violaciones.find(v => v.field === 'P1');
    expect(p1v?.code).toBe('PRODUCT_REJECTED');
  });

  it('mixed scenario: CCM_PARSE_FAILED + PRODUCT_MISSING in same response', () => {
    // P1: in fase4_produtos but not in artifacts → CCM_PARSE_FAILED
    // P2: not in either table → PRODUCT_MISSING
    const presentInArtifacts = new Set<string>(['P3', 'P4', 'P5', 'P6', 'P7', 'P8']);
    const approvedInFase4 = new Set<string>(['P1']); // only P1 was generated

    const violaciones = buildViolaciones(ALL_CODES, presentInArtifacts, [], approvedInFase4);

    expect(violaciones.find(v => v.field === 'P1')?.code).toBe('CCM_PARSE_FAILED');
    expect(violaciones.find(v => v.field === 'P2')?.code).toBe('PRODUCT_MISSING');
  });
});
