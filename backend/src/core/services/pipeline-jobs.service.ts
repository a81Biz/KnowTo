// src/core/services/pipeline-jobs.service.ts
//
// Gestión de pipeline_jobs para generación asíncrona de documentos.
//
// Dev:  almacenamiento en memoria (Map). Notifica via callback inyectado desde
//       server.dev.ts (WebSocket event-bus).
// Prod: almacenamiento en Supabase. Supabase Realtime notifica al frontend
//       directamente — no se necesita ningún callback aquí.

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
    this.supabase =
      this.isDev
        ? null
        : createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false },
          });
  }

  /** Crea un job en estado 'pending' y devuelve su ID. */
  async createJob(params: Omit<PipelineJob, 'id' | 'status'>): Promise<string> {
    const id = crypto.randomUUID();

    if (this.isDev) {
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
    if (this.isDev) {
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
  }

  /** Devuelve el estado actual de un job por su ID. */
  async getJob(jobId: string): Promise<PipelineJob | null> {
    if (this.isDev) {
      return _devJobs.get(jobId) ?? null;
    }

    const { data, error } = await this.supabase!
      .from('pipeline_jobs')
      .select('id, site_id, project_id, step_id, phase_id, prompt_id, status, context, user_inputs, result, error, user_id')
      .eq('id', jobId)
      .single();

    if (error || !data) return null;
    return {
      id:         data.id as string,
      siteId:     data.site_id as string,
      projectId:  data.project_id as string,
      stepId:     data.step_id as string | undefined,
      phaseId:    data.phase_id as string,
      promptId:   data.prompt_id as string,
      status:     data.status as PipelineJob['status'],
      context:    data.context as Record<string, unknown> | undefined,
      userInputs: data.user_inputs as Record<string, unknown> | undefined,
      result:     data.result as Record<string, unknown> | undefined,
      error:      data.error as string | undefined,
      userId:     data.user_id as string,
    };
  }

  /** Marca el job como fallido y notifica si hay notificador registrado. */
  async failJob(jobId: string, errorMsg: string): Promise<void> {
    if (this.isDev) {
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
  }
}
