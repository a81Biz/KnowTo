// src/__tests__/cce/routes/health.cce.test.ts
import { describe, it, expect } from 'vitest';
import app from '../../../index';
import type { Env } from '../../../core/types/env';

const MOCK_ENV = { ENVIRONMENT: 'development' } as Env;

describe('GET /cce/health', () => {
  it('devuelve 200 con el shape correcto', async () => {
    const res = await app.request('/cce/health', {}, MOCK_ENV);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.success).toBe(true);
    expect(body.service).toBe('knowto-cce');
    expect(body.environment).toBe('development');
    expect(typeof body.timestamp).toBe('string');
  });

  it('no requiere autenticación', async () => {
    const res = await app.request('/cce/health', {}, MOCK_ENV);
    expect(res.status).toBe(200);
  });

  it('devuelve Content-Type application/json', async () => {
    const res = await app.request('/cce/health', {}, MOCK_ENV);
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('el timestamp es una fecha ISO válida', async () => {
    const res = await app.request('/cce/health', {}, MOCK_ENV);
    const body = await res.json() as { timestamp: string };
    expect(() => new Date(body.timestamp).toISOString()).not.toThrow();
  });
});

describe('GET /openapi.json — tags y paths CCE', () => {
  it('incluye el tag cce en la spec', async () => {
    const res = await app.request('/openapi.json', {}, MOCK_ENV);
    const spec = await res.json() as { tags: Array<{ name: string }> };
    expect(spec.tags.some((t) => t.name === 'cce')).toBe(true);
  });

  it('incluye los paths del wizard CCE en el spec', async () => {
    const res = await app.request('/openapi.json', {}, MOCK_ENV);
    const spec = await res.json() as { paths: Record<string, unknown> };
    expect(spec.paths['/cce/wizard/project']).toBeDefined();
    expect(spec.paths['/cce/wizard/projects']).toBeDefined();
    expect(spec.paths['/cce/wizard/step']).toBeDefined();
    expect(spec.paths['/cce/wizard/generate']).toBeDefined();
    expect(spec.paths['/cce/wizard/generate-form']).toBeDefined();
    expect(spec.paths['/cce/wizard/extract']).toBeDefined();
    expect(spec.paths['/cce/wizard/upload']).toBeDefined();
  });
});