// src/cce/router.ts
// Crea y exporta el router del microsite CCE (EC0249).
// Este router se monta en el API gateway bajo el prefijo /cce.

import { OpenAPIHono } from '@hono/zod-openapi';
import { health } from './routes/health.route';
import { wizard } from './routes/wizard.route';
import type { Env } from '../core/types/env';

export function createCceRouter() {
  const router = new OpenAPIHono<{ Bindings: Env }>();
  router.route('/health', health);
  router.route('/wizard', wizard);
  return router;
}
