/**
 * ICertificationRulesEngine — PT-071
 * Standard-agnostic interface for certification validation and auto-correction.
 * EC0366 is one implementation; other standards provide their own via the factory.
 */

import type {
  CertificationArtifact,
  CertificationContext,
  CertResult,
  Violacion,
} from '../types/certification.types';

export interface ICertificationRulesEngine {
  /**
   * Validate a typed CertificationArtifact against the standard's rules.
   * Pure function — no DB reads, no side effects.
   * certificable = result.violaciones.filter(v => v.severity === 'error').length === 0
   */
  runCertificationCheck(
    artifact: CertificationArtifact,
    ctx: CertificationContext
  ): CertResult;

  /**
   * Auto-correct a math-only violation (e.g. weight rounding delta ≤ roundingThreshold).
   * Returns a NEW artifact (original is never mutated).
   * Only call after runCertificationCheck indicates correctable violations.
   */
  correct(
    artifact: CertificationArtifact,
    ctx: CertificationContext
  ): CertificationArtifact;

  /**
   * PT-105: Return the expected valid values for a given violation.
   * Used by the P1 retry orchestrator to build actionable correction hints.
   * Standard-agnostic: EC0366 returns instrument lists; NullRulesEngine returns [].
   */
  getExpectedForViolation(violacion: Violacion): string[];
}
