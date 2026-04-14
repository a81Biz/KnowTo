// src/cce/router.ts
// Crea y exporta el router del microsite CCE (EC0249).
// Construye el SiteConfig leyendo el flow-map.yaml de CCE e inyectándolo
// como contexto para el PipelineOrchestratorService.

import { OpenAPIHono } from '@hono/zod-openapi';
import { health } from './routes/health.route';
import { wizard } from './routes/wizard.route';
import type { Env } from '../core/types/env';
import type { SiteConfig } from '../core/types/pipeline.types';
import * as yaml from 'yaml';
import * as fs from 'fs';
import * as path from 'path';

// ── SiteConfig de CCE ─────────────────────────────────────────────────────────
// Se construye una vez al arrancar el servidor (no por request).
// En Cloudflare Workers (producción), el fs.readFileSync se ejecuta en tiempo
// de bundling via wrangler, que empaqueta el archivo en el worker bundle.
// En desarrollo, se lee del filesystem local.

function loadCceSiteConfig(): SiteConfig {
  try {
    const filePath = path.join(process.cwd(), 'src', 'cce', 'prompts', 'flow-map.yaml');
    const raw = fs.readFileSync(filePath, 'utf8');
    return {
      site_id:  'cce',
      flow_map: yaml.parse(raw),
    };
  } catch {
    // Fallback: flow-map vacío si el archivo no está disponible (ej. en tests)
    return { site_id: 'cce', flow_map: { version: '0.0.0', pipelines: {} } };
  }
}

export const cceSiteConfig: SiteConfig = loadCceSiteConfig();

export function createCceRouter() {
  const router = new OpenAPIHono<{ Bindings: Env }>();
  router.route('/health', health);
  router.route('/wizard', wizard);
  return router;
}
