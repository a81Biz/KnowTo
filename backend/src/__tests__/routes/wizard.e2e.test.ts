// src/__tests__/routes/wizard.e2e.test.ts
// Tests E2E de todos los endpoints /api/wizard/*.
//
// Estrategia de aislamiento:
//   • Se mockean SupabaseService y AIService → CERO escrituras a BD.
//   • Se usa app.request() de Hono con env mock → sin red real.
//   • Cada test es independiente (beforeEach limpia los mocks).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../../index';
import type { Env } from '../../types/env';

// ── Mocks de servicios ───────────────────────────────────────────────────────
const mockCreateProject       = vi.fn().mockResolvedValue({ projectId: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee' });
const mockSaveStep            = vi.fn().mockResolvedValue({ stepId:    'bbbbbbbb-cccc-4ddd-eeee-ffffffffffff' });
const mockSaveDocument        = vi.fn().mockResolvedValue({ documentId: 'cccccccc-dddd-4eee-ffff-000000000000' });
const mockGetContext          = vi.fn().mockResolvedValue({ project: { name: 'Test' } });
const mockGetProjects         = vi.fn().mockResolvedValue([]);
const mockAiGenerate          = vi.fn().mockResolvedValue('# Documento generado\nContenido de prueba.');
const mockSaveExtractedContext = vi.fn().mockResolvedValue({ extractedContextId: 'dddddddd-eeee-4fff-aaaa-111111111111' });
const mockExtract             = vi.fn().mockResolvedValue({
  extractorId: 'EXTRACTOR_F2',
  content: '## 1. ANÁLISIS DEL SECTOR/INDUSTRIA\nContenido extraído.',
  parserUsed: { 'F0.sector_industria': true },
  extractedContextId: 'dddddddd-eeee-4fff-aaaa-111111111111',
});

vi.mock('../../services/supabase.service', () => ({
  SupabaseService: vi.fn().mockImplementation(() => ({
    createProject:        mockCreateProject,
    saveStep:             mockSaveStep,
    saveDocument:         mockSaveDocument,
    getProjectContext:    mockGetContext,
    getUserProjects:      mockGetProjects,
    markStepError:        vi.fn(),
    saveExtractedContext: mockSaveExtractedContext,
  })),
}));

vi.mock('../../services/ai.service', () => ({
  AIService: vi.fn().mockImplementation(() => ({
    generate: mockAiGenerate,
  })),
}));

vi.mock('../../services/context-extractor.service', () => ({
  ContextExtractorService: vi.fn().mockImplementation(() => ({
    extract: mockExtract,
  })),
}));

// ── Constantes de test ───────────────────────────────────────────────────────
const DEV_ENV: Env = { ENVIRONMENT: 'development' } as Env;
const AUTH = { Authorization: 'Bearer dev-local-bypass' };
const JSON_HEADER = { 'Content-Type': 'application/json' };

const VALID_PROJECT_ID = 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee';
const VALID_STEP_ID    = 'bbbbbbbb-cccc-4ddd-eeee-ffffffffffff';

function post(path: string, body: unknown) {
  return app.request(path, {
    method: 'POST',
    headers: { ...AUTH, ...JSON_HEADER },
    body: JSON.stringify(body),
  }, DEV_ENV);
}

function get(path: string, auth = true) {
  return app.request(path, {
    headers: auth ? AUTH : {},
  }, DEV_ENV);
}

// ── Autenticación (aplica a todos los endpoints) ─────────────────────────────
describe('Autenticación', () => {
  it('todos los endpoints devuelven 401 sin token', async () => {
    const endpoints = [
      () => app.request('/api/wizard/projects', {}, DEV_ENV),
      () => app.request('/api/wizard/project/not-checked', {}, DEV_ENV),
      () => app.request('/api/wizard/project', { method: 'POST', headers: JSON_HEADER, body: '{}' }, DEV_ENV),
      () => app.request('/api/wizard/step',    { method: 'POST', headers: JSON_HEADER, body: '{}' }, DEV_ENV),
      () => app.request('/api/wizard/generate',{ method: 'POST', headers: JSON_HEADER, body: '{}' }, DEV_ENV),
      () => app.request('/api/wizard/extract', { method: 'POST', headers: JSON_HEADER, body: '{}' }, DEV_ENV),
    ];
    for (const call of endpoints) {
      const res = await call();
      expect(res.status, `Esperaba 401 en ${res.url}`).toBe(401);
    }
  });
});

// ── POST /api/wizard/project ─────────────────────────────────────────────────
describe('POST /api/wizard/project', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('crea un proyecto y devuelve 201 con projectId UUID', async () => {
    const res = await post('/api/wizard/project', {
      name: 'Curso de Seguridad Industrial',
      clientName: 'Juan Pérez',
      industry: 'Manufactura',
      email: 'juan@empresa.com',
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { success: boolean; data: { projectId: string } };
    expect(body.success).toBe(true);
    expect(body.data.projectId).toBe(VALID_PROJECT_ID);
    expect(mockCreateProject).toHaveBeenCalledOnce();
  });

  it('crea proyecto sin campos opcionales (industry/email)', async () => {
    const res = await post('/api/wizard/project', {
      name: 'Proyecto Mínimo',
      clientName: 'Ana García',
    });
    expect(res.status).toBe(201);
  });

  it('devuelve 400 si name tiene menos de 3 caracteres', async () => {
    const res = await post('/api/wizard/project', { name: 'AB', clientName: 'Ana García' });
    expect(res.status).toBe(400);
    expect(mockCreateProject).not.toHaveBeenCalled();
  });

  it('devuelve 400 si clientName falta', async () => {
    const res = await post('/api/wizard/project', { name: 'Proyecto Válido' });
    expect(res.status).toBe(400);
  });

  it('devuelve 400 si email no tiene formato válido', async () => {
    const res = await post('/api/wizard/project', {
      name: 'Proyecto',
      clientName: 'Ana',
      email: 'no-es-email',
    });
    expect(res.status).toBe(400);
  });

  it('devuelve 400 si el body está vacío', async () => {
    const res = await post('/api/wizard/project', {});
    expect(res.status).toBe(400);
  });
});

// ── GET /api/wizard/projects ─────────────────────────────────────────────────
describe('GET /api/wizard/projects', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('devuelve 200 con lista vacía', async () => {
    const res = await get('/api/wizard/projects');
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('devuelve 200 con proyectos cuando los hay', async () => {
    mockGetProjects.mockResolvedValueOnce([
      { project_id: VALID_PROJECT_ID, name: 'Test', client_name: 'Client', progress_pct: 10 },
    ]);
    const res = await get('/api/wizard/projects');
    expect(res.status).toBe(200);
    const body = await res.json() as { data: unknown[] };
    expect(body.data).toHaveLength(1);
  });
});

// ── GET /api/wizard/project/:projectId ──────────────────────────────────────
describe('GET /api/wizard/project/:projectId', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('devuelve 200 con el contexto del proyecto', async () => {
    const res = await get(`/api/wizard/project/${VALID_PROJECT_ID}`);
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: Record<string, unknown> };
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ project: { name: 'Test' } });
  });

  it('devuelve 400 si projectId no es UUID', async () => {
    const res = await get('/api/wizard/project/not-a-uuid');
    expect(res.status).toBe(400);
  });
});

