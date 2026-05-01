// src/dcfl/router.ts
// Crea y exporta el router del microsite DCFL (EC0366).
// Construye el SiteConfig leyendo el flow-map.yaml de DCFL e inyectándolo
// como contexto para el PipelineOrchestratorService.

import { OpenAPIHono } from '@hono/zod-openapi';
import { health } from './routes/health.route';
import { wizard } from './routes/wizard.route';
import formSchemaRoutes from './api/routes/form-schema.routes';
import type { Env } from '../core/types/env';
import type { SiteConfig } from '../core/types/pipeline.types';
import * as yaml from 'yaml';
import * as fs from 'fs';
import * as path from 'path';

// ── SiteConfig de DCFL ────────────────────────────────────────────────────────
// Se construye una vez al arrancar el servidor.
// En producción (Workers), el YAML es empaquetado en el bundle por wrangler.
// En desarrollo, se lee del filesystem local.

function loadDcflSiteConfig(): SiteConfig {
  try {
    const filePath = path.join(process.cwd(), 'src', 'dcfl', 'prompts', 'flow-map.yaml');
    const raw = fs.readFileSync(filePath, 'utf8');
    return {
      site_id:  'dcfl',
      flow_map: yaml.parse(raw),
    };
  } catch {
    return { site_id: 'dcfl', flow_map: { version: '0.0.0', pipelines: {} } };
  }
}

export const dcflSiteConfig: SiteConfig = loadDcflSiteConfig();

export function createDcflRouter() {
  const router = new OpenAPIHono<{ Bindings: Env }>();
  router.route('/health', health);
  router.route('/wizard', wizard);
  router.route('/api/form-schema', formSchemaRoutes);
  return router;
}
