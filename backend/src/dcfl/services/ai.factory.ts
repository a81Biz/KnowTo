import { AIService } from '../../core/services/ai.service';
import { OllamaProvider, CloudflareProvider } from '../../core/services/llm.provider';
import { getPromptRegistry } from '../prompts';
import { Env } from '../../core/types/env';

const DCFL_SYSTEM_PROMPT =
  'Eres un asistente experto en diseño instruccional y estándares CONOCER (específicamente EC0366).\n' +
  'Genera documentos profesionales SOLO en español.\n' +
  'Usa formato Markdown estricto con tablas y listas.\n' +
  'No inventes datos. Si no tienes información, indícalo explícitamente.\n' +
  'Responde únicamente con el documento solicitado, sin preámbulos ni explicaciones adicionales.';

export function createAIService(env: Env): AIService {
  // En desarrollo, forzar Ollama con los nuevos parámetros
  if (env.ENVIRONMENT !== 'production') {
    const ollamaUrl = env.OLLAMA_URL || 'http://ollama:11434';
    const ollamaModel = env.OLLAMA_MODEL || 'qwen2.5:14b';
    const provider = new OllamaProvider(ollamaUrl, ollamaModel);
    console.log(`[AI Factory] Usando Ollama - URL: ${ollamaUrl}, Modelo: ${ollamaModel}`);
    return new AIService(provider, getPromptRegistry(), DCFL_SYSTEM_PROMPT, env);
  }

  // En producción, usar Cloudflare
  const provider = new CloudflareProvider(env.AI, DCFL_SYSTEM_PROMPT);
  return new AIService(provider, getPromptRegistry(), DCFL_SYSTEM_PROMPT, env);
}
