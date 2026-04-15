// frontend/dcfl/src/shared/supabase.realtime.ts
//
// Suscripción a resultados de pipeline_jobs via Supabase Realtime (WebSocket).
//
// Flujo:
//   1. Conecta WebSocket a ws://localhost:54321/realtime/v1 (Kong → Realtime)
//   2. Suscribe a postgres_changes UPDATE en pipeline_jobs WHERE id=eq.{jobId}
//   3. Si CHANNEL_ERROR o sin SUBSCRIBED en 8s → polling HTTP GET /wizard/job/:id
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
}

/**
 * Handle devuelto por subscribeToJob.
 * cancel() detiene todo: WebSocket channel y polling timer. No invoca callbacks.
 */
export interface JobSubscription {
  cancel(): void;
}

// ── Constantes ───────────────────────────────────────────────────────────────

const REALTIME_TIMEOUT_MS  = 8_000;  // sin SUBSCRIBED en 8s → polling
const POLLING_INTERVAL_MS  = 3_000;  // frecuencia del polling HTTP
const MAX_POLL_ATTEMPTS    = 60;     // 60 × 3s = 3 minutos máximo de polling

// ── subscribeToJob ────────────────────────────────────────────────────────────

/**
 * Espera el resultado de un pipeline_job.
 *
 * Intenta primero Supabase Realtime (WebSocket). Si falla o no conecta en 8s,
 * activa polling HTTP contra GET /wizard/job/:id cada 3s, máximo 3 minutos.
 *
 * IMPORTANTE: llama cancel() al abandonar el paso (regenerar, navegar).
 * Sin cancel(), el pollingTimer setInterval sigue indefinidamente.
 */
export function subscribeToJob(
  jobId: string,
  onComplete: (result: JobResult) => void,
  onError: (error: string) => void
): JobSubscription {
  let done         = false;
  let pollingTimer: ReturnType<typeof setInterval> | null = null;
  let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
  let pollCount    = 0;
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
    // de 8s) lancen dos setInterval simultáneos — causa del bucle infinito.
    if (done || pollingTimer !== null) return;

    console.info('[realtime] Fallback activo: polling HTTP cada 3s para job', jobId);
    pollCount = 0;

    pollingTimer = setInterval(async () => {
      if (done) { clearInterval(pollingTimer!); pollingTimer = null; return; }

      pollCount++;
      if (pollCount > MAX_POLL_ATTEMPTS) {
        finish(() => onError(
          `Timeout: el pipeline no respondió en ${MAX_POLL_ATTEMPTS * POLLING_INTERVAL_MS / 60_000} minutos`
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
        }
        // pending / running → continuar polling
      } catch {
        // Error de red transitorio — seguir intentando
      }
    }, POLLING_INTERVAL_MS);
  };

  // ── Canal Realtime ───────────────────────────────────────────────────────
  channel = getSupabaseClient()
    .channel(`job-${jobId}`)
    // Vía 1: broadcast directo desde el backend (más fiable en self-hosted)
    .on(
      'broadcast',
      { event: 'job_update' },
      (payload) => {
        const data = payload.payload as { job_id?: string; status?: string; result?: JobResult; error?: string };
        if (data.status === 'completed' && data.result) {
          finish(() => { channel.unsubscribe(); onComplete(data.result!); });
        } else if (data.status === 'failed') {
          finish(() => { channel.unsubscribe(); onError(data.error ?? 'Error desconocido en el pipeline'); });
        }
      }
    )
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
        const row = payload.new as { status: string; result?: JobResult; error?: string };
        if (row.status === 'completed' && row.result) {
          finish(() => { channel.unsubscribe(); onComplete(row.result!); });
        } else if (row.status === 'failed') {
          finish(() => { channel.unsubscribe(); onError(row.error ?? 'Error desconocido en el pipeline'); });
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.info('[realtime] Suscripción activa para job', jobId);
        if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null; }
        return;
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        // Error definitivo del canal — cambiar a polling.
        // No tratar CLOSED aquí: unsubscribe() genera CLOSED y si ya hay
        // un pollingTimer activo, el guard de startPolling() lo absorbe.
        console.warn('[realtime] Canal falló, activando polling HTTP', { status, jobId });
        if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null; }
        channel.unsubscribe(); // genera CLOSED → startPolling() bloqueado por guard
        startPolling();
        return;
      }

      if (status === 'CLOSED') {
        // CLOSED puede venir tras unsubscribe() (intencionado) o por desconexión.
        // startPolling() tiene guard: no hace nada si ya hay un timer activo.
        console.info('[realtime] Canal cerrado para job', jobId);
        startPolling();
      }
    });

  // Si en 8s no llega SUBSCRIBED (WebSocket lento o caído), activar polling
  fallbackTimer = setTimeout(() => {
    if (done) return;
    console.warn('[realtime] Sin SUBSCRIBED en 8s, activando polling para job', jobId);
    channel.unsubscribe();
    startPolling();
  }, REALTIME_TIMEOUT_MS);

  return {
    cancel() {
      if (done) return;
      done = true;
      stopTimers();
      channel.unsubscribe();
      console.info('[realtime] Suscripción cancelada para job', jobId);
    },
  };
}
