// frontend/dcfl/src/shared/supabase.realtime.ts
//
// Dos mecanismos de suscripción a pipeline_jobs via Supabase Realtime:
//
// 1. subscribeToJob() — suscripción por-job individual (legacy, mantener para compat)
//    Crea un canal Supabase por job. Si sin SUBSCRIBED en 10s → polling HTTP.
//
// 2. RealtimeJobBus — singleton por proyecto (recomendado)
//    Un único canal escucha todos los jobs del proyecto. Si falla → un solo
//    polling HTTP para todos los jobs pendientes (no N pollings en paralelo).
//
// Requisitos del stack para que el WebSocket funcione:
//   - SECURE_CHANNELS=true en docker-compose.yml (if sin else devuelve nil si false)
//   - request-transformer en kong.yml inyecta Host:realtime-dev.localhost
//   - Schema `realtime` en la DB (migración 011)
//   - Publicación `supabase_realtime` en la DB (migración 011)

import { createClient, type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';
import { getData } from '@core/http.client';
import { buildEndpoint, ENDPOINTS } from './endpoints';

// ── Singleton Supabase client ────────────────────────────────────────────────

let _client: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      import.meta.env['VITE_SUPABASE_URL'] as string,
      import.meta.env['VITE_SUPABASE_ANON_KEY'] as string,
      {
        auth: {
          persistSession: true,
          storageKey: 'dcfl-supabase-auth',
        },
        realtime: {
          // Deshabilitar reconexión automática del cliente Supabase.
          // Sin esto, el cliente reconecta el socket indefinidamente al cerrarse,
          // lo que genera ciclos CLOSED→startPolling→CLOSED→startPolling…
          params: { eventsPerSecond: 10 },
        },
      }
    );
  }
  return _client;
}

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface JobResult {
  documentId: string;
  content: string;
}

interface JobPollData {
  jobId:   string;
  status:  'pending' | 'running' | 'completed' | 'failed';
  result?: JobResult;
  error?:  string;
  progress?: { currentStep: string; stepIndex: number; totalSteps: number };
}

/**
 * Handle devuelto por subscribeToJob.
 * cancel() detiene todo: WebSocket channel y polling timer. No invoca callbacks.
 */
export interface JobSubscription {
  cancel(): void;
}

// ── Constantes ───────────────────────────────────────────────────────────────

const REALTIME_TIMEOUT_MS  = 10_000;  // sin SUBSCRIBED en 10s → polling (latencia real Docker: 2–4s DB idle + Phoenix handshake)
const POLLING_INTERVAL_MS  = 3_000;   // frecuencia del polling HTTP
const POLLING_TIMEOUT_MS   = 1_200_000; // 20 minutos máximo de polling

// ── subscribeToJob ────────────────────────────────────────────────────────────

/**
 * Espera el resultado de un pipeline_job.
 *
 * Intenta primero Supabase Realtime (WebSocket). Si falla o no conecta en 10s,
 * activa polling HTTP contra GET /wizard/job/:id cada 3s, máximo 20 minutos.
 *
 * IMPORTANTE: llama cancel() al abandonar el paso (regenerar, navegar).
 * Sin cancel(), el pollingTimer setInterval sigue indefinidamente.
 */
