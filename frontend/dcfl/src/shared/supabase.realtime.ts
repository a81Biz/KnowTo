// frontend/dcfl/src/shared/supabase.realtime.ts
//
// Suscripción a Supabase Realtime para notificaciones de pipeline_jobs.
//
// Ambos entornos (dev y prod) usan Supabase Realtime vía WebSocket:
//   - Desarrollo: ws://localhost:54321/realtime/v1 (Kong local)
//   - Producción: wss://<project>.supabase.co/realtime/v1 (Supabase cloud)

import { createClient, type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';

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

// ── subscribeToJob ────────────────────────────────────────────────────────────

/**
 * Suscribe al canal de Realtime del job indicado via Supabase WebSocket.
 * Si el canal falla (CHANNEL_ERROR / TIMED_OUT / CLOSED), llama a onError.
 *
 * @returns El canal de Realtime (para unsubscribe manual si es necesario).
 */
export function subscribeToJob(
  jobId: string,
  onComplete: (result: JobResult) => void,
  onError: (error: string) => void
): RealtimeChannel {
  let done = false;

  const finish = (fn: () => void) => {
    if (done) return;
    done = true;
    fn();
  };

  const channel = getSupabaseClient()
    .channel(`job-${jobId}`)
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
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        console.warn('[realtime] Canal no disponible', { status, jobId });
        finish(() => onError(`Realtime no disponible (${status}). Verifica la conexión a Supabase.`));
      }
    });

  return channel;
}
