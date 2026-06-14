// src/__tests__/routes/certification.e2e.test.ts
//
// PT-084 — Tests E2E: Certification Canonical Model Sprint 2 endpoints.
//
// Coverage:
//   1.  GET  /dcfl/api/certification-status/:id  → 8 products with certScore
//   2.  GET  /dcfl/api/certification-status/:id  → certificable:false when product rejected
//   3.  GET  /dcfl/api/certification-status/:id  → certificable:false when product missing
//   4.  POST /dcfl/wizard/step/complete          → 409 when F4 step is not certificable
//   5.  POST /dcfl/wizard/step/complete          → 200 when F4 step is certificable
//   6.  GET  /dcfl/api/f3/:id/validation-status  → plataforma:false when F3 not filled
//   7.  GET  /dcfl/api/f3/:id/validation-status  → plataforma:true when F3 has data
//   8.  PATCH /dcfl/api/f3/:id/structured        → 200 + creates ArtifactVersion for F3
//   9.  PATCH /dcfl/api/f3/:id/structured        → 400 when no fields provided
//   10. GET  /dcfl/api/certification-status/:id  → certificable:true when NullRulesEngine (no estandarNorma)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../../index';
import type { Env } from '../../core/types/env';

// ── Chainable Supabase query builder mock ────────────────────────────────────
//
// Builds a mock that supports: .from(t).select(...).eq(...).in(...).maybeSingle()
// and .from(t).update(...).eq(...)
// Returns { data: rows, error: null } at the end of the chain.

function makeQueryBuilder(data: unknown, error: unknown = null) {
  const builder: any = {
    select: () => builder,
    eq:     () => builder,
    in:     () => builder,
    is:     () => builder,
    update: () => builder,
    insert: () => builder,
    delete: () => builder,
    single: () => Promise.resolve({ data, error }),
    maybeSingle: () => Promise.resolve({ data, error }),
    then: (resolve: (v: any) => any) => Promise.resolve({ data, error }).then(resolve),
  };
  return builder;
}

// Creates a mock client where each table name maps to its mock data.
// Unknown tables get { data: null, error: null }.
function makeClientMock(tableMap: Record<string, unknown>) {
  return {
    from: (table: string) => makeQueryBuilder(tableMap[table] ?? null),
  };
}

// ── Mock stubs — redefined per test in beforeEach ────────────────────────────

const mockGetF3Especificaciones = vi.fn();
const mockSaveArtifactVersion   = vi.fn().mockResolvedValue({ id: 'av-001', version: 1 });
const mockGetProjectBrief       = vi.fn().mockResolvedValue({ estandarNorma: 'EC0366', dominioTecnico: 'seguridad industrial' });
const mockSaveF4Produto         = vi.fn().mockResolvedValue(undefined);
let   mockClient: any           = null;

vi.mock('../../dcfl/services/supabase.service', () => ({
  SupabaseService: vi.fn().mockImplementation(() => ({
    createProject:        vi.fn().mockResolvedValue({ projectId: PROJECT_ID }),
    saveStep:             vi.fn().mockResolvedValue({ stepId: STEP_ID }),
    saveDocument:         vi.fn().mockResolvedValue({}),
    getProjectContext:    vi.fn().mockResolvedValue({ project: { name: 'Test' } }),
    getUserProjects:      vi.fn().mockResolvedValue([]),
    markStepError:        vi.fn(),
    saveExtractedContext: vi.fn().mockResolvedValue({}),
    getTemarioBase:       vi.fn().mockResolvedValue(null),
    getProjectBrief:      mockGetProjectBrief,
    saveProjectBrief:     vi.fn().mockResolvedValue(undefined),
    getF3Especificaciones: mockGetF3Especificaciones,
    saveArtifactVersion:  mockSaveArtifactVersion,
    saveF4Produto:        mockSaveF4Produto,
    get client() { return mockClient; },
  })),
}));

vi.mock('../../core/services/ai.service', () => {
  const M: any = vi.fn().mockImplementation(() => ({
    generate: vi.fn().mockResolvedValue(''),
    runAgent: vi.fn().mockResolvedValue('{}'),
  }));
  M.sanitizeOutput = (t: string) => t;
  return { AIService: M };
});

// ── Constants ────────────────────────────────────────────────────────────────

