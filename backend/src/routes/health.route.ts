// src/routes/health.route.ts
import { Hono } from 'hono';
import type { Env } from '../types/env';

const health = new Hono<{ Bindings: Env }>();

health.get('/', (c) => {
  return c.json({
    success: true,
    service: 'knowto-backend',
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
  });
});

export { health };
