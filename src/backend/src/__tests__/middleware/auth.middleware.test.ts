// src/__tests__/middleware/auth.middleware.test.ts
// Tests unitarios del auth middleware.
// NO se realizan llamadas reales a Supabase — se mockea createClient.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { authMiddleware, DEV_TOKEN, DEV_USER_ID } from '../../core/middleware/auth.middleware';
import type { Env } from '../../core/types/env';

// ── Mock de @supabase/supabase-js ────────────────────────────────────────────
const mockGetUser = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────
type TestEnv = Pick<Env, 'ENVIRONMENT' | 'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY'>;

function makeApp(envOverride: Partial<TestEnv> = {}) {
  const app = new Hono<{ Bindings: Env; Variables: { userId: string } }>();
  app.use('*', authMiddleware);
  app.get('/test', (c) => c.json({ userId: c.get('userId') }));
  return app;
}

const DEV_ENV = { ENVIRONMENT: 'development' } as Env;
const PROD_ENV = {
  ENVIRONMENT: 'production',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
} as Env;

// ── Tests ────────────────────────────────────────────────────────────────────
describe('authMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Sin token ───────────────────────────────────────────────────────────
  it('devuelve 401 cuando no hay encabezado Authorization', async () => {
    const res = await makeApp().request('/test', {}, DEV_ENV);
    expect(res.status).toBe(401);
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toBe('Unauthorized');
  });

  it('devuelve 401 si el esquema no es Bearer', async () => {
    const res = await makeApp().request('/test', { headers: { Authorization: 'Basic abc' } }, DEV_ENV);
    expect(res.status).toBe(401);
  });

  // ── Desarrollo ──────────────────────────────────────────────────────────
  it('acepta el token dev-local-bypass en desarrollo', async () => {
    const res = await makeApp().request(
      '/test',
      { headers: { Authorization: `Bearer ${DEV_TOKEN}` } },
      DEV_ENV
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { userId: string };
    expect(body.userId).toBe(DEV_USER_ID);
  });

  it('rechaza cualquier otro token en desarrollo (no llama a Supabase)', async () => {
    const res = await makeApp().request(
      '/test',
      { headers: { Authorization: 'Bearer otro-token-cualquiera' } },
      DEV_ENV
    );
    expect(res.status).toBe(401);
    // En dev nunca debe llamar a createClient
    const { createClient } = await import('@supabase/supabase-js');
    expect(createClient).not.toHaveBeenCalled();
  });

  // ── Producción ──────────────────────────────────────────────────────────
  it('rechaza el token dev-local-bypass en producción', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'invalid jwt' } });
    const res = await makeApp().request(
      '/test',
      { headers: { Authorization: `Bearer ${DEV_TOKEN}` } },
      PROD_ENV
    );
    expect(res.status).toBe(401);
  });

  it('acepta un JWT válido de Supabase en producción', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'prod-user-123' } }, error: null });
    const res = await makeApp().request(
      '/test',
      { headers: { Authorization: 'Bearer valid-supabase-jwt' } },
      PROD_ENV
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { userId: string };
    expect(body.userId).toBe('prod-user-123');
  });

  it('rechaza un JWT inválido en producción', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'invalid jwt' } });
    const res = await makeApp().request(
      '/test',
      { headers: { Authorization: 'Bearer invalid-jwt' } },
      PROD_ENV
    );
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('Invalid token');
  });

  it('rechaza cuando Supabase devuelve error', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: undefined }, error: { message: 'network error' } });
    const res = await makeApp().request(
      '/test',
      { headers: { Authorization: 'Bearer some-token' } },
      PROD_ENV
    );
    expect(res.status).toBe(401);
  });
});
