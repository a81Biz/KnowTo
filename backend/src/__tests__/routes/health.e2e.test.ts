// src/__tests__/routes/health.e2e.test.ts
// Tests E2E del endpoint /dcfl/health.
// Se usa app.request() de Hono con un env mock — sin red real.

import { describe, it, expect } from 'vitest';
import app from '../../index';
import type { Env } from '../../core/types/env';

const MOCK_ENV = { ENVIRONMENT: 'development' } as Env;

describe('GET /health (global)', () => {
  it('devuelve 200 con el shape correcto', async () => {
    const res = await app.request('/health', {}, MOCK_ENV);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.success).toBe(true);
    expect(body.service).toBe('knowto-api');
    expect(body.environment).toBe('development');
    expect(typeof body.timestamp).toBe('string');
  });
});

describe('GET /dcfl/health', () => {
  it('devuelve 200 con el shape correcto', async () => {
    const res = await app.request('/dcfl/health', {}, MOCK_ENV);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.success).toBe(true);
    expect(body.service).toBe('knowto-dcfl');
    expect(body.environment).toBe('development');
    expect(typeof body.timestamp).toBe('string');
  });

  it('no requiere autenticación', async () => {
    const res = await app.request('/dcfl/health', {}, MOCK_ENV);
    expect(res.status).toBe(200);
  });

  it('devuelve Content-Type application/json', async () => {
    const res = await app.request('/dcfl/health', {}, MOCK_ENV);
    expect(res.headers.get('content-type')).toContain('application/json');
  });
});

describe('GET /openapi.json', () => {
  it('devuelve el spec OpenAPI válido', async () => {
    const res = await app.request('/openapi.json', {}, MOCK_ENV);
    expect(res.status).toBe(200);
    const spec = await res.json() as Record<string, unknown>;
    expect(spec.openapi).toBe('3.0.0');
    expect((spec.info as Record<string, unknown>).title).toBe('KnowTo API');
    expect(spec.paths).toBeDefined();
  });

  it('incluye los paths del wizard DCFL en el spec', async () => {
    const res = await app.request('/openapi.json', {}, MOCK_ENV);
    const spec = await res.json() as { paths: Record<string, unknown> };
    expect(spec.paths['/dcfl/wizard/project']).toBeDefined();
    expect(spec.paths['/dcfl/wizard/projects']).toBeDefined();
    expect(spec.paths['/dcfl/wizard/step']).toBeDefined();
    expect(spec.paths['/dcfl/wizard/generate']).toBeDefined();
  });

  it('incluye el tag dcfl en la spec', async () => {
    const res = await app.request('/openapi.json', {}, MOCK_ENV);
    const spec = await res.json() as { tags: Array<{ name: string }> };
    expect(spec.tags.some((t) => t.name === 'dcfl')).toBe(true);
  });
});
