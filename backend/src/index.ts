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

// ── Helpers de dominio ────────────────────────────────────────────────────────
//
// El backend está en  api.{dominio}  y el frontend en  {dominio}.
// Ambos se derivan de la URL de la propia petición al Worker; no hay
// ningún dominio hardcodeado ni variable de entorno para esto.
//
// Ejemplos:
//   Worker en api.knowto.dev   → permite knowto.dev y www.knowto.dev
//   Worker en api.knowto.mx    → permite knowto.mx  y www.knowto.mx
//   Worker en localhost:8787   → permite cualquier localhost (cualquier puerto)

function apexFromRequest(requestUrl: string): string | null {
  try {
    const host = new URL(requestUrl).hostname; // "api.knowto.dev"
    // Quita el primer segmento (el subdominio "api")
    const parts = host.split('.');
    return parts.length >= 2 ? parts.slice(1).join('.') : null;
  } catch {
    return null;
  }
}

function isAllowedOrigin(origin: string, requestUrl: string, isProd: boolean): boolean {
  try {
    const { hostname } = new URL(origin);

    if (!isProd) {
      // Desarrollo: acepta cualquier localhost independientemente del puerto
      return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    }

    // Producción: el frontend está en el dominio apex del propio Worker
    const apex = apexFromRequest(requestUrl);
    return apex !== null && (hostname === apex || hostname === `www.${apex}`);
  } catch {
    return false;
  }
}

// ============================================================================
// MIDDLEWARE GLOBAL
// ============================================================================
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: (origin, c) => {
      const isProd = (c.env as Env).ENVIRONMENT === 'production';
      return isAllowedOrigin(origin, c.req.url, isProd) ? origin : '';
    },
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
  servers: (() => {
    // URL del propio Worker en esta petición — siempre correcta sin config manual
    const workerOrigin = new URL(c.req.url).origin;
    return [
      { url: workerOrigin, description: 'Este servidor' },
    ];
  })(),
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
