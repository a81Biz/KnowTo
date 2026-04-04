// src/server.dev.ts
// Servidor de desarrollo en Node.js puro (NO workerd / NO wrangler sandbox).
//
// Por qué existe este archivo:
//   workerd (runtime de wrangler v3) bloquea fetch a IPs privadas RFC-1918
//   por seguridad. Esto impide llamar a Ollama (172.x / localhost) desde dentro
//   del Worker. @hono/node-server corre el mismo código Hono en Node.js sin
//   esa restricción, lo que además permite breakpoints nativos de VS Code.
//
// En producción se sigue desplegando con wrangler deploy — este archivo
// no se incluye en el bundle de Cloudflare Workers.

import { serve } from '@hono/node-server';
import app from './index';
import type { Env } from './types/env';

const port = parseInt(process.env['PORT'] ?? '8787', 10);

// Env mock que reemplaza los bindings de Cloudflare Workers.
// env.AI.run nunca se llama en dev (AIService usa Ollama directamente).
const devEnv: Env = {
  ENVIRONMENT:              process.env['ENVIRONMENT']              ?? 'development',
  OLLAMA_URL:               process.env['OLLAMA_URL']               ?? 'http://localhost:11434',
  OLLAMA_MODEL:             process.env['OLLAMA_MODEL']             ?? 'llama3.2:3b',
  SUPABASE_URL:             process.env['SUPABASE_URL']             ?? '',
  SUPABASE_SERVICE_ROLE_KEY: process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '',
  SUPABASE_JWT_SECRET:      process.env['SUPABASE_JWT_SECRET']      ?? '',
  AI: {
    // Solo se invocaría si ENVIRONMENT=production — no debería ocurrir en dev
    run: async () => { throw new Error('[server.dev] env.AI.run no disponible en modo desarrollo'); },
  } as Ai,
};

serve(
  {
    fetch: (req: Request) => app.fetch(req, devEnv),
    port,
    hostname: '0.0.0.0',
  },
  () => {
    console.log(`[knowto-dev] Backend corriendo en http://0.0.0.0:${port}`);
    console.log(`[knowto-dev] OLLAMA_URL  : ${devEnv.OLLAMA_URL}`);
    console.log(`[knowto-dev] OLLAMA_MODEL: ${devEnv.OLLAMA_MODEL}`);
    console.log(`[knowto-dev] Docs        : http://localhost:${port}/api/docs`);
  }
);
