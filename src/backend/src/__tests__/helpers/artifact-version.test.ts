/**
 * PT-076 — saveArtifactVersion tests
 * Tests the 3-step atomic sequence: deactivate → compute version → insert
 * and verifies prompt_hash computation and projection update behavior.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'crypto';
import { SupabaseService } from '../../dcfl/services/supabase.service';
import type { Env } from '../../core/types/env';
import type { P1Artifact } from '../../dcfl/types/certification.types';

// ── Chainable Supabase mock ───────────────────────────────────────────────────

const INSERTED_ROW = {
  id: 'mock-av-id-001',
  project_id: 'proj-001',
  product_code: 'P1',
  version: 1,
  artifact: {},
  documento_md: null,
  prompt_template_id: null,
  prompt_template_version: null,
  prompt_hash: null,
  model: null,
  generated_by: null,
  cert_score: null,
  correction_log: null,
  derived_from_artifact_id: null,
  created_at: new Date().toISOString(),
  is_active: true,
};

const mockUpdate = vi.fn();
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();

function buildChain() {
  const chain: any = {
    update: (...a: any[]) => { mockUpdate(...a); return chain; },
    insert: (...a: any[]) => { mockInsert(...a); return chain; },
    select: (...a: any[]) => { mockSelect(...a); return chain; },
    eq:     (...a: any[]) => { mockEq(...a);     return chain; },
    order:  (...a: any[]) => { mockOrder(...a);  return chain; },
    limit:  (...a: any[]) => { mockLimit(...a);  return chain; },
    maybeSingle: async () => { mockMaybeSingle(); return { data: null, error: null }; },
    single:      async () => { mockSingle();      return { data: INSERTED_ROW, error: null }; },
  };
  return chain;
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: () => buildChain() })),
}));

const PROD_ENV: Env = {
  ENVIRONMENT: 'production',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-key',
} as Env;

const DEV_ENV = { ENVIRONMENT: 'development' } as Env;

// ── Fixture ───────────────────────────────────────────────────────────────────

const p1Artifact: P1Artifact = {
  productCode: 'P1',
  modalidad: 'presencial',
  idioma: 'es',
  unidades: [],
  criterios: [],
};

const baseCertScore = {
  overall: 100,
  axes: {
    bloom_alignment: 100,
    weight_balance: 100,
    modality_consistency: 100,
    language_compliance: 100,
    observable_verbs: 100,
    p4_coverage: 100,
  },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('saveArtifactVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockReturnValue(undefined);
    mockInsert.mockReturnValue(undefined);
  });

  it('throws when Supabase client is not initialised (dev mode)', async () => {
    const svc = new SupabaseService(DEV_ENV);
    await expect(
      svc.saveArtifactVersion({
        projectId: 'p1', productCode: 'P1', artifact: p1Artifact,
        documentoMd: '# Test', certScore: baseCertScore, status: 'valid',
      }),
    ).rejects.toThrow('saveArtifactVersion: Supabase client not initialised');
  });

  it('resolves with an ArtifactVersion-shaped object in prod mode', async () => {
    const svc = new SupabaseService(PROD_ENV);
    const result = await svc.saveArtifactVersion({
      projectId: 'proj-001', productCode: 'P1', artifact: p1Artifact,
      documentoMd: '# P1', certScore: baseCertScore, status: 'valid',
    });
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('is_active', true);
  });

  it('computes correct prompt_hash when templateId and version are provided', async () => {
    const svc = new SupabaseService(PROD_ENV);
    const templateId = 'F4_P1_GENERATE_DOCUMENT';
    const templateVersion = '1.0';
    const expectedHash = createHash('sha256')
      .update(`${templateId}|${templateVersion}`)
      .digest('hex');

    await svc.saveArtifactVersion({
      projectId: 'proj-001', productCode: 'P1', artifact: p1Artifact,
      documentoMd: '# P1', certScore: baseCertScore, status: 'valid',
      promptTemplateId: templateId, promptTemplateVersion: templateVersion,
    });

    const insertedPayload = mockInsert.mock.calls[0]?.[0];
    expect(insertedPayload?.prompt_hash).toBe(expectedHash);
  });

  it('sets prompt_hash to null when templateId/version are absent', async () => {
    const svc = new SupabaseService(PROD_ENV);
    await svc.saveArtifactVersion({
      projectId: 'proj-001', productCode: 'P1', artifact: p1Artifact,
      documentoMd: '# P1', certScore: baseCertScore, status: 'valid',
    });

    const insertedPayload = mockInsert.mock.calls[0]?.[0];
    expect(insertedPayload?.prompt_hash).toBeNull();
  });

  it('stores derivedFromArtifactId in the insert payload when provided', async () => {
    const svc = new SupabaseService(PROD_ENV);
    await svc.saveArtifactVersion({
      projectId: 'proj-001', productCode: 'P1', artifact: p1Artifact,
      documentoMd: '# P1', certScore: baseCertScore, status: 'corrected',
      derivedFromArtifactId: 'parent-av-id',
    });

    const insertedPayload = mockInsert.mock.calls[0]?.[0];
    expect(insertedPayload?.derived_from_artifact_id).toBe('parent-av-id');
  });

  it('inserts with is_active=true', async () => {
    const svc = new SupabaseService(PROD_ENV);
    await svc.saveArtifactVersion({
      projectId: 'proj-001', productCode: 'P1', artifact: p1Artifact,
      documentoMd: '# P1', certScore: baseCertScore, status: 'valid',
    });

    const insertedPayload = mockInsert.mock.calls[0]?.[0];
    expect(insertedPayload?.is_active).toBe(true);
  });

  it('calls deactivate (update is_active=false) before insert', async () => {
    const svc = new SupabaseService(PROD_ENV);
    await svc.saveArtifactVersion({
      projectId: 'proj-001', productCode: 'P1', artifact: p1Artifact,
      documentoMd: '# P1', certScore: baseCertScore, status: 'valid',
    });

    // update is called for deactivation (first call) and projection (third call)
    expect(mockUpdate).toHaveBeenCalledWith({ is_active: false });
  });

  it('does NOT update fase4_productos projection for non-product codes (e.g. F3)', async () => {
    const svc = new SupabaseService(PROD_ENV);
    const updateCallsBefore = mockUpdate.mock.calls.length;
    await svc.saveArtifactVersion({
      projectId: 'proj-001', productCode: 'F3', artifact: p1Artifact,
      documentoMd: '# F3', certScore: baseCertScore, status: 'valid',
    });
    // Only the deactivate update — no projection update for non-P codes
    const updateCalls = mockUpdate.mock.calls.length - updateCallsBefore;
    expect(updateCalls).toBe(1);
  });
});
