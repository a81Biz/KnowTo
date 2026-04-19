// src/core/services/pipeline-jobs.service.ts
//
// Gestión de pipeline_jobs para generación asíncrona de documentos.
//
// Con Supabase disponible (dev self-hosted o prod cloud):
//   Escribe en la tabla pipeline_jobs. Supabase Realtime notifica al frontend.
// Sin Supabase (solo si SUPABASE_URL contiene 'dummy' o está vacío):
//   Almacenamiento en memoria (Map). Notifica via callback inyectado.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../types/env';

export interface PipelineJob {
  id: string;
  siteId: string;
  projectId: string;
  stepId?: string;
  phaseId: string;
  promptId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  context?: Record<string, unknown>;
  userInputs?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  userId: string;
}

export type JobNotifier = (
  userId: string,
  payload: {
    job_id: string;
    status: string;
    result?: Record<string, unknown>;
    error?: string;
  }
) => void;

// ── Notificador global — se inyecta desde server.dev.ts en desarrollo ──────
let _notifier: JobNotifier | undefined;

/** Registra el notificador de WebSocket para el entorno de desarrollo. */
export function setGlobalNotifier(fn: JobNotifier): void {
  _notifier = fn;
}

// ── In-memory store compartido entre todas las instancias (solo dev) ────────
const _devJobs = new Map<string, PipelineJob>();

// ── Servicio ─────────────────────────────────────────────────────────────────

export class PipelineJobsService {
  private readonly isDev: boolean;
  private readonly supabase: SupabaseClient | null;

  constructor(env: Env) {
    this.isDev = env.ENVIRONMENT !== 'production';

    // Crear el cliente Supabase siempre que haya una URL real.
    // En dev con stack self-hosted apunta a http://supabase-kong:8000.
    // En prod apunta al proyecto Supabase cloud.
    // Sin Supabase configurado (URL vacía o 'dummy') usa almacenamiento en memoria.
    const url = env.SUPABASE_URL ?? '';
    const key = env.SUPABASE_SERVICE_ROLE_KEY ?? '';
    const hasRealSupabase = url.length > 0 && !url.includes('dummy') && key.length > 0 && !key.includes('dummy');

    this.supabase = hasRealSupabase
      ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
      : null;
  }

  /** Crea un job en estado 'pending' y devuelve su ID. */
  async createJob(params: Omit<PipelineJob, 'id' | 'status'>): Promise<string> {
    const id = crypto.randomUUID();

    if (!this.supabase) {
      _devJobs.set(id, { ...params, id, status: 'pending' });
      return id;
    }

    const { error } = await this.supabase!.from('pipeline_jobs').insert({
      id,
      site_id:     params.siteId,
      project_id:  params.projectId,
      step_id:     params.stepId ?? null,
      phase_id:    params.phaseId,
      prompt_id:   params.promptId,
      status:      'pending',
      context:     params.context ?? null,
      user_inputs: params.userInputs ?? null,
      user_id:     params.userId,
    });

    if (error) throw new Error(`createJob failed: ${error.message}`);
    return id;
  }

  /** Marca el job como completado y notifica si hay notificador registrado. */
  async completeJob(jobId: string, result: Record<string, unknown>): Promise<void> {
    if (!this.supabase) {
      const job = _devJobs.get(jobId);
      if (!job) return;
      job.status = 'completed';
      job.result = result;
      _notifier?.(job.userId, { job_id: jobId, status: 'completed', result });
      return;
    }

    const { error } = await this.supabase!
      .from('pipeline_jobs')
      .update({ status: 'completed', result })
      .eq('id', jobId);

    if (error) throw new Error(`completeJob failed: ${error.message}`);

    // Broadcast directo desactivado: se prefiere postgres_changes CDC.
    // this._broadcastJobUpdate(jobId, { job_id: jobId, status: 'completed', result });
  }

