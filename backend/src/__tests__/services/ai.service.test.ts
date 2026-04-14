// src/__tests__/services/ai.service.test.ts
//
// Cubre los dos backends de IA:
//   development → Ollama  (se mockea globalThis.fetch)
//   production  → Workers AI  (se mockea env.AI.run)
//
// Usa el core AIService con el DCFL registry inyectado.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIService } from '../../core/services/ai.service';
import { getPromptRegistry } from '../../dcfl/prompts';
import type { Env } from '../../core/types/env';

// ── Helpers ──────────────────────────────────────────────────────────────────
const AI_CONTENT = '# Marco de Referencia\nContenido generado por IA.';

const DCFL_SYSTEM_PROMPT =
  'Eres un experto en diseño instruccional certificado en el estándar EC0366 del CONOCER.';

const BASE_OPTS = {
  promptId: 'F0' as const,
  context: { projectName: 'Test Project', clientName: 'Juan Pérez', industry: 'Manufactura' },
  userInputs: { courseTopic: 'Seguridad industrial' },
};

function makeDevEnv(ollamaUrl = 'http://ollama:11434'): Env {
  return {
    ENVIRONMENT: 'development',
    OLLAMA_URL: ollamaUrl,
    AI: { run: vi.fn() } as unknown as Ai, // no debe llamarse en dev
  } as Env;
}

function makeProdEnv(runResult: unknown = { response: AI_CONTENT }): Env {
  return {
    ENVIRONMENT: 'production',
    AI: { run: vi.fn().mockResolvedValue(runResult) } as unknown as Ai,
  } as Env;
}

function makeAI(env: Env): AIService {
  return new AIService(env, getPromptRegistry(), DCFL_SYSTEM_PROMPT);
}

function mockFetch(body: unknown, ok = true, status = 200) {
  // mockImplementation crea una nueva Response por llamada — evita "Body already read"
  // cuando el pipeline hace múltiples fetch calls sobre el mismo spy.
  return vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
describe('AIService — modo desarrollo (Ollama)', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('llama a Ollama y devuelve el contenido generado', async () => {
    const fetchSpy = mockFetch({ response: AI_CONTENT });
    const content = await makeAI(makeDevEnv()).generate(BASE_OPTS);

    expect(content).toBe(AI_CONTENT);
    expect(fetchSpy).toHaveBeenCalledTimes(5); // F0 tiene 5 pipeline_steps
    const [url] = fetchSpy.mock.calls[0] as [string, ...unknown[]];
    expect(url).toContain('/api/generate');
    expect(url).toContain('ollama');
  });

  it('usa http://localhost:11434 cuando OLLAMA_URL no está definida', async () => {
    const fetchSpy = mockFetch({ response: AI_CONTENT });
    const env = makeDevEnv();
    delete (env as Partial<Env>).OLLAMA_URL;
    await makeAI(env).generate(BASE_OPTS);
    const [url] = fetchSpy.mock.calls[0] as [string, ...unknown[]];
    expect(url).toContain('localhost:11434');
  });

  it('envía model, prompt y system en el body', async () => {
    const fetchSpy = mockFetch({ response: AI_CONTENT });
    await makeAI(makeDevEnv()).generate(BASE_OPTS);
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body['model']).toBe('llama3.2:3b');
    expect(typeof body['prompt']).toBe('string');
    expect(typeof body['system']).toBe('string');
    expect(body['stream']).toBe(false);
  });

  it('el prompt contiene el contexto del proyecto', async () => {
    const fetchSpy = mockFetch({ response: AI_CONTENT });
    await makeAI(makeDevEnv()).generate(BASE_OPTS);
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { prompt: string };
    expect(body.prompt).toContain('Test Project');
    expect(body.prompt).toContain('Juan Pérez');
  });

  it('NO llama a env.AI.run en desarrollo', async () => {
    mockFetch({ response: AI_CONTENT });
    const env = makeDevEnv();
    await makeAI(env).generate(BASE_OPTS);
    expect(env.AI.run).not.toHaveBeenCalled();
  });

  it('lanza error si Ollama responde con HTTP error', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(new Response('Service Unavailable', { status: 503 }))
    );
    await expect(makeAI(makeDevEnv()).generate(BASE_OPTS))
      .rejects.toThrow(/failed/);
  });

  it('lanza error si Ollama devuelve response vacío', async () => {
    mockFetch({ response: '' });
    await expect(makeAI(makeDevEnv()).generate(BASE_OPTS))
      .rejects.toThrow(/failed/);
  });

  it('todos los promptIds válidos se renderizan sin error', async () => {
    const ids = [
      'F0', 'F1', 'F2', 'F2_5', 'F3',
      'F4_P0', 'F4_P1', 'F4_P2', 'F4_P3', 'F4_P4', 'F4_P5', 'F4_P6', 'F4_P7',
      'F5', 'F5_2',
      'F6', 'F6_FORM', 'F6_2a', 'F6_2b',
    ] as const;
    for (const id of ids) {
      mockFetch({ response: AI_CONTENT }); // mockResolvedValue — persiste para todos los pasos del pipeline
      await expect(
        makeAI(makeDevEnv()).generate({ ...BASE_OPTS, promptId: id })
      ).resolves.toBe(AI_CONTENT);
      vi.restoreAllMocks(); // limpia el spy antes de la siguiente iteración
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('AIService — modo producción (Workers AI)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('llama a Workers AI con el modelo correcto', async () => {
    const env = makeProdEnv();
    await makeAI(env).generate(BASE_OPTS);
    const [model] = (env.AI.run as ReturnType<typeof vi.fn>).mock.calls[0] as [string, ...unknown[]];
    expect(model).toBe('@cf/meta/llama-3.2-3b-instruct');
  });

  it('devuelve el contenido del objeto {response}', async () => {
    const content = await makeAI(makeProdEnv({ response: AI_CONTENT })).generate(BASE_OPTS);
    expect(content).toBe(AI_CONTENT);
  });

  it('acepta respuesta como string plano', async () => {
    const content = await makeAI(makeProdEnv(AI_CONTENT)).generate(BASE_OPTS);
    expect(content).toBe(AI_CONTENT);
  });

  it('lanza error si Workers AI devuelve response vacío', async () => {
    await expect(makeAI(makeProdEnv({ response: '' })).generate(BASE_OPTS))
      .rejects.toThrow(/failed/);
  });

  it('lanza error si env.AI.run lanza una excepción', async () => {
    const env = makeProdEnv();
    (env.AI.run as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Workers AI unavailable'));
    await expect(makeAI(env).generate(BASE_OPTS))
      .rejects.toThrow(/Workers AI unavailable/);
  });

  it('NO llama a fetch en producción', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await makeAI(makeProdEnv()).generate(BASE_OPTS);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