export function subscribeToJob(
  jobId: string,
  onComplete: (result: JobResult) => void,
  onError: (error: string) => void,
  onUpdate?: (job: JobPollData) => void
): JobSubscription {
  let done              = false;
  let intentionalClose  = false;
  let pollingTimer: ReturnType<typeof setInterval> | null = null;
  let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
  let pollStartTime = Date.now();
  // channel se asigna justo abajo; let para que cancel() pueda acceder.
  let channel: RealtimeChannel;

  const stopTimers = () => {
    if (pollingTimer)  { clearInterval(pollingTimer);  pollingTimer  = null; }
    if (fallbackTimer) { clearTimeout(fallbackTimer);  fallbackTimer = null; }
  };

  const finish = (fn: () => void) => {
    if (done) return;
    done = true;
    stopTimers();
    fn();
  };

  // ── Fallback: polling HTTP ───────────────────────────────────────────────
  const startPolling = () => {
    // Guard crítico: evita que CHANNEL_ERROR + CLOSED subsecuente (o el timer
    // de 10s) lancen dos setInterval simultáneos — causa del bucle infinito.
    if (done || pollingTimer !== null) return;

    console.info('[realtime] Fallback activo: polling HTTP cada 3s para job', jobId);
    pollStartTime = Date.now();

    pollingTimer = setInterval(async () => {
      if (done) { clearInterval(pollingTimer!); pollingTimer = null; return; }

      const elapsed = Date.now() - pollStartTime;
      if (elapsed > POLLING_TIMEOUT_MS) {
        finish(() => onError(
          `Timeout: el pipeline no respondió en ${Math.round(POLLING_TIMEOUT_MS / 60_000)} minutos`
        ));
        return;
      }

      try {
        const resp = await getData<JobPollData>(
          buildEndpoint(ENDPOINTS.wizard.job(jobId))
        );
        const job = resp.data;
        if (!job) return;

        if (job.status === 'completed' && job.result) {
          finish(() => onComplete(job.result!));
        } else if (job.status === 'failed') {
          finish(() => onError(job.error ?? 'Error desconocido en el pipeline'));
        } else if (onUpdate && job.progress) {
          onUpdate(job);
        }
        // pending / running → continuar polling
      } catch {
        // Error de red transitorio — seguir intentando
      }
    }, POLLING_INTERVAL_MS);
  };

  // ── Canal Realtime ───────────────────────────────────────────────────────
  channel = getSupabaseClient()
    .channel(`jobs-${jobId}`)
    // Vía 2: postgres_changes CDC (funciona cuando Realtime WAL está OK)
    .on(
      'postgres_changes',
      {
        event:  'UPDATE',
        schema: 'public',
        table:  'pipeline_jobs',
        filter: `id=eq.${jobId}`,
      },
      (payload) => {
        const row = payload.new as JobPollData;
        if (row.status === 'completed' && row.result) {
          finish(() => { channel.unsubscribe(); onComplete(row.result!); });
        } else if (row.status === 'failed') {
          finish(() => { channel.unsubscribe(); onError(row.error ?? 'Error desconocido en el pipeline'); });
        } else if (onUpdate && row.progress) {
          onUpdate(row);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.info('[realtime] Suscripción activa para job', jobId);
        if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null; }
        // Verificación inmediata: el job pudo completar/fallar ANTES de que
        // la suscripción se estableciera. Si ya terminó, finish() lo captura
        // y evita que el frontend quede atascado esperando un evento que nunca llega.
        void (async () => {
          if (done) return;
          try {
            const resp = await getData<JobPollData>(buildEndpoint(ENDPOINTS.wizard.job(jobId)));
            const job = resp.data;
            if (!job) return;
            if (job.status === 'completed' && job.result) {
              finish(() => onComplete(job.result!));
            } else if (job.status === 'failed') {
              finish(() => onError(job.error ?? 'Error desconocido en el pipeline'));
            }
          } catch { /* ignorar — Realtime se encargará si el job sigue en progreso */ }
        })();
        return;
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        // Error definitivo del canal — cambiar a polling.
        console.warn('[realtime] Canal falló, activando polling HTTP', { status, jobId });
        if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null; }
        intentionalClose = true;
        channel.unsubscribe(); // genera CLOSED → guard de intentionalClose lo absorbe
        startPolling();
        return;
      }

      if (status === 'CLOSED') {
        // CLOSED intencionado (unsubscribe tras error o cancel) → no loguear ni re-activar.
        if (intentionalClose) return;
        // CLOSED inesperado → intentar fallback.
        console.info('[realtime] Canal cerrado inesperadamente para job', jobId);
        startPolling();
      }
    });

  // Si en 10s no llega SUBSCRIBED (WebSocket lento o caído en dev), activar polling.
  fallbackTimer = setTimeout(() => {
    if (done) return;
    console.warn('[realtime] Sin SUBSCRIBED en 10s, activando polling para job', jobId);
    intentionalClose = true;
    channel.unsubscribe();
    startPolling();
  }, REALTIME_TIMEOUT_MS);

  return {
    cancel() {
      if (done) return;
      done = true;
      intentionalClose = true;
      stopTimers();
      channel.unsubscribe();
      console.info('[realtime] Suscripción cancelada para job', jobId);
    },
  };
}

