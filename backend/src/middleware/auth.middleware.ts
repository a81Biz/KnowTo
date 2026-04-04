// src/middleware/auth.middleware.ts
//
// PRODUCTION:   Solo acepta JWT válidos de Supabase (Google OAuth).
//               Cualquier otro token → 401.
//
// DESARROLLO:   Solo acepta el token literal 'dev-local-bypass'.
//               Cualquier otro token → 401 (evita llamar a Supabase sin vars).
//
import { createMiddleware } from 'hono/factory';
import { createClient } from '@supabase/supabase-js';
import type { Env } from '../types/env';

export const DEV_TOKEN = 'dev-local-bypass';
export const DEV_USER_ID = 'dev-user-local';

export const authMiddleware = createMiddleware<{ Bindings: Env; Variables: { userId: string } }>(
  async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const token = authHeader.slice(7);
    const isProd = c.env.ENVIRONMENT === 'production';

    // -----------------------------------------------------------------------
    // DESARROLLO — solo acepta el token de bypass; rechaza cualquier otro
    // para no intentar llamar a Supabase con variables no definidas.
    // -----------------------------------------------------------------------
    if (!isProd) {
      if (token === DEV_TOKEN) {
        c.set('userId', DEV_USER_ID);
        await next();
        return;
      }
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // -----------------------------------------------------------------------
    // PRODUCCIÓN — valida JWT de Google OAuth via Supabase
    // El token 'dev-local-bypass' es una cadena literal sin firma válida;
    // getUser() lo rechazará con error, garantizando que nunca funcione en prod.
    // -----------------------------------------------------------------------
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return c.json({ success: false, error: 'Invalid token' }, 401);
    }

    c.set('userId', data.user.id);
    await next();
  }
);
