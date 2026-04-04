// src/__tests__/services/ai.service.test.ts
// Tests unitarios del AIService.
// Se mockea env.AI.run para no hacer llamadas reales a Workers AI.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIService } from '../../services/ai.service';
import type { Env } from '../../types/env';

// ── Helpers ──────────────────────────────────────────────────────────────────
const AI_RESPONSE = '# Marco de Referencia\nContenido generado por IA.';

function makeEnv(runResult: unknown = { response: AI_RESPONSE }): Env {
  return {
    ENVIRONMENT: 'development',
    AI: { run: vi.fn().mockResolvedValue(runResult) } as unknown as Ai,
  } as Env;
}

describe('AIService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('genera contenido a partir de un promptId válido', async () => {
    const env = makeEnv();
    const svc = new AIService(env);
    const content = await svc.generate({
      promptId: 'F0',
      context: { projectName: 'Test Project', clientName: 'Juan Pérez', industry: 'Manufactura' },
      userInputs: { courseTopic: 'Seguridad industrial' },
    });
    expect(content).toBe(AI_RESPONSE);
    expect((env.AI.run as ReturnType<typeof vi.fn>)).toHaveBeenCalledOnce();
  });

  it('llama a AI con el modelo correcto', async () => {
    const env = makeEnv();
    const svc = new AIService(env);
    await svc.generate({
      promptId: 'F1',
      context: { projectName: 'P', clientName: 'C' },
      userInputs: {},
    });
    const [model] = (env.AI.run as ReturnType<typeof vi.fn>).mock.calls[0] as [string, ...unknown[]];
    expect(model).toBe('@cf/meta/llama-3.2-3b-instruct');
  });

  it('acepta respuesta como string plano (alternativa al objeto {response})', async () => {
    const env = makeEnv('# Respuesta directa');
    const svc = new AIService(env);
    const content = await svc.generate({
      promptId: 'F0',
      context: { projectName: 'P', clientName: 'C' },
      userInputs: {},
    });
    expect(content).toBe('# Respuesta directa');
  });

  it('lanza error cuando la respuesta de IA está vacía', async () => {
    const env = makeEnv({ response: '' });
    const svc = new AIService(env);
    await expect(
      svc.generate({ promptId: 'F0', context: { projectName: 'P', clientName: 'C' }, userInputs: {} })
    ).rejects.toThrow('AI generation failed');
  });

  it('lanza error cuando AI.run lanza una excepción', async () => {
    const env = makeEnv();
    (env.AI.run as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Workers AI unavailable'));
    const svc = new AIService(env);
    await expect(
      svc.generate({ promptId: 'F0', context: { projectName: 'P', clientName: 'C' }, userInputs: {} })
    ).rejects.toThrow('AI generation failed: Workers AI unavailable');
  });

  it('interpola el contexto en el prompt renderizado', async () => {
    const env = makeEnv();
    const svc = new AIService(env);
    await svc.generate({
      promptId: 'F0',
      context: { projectName: 'MiProyecto', clientName: 'Ana López' },
      userInputs: { courseTopic: 'Node.js avanzado' },
    });
    const callArgs = (env.AI.run as ReturnType<typeof vi.fn>).mock.calls[0] as [string, { prompt: string }];
    expect(callArgs[1].prompt).toContain('MiProyecto');
    expect(callArgs[1].prompt).toContain('Ana López');
  });

  it('todos los promptIds válidos se renderizan sin error', async () => {
    const ids = ['F0', 'F1', 'F2', 'F3', 'F4', 'F5', 'F5_2', 'F6', 'F6_2'] as const;
    for (const id of ids) {
      const env = makeEnv();
      const svc = new AIService(env);
      await expect(
        svc.generate({ promptId: id, context: { projectName: 'P', clientName: 'C' }, userInputs: {} })
      ).resolves.toBeDefined();
    }
  });
});