// ── RealtimeJobBus ────────────────────────────────────────────────────────────

/**
 * Bus singleton por proyecto: un único canal Supabase escucha todos los jobs
 * del proyecto. Si el WebSocket falla, activa UN polling HTTP para todos los
 * jobs pendientes (en lugar de N pollings en paralelo).
 *
 * Uso:
 *   const bus = new RealtimeJobBus(projectId);
 *   const result = await bus.waitForJob(jobId);
 *   bus.cancel(jobId);   // abandona un job sin destruir el bus
 *   bus.destroy();       // destruye canal y todos los listeners (en unmount)
 */
export class RealtimeJobBus {
  private _channel: RealtimeChannel | null = null;
  private _listeners = new Map<string, {
    resolve: (r: JobResult) => void;
    reject:  (e: Error)     => void;
    onUpdate?: (job: JobPollData) => void;
  }>();
  private _pollingTimer:  ReturnType<typeof setInterval>  | null = null;
  private _fallbackTimer: ReturnType<typeof setTimeout>   | null = null;
  private _pollingActive = false;
  private _destroyed     = false;

  constructor(private readonly projectId: string) {
    this._connect();
  }

  // ── Canal Realtime ─────────────────────────────────────────────────────────
  private _connect(): void {
    this._channel = getSupabaseClient()
      .channel(`bus-project-${this.projectId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pipeline_jobs', filter: `project_id=eq.${this.projectId}` },
        (payload) => {
          const row = payload.new as any;
          this._resolve(row.id, row.status, row.result, row.error, row.progress);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.info('[realtime-bus] Canal activo para proyecto', this.projectId);
          if (this._fallbackTimer) { clearTimeout(this._fallbackTimer); this._fallbackTimer = null; }
          void this._pollAll(); // check jobs already finished before subscription
          return;
        }
        if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') && !this._pollingActive) {
          console.warn('[realtime-bus] Canal falló, activando polling de proyecto', { status });
          this._startPolling();
        }
      });

    this._fallbackTimer = setTimeout(() => {
      if (this._pollingActive || this._destroyed) return;
      console.warn('[realtime-bus] Sin SUBSCRIBED en 10s, activando polling para proyecto', this.projectId);
      this._startPolling();
    }, REALTIME_TIMEOUT_MS);
  }

  // ── Resolución de listeners ────────────────────────────────────────────────
  private _resolve(
    jobId: string,
    status: string,
    result?: JobResult,
    error?: string,
    progress?: JobPollData['progress']
  ): void {
    const listener = this._listeners.get(jobId);
    if (!listener) return;
    if (status === 'completed' && result) {
      this._listeners.delete(jobId);
      listener.resolve(result);
    } else if (status === 'failed') {
      this._listeners.delete(jobId);
      listener.reject(new Error(error ?? 'Error desconocido en el pipeline'));
    } else if (listener.onUpdate && progress) {
      listener.onUpdate({ jobId, status: status as any, progress });
    }
  }

  // ── Polling de proyecto ────────────────────────────────────────────────────
  private async _pollAll(): Promise<void> {
    if (this._destroyed || this._listeners.size === 0) return;
    for (const jobId of [...this._listeners.keys()]) {
      if (!this._listeners.has(jobId)) continue; // resolved by a prior iteration
      try {
        const resp = await getData<JobPollData>(buildEndpoint(ENDPOINTS.wizard.job(jobId)));
        const job = resp.data;
        if (job) this._resolve(job.jobId, job.status, job.result, job.error, job.progress);
      } catch { /* transient network error — retry next interval */ }
    }
  }

  private _startPolling(): void {
    if (this._pollingActive) return;
    this._pollingActive = true;
    const startTime = Date.now();
    this._pollingTimer = setInterval(async () => {
      if (this._destroyed) return;
      if (this._listeners.size === 0) return;
      if (Date.now() - startTime > POLLING_TIMEOUT_MS) {
        for (const [jobId, listener] of [...this._listeners]) {
          this._listeners.delete(jobId);
          listener.reject(new Error(`Timeout: el pipeline no respondió en ${Math.round(POLLING_TIMEOUT_MS / 60_000)} minutos`));
        }
        return;
      }
      await this._pollAll();
    }, POLLING_INTERVAL_MS);
  }

  // ── API pública ────────────────────────────────────────────────────────────

  waitForJob(jobId: string, onUpdate?: (job: JobPollData) => void): Promise<JobResult> {
    return new Promise<JobResult>((resolve, reject) => {
      this._listeners.set(jobId, { resolve, reject, onUpdate });
      // Immediate status check — job may have finished before registration
      void getData<JobPollData>(buildEndpoint(ENDPOINTS.wizard.job(jobId)))
        .then(resp => {
          const job = resp.data;
          if (job && this._listeners.has(jobId)) {
            this._resolve(job.jobId, job.status, job.result, job.error, job.progress);
          }
        })
        .catch(() => { /* still pending, bus will catch the update */ });
    });
  }

  cancel(jobId: string): void {
    if (this._listeners.delete(jobId)) {
      console.info('[realtime-bus] Listener cancelado para job', jobId);
    }
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    if (this._pollingTimer)  { clearInterval(this._pollingTimer);  this._pollingTimer  = null; }
    if (this._fallbackTimer) { clearTimeout(this._fallbackTimer);  this._fallbackTimer = null; }
    if (this._channel) { this._channel.unsubscribe(); this._channel = null; }
    this._listeners.clear();
    console.info('[realtime-bus] Bus destruido para proyecto', this.projectId);
  }
}

// ── AppJobHub ─────────────────────────────────────────────────────────────────

/**
 * Hub singleton de broadcast por proyecto.
 * Usa el canal de Realtime Broadcast (no postgres_changes CDC) para recibir
 * notificaciones de jobs en < 500ms, sin WAL round-trip ni cold-start del tenant.
 *
 * El backend envía un POST a /realtime/v1/api/broadcast tras completeJob()/failJob().
 * Este hub escucha ese evento en el canal `project-jobs-{projectId}`.
 *
 * Uso:
 *   jobHub.activate(projectId);                          // en mount() de cada step
 *   jobHub.waitForJob(jobId)                             // Promise<JobResult>
 *   jobHub.subscribeToJobCallback(jobId, ok, err, upd)  // JobSubscription (compat legacy)
 *   jobHub.cancel(jobId)                                 // abandona un listener
 */
class AppJobHub {
  private _projectId: string | null = null;
  private _channel: RealtimeChannel | null = null;
  private _listeners = new Map<string, {
    resolve:   (r: JobResult) => void;
    reject:    (e: Error)     => void;
    onUpdate?: (job: JobPollData) => void;
  }>();
  private _pollingTimer:  ReturnType<typeof setInterval> | null = null;
  private _fallbackTimer: ReturnType<typeof setTimeout>  | null = null;
  private _pollingActive = false;
  private _subscribed    = false;

  activate(projectId: string): void {
    if (this._projectId === projectId && this._channel) return;

    if (this._channel) {
      this._channel.unsubscribe();
      this._channel = null;
    }
    if (this._fallbackTimer) { clearTimeout(this._fallbackTimer);  this._fallbackTimer = null; }
    if (this._pollingTimer)  { clearInterval(this._pollingTimer);  this._pollingTimer  = null; }

    this._projectId    = projectId;
    this._subscribed   = false;
    this._pollingActive = false;

    this._channel = getSupabaseClient()
      .channel(`project-jobs-${projectId}`)
      .on('broadcast', { event: 'job_update' }, (msg: any) => {
        const data = msg?.payload as { jobId: string; status: string; result?: JobResult; error?: string } | undefined;
        if (data?.jobId) this._resolve(data.jobId, data.status, data.result, data.error);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.info('[realtime-hub] Canal activo para proyecto', projectId);
          if (this._fallbackTimer) { clearTimeout(this._fallbackTimer);  this._fallbackTimer = null; }
          if (this._pollingTimer)  { clearInterval(this._pollingTimer);  this._pollingTimer  = null; }
          this._pollingActive = false;
          this._subscribed = true;
          void this._pollAll();
          return;
        }
        if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') && !this._pollingActive) {
          console.warn('[realtime-hub] Canal falló, activando polling de proyecto', { status });
          this._startPolling();
        }
      });

    this._fallbackTimer = setTimeout(() => {
      this._fallbackTimer = null;
      if (this._subscribed) return;
      console.warn('[realtime-hub] Sin SUBSCRIBED en 10s, activando polling para proyecto', projectId);
      this._startPolling();
    }, REALTIME_TIMEOUT_MS);
  }

  private _resolve(
    jobId: string,
    status: string,
    result?: JobResult,
    error?: string,
  ): void {
    const listener = this._listeners.get(jobId);
    if (!listener) return;
    if (status === 'completed' && result) {
      this._listeners.delete(jobId);
      listener.resolve(result);
    } else if (status === 'failed') {
      this._listeners.delete(jobId);
      listener.reject(new Error(error ?? 'Error desconocido en el pipeline'));
    } else if (listener.onUpdate) {
      // progress updates llegan via postgres_changes poll, no via broadcast
    }
  }

  private async _pollAll(): Promise<void> {
    if (this._listeners.size === 0) return;
    for (const jobId of [...this._listeners.keys()]) {
      if (!this._listeners.has(jobId)) continue;
      try {
        const resp = await getData<JobPollData>(buildEndpoint(ENDPOINTS.wizard.job(jobId)));
        const job = resp.data;
        if (job) {
          if (listener_onUpdate(this._listeners.get(jobId), job)) continue;
          this._resolve(job.jobId, job.status, job.result, job.error);
        }
      } catch { /* transient network error — retry next interval */ }
    }
  }

  private _startPolling(): void {
    if (this._pollingActive) return;
    this._pollingActive = true;
    const startTime = Date.now();
    this._pollingTimer = setInterval(async () => {
      if (this._listeners.size === 0) return;
      if (Date.now() - startTime > POLLING_TIMEOUT_MS) {
        for (const [jobId, listener] of [...this._listeners]) {
          this._listeners.delete(jobId);
          listener.reject(new Error(`Timeout: el pipeline no respondió en ${Math.round(POLLING_TIMEOUT_MS / 60_000)} minutos`));
        }
        clearInterval(this._pollingTimer!);
        this._pollingTimer  = null;
        this._pollingActive = false;
        return;
      }
      await this._pollAll();
    }, POLLING_INTERVAL_MS);
  }

  waitForJob(jobId: string, onUpdate?: (job: JobPollData) => void): Promise<JobResult> {
    return new Promise<JobResult>((resolve, reject) => {
      this._listeners.set(jobId, { resolve, reject, onUpdate });
      void getData<JobPollData>(buildEndpoint(ENDPOINTS.wizard.job(jobId)))
        .then(resp => {
          const job = resp.data;
          if (job && this._listeners.has(jobId)) {
            if (onUpdate && job.progress && (job.status === 'pending' || job.status === 'running')) {
              onUpdate(job);
            }
            this._resolve(job.jobId, job.status, job.result, job.error);
          }
        })
        .catch(() => {});
    });
  }

  subscribeToJobCallback(
    jobId: string,
    onComplete: (result: JobResult) => void,
    onError: (error: string) => void,
    onUpdate?: (job: JobPollData) => void,
  ): JobSubscription {
    this.waitForJob(jobId, onUpdate)
      .then(onComplete)
      .catch((e: Error) => onError(e.message));
    return { cancel: () => this.cancel(jobId) };
  }

  cancel(jobId: string): void {
    if (this._listeners.delete(jobId)) {
      console.info('[realtime-hub] Listener cancelado para job', jobId);
    }
  }

  destroy(): void {
    if (this._pollingTimer)  { clearInterval(this._pollingTimer);  this._pollingTimer  = null; }
    if (this._fallbackTimer) { clearTimeout(this._fallbackTimer);  this._fallbackTimer = null; }
    if (this._channel) { this._channel.unsubscribe(); this._channel = null; }
    this._listeners.clear();
    this._projectId    = null;
    this._subscribed   = false;
    this._pollingActive = false;
    console.info('[realtime-hub] Hub destruido');
  }
}

function listener_onUpdate(
  listener: { onUpdate?: (job: JobPollData) => void } | undefined,
  job: JobPollData,
): boolean {
  if (!listener) return false;
  if ((job.status === 'pending' || job.status === 'running') && listener.onUpdate && job.progress) {
    listener.onUpdate(job);
    return true;
  }
  return false;
}

export const jobHub = new AppJobHub();
