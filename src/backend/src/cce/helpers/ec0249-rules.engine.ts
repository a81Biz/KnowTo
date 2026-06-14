/**
 * EC0249RulesEngine — PT-087 stub
 * Standard: EC0249 (Consultoría Empresarial)
 *
 * Implements ICertificationRulesEngine so the CCE microsite can register this
 * engine with CertificationEngineFactory.registerEngine('EC0249', new EC0249RulesEngine()).
 *
 * All methods are stubs — no domain rules implemented yet.
 * TODO: EC0249 rules — implement once CCE phase definitions are finalized.
 */

import type { ICertificationRulesEngine } from '../../dcfl/helpers/certification-rules.engine';
import type {
  CertificationArtifact,
  CertificationContext,
  CertResult,
} from '../../dcfl/types/certification.types';

export class EC0249RulesEngine implements ICertificationRulesEngine {
  runCertificationCheck(
    _artifact: CertificationArtifact,
    _ctx: CertificationContext,
  ): CertResult {
    // TODO: EC0249 rules — consultancy artifact validation
    return { violaciones: [], artifactCorregido: null };
  }

  correct(
    artifact: CertificationArtifact,
    _ctx: CertificationContext,
  ): CertificationArtifact {
    // TODO: EC0249 rules — auto-correction not yet defined
    return artifact;
  }
}
