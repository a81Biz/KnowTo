// src/shared/pubsub.ts
// Event bus para comunicación entre módulos (requerido por FRONTEND ARCHITECTURE DOCUMENT)

type Handler<T = unknown> = (data: T) => void;

class PubSubClass {
  private events: Map<string, Handler[]> = new Map();

  subscribe<T>(event: string, handler: Handler<T>): () => void {
    if (!this.events.has(event)) this.events.set(event, []);
    this.events.get(event)!.push(handler as Handler);

    return () => {
      const handlers = this.events.get(event) ?? [];
      this.events.set(event, handlers.filter((h) => h !== handler));
    };
  }

  publish<T>(event: string, data: T): void {
    (this.events.get(event) ?? []).forEach((h) => h(data));
  }

  once<T>(event: string, handler: Handler<T>): void {
    const unsub = this.subscribe<T>(event, (data) => {
      handler(data);
      unsub();
    });
  }
}

export const pubsub = new PubSubClass();

// Eventos tipados del sistema
export const EVENTS = {
  WIZARD_NEXT_STEP: 'wizard:nextStep',
  WIZARD_PREV_STEP: 'wizard:prevStep',
  WIZARD_STEP_COMPLETE: 'wizard:stepComplete',
  DOCUMENT_GENERATED: 'document:generated',
  AUTH_STATE_CHANGED: 'auth:stateChanged',
} as const;