  /** Devuelve el estado actual de un job por su ID. */
  async getJob(jobId: string): Promise<PipelineJob | null> {
    if (!this.supabase) {
      return _devJobs.get(jobId) ?? null;
    }

    const { data, error } = await this.supabase!
      .from('pipeline_jobs')
      .select('id, site_id, project_id, step_id, phase_id, prompt_id, status, context, user_inputs, result, error, user_id')
      .eq('id', jobId)
      .single();

    if (error || !data) return null;
    return {
      id:      data.id as string,
      siteId:  data.site_id as string,
      projectId: data.project_id as string,
      phaseId: data.phase_id as string,
      promptId: data.prompt_id as string,
      status:  data.status as PipelineJob['status'],
      userId:  data.user_id as string,
      ...(data.step_id    ? { stepId:     data.step_id    as string }                    : {}),
      ...(data.context    ? { context:    data.context    as Record<string, unknown> }   : {}),
      ...(data.user_inputs ? { userInputs: data.user_inputs as Record<string, unknown> } : {}),
      ...(data.result     ? { result:     data.result     as Record<string, unknown> }   : {}),
      ...(data.error      ? { error:      data.error      as string }                    : {}),
    };
  }

  // ── Outputs intermedios por agente ──────────────────────────────────────────

  /**
   * Persiste el output de un agente del pipeline.
   * Si ya existe un registro para (job_id, agent_name), lo reemplaza (UPSERT).
   * En modo dev sin Supabase: no-op (los outputs viven en memoria en AIService).
   */
  async saveAgentOutput(jobId: string, agentName: string, output: string): Promise<void> {
    if (!this.supabase) return;

    const { error } = await this.supabase
      .from('pipeline_agent_outputs')
      .upsert(
        { job_id: jobId, agent_name: agentName, output },
        { onConflict: 'job_id,agent_name' }
      );

    if (error) {
      // No lanzar — un fallo de persistencia no debe abortar el pipeline
      console.error(`[pipeline-jobs] saveAgentOutput failed (${agentName}):`, error.message);
    }
  }

  /**
   * Carga el output de un agente desde la DB.
   * Devuelve null si no existe o si no hay Supabase (dev sin DB).
   * Usado para retomar un pipeline desde el último checkpoint.
   */
  async getAgentOutput(jobId: string, agentName: string): Promise<string | null> {
    if (!this.supabase) return null;

    const { data, error } = await this.supabase
      .from('pipeline_agent_outputs')
      .select('output')
      .eq('job_id', jobId)
      .eq('agent_name', agentName)
      .maybeSingle();

    if (error || !data) return null;
    return (data as { output: string }).output;
  }

  /** Actualiza el progreso en tiempo real de un job. */
  async updateJobProgress(jobId: string, progress: { currentStep: string; stepIndex: number; totalSteps: number }): Promise<void> {
    if (!this.supabase) return;

    const { error } = await this.supabase!
      .from('pipeline_jobs')
      .update({ progress })
      .eq('id', jobId);

    if (error) console.error(`[pipeline-jobs] fail updating progress for ${jobId}:`, error.message);
  }

  /** Marca el job como fallido y notifica si hay notificador registrado. */
  async failJob(jobId: string, errorMsg: string): Promise<void> {
    if (!this.supabase) {
      const job = _devJobs.get(jobId);
      if (!job) return;
      job.status = 'failed';
      job.error = errorMsg;
      _notifier?.(job.userId, { job_id: jobId, status: 'failed', error: errorMsg });
      return;
    }

    const { error } = await this.supabase!
      .from('pipeline_jobs')
      .update({ status: 'failed', error: errorMsg })
      .eq('id', jobId);

    if (error) throw new Error(`failJob failed: ${error.message}`);

    // this._broadcastJobUpdate(jobId, { job_id: jobId, status: 'failed', error: errorMsg });
  }

  /*
  private _broadcastJobUpdate(
    jobId: string,
    payload: { job_id: string; status: string; result?: Record<string, unknown>; error?: string },
  ): void {
    if (!this.supabase) return;

    const ch = this.supabase.channel(`jobs-${jobId}`);

    // Timeout de seguridad: si subscribe no conecta en 5s, liberar el canal
    const cleanup = setTimeout(() => { ch.unsubscribe().catch(() => {}); }, 5_000);

    ch.subscribe((status) => {
      if (status !== 'SUBSCRIBED') return;
      ch.send({ type: 'broadcast', event: 'job_update', payload })
        .then(() => { clearTimeout(cleanup); ch.unsubscribe().catch(() => {}); })
        .catch(() => { clearTimeout(cleanup); ch.unsubscribe().catch(() => {}); });
    });
  }
  */
}
