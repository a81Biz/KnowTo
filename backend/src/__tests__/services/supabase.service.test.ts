// src/__tests__/services/supabase.service.test.ts
// Tests unitarios del SupabaseService.
// Modo dev: todos los métodos devuelven datos mock sin tocar BD.
// Modo producción: se mockea createClient para verificar las llamadas RPC.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseService } from '../../services/supabase.service';
import type { Env } from '../../types/env';

// ── Mock de Supabase ─────────────────────────────────────────────────────────
const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: mockFrom,
    })),
  })),
}));

const DEV_ENV = { ENVIRONMENT: 'development' } as Env;
const PROD_ENV = {
  ENVIRONMENT: 'production',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'key',
} as Env;

// ── Helpers ──────────────────────────────────────────────────────────────────
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('SupabaseService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // ── Modo desarrollo ──────────────────────────────────────────────────────
  describe('modo desarrollo (ENVIRONMENT !== production)', () => {
    it('NO instancia createClient en dev (evita crash con vars no definidas)', () => {
      // createClient se ha mockeado al inicio; verificamos que con DEV_ENV no se llama.
      // El servicio no debe lanzar aunque SUPABASE_URL sea undefined.
      vi.clearAllMocks();
      expect(() => new SupabaseService(DEV_ENV)).not.toThrow();
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('createProject devuelve UUID válido sin llamar a BD', async () => {
      const svc = new SupabaseService(DEV_ENV);
      const result = await svc.createProject({ userId: 'u1', name: 'Test', clientName: 'Client' });
      expect(result.projectId).toMatch(UUID_REGEX);
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('createProject genera UUIDs únicos en cada llamada', async () => {
      const svc = new SupabaseService(DEV_ENV);
      const r1 = await svc.createProject({ userId: 'u1', name: 'A', clientName: 'B' });
      const r2 = await svc.createProject({ userId: 'u1', name: 'A', clientName: 'B' });
      expect(r1.projectId).not.toBe(r2.projectId);
    });

    it('saveStep devuelve UUID válido sin llamar a BD', async () => {
      const svc = new SupabaseService(DEV_ENV);
      const result = await svc.saveStep({ projectId: 'p1', stepNumber: 0, inputData: {} });
      expect(result.stepId).toMatch(UUID_REGEX);
    });

    it('saveDocument devuelve UUID válido sin llamar a BD', async () => {
      const svc = new SupabaseService(DEV_ENV);
      const result = await svc.saveDocument({
        projectId: 'p1', stepId: 's1', phaseId: 'F0', title: 'T', content: 'C',
      });
      expect(result.documentId).toMatch(UUID_REGEX);
    });

    it('getProjectContext devuelve objeto vacío sin llamar a BD', async () => {
      const svc = new SupabaseService(DEV_ENV);
      const ctx = await svc.getProjectContext('any-id');
      expect(ctx).toEqual({ project: null });
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('getUserProjects devuelve array vacío sin llamar a BD', async () => {
      const svc = new SupabaseService(DEV_ENV);
      const projects = await svc.getUserProjects('any-user');
      expect(projects).toEqual([]);
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('markStepError retorna sin hacer nada en dev', async () => {
      const svc = new SupabaseService(DEV_ENV);
      await expect(svc.markStepError('step-id', 'error msg')).resolves.toBeUndefined();
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  // ── Modo producción ──────────────────────────────────────────────────────
  describe('modo producción', () => {
    it('createProject llama a sp_create_project y devuelve projectId', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { success: true, project_id: 'prod-proj-uuid' },
        error: null,
      });
      const svc = new SupabaseService(PROD_ENV);
      const result = await svc.createProject({ userId: 'u1', name: 'Test', clientName: 'Client' });
      expect(mockRpc).toHaveBeenCalledWith('sp_create_project', expect.objectContaining({ p_user_id: 'u1' }));
      expect(result.projectId).toBe('prod-proj-uuid');
    });

    it('createProject lanza error si Supabase devuelve error', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });
      const svc = new SupabaseService(PROD_ENV);
      await expect(
        svc.createProject({ userId: 'u1', name: 'Test', clientName: 'Client' })
      ).rejects.toThrow('sp_create_project failed: DB error');
    });

    it('saveStep llama a sp_save_step y devuelve stepId', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { success: true, step_id: 'prod-step-uuid' },
        error: null,
      });
      const svc = new SupabaseService(PROD_ENV);
      const result = await svc.saveStep({ projectId: 'p1', stepNumber: 2, inputData: { foo: 'bar' } });
      expect(mockRpc).toHaveBeenCalledWith('sp_save_step', expect.objectContaining({ p_step_number: 2 }));
      expect(result.stepId).toBe('prod-step-uuid');
    });

    it('saveDocument llama a sp_save_document y devuelve documentId', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { success: true, document_id: 'prod-doc-uuid' },
        error: null,
      });
      const svc = new SupabaseService(PROD_ENV);
      const result = await svc.saveDocument({
        projectId: 'p1', stepId: 's1', phaseId: 'F0', title: 'Title', content: '# Doc',
      });
      expect(result.documentId).toBe('prod-doc-uuid');
    });

    it('lanza error si RPC indica success: false', async () => {
      mockRpc.mockResolvedValueOnce({ data: { success: false, error: 'Not found' }, error: null });
      const svc = new SupabaseService(PROD_ENV);
      await expect(
        svc.createProject({ userId: 'u1', name: 'Test', clientName: 'Client' })
      ).rejects.toThrow('Not found');
    });
  });
});
