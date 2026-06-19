import { Context } from 'hono';
import { SupabaseService } from '../services/supabase.service';
import { ContextExtractorService } from '../../core/services/context-extractor.service';
import { PipelineJobsService } from '../../core/services/pipeline-jobs.service';
import { Env } from '../../core/types/env';
import dcflFlowMap from '../prompts/flow-map.json';

export async function handleExtract(c: Context) {
  const { projectId, extractorId, sourceDocuments } = (c.req as any).valid('json');
  const userId = c.get('userId') || '00000000-0000-0000-0000-000000000001';
  const jobsSvc = new PipelineJobsService(c.env);

  const toPhase = extractorId.replace(/^EXTRACTOR_/, '');

  const jobId = await jobsSvc.createJob({
    siteId: 'dcfl',
    projectId,
    phaseId: toPhase,
    promptId: extractorId,
    context: { sourceDocuments },
    userInputs: {},
    userId,
  });

  // PT-002: Fire-and-forget — libera la conexión HTTP de inmediato.
  void runExtractAsync(jobId, { projectId, extractorId, sourceDocuments }, c.env);

  return c.json({ success: true, data: { jobId }, timestamp: new Date().toISOString() }, 202 as any);
}

async function runExtractAsync(
  jobId: string,
  body: {
    projectId: string;
    extractorId: string;
    sourceDocuments: Record<string, string>;
  },
  env: Env
): Promise<void> {
  const jobsSvc = new PipelineJobsService(env);
  const supabase = new SupabaseService(env);

  await jobsSvc.startJob(jobId);

  try {
    const extractor = new ContextExtractorService(env, dcflFlowMap as Record<string, unknown>);
    const result = await extractor.extract({
      projectId: body.projectId,
      extractorId: body.extractorId,
      sourceDocuments: body.sourceDocuments,
    });

    const toPhase = body.extractorId.replace(/^EXTRACTOR_/, '');
    const fromPhases = Object.keys(body.sourceDocuments);

    const { extractedContextId } = await supabase.saveExtractedContext({
      projectId: body.projectId,
      extractorId: body.extractorId,
      fromPhases,
      toPhase,
      content: result.content,
      parserUsed: result.parserUsed,
    });

    await jobsSvc.completeJob(jobId, {
      extractorId: result.extractorId,
      content: result.content,
      parserUsed: result.parserUsed,
      extractedContextId,
    }, { projectId: body.projectId });

    console.log(`[extract-async] job=${jobId} completado extractorId=${body.extractorId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[extract-async] job=${jobId} FAILED:`, msg);
    await jobsSvc.failJob(jobId, msg, { projectId: body.projectId });
  }
}
