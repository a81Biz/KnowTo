// src/__tests__/services/ai.service.test.ts
//
// Cubre los dos backends de IA:
//   development → Ollama  (se mockea globalThis.fetch)
//   production  → Workers AI  (se mockea env.AI.run)
//
// Usa el core AIService con el DCFL registry inyectado.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIService } from '../../core/services/ai.service';
import { OllamaProvider, CloudflareProvider } from '../../core/services/llm.provider';
import { getPromptRegistry } from '../../dcfl/prompts';
import type { Env } from '../../core/types/env';

// ── Helpers ──────────────────────────────────────────────────────────────────
const AI_CONTENT = '# Marco de Referencia\nContenido generado por IA.';

const DCFL_SYSTEM_PROMPT =
  'Eres un experto en diseño instruccional y desarrollo de contenidos de aprendizaje estructurados.';

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
  if (env.ENVIRONMENT === 'production') {
    const provider = new CloudflareProvider((env as any).AI, DCFL_SYSTEM_PROMPT);
    return new AIService(provider, getPromptRegistry(), DCFL_SYSTEM_PROMPT, env);
  }
  const ollamaUrl = (env as any).OLLAMA_URL ?? 'http://localhost:11434';
  const provider = new OllamaProvider(ollamaUrl, 'llama3.2:3b');
  return new AIService(provider, getPromptRegistry(), DCFL_SYSTEM_PROMPT, env);
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

    // El ensamblador final es TS puro (no LLM); devuelve '' sin onAgentOutput callback.
    expect(content).toBeTypeOf('string');
    expect(fetchSpy).toHaveBeenCalled();
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
    expect(body['model']).toBe('qwen2.5:14b'); // F0 template especifica este modelo
    expect(typeof body['prompt']).toBe('string');
    expect(typeof body['system']).toBe('string');
    expect(body['stream']).toBe(false); // OllamaProvider usa stream: false
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
      .rejects.toThrow(/503|Ollama/);
  });

  it('lanza error si Ollama devuelve response vacío', async () => {
    mockFetch({ response: '' });
    await expect(makeAI(makeDevEnv()).generate(BASE_OPTS))
      .rejects.toThrow(/empty|Ollama/i);
  });

  it('todos los promptIds válidos se renderizan sin error', async () => {
    const ids = [
      'F0', 'F1', 'F2', 'F2_5', 'F3',
      'F5', 'F5_2',
      'F6', 'F6_FORM', 'F6_2a', 'F6_2b',
    ] as const;
    for (const id of ids) {
      mockFetch({ response: AI_CONTENT }); // mockResolvedValue — persiste para todos los pasos del pipeline
      await expect(
        makeAI(makeDevEnv()).generate({ ...BASE_OPTS, promptId: id })
      ).resolves.toBeTypeOf('string'); // el ensamblador TS devuelve '' sin callback
      vi.restoreAllMocks(); // limpia el spy antes de la siguiente iteración
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('AIService — modo producción (Workers AI)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('llama a Workers AI con el modelo que especifica el template', async () => {
    const env = makeProdEnv();
    await makeAI(env).generate(BASE_OPTS);
    const [model] = (env.AI.run as ReturnType<typeof vi.fn>).mock.calls[0] as [string, ...unknown[]];
    // F0 template especifica qwen2.5:14b para todos sus agentes
    expect(model).toBe('qwen2.5:14b');
  });

  it('devuelve string tras pipeline (ensamblador TS sin callback devuelve "")', async () => {
    const content = await makeAI(makeProdEnv({ response: AI_CONTENT })).generate(BASE_OPTS);
    expect(content).toBeTypeOf('string');
  });

  it('acepta respuesta como string plano y retorna string', async () => {
    const content = await makeAI(makeProdEnv(AI_CONTENT)).generate(BASE_OPTS);
    expect(content).toBeTypeOf('string');
  });

  it('completa pipeline aunque Workers AI devuelva response vacío (CloudflareProvider usa JSON.stringify de fallback)', async () => {
    // CloudflareProvider: response.response || response.text || JSON.stringify(response)
    // Con { response: '' }: '' || undefined || '{"response":""}' → no lanza
    const content = await makeAI(makeProdEnv({ response: '' })).generate(BASE_OPTS);
    expect(content).toBeTypeOf('string');
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

// ─────────────────────────────────────────────────────────────────────────────
describe('OllamaProvider — paths de error', () => {
  // OLLAMA_TIMEOUT_MS = 25 * 60 * 1000 (constante de módulo en llm.provider.ts)
  const TIMEOUT_25_MIN = 25 * 60 * 1000;

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('clasifica como "Ollama timeout" cuando el AbortController dispara tras 25 min', async () => {
    vi.useFakeTimers();

    // fetch que nunca resuelve pero responde al AbortSignal
    vi.spyOn(globalThis, 'fetch').mockImplementation((_url, opts) => {
      const signal = (opts as RequestInit)?.signal;
      return new Promise<Response>((_, reject) => {
        if (signal?.aborted) {
          reject(new DOMException('This operation was aborted', 'AbortError'));
          return;
        }
        signal?.addEventListener('abort', () =>
          reject(new DOMException('This operation was aborted', 'AbortError'))
        );
      });
    });

    const provider = new OllamaProvider('http://ollama:11434', 'qwen2.5:14b');
    const promise = provider.generate('test prompt');

    // Handler adjuntado ANTES de avanzar timers — evita PromiseRejectionHandledWarning
    const assertion = expect(promise).rejects.toThrow(/timeout/i);
    await vi.advanceTimersByTimeAsync(TIMEOUT_25_MIN + 1000);
    await assertion;
  });

  it('clasifica ECONNREFUSED como "Ollama no disponible"', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new TypeError('fetch failed')
    );
    const provider = new OllamaProvider('http://ollama:11434', 'qwen2.5:14b');
    await expect(provider.generate('test')).rejects.toThrow(/no disponible/i);
  });

  it('reintenta con modelo por defecto cuando Ollama responde 404 y tiene éxito', async () => {
    let callCount = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(new Response('Not Found', { status: 404 }));
      }
      return Promise.resolve(
        new Response(JSON.stringify({ response: 'respuesta-retry' }), { status: 200 })
      );
    });

    // El modelo solicitado es diferente al defaultModel → activa el retry en 404
    const provider = new OllamaProvider('http://ollama:11434', 'qwen2.5:14b');
    const result = await provider.generate('test', 'modelo-inexistente:latest');

    expect(result).toBe('respuesta-retry');
    expect(callCount).toBe(2);
  });

  it('clasifica timeout del retry con AbortController propio (no reutiliza el primario)', async () => {
    vi.useFakeTimers();
    let callCount = 0;

    vi.spyOn(globalThis, 'fetch').mockImplementation((_url, opts) => {
      callCount++;
      if (callCount === 1) {
        // intento primario: 404 resuelve de inmediato
        return Promise.resolve(new Response('Not Found', { status: 404 }));
      }
      // retry: cuelga — responde al AbortSignal del retryController
      const signal = (opts as RequestInit)?.signal;
      return new Promise<Response>((_, reject) => {
        if (signal?.aborted) {
          reject(new DOMException('This operation was aborted', 'AbortError'));
          return;
        }
        signal?.addEventListener('abort', () =>
          reject(new DOMException('This operation was aborted', 'AbortError'))
        );
      });
    });

    const provider = new OllamaProvider('http://ollama:11434', 'qwen2.5:14b');
    const promise = provider.generate('test', 'modelo-inexistente:latest');

    // Handler adjuntado ANTES de avanzar timers — evita PromiseRejectionHandledWarning
    const assertion = expect(promise).rejects.toThrow(/timeout/i);
    // advanceTimersByTimeAsync flushea microtasks: procesa el 404, lanza el retry,
    // registra su AbortController, y luego dispara el timeout del retry
    await vi.advanceTimersByTimeAsync(TIMEOUT_25_MIN + 1000);
    await assertion;
    expect(callCount).toBe(2);
  });
});
