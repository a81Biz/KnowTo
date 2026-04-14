// frontend/dcfl/src/shared/supabase.realtime.ts
//
// Cliente de Supabase Realtime para notificaciones en PRODUCCIÓN.
// El frontend se suscribe directamente a los cambios de pipeline_jobs
// sin pasar por el backend (Cloudflare Workers no mantiene WebSockets).
//
// Uso:
//   const ch = subscribeToJob(jobId, onComplete, onError);
//   // Para cancelar: ch.unsubscribe();

import { createClient, type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';

// Singleton: una sola instancia de GoTrueClient por microsite.
// storageKey único evita conflictos con otros microsites (cce, etc.) que
// también usen @supabase/supabase-js en la misma sesión del navegador.
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

export interface JobResult {
  documentId: string;
  content: string;
}

/**
 * Suscribe al canal de Realtime del job indicado.
 * Llama onComplete con el resultado cuando status = 'completed'.
 * Llama onError con el mensaje cuando status = 'failed'.
 * Se desuscribe automáticamente en ambos casos.
 *
 * @returns El canal de Realtime (para desuscribir manualmente si es necesario).
 */
export function subscribeToJob(
  jobId: string,
  onComplete: (result: JobResult) => void,
  onError: (error: string) => void
): RealtimeChannel {
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
          channel.unsubscribe();
          onComplete(row.result);
        } else if (row.status === 'failed') {
          channel.unsubscribe();
          onError(row.error ?? 'Error desconocido en el pipeline');
        }
      }
    )
    .subscribe();

  return channel;
}