const DEV_ENV: Env = { ENVIRONMENT: 'development' } as Env;
const AUTH         = { Authorization: 'Bearer dev-local-bypass' };
const JSON_HEADER  = { 'Content-Type': 'application/json' };
const PROJECT_ID   = 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee';
const STEP_ID      = 'bbbbbbbb-cccc-4ddd-eeee-ffffffffffff';

// All 8 product codes, each with status 'valid' and a full CertificationScore.
const ALL_VALID_ARTIFACTS = ['P1','P2','P3','P4','P5','P6','P7','P8'].map(code => ({
  product_code: code,
  version: 1,
  is_active: true,
  status: 'valid',
  cert_score: { cobertura: 100, bloom: 100, modalidad: 100, idioma: 100, vocabulario: 100, trazabilidad: 100, total: 100 },
}));

function get(path: string) {
  return app.request(path, { headers: AUTH }, DEV_ENV);
}

function patch(path: string, body: unknown) {
  return app.request(path, {
    method: 'PATCH',
    headers: { ...AUTH, ...JSON_HEADER },
    body: JSON.stringify(body),
  }, DEV_ENV);
}

function postJson(path: string, body: unknown) {
  return app.request(path, {
    method: 'POST',
    headers: { ...AUTH, ...JSON_HEADER },
    body: JSON.stringify(body),
  }, DEV_ENV);
}

// ── 1-3: GET /dcfl/api/certification-status/:id ──────────────────────────────

describe('GET /dcfl/api/certification-status/:id', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('1. returns all 8 products with certScore and certificable:true when all valid', async () => {
    mockClient = makeClientMock({
      projects: { id: PROJECT_ID },
      artifact_versions: ALL_VALID_ARTIFACTS,
    });

    const res = await get(`/dcfl/api/certification-status/${PROJECT_ID}`);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.certificable).toBe(true);
    expect(Object.keys(body.products)).toHaveLength(8);
    const p1 = body.products['P1'];
    expect(p1.status).toBe('valid');
    expect(p1.certScore.total).toBe(100);
    expect(body.projectCertScore.total).toBe(100);
  });

  it('2. returns certificable:false when one product has status rejected', async () => {
    const artifacts = ALL_VALID_ARTIFACTS.map(a =>
      a.product_code === 'P1' ? { ...a, status: 'rejected' } : a
    );
    mockClient = makeClientMock({
      projects: { id: PROJECT_ID },
      artifact_versions: artifacts,
    });

    const res = await get(`/dcfl/api/certification-status/${PROJECT_ID}`);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.certificable).toBe(false);
    expect(body.products['P1'].status).toBe('rejected');
  });

  it('3. returns certificable:false when a product is missing', async () => {
    const artifacts = ALL_VALID_ARTIFACTS.filter(a => a.product_code !== 'P3');
    mockClient = makeClientMock({
      projects: { id: PROJECT_ID },
      artifact_versions: artifacts,
    });

    const res = await get(`/dcfl/api/certification-status/${PROJECT_ID}`);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.certificable).toBe(false);
    expect(body.products['P3']).toBeUndefined();
  });
});

// ── 4-5: POST /dcfl/wizard/step/complete (PT-082 gate) ───────────────────────

describe('POST /dcfl/wizard/step/complete (PT-082 certification gate)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('4. returns 409 when F4 step is not certificable (missing products)', async () => {
    // wizard_steps returns step_number=5 (F4), artifact_versions returns only 7 products
    const partialArtifacts = ALL_VALID_ARTIFACTS.filter(a => a.product_code !== 'P8');

    // The step.handlers.ts queries wizard_steps then artifact_versions sequentially
    // We need the chainable builder to differentiate by table.
    let callCount = 0;
    mockClient = {
      from: (table: string) => {
        if (table === 'wizard_steps') {
          return makeQueryBuilder({ step_number: 5, project_id: PROJECT_ID });
        }
        if (table === 'artifact_versions') {
          return makeQueryBuilder(partialArtifacts);
        }
        return makeQueryBuilder(null);
      },
    };

    const res = await postJson('/dcfl/wizard/step/complete', { stepId: STEP_ID });
    expect(res.status).toBe(409);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
    expect(body.certificable).toBe(false);
    expect(body.violaciones).toBeInstanceOf(Array);
    expect(body.violaciones.some((v: any) => v.field === 'P8')).toBe(true);
  });

  it('5. returns 200 when F4 step is certificable (all 8 present, none rejected)', async () => {
    let wizardCalls = 0;
    mockClient = {
      from: (table: string) => {
        if (table === 'wizard_steps') {
          wizardCalls++;
          // 1st call = select lookup; 2nd call = update to completed
          return wizardCalls === 1
            ? makeQueryBuilder({ step_number: 5, project_id: PROJECT_ID })
            : makeQueryBuilder({ status: 'completed' });
        }
        if (table === 'artifact_versions') {
          return makeQueryBuilder(ALL_VALID_ARTIFACTS);
        }
        return makeQueryBuilder(null);
      },
    };

    const res = await postJson('/dcfl/wizard/step/complete', { stepId: STEP_ID });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
  });
});

