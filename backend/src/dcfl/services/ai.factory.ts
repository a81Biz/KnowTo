import { AIService } from '../../core/services/ai.service';
import { OllamaProvider, CloudflareProvider } from '../../core/services/llm.provider';
import { getPromptRegistry } from '../prompts';
import { Env } from '../../core/types/env';

const DCFL_SYSTEM_PROMPT =
  'Eres un experto en diseño instruccional certificado en el estándar EC0366 del CONOCER.\n' +
  'Genera documentos profesionales SOLO en español.\n' +
  'Usa formato Markdown estricto con tablas y listas.\n' +
  'No inventes datos. Si no tienes información, indícalo explícitamente.\n' +
  'Responde únicamente con el documento solicitado, sin preámbulos ni explicaciones adicionales.';

export function createAIService(env: Env): AIService {
  const provider = env.ENVIRONMENT === 'production'
    ? new CloudflareProvider(env.AI, DCFL_SYSTEM_PROMPT)
    : new OllamaProvider(env.OLLAMA_URL || 'http://localhost:11434', env.OLLAMA_MODEL || 'llama3.2:3b');
  return new AIService(provider, getPromptRegistry(), DCFL_SYSTEM_PROMPT, env);
}
