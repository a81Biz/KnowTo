// src/index.ts
// API Gateway — punto de entrada único del Cloudflare Worker.
//
// Arquitectura de microsites:
//   Cada microsite expone un router montado bajo su slug:
//     /dcfl/*  → microsite EC0366 (Certificación)
//   Para añadir un nuevo microsite, importar su router y registrarlo aquí.
//
// Convención de URLs:
//   Dev:  http://api.localhost/[slug]/...
//   Prod: https://api.[dominio]/[slug]/...

import { OpenAPIHono } from '@hono/zod-openapi';
import { apiReference } from '@scalar/hono-api-reference';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { errorMiddleware } from './core/middleware/error.middleware';
import { createDcflRouter } from './dcfl/router';
import type { Env } from './core/types/env';

const app = new OpenAPIHono<{ Bindings: Env }>();

// ── Helpers de dominio ────────────────────────────────────────────────────────
//
// En desarrollo: todas las peticiones vienen de *.localhost → se aceptan.
// En producción: el frontend está en {slug}.{dominio-apex} y el backend en api.{dominio-apex}.
//
// El dominio-apex se deriva dinámicamente de la URL del propio Worker.
// No hay dominios hardcodeados ni variables de entorno para esto.

function apexFromRequest(requestUrl: string): string | null {
  try {
    const host = new URL(requestUrl).hostname; // "api.knowto.dev"
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
      // Desarrollo: acepta cualquier variante de localhost (incluye *.localhost)
      return (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname.endsWith('.localhost')
      );
    }

    // Producción: el frontend está en un subdominio del mismo dominio-apex del Worker
    const apex = apexFromRequest(requestUrl);
    return apex !== null && (hostname === apex || hostname.endsWith(`.${apex}`));
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
// HEALTH GLOBAL — /health
// ============================================================================
app.get('/health', (c) =>
  c.json({
    success: true,
    service: 'knowto-api',
    environment: (c.env as Env).ENVIRONMENT ?? 'unknown',
    timestamp: new Date().toISOString(),
  })
);

// ============================================================================
// MICROSITES
// ============================================================================
// ─── DCFL (EC0366) ─────────────────────────────────────────────────────────
app.route('/dcfl', createDcflRouter());

// Para añadir un nuevo microsite:
//   import { createFooRouter } from './foo/router';
//   app.route('/foo', createFooRouter());

// ============================================================================
// OPENAPI SPEC — /openapi.json
// ============================================================================
app.doc('/openapi.json', (c) => ({
  openapi: '3.0.0',
  info: {
    title: 'KnowTo API',
    version: '1.0.0',
    description:
      'API multi-microsite de KnowTo. Cada microsite tiene sus endpoints agrupados por tag.\n\n' +
      '**DCFL (EC0366):** Proceso de certificación EC0366 (CONOCER). ' +
      'Todos los endpoints de /dcfl/wizard requieren autenticación Bearer (Google OAuth via Supabase). ' +
      'En desarrollo local usar el token literal `dev-local-bypass`.',
  },
  servers: (() => {
    const workerOrigin = new URL(c.req.url).origin;
    return [{ url: workerOrigin, description: 'Este servidor' }];
  })(),
  tags: [
    { name: 'dcfl', description: 'Microsite EC0366 — Certificación de Diseño de Cursos de Formación' },
    // Para añadir un nuevo microsite, agregar su tag aquí:
    // { name: 'foo', description: 'Microsite Foo — descripción' },
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
// SWAGGER UI (Scalar) — /docs
// ============================================================================
app.get(
  '/docs',
  apiReference({
    spec: { url: '/openapi.json' },
    theme: 'kepler',
    layout: 'modern',
  })
);

// 404 handler
app.notFound((c) =>
  c.json({ success: false, error: `Route not found: ${c.req.method} ${c.req.path}` }, 404)
);

export default app;
