// src/dcfl/router.ts
// Crea y exporta el router del microsite DCFL (EC0366).
// Construye el SiteConfig leyendo el flow-map.yaml de DCFL e inyectándolo
// como contexto para el PipelineOrchestratorService.

import { OpenAPIHono } from '@hono/zod-openapi';
import { z } from 'zod';
import { health } from './routes/health.route';
import { wizard } from './routes/wizard.route';
import formSchemaRoutes from './api/routes/form-schema.routes';
import { testRoutes } from './routes/test.route';
import { temarioRoutes } from './routes/temario.route';
import { f3Routes } from './routes/f3.route';
import { certificationRoutes } from './routes/certification.route';
import { SupabaseService } from './services/supabase.service';
import { authMiddleware } from '../core/middleware/auth.middleware';
import type { Env } from '../core/types/env';
import type { SiteConfig } from '../core/types/pipeline.types';
import * as yaml from 'yaml';
import * as fs from 'fs';
import * as path from 'path';

// ── Aprobaciones ──────────────────────────────────────────────────────────────

const AprobacionSchema = z.object({
  projectId:    z.string().uuid(),
  fase:         z.string().min(1),
  aprobadoPor:  z.string().min(1),
  cargo:        z.string().optional(),
  observaciones: z.string().optional(),
  documentoMd:  z.string().optional(),
});

function generarFolio(projectId: string, seq: number): string {
  const hash8 = projectId.replace(/-/g, '').substring(0, 8).toUpperCase();
  return `DCFL-${hash8}-${String(seq + 1).padStart(3, '0')}`;
}

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
  const router = new OpenAPIHono<{ Bindings: Env; Variables: { userId: string } }>();
  router.route('/health', health);
  router.route('/wizard', wizard);
  router.use('/api/form-schema/*', authMiddleware);
  router.route('/api/form-schema', formSchemaRoutes);
  router.use('/api/temario/*', authMiddleware);
  router.route('/api/temario', temarioRoutes);
  router.use('/api/f3/*', authMiddleware);
  router.route('/api/f3', f3Routes);
  router.use('/api/certification-status/*', authMiddleware);
  router.route('/api/certification-status', certificationRoutes);
  router.use('/test/*', async (c, next) => {
    if (c.env.ENVIRONMENT === 'production') return c.json({ error: 'Not found' }, 404);
    return next();
  });
  router.route('/test', testRoutes);

  router.use('/api/aprobaciones', authMiddleware);
  router.post('/api/aprobaciones', async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = AprobacionSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, 400);
    }
    const { projectId, fase, aprobadoPor, cargo, observaciones, documentoMd } = parsed.data;
    const supabase = new SupabaseService(c.env);
    const userId = c.get('userId');
    try {
      // Verificar que el proyecto pertenece al usuario autenticado
      if (supabase.client && userId) {
        const { data: proj } = await supabase.client
          .from('projects')
          .select('id')
          .eq('id', projectId)
          .eq('user_id', userId)
          .maybeSingle();
        if (!proj) return c.json({ error: 'Forbidden' }, 403);
      }
      const seq = await supabase.countAprobaciones(projectId);
      const folio = generarFolio(projectId, seq);
      await supabase.saveAprobacion({ projectId, folio, fase, aprobadoPor, cargo, observaciones, documentoMd });
      return c.json({ success: true, folio }, 201);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar aprobación';
      console.error('[aprobaciones] Error:', err);
      return c.json({ error: msg }, 500);
    }
  });

  return router;
}
