// frontend/dcfl/src/shared/ws.client.ts
//
// LEGADO — No se usa actualmente. Conservado por referencia.
//
// La notificación de jobs usa Supabase Realtime (supabase.realtime.ts)
// tanto en desarrollo (self-hosted Kong) como en producción (Supabase cloud).
// Este cliente WebSocket personalizado solo se activaría en producción (PROD=true)
// y solo si se re-integra en step.base.ts.

type WsMessage = {
  type?: string;
  job_id?: string;
  status?: string;
  result?: Record<string, unknown>;
  error?: string;
};

type MessageHandler = (msg: WsMessage) => void;

// En desarrollo se usa polling (GET /job/:jobId). WebSocket solo en producción.
const _IS_PRODUCTION =
  (import.meta.env.PROD as boolean) ||
  (import.meta.env['VITE_ENVIRONMENT'] as string) === 'production';

import { logger } from './logger';

class WsClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<MessageHandler>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private buildUrl(): string {
    const { hostname, protocol } = window.location;
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';

    // Mismo patrón de resolución de dominio que endpoints.ts
    const apex =
      hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
        ? 'localhost'
        : hostname.split('.').slice(1).join('.');

    return `${wsProtocol}//api.${apex}/ws?token=dev-local-bypass`;
  }

  connect(): void {
    if (!_IS_PRODUCTION) return; // Polling se usa en desarrollo — no WebSocket
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return;

    const url = this.buildUrl();
    logger.info('[ws] Conectando a', url);
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      logger.info('[ws] Conexión abierta');
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    };

    this.ws.onmessage = (evt: MessageEvent<string>) => {
      let msg: WsMessage;
      try {
        msg = JSON.parse(evt.data) as WsMessage;
      } catch {
        logger.warn('[ws] Mensaje no parseable', evt.data);
        return;
      }

      if (msg.type === 'connected') {
        logger.debug('[ws] Handshake recibido');
        return;
      }

      if (msg.job_id) {
        logger.debug('[ws] Mensaje recibido', { job_id: msg.job_id, status: msg.status });
        this.dispatch(`job_${msg.job_id}`, msg);
      }
    };

    this.ws.onclose = (evt) => {
      logger.info('[ws] Conexión cerrada', { code: evt.code, reason: evt.reason });
      // Reconectar automáticamente si no fue un cierre voluntario (código >= 4000 = error)
      if (evt.code < 4000) {
        logger.info('[ws] Reconectando en 3s...');
        this.reconnectTimer = setTimeout(() => this.connect(), 3000);
      }
    };

    this.ws.onerror = (evt) => {
      logger.error('[ws] Error de WebSocket', evt);
      this.ws?.close();
    };
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close(1000, 'Client disconnect');
    this.ws = null;
  }

  on(event: string, handler: MessageHandler): void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
  }

  off(event: string, handler: MessageHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  private dispatch(event: string, msg: WsMessage): void {
    this.handlers.get(event)?.forEach((h) => h(msg));
  }
}

export const wsClient = new WsClient();
