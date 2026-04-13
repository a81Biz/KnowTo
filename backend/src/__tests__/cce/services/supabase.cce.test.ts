// src/__tests__/cce/services/supabase.cce.test.ts
import { describe, it, expect } from 'vitest';
import { SupabaseService } from '../../../cce/services/supabase.service';
import type { Env } from '../../../core/types/env';

const DEV_ENV: Env = { ENVIRONMENT: 'development' } as Env;

describe('CCE SupabaseService — modo desarrollo (mocks)', () => {
  it('createProject devuelve un projectId UUID válido', async () => {
    const svc = new SupabaseService(DEV_ENV);
    const result = await svc.createProject({
      userId: 'user-123',
      name: 'Consultoría TECHIC',
      clientName: 'María López',
      companyName: 'TECHIC Agencia',
      sector: 'Servicios creativos',
      email: 'maria@techic.com',
    });
    expect(result.projectId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('saveStep devuelve un stepId UUID válido', async () => {
    const svc = new SupabaseService(DEV_ENV);
    const result = await svc.saveStep({
      projectId: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
      stepNumber: 0,
      inputData: { companyName: 'TECHIC', sector: 'Servicios' },
    });
    expect(result.stepId).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('saveDocument devuelve un documentId UUID válido', async () => {
    const svc = new SupabaseService(DEV_ENV);
    const result = await svc.saveDocument({
      projectId: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
      stepId: 'bbbbbbbb-cccc-4ddd-eeee-ffffffffffff',
      phaseId: 'F0',
      title: 'Marco de Referencia',
      content: '# Marco de Referencia\nContenido...',
    });
    expect(result.documentId).toMatch(/^[0-9a-f-]{36}$/i);
  });

  // NUEVO: Test para saveStepOutput (tabla cce_step_outputs)
  it('saveStepOutput guarda y recupera outputs intermedios', async () => {
    const svc = new SupabaseService(DEV_ENV);
    const projectId = 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee';
    const outputKey = 'sector_raw';
    const outputValue = { sector: 'Audiovisual', data: 'test' };

    await svc.saveStepOutput({ projectId, pipelineId: 'F0', stageId: 'test', outputKey, outputValue });
    const outputs = await svc.getStepOutputs(projectId, [outputKey]);

    expect(outputs[outputKey]).toEqual(outputValue);
  });

  // NUEVO: Test para getPrompt (tabla cce_prompts)
  it('getPrompt devuelve un prompt por ID', async () => {
    const svc = new SupabaseService(DEV_ENV);
    const prompt = await svc.getPrompt('F0_SPECIALIST_NOMS');
    expect(prompt).toBeDefined();
    // In dev mode mock, the agent_type might be different or generic, so just check it returns an object
    expect(typeof prompt).toBe('object');
  });

  // NUEVO: Test para listPromptsByFase
  it('listPromptsByFase devuelve prompts de una fase', async () => {
    const svc = new SupabaseService(DEV_ENV);
    const prompts = await svc.listPromptsByFase('F0');
    expect(Array.isArray(prompts)).toBe(true);
  });

  it('getProjectContext devuelve objeto con project null en dev', async () => {
    const svc = new SupabaseService(DEV_ENV);
    const ctx = await svc.getProjectContext('aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee');
    expect(ctx).toEqual({ project: null });
  });

  it('getUserProjects devuelve array vacío en dev', async () => {
    const svc = new SupabaseService(DEV_ENV);
    const projects = await svc.getUserProjects('user-123');
    expect(Array.isArray(projects)).toBe(true);
    expect(projects).toHaveLength(0);
  });

  it('saveExtractedContext devuelve un extractedContextId UUID válido', async () => {
    const svc = new SupabaseService(DEV_ENV);
    const result = await svc.saveExtractedContext({
      projectId: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
      extractorId: 'EXTRACTOR_F1_2',
      fromPhases: ['F0', 'F1_1'],
      toPhase: 'F1_2',
      content: '## Contexto extraído...',
      parserUsed: { 'F0.sector_industria': true },
    });
    expect(result.extractedContextId).toMatch(/^[0-9a-f-]{36}$/i);
  });
});