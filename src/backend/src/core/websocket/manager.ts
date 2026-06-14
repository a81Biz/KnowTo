// src/core/websocket/manager.ts
//
// WebSocket server para notificaciones reactivas en DESARROLLO.
// SOLO se activa cuando ENVIRONMENT !== 'production'.
//
// Mecanismo:
//   - El frontend conecta a ws://api.localhost/ws?token=<bearer>
//   - El token se valida contra DEV_TOKEN (igual que authMiddleware en HTTP)
//   - Cuando un pipeline_job cambia de estado, PipelineJobsService llama al
//     notificador devuelto por createWsNotifier(), que emite un evento en el
//     jobEventBus (EventEmitter in-memory).
//   - El handler del WebSocket escucha ese evento y reenvía el payload al cliente.
//
// En producción el frontend usa Supabase Realtime directamente — este módulo
// no se registra y el EventEmitter nunca recibe eventos.

import { EventEmitter } from 'events';
import type { UpgradeWebSocket } from 'hono/ws';
import type { OpenAPIHono } from '@hono/zod-openapi';
import type { Env } from '../types/env';
import type { JobNotifier } from '../services/pipeline-jobs.service';
import { DEV_TOKEN, DEV_USER_ID } from '../middleware/auth.middleware';

// ── Bus de eventos in-memory ────────────────────────────────────────────────
const jobEventBus = new EventEmitter();
jobEventBus.setMaxListeners(200); // una conexión WS por tab de navegador

// ── Notificador para inyectar en PipelineJobsService ───────────────────────

/** Devuelve la función de notificación para conectar PipelineJobsService ↔ WS. */
export function createWsNotifier(): JobNotifier {
  return (userId, payload) => {
    jobEventBus.emit(`user:${userId}`, payload);
  };
}

// ── Registro de la ruta /ws ─────────────────────────────────────────────────

/**
 * Registra la ruta GET /ws en el app de Hono.
 * Debe llamarse antes de `serve()` y solo en desarrollo.
 *
 * @param app              Instancia de OpenAPIHono (el mismo app de index.ts)
 * @param upgradeWebSocket Función obtenida de createNodeWebSocket({ app })
 */
export function registerWebSocketRoute(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app: OpenAPIHono<any>,
  upgradeWebSocket: UpgradeWebSocket
): void {
  app.get(
    '/ws',
    upgradeWebSocket((c) => {
      // WS handshake no permite headers custom → token en query param
      const token  = c.req.query('token') ?? '';
      const userId = token === DEV_TOKEN ? DEV_USER_ID : null;

      if (!userId) {
        // Rechazo inmediato al abrir — no hay forma de devolver 401 en WS
        return {
          onOpen(_evt, ws) {
            ws.close(4001, 'Unauthorized');
          },
        };
      }

      let handler: ((payload: unknown) => void) | null = null;

      return {
        onOpen(_evt, ws) {
          handler = (payload: unknown) => {
            try {
              ws.send(JSON.stringify(payload));
            } catch {
              // Ignore send errors (connection may already be closing)
            }
          };
          jobEventBus.on(`user:${userId}`, handler);
          ws.send(JSON.stringify({ type: 'connected', userId }));
        },

        onClose() {
          if (handler) {
            jobEventBus.off(`user:${userId}`, handler);
            handler = null;
          }
        },

        onError() {
          if (handler) {
            jobEventBus.off(`user:${userId}`, handler);
            handler = null;
          }
        },
      };
    })
  );
}