// ── 6-7: GET /dcfl/api/f3/:id/validation-status ──────────────────────────────

describe('GET /dcfl/api/f3/:id/validation-status', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('6. returns plataforma:false modalidad:false when F3 not filled', async () => {
    mockGetF3Especificaciones.mockResolvedValue(null);
    mockClient = makeClientMock({ projects: { id: PROJECT_ID } });

    const res = await get(`/dcfl/api/f3/${PROJECT_ID}/validation-status`);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.plataforma).toBe(false);
    expect(body.modalidad).toBe(false);
    expect(body.f3_exists).toBe(false);
  });

  it('7. returns plataforma:true modalidad:true when F3 has platform and modalidad data', async () => {
    mockGetF3Especificaciones.mockResolvedValue({
      plataforma_navegador: { plataforma: 'Moodle', modalidad: 'virtual', modalidad_curso: 'virtual' },
      criterios_aceptacion: [{ criterio: 'Aprobación >80%' }],
      calculo_duracion: null,
    });
    mockClient = makeClientMock({ projects: { id: PROJECT_ID } });

    const res = await get(`/dcfl/api/f3/${PROJECT_ID}/validation-status`);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.plataforma).toBe(true);
    expect(body.modalidad).toBe(true);
    expect(body.idioma_ok).toBe(true);
    expect(body.f3_exists).toBe(true);
  });
});

// ── 8-9: PATCH /dcfl/api/f3/:id/structured ───────────────────────────────────

describe('PATCH /dcfl/api/f3/:id/structured', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('8. updates F3 and creates ArtifactVersion with productCode F3', async () => {
    mockGetF3Especificaciones.mockResolvedValue({
      plataforma_navegador: {},
      criterios_aceptacion: null,
      calculo_duracion: null,
      documento_final: '',
    });
    mockClient = {
      from: (table: string) => {
        if (table === 'projects') return makeQueryBuilder({ id: PROJECT_ID });
        if (table === 'fase3_especificaciones') return makeQueryBuilder({ status: 'ok' });
        return makeQueryBuilder(null);
      },
    };

    const res = await patch(`/dcfl/api/f3/${PROJECT_ID}/structured`, {
      plataforma: 'Moodle',
      modalidad: 'virtual',
      idioma: 'es',
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.ok).toBe(true);
    expect(body.updatedFields.plataforma).toBe(true);
    expect(body.updatedFields.modalidad).toBe(true);
    expect(mockSaveArtifactVersion).toHaveBeenCalledOnce();
    const saveCall = mockSaveArtifactVersion.mock.calls[0][0];
    expect(saveCall.productCode).toBe('F3');
    expect(saveCall.artifact.plataforma).toBe('Moodle');
    expect(saveCall.artifact.modalidad).toBe('virtual');
  });

  it('9. returns 400 when no fields are provided', async () => {
    mockClient = makeClientMock({ projects: { id: PROJECT_ID } });

    const res = await patch(`/dcfl/api/f3/${PROJECT_ID}/structured`, {});
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toMatch(/At least one field required/i);
    expect(mockSaveArtifactVersion).not.toHaveBeenCalled();
  });
});

// ── 10: NullRulesEngine path ──────────────────────────────────────────────────

describe('NullRulesEngine (project without estandarNorma)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('10. certification-status returns certificable:true even without estandarNorma', async () => {
    // NullRulesEngine produces no violations — all products are 'valid' regardless
    mockGetProjectBrief.mockResolvedValue({ estandarNorma: null, dominioTecnico: 'generico' });
    mockClient = makeClientMock({
      projects: { id: PROJECT_ID },
      artifact_versions: ALL_VALID_ARTIFACTS,
    });

    const res = await get(`/dcfl/api/certification-status/${PROJECT_ID}`);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    // The certification route only reads artifact_versions — NullRulesEngine
    // doesn't change status values already stored. All 8 are valid → certificable.
    expect(body.certificable).toBe(true);
  });
});