// ── POST /api/wizard/step ────────────────────────────────────────────────────
describe('POST /api/wizard/step', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('guarda el paso y devuelve stepId', async () => {
    const res = await post('/api/wizard/step', {
      projectId: VALID_PROJECT_ID,
      stepNumber: 0,
      inputData: { courseTopic: 'Seguridad industrial' },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { stepId: string } };
    expect(body.data.stepId).toBe(VALID_STEP_ID);
  });

  it('devuelve 400 si projectId no es UUID', async () => {
    const res = await post('/api/wizard/step', {
      projectId: 'not-uuid',
      stepNumber: 0,
      inputData: {},
    });
    expect(res.status).toBe(400);
  });

  it('devuelve 400 si stepNumber está fuera de rango [0-9]', async () => {
    const res = await post('/api/wizard/step', {
      projectId: VALID_PROJECT_ID,
      stepNumber: 10,
      inputData: {},
    });
    expect(res.status).toBe(400);
  });
});

// ── POST /api/wizard/generate ────────────────────────────────────────────────
describe('POST /api/wizard/generate', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const VALID_BODY = {
    projectId: VALID_PROJECT_ID,
    stepId:    VALID_STEP_ID,
    phaseId:   'F0',
    promptId:  'F0',
    context:   { projectName: 'Proyecto Test', clientName: 'Juan Pérez', industry: 'Manufactura' },
    userInputs: { courseTopic: 'Seguridad' },
  };

  it('genera documento y devuelve documentId + content', async () => {
    const res = await post('/api/wizard/generate', VALID_BODY);
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { documentId: string; content: string } };
    expect(body.success).toBe(true);
    expect(body.data.documentId).toBe('cccccccc-dddd-4eee-ffff-000000000000');
    expect(body.data.content).toContain('Documento generado');
    expect(mockAiGenerate).toHaveBeenCalledOnce();
    expect(mockSaveDocument).toHaveBeenCalledOnce();
  });

  it('pasa el contexto correcto al AIService', async () => {
    await post('/api/wizard/generate', VALID_BODY);
    const [opts] = mockAiGenerate.mock.calls[0] as [{ context: { projectName: string } }];
    expect(opts.context.projectName).toBe('Proyecto Test');
  });

  it('devuelve 400 si phaseId es inválido', async () => {
    const res = await post('/api/wizard/generate', { ...VALID_BODY, phaseId: 'INVALID' });
    expect(res.status).toBe(400);
    expect(mockAiGenerate).not.toHaveBeenCalled();
  });

  it('devuelve 400 si promptId es inválido', async () => {
    const res = await post('/api/wizard/generate', { ...VALID_BODY, promptId: 'INVALID' });
    expect(res.status).toBe(400);
  });

  it('devuelve 400 si projectId no es UUID', async () => {
    const res = await post('/api/wizard/generate', { ...VALID_BODY, projectId: 'not-uuid' });
    expect(res.status).toBe(400);
  });

  it('devuelve 500 si AIService lanza un error', async () => {
    mockAiGenerate.mockRejectedValueOnce(new Error('Workers AI timeout'));
    const res = await post('/api/wizard/generate', VALID_BODY);
    expect(res.status).toBe(500);
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toContain('Workers AI timeout');
  });

  it('no persiste datos cuando AI falla (saveDocument no se llama)', async () => {
    mockAiGenerate.mockRejectedValueOnce(new Error('AI error'));
    await post('/api/wizard/generate', VALID_BODY);
    expect(mockSaveDocument).not.toHaveBeenCalled();
  });
});

