// src/index.ts
// Entry point del Cloudflare Worker
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { health } from './routes/health.route';
import { wizard } from './routes/wizard.route';
import { errorMiddleware } from './middleware/error.middleware';
import type { Env } from './types/env';

const app = new Hono<{ Bindings: Env }>();

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

// 404 handler
app.notFound((c) =>
  c.json({ success: false, error: `Route not found: ${c.req.method} ${c.req.path}` }, 404)
);

export default app;
