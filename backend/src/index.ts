// src/index.ts
// Entry point del Cloudflare Worker
import { OpenAPIHono } from '@hono/zod-openapi';
import { apiReference } from '@scalar/hono-api-reference';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { health } from './routes/health.route';
import { wizard } from './routes/wizard.route';
import { errorMiddleware } from './middleware/error.middleware';
import type { Env } from './types/env';

const app = new OpenAPIHono<{ Bindings: Env }>();

// ============================================================================
// MIDDLEWARE GLOBAL
// ============================================================================
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: ['http://localhost:5173', 'https://knowto.dev'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })
);
app.use('*', errorMiddleware);

// ============================================================================
// RUTAS
// ============================================================================
app.route('/api/health', health);
app.route('/api/wizard', wizard);

// ============================================================================
// OPENAPI SPEC — /api/openapi.json
// ============================================================================
app.doc('/api/openapi.json', (c) => ({
  openapi: '3.0.0',
  info: {
    title: 'KnowTo API',
    version: '1.0.0',
    description:
      'API para el proceso de certificación EC0366 (CONOCER). ' +
      'Todos los endpoints de /api/wizard requieren autenticación Bearer (Google OAuth via Supabase). ' +
      'En desarrollo local usar el token literal `dev-local-bypass`.',
  },
  servers: [
    { url: 'http://localhost:8787', description: 'Desarrollo local (wrangler dev)' },
    { url: 'https://knowto-backend.workers.dev', description: `Producción (${c.env.ENVIRONMENT ?? 'cloudflare'})` },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          '**Producción:** JWT de Google OAuth emitido por Supabase.\n\n' +
          '**Desarrollo local:** usar el token literal `dev-local-bypass`.',
      },
    },
  },
}));

// ============================================================================
// SWAGGER UI (Scalar) — /api/docs
// ============================================================================
app.get(
  '/api/docs',
  apiReference({
    spec: { url: '/api/openapi.json' },
    theme: 'kepler',
    layout: 'modern',
  })
);

// 404 handler
app.notFound((c) =>
  c.json({ success: false, error: `Route not found: ${c.req.method} ${c.req.path}` }, 404)
);

export default app;
