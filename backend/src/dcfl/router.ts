// src/dcfl/router.ts
// Crea y exporta el router del microsite DCFL (EC0366).
// Este router se monta en el API gateway bajo el prefijo /dcfl.
//
// Para añadir un nuevo microsite, crear un archivo análogo en src/[microsite]/router.ts
// y montarlo en src/index.ts con app.route('/[microsite]', create[Microsite]Router()).

import { OpenAPIHono } from '@hono/zod-openapi';
import { health } from './routes/health.route';
import { wizard } from './routes/wizard.route';
import type { Env } from '../core/types/env';

export function createDcflRouter() {
  const router = new OpenAPIHono<{ Bindings: Env }>();
  router.route('/health', health);
  router.route('/wizard', wizard);
  return router;
}
