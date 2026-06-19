/**
 * p1-retry.helper.ts — PT-105
 * Orchestrator for P1 iterative correction cycle (max 2 retries).
 *
 * Pattern mirrors p4-orchestrator.helper.ts:
 *   - Creates sub-jobs (internal, not surfaced to the frontend)
 *   - Waits for each attempt via jobsSvc.waitForJob
 *   - Reads artifact_versions.status to decide whether to retry
 *   - On rejection, computes correction hints via the Rules Engine and stores them
 *     in pipeline_agent_outputs so the next attempt picks them up
 *
 * The KEY mechanism: p1_correction_hints injected in context.
 * p1-document.assembler.ts reads these and overrides the temario's tipo_evaluacion
 * when building the CCM P1Artifact, making the retry actually effective for
 * BLOOM_INSTRUMENT_MISMATCH violations.
 */

import { PipelineJobsService } from '../../core/services/pipeline-jobs.service';
import { SupabaseService } from '../services/supabase.service';
import { CertificationEngineFactory } from './certification-engine.factory';
import type { Env } from '../../core/types/env';
import type { P1Artifact, CertificationContext, F3Artifact } from '../types/certification.types';

export interface P1CorrectionHint {
  unit: string;
  violation_code: string;
  current_instrument: string;
  expected_instruments: string[];
  estandar_norma: string | null;
}

const RETRY_TIMEOUT_MS = 20 * 60 * 1_000; // 20 min per attempt

export async function runP1WithRetry(
  metaJobId: string,
  body: {
    projectId: string;
    stepId: string;
    phaseId: string;
    promptId: string;
    context: Record<string, any>;
    userInputs: Record<string, unknown>;
  },
  env: Env,
  userId: string,
  runPipeline: (jobId: string, body: any, env: Env) => Promise<void>,
  maxRetries = 2,
): Promise<void> {
  const jobsSvc = new PipelineJobsService(env);
  const supabase = new SupabaseService(env);
  const projectId = body.projectId;
  const estandarNorma: string | null = (body.context as any)?._frozen?.estandar_norma ?? null;

  let currentHints: P1CorrectionHint[] = [];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const enrichedContext = {
      ...body.context,
      p1_retry_count: attempt,
      p1_correction_hints: currentHints,
    };

    const subJobId = await jobsSvc.createJob({
      siteId: 'dcfl',
      projectId,
      stepId: body.stepId,
      phaseId: body.phaseId,
      promptId: body.promptId,
      context: enrichedContext,
      userInputs: body.userInputs,
      userId,
    });

    console.log(`[p1-retry] attempt=${attempt + 1}/${maxRetries} subJob=${subJobId} hints=${currentHints.length}`);

    runPipeline(subJobId, {
      projectId,
      stepId: body.stepId,
      phaseId: body.phaseId,
      promptId: body.promptId,
      context: enrichedContext,
      userInputs: body.userInputs,
    }, env).catch(err => console.error(`[p1-retry] attempt ${attempt + 1}: pipeline error`, err));

    const outcome = await jobsSvc.waitForJob(subJobId, RETRY_TIMEOUT_MS);
    console.log(`[p1-retry] attempt=${attempt + 1} outcome=${outcome}`);

    if (outcome !== 'completed') {
      console.warn(`[p1-retry] attempt ${attempt + 1} did not complete (${outcome}) — stopping retry loop`);
      break;
    }

    // Read the active artifact for P1
    const { data: artifactRow } = await supabase.client!
      .from('artifact_versions')
      .select('status, artifact')
      .eq('project_id', projectId)
      .eq('product_code', 'P1')
      .eq('is_active', true)
      .maybeSingle();

    const artStatus = artifactRow?.status ?? 'none';
    console.log(`[p1-retry] attempt=${attempt + 1} artifact status=${artStatus}`);

    if (!artifactRow || artStatus === 'valid' || artStatus === 'corrected') {
      // Success — no more retries needed
      break;
    }

    if (attempt < maxRetries - 1 && artifactRow) {
      // Build correction hints for the next attempt
      const artifact = artifactRow.artifact as P1Artifact;
      const engine = CertificationEngineFactory.getEngine(estandarNorma);

      const f3Minimal: F3Artifact = {
        plataforma: '', modalidad: artifact.modalidad ?? 'presencial',
        criteriosAceptacion: [], reporteo: [], idioma: artifact.idioma ?? 'es',
      };
      const certCtx: CertificationContext = {
        f3Artifact: f3Minimal,
        requiredLang: null,
        estandarNorma,
        roundingThreshold: 3,
      };

      const { violaciones } = engine.runCertificationCheck(artifact, certCtx);
      currentHints = violaciones
        .filter(v => v.code === 'BLOOM_INSTRUMENT_MISMATCH')
        .map(v => {
          const unitMatch = v.message.match(/Unidad "([^"]+)"/);
          const currentMatch = v.message.match(/instrumento "([^"]+)"/);
          return {
            unit: unitMatch?.[1] ?? v.field,
            violation_code: v.code,
            current_instrument: currentMatch?.[1] ?? '',
            expected_instruments: engine.getExpectedForViolation(v),
            estandar_norma: estandarNorma,
          };
        });

      if (currentHints.length > 0) {
        // Persist correction context as a synthetic agent output for traceability
        await supabase.client!
          .from('pipeline_agent_outputs')
          .insert({
            job_id: subJobId,
            agent_name: 'correction_context_p1',
            output: JSON.stringify(currentHints),
            created_at: new Date().toISOString(),
          })
          .catch(e => console.warn('[p1-retry] Could not save correction hints:', e));
        console.log(`[p1-retry] ${currentHints.length} correction hint(s) prepared for attempt ${attempt + 2}`);
      }
    }
  }

  // Complete the meta-job so the frontend subscription resolves
  await jobsSvc.completeJob(metaJobId, {
    delegated_to_retry_orchestrator: true,
    max_attempts: maxRetries,
  }, { projectId });
}
