/**
 * CertificationEngineFactory — PT-071
 * Selects the appropriate ICertificationRulesEngine based on estandarNorma.
 * Adding support for a new standard means registering a new engine here — no other file changes.
 */

import type { ICertificationRulesEngine } from './certification-rules.engine';
import { EC0366RulesEngine } from './ec0366-rules.engine';
import type {
  CertificationArtifact,
  CertificationContext,
  CertResult,
  Violacion,
} from '../types/certification.types';

/** NullRulesEngine: used when estandarNorma is null/unknown. Never blocks certification. */
class NullRulesEngine implements ICertificationRulesEngine {
  runCertificationCheck(_artifact: CertificationArtifact, _ctx: CertificationContext): CertResult {
    return { violaciones: [], artifactCorregido: null };
  }
  correct(artifact: CertificationArtifact, _ctx: CertificationContext): CertificationArtifact {
    return artifact;
  }
  getExpectedForViolation(_violacion: Violacion): string[] {
    return [];
  }
}

const _registry = new Map<string, ICertificationRulesEngine>([
  ['EC0366', new EC0366RulesEngine()],
]);

export const CertificationEngineFactory = {
  /**
   * Register an engine for a standard at runtime (e.g., from a microsite init).
   * Enables EC0249 or custom standards without modifying this file.
   */
  registerEngine(estandarNorma: string, engine: ICertificationRulesEngine): void {
    _registry.set(estandarNorma, engine);
  },

  /** Returns the engine for the given standard, or NullRulesEngine if unknown/null. */
  getEngine(estandarNorma: string | null | undefined): ICertificationRulesEngine {
    if (!estandarNorma) return new NullRulesEngine();
    return _registry.get(estandarNorma) ?? new NullRulesEngine();
  },
};