// ── POST /api/wizard/extract ─────────────────────────────────────────────────
describe('POST /api/wizard/extract', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const VALID_EXTRACT_BODY = {
    projectId:       VALID_PROJECT_ID,
    extractorId:     'EXTRACTOR_F2',
    sourceDocuments: {
      F0: '# MARCO DE REFERENCIA\n## 1. ANÁLISIS DEL SECTOR/INDUSTRIA\nDatos del sector.',
      F1: '# INFORME DE NECESIDADES\n## 2. ANÁLISIS DE BRECHAS DE COMPETENCIA\nBrechas identificadas.',
    },
  };

  it('extrae contexto y devuelve 200 con content + parserUsed', async () => {
    const res = await post('/api/wizard/extract', VALID_EXTRACT_BODY);
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { extractorId: string; content: string; parserUsed: Record<string, boolean> } };
    expect(body.success).toBe(true);
    expect(body.data.extractorId).toBe('EXTRACTOR_F2');
    expect(typeof body.data.content).toBe('string');
    expect(mockExtract).toHaveBeenCalledOnce();
    expect(mockSaveExtractedContext).toHaveBeenCalledOnce();
  });

  it('llama a saveExtractedContext con los parámetros correctos', async () => {
    await post('/api/wizard/extract', VALID_EXTRACT_BODY);
    const [params] = mockSaveExtractedContext.mock.calls[0] as [{ projectId: string; extractorId: string; toPhase: string }];
    expect(params.projectId).toBe(VALID_PROJECT_ID);
    expect(params.extractorId).toBe('EXTRACTOR_F2');
    expect(params.toPhase).toBe('F2');
  });

  it('devuelve 400 si projectId no es UUID', async () => {
    const res = await post('/api/wizard/extract', { ...VALID_EXTRACT_BODY, projectId: 'not-uuid' });
    expect(res.status).toBe(400);
    expect(mockExtract).not.toHaveBeenCalled();
  });

  it('devuelve 400 si extractorId falta', async () => {
    const { extractorId: _, ...body } = VALID_EXTRACT_BODY;
    const res = await post('/api/wizard/extract', body);
    expect(res.status).toBe(400);
  });

  it('devuelve 400 si sourceDocuments falta', async () => {
    const res = await post('/api/wizard/extract', { projectId: VALID_PROJECT_ID, extractorId: 'EXTRACTOR_F2' });
    expect(res.status).toBe(400);
  });

  it('devuelve 500 si el extractor lanza un error', async () => {
    mockExtract.mockRejectedValueOnce(new Error('Extractor node not found'));
    const res = await post('/api/wizard/extract', VALID_EXTRACT_BODY);
    expect(res.status).toBe(500);
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toContain('Extractor node not found');
  });
});
