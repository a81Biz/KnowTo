// src/middleware/error.middleware.ts
import { createMiddleware } from 'hono/factory';

export const errorMiddleware = createMiddleware(async (c, next) => {
  try {
    await next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[ERROR]', message);
    return c.json(
      { success: false, error: message, timestamp: new Date().toISOString() },
      500
    );
  }
});
