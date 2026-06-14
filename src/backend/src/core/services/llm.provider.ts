import { Agent, setGlobalDispatcher } from 'undici';

// Configurar agente global para peticiones de larga duración (Ollama 27B)
// Esto anula los timeouts de socket por defecto de Node.js (5 min)
const globalDispatcher = new Agent({
  connect: { timeout: 900000 },
  headersTimeout: 900000,
  bodyTimeout: 900000,
  keepAliveTimeout: 900000,
});
setGlobalDispatcher(globalDispatcher);

export interface ILLMProvider {
  generate(prompt: string, model?: string, systemPrompt?: string): Promise<string>;
  generateVision(prompt: string, imageBase64: string, mimeType: string): Promise<string>;
  chat(
    prompt: string, 
    tools?: Array<{ type: string; function: { name: string; description: string; parameters: any } }>,
    systemPrompt?: string
  ): Promise<{ content: string; toolCalls?: Array<{ name: string; arguments: any }> }>;
}

export class OllamaProvider implements ILLMProvider {
  private url: string;
  private defaultModel: string;


  private readonly OLLAMA_TIMEOUT = 15 * 60 * 1000; // 15 minutos

  constructor(url: string, defaultModel: string) {
    this.url = url.replace(/\/$/, '');
    this.defaultModel = defaultModel;
  }

  async generate(prompt: string, model?: string, systemPrompt?: string): Promise<string> {
    const requestedModel = model ?? this.defaultModel;
    const defaultLocalModel = process.env.OLLAMA_DEFAULT_MODEL || this.defaultModel || 'qwen2.5:14b';
    
    let finalModel = requestedModel;
    if (requestedModel.startsWith('@cf/')) {
      console.log(`[Ollama] Mapeando modelo de producción '${requestedModel}' → modelo local '${defaultLocalModel}'`);
      finalModel = defaultLocalModel;
    }

    const base = this.url;
    
    // Log para ver el tamaño del prompt
    console.log(`[Ollama] Solicitando generación con modelo: ${finalModel}, prompt size: ${prompt.length} chars`);
    
    // Log de los primeros 200 caracteres del prompt para depuración
    console.log(`[Ollama] Prompt preview: ${prompt.substring(0, 200)}...`);
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.OLLAMA_TIMEOUT);
    
    let res: Response;
    try {
      res = await fetch(`${base}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: finalModel,
          prompt,
          system: systemPrompt ?? '',
          stream: false,
          options: { num_ctx: 20480, num_predict: 8192 },
        }),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      throw new Error(`Ollama fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    clearTimeout(timeout);
    
    if (!res.ok) {
      // Leer el cuerpo del error para diagnóstico
      const errBody = await res.text();
      console.error(`[Ollama] HTTP ${res.status} - Response body: ${errBody}`);
      throw new Error(`Ollama error: ${res.status} - ${errBody.slice(0, 300)}`);
    }
    
    const data = await res.json() as { response?: string };
    if (!data.response) {
      throw new Error('Ollama response empty');
    }
    
    console.log(`[Ollama] Respuesta recibida, tamaño: ${data.response.length} chars`);
    return data.response;
  }

  async generateVision(prompt: string, imageBase64: string, mimeType: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.OLLAMA_TIMEOUT);

    try {
      // Ollama Vision usa el modelo llava por defecto en dev
      const res = await fetch(`${this.url}/api/generate`, {
        method: 'POST',
        body: JSON.stringify({
          model: 'llava',
          prompt,
          images: [imageBase64],
          stream: false,
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Ollama Vision error: ${res.statusText}`);
      const data = (await res.json()) as { response: string };
      return data.response;
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Método chat que soporta tool calling usando el endpoint /api/chat
   */
  async chat(
    prompt: string, 
    tools?: Array<{ type: string; function: { name: string; description: string; parameters: any } }>,
    systemPrompt?: string
  ): Promise<{ content: string; toolCalls?: Array<{ name: string; arguments: any }> }> {
    const base = this.url.replace(/\/$/, '');
    const model = this.defaultModel;
    
    const messages = [
      { role: 'system', content: systemPrompt || '' },
      { role: 'user', content: prompt }
    ];
    
    const body: any = {
      model,
      messages,
      stream: false,
      options: { num_ctx: 20480, num_predict: 8192 }
    };
    
    if (tools && tools.length > 0) {
      body.tools = tools;
    }
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.OLLAMA_TIMEOUT);
    
    try {
      const res = await fetch(`${base}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Ollama chat error ${res.status}: ${errBody}`);
      }
      
      const data = await res.json() as any;
      const message = data.message;
      
      console.log('[OLLAMA-CHAT] Respuesta completa:', JSON.stringify(data, null, 2));
      console.log('[OLLAMA-CHAT] message:', JSON.stringify(message, null, 2));
      if (message?.tool_calls) {
        console.log('[OLLAMA-CHAT] tool_calls encontrados:', JSON.stringify(message.tool_calls, null, 2));
      } else {
        console.log('[OLLAMA-CHAT] No hay tool_calls en la respuesta');
      }
      
      // Si no hay tool_calls nativos, buscar patrones de tool calls en el texto
      let parsedToolCalls: Array<{ name: string; arguments: any }> | undefined = undefined;
      
      if (!message?.tool_calls || message.tool_calls.length === 0) {
        const content = message?.content || '';
        
        // Patrón 1: ["web_search", {"query": "..."}]
        // Tolerante a espacios, saltos de línea, y comillas simples o dobles
        const toolCallPattern = /\[\s*["']web_search["']\s*,\s*(\{[^]]*?\})\s*\]/s;
        const match = content.match(toolCallPattern);
        
        if (match) {
          try {
            // Limpiar el JSON de posibles caracteres problemáticos
            let argsStr = match[1];
            // Reemplazar comillas simples por dobles si es necesario
            if (argsStr.includes("'") && !argsStr.includes('"')) {
              argsStr = argsStr.replace(/'/g, '"');
            }
            const args = JSON.parse(argsStr);
            parsedToolCalls = [{ name: 'web_search', arguments: args }];
            console.log('[OLLAMA-CHAT] Tool call detectado en texto (patrón 1):', JSON.stringify(parsedToolCalls));
          } catch (e) {
            console.warn('[OLLAMA-CHAT] Error parsing tool call from text (patrón 1):', e);
          }
        }
        
        // Patrón 2: {"name": "web_search", "parameters": {...}}
        if (!parsedToolCalls) {
          const toolCallPattern2 = /\{\s*["']name["']\s*:\s*["']web_search["']\s*,\s*["']parameters["']\s*:\s*(\{[^}]+\})\s*\}/s;
          const match2 = content.match(toolCallPattern2);
          
          if (match2) {
            try {
              let argsStr = match2[1];
              if (argsStr.includes("'") && !argsStr.includes('"')) {
                argsStr = argsStr.replace(/'/g, '"');
              }
              const args = JSON.parse(argsStr);
              parsedToolCalls = [{ name: 'web_search', arguments: args }];
              console.log('[OLLAMA-CHAT] Tool call detectado en texto (patrón 2):', JSON.stringify(parsedToolCalls));
            } catch (e) {
              console.warn('[OLLAMA-CHAT] Error parsing tool call from text (patrón 2):', e);
            }
          }
        }
      }
      
      // Usar tool_calls nativos o los parseados
      const effectiveToolCalls = message?.tool_calls?.length ? message.tool_calls : parsedToolCalls;
      
      if (effectiveToolCalls && effectiveToolCalls.length > 0) {
        return {
          content: message?.content || '',
          toolCalls: effectiveToolCalls.map((tc: any) => ({
            name: tc.name || tc.function?.name,
            arguments: tc.arguments || tc.function?.arguments || {}
          }))
        };
      }
      
      return { content: message?.content || '' };
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }
}

export class CloudflareProvider implements ILLMProvider {
  constructor(private ai: any, private systemPrompt: string) {}

  async generate(prompt: string, model?: string, systemPrompt?: string): Promise<string> {
    const modelToUse = model || '@cf/meta/llama-3-8b-instruct';
    const response = await this.ai.run(modelToUse, {
      messages: [
        { role: 'system', content: systemPrompt || this.systemPrompt },
        { role: 'user', content: prompt }
      ]
    });
    return response.response || response.text || JSON.stringify(response);
  }

  async generateVision(prompt: string, imageBase64: string, mimeType: string): Promise<string> {
    const response = await this.ai.run('@cf/meta/llama-3.2-11b-vision-instruct', {
      prompt,
      image: [...new Uint8Array(Buffer.from(imageBase64, 'base64'))]
    });
    return response.response || response.text || JSON.stringify(response);
  }

  async chat(
    prompt: string, 
    tools?: Array<{ type: string; function: { name: string; description: string; parameters: any } }>,
    systemPrompt?: string
  ): Promise<{ content: string; toolCalls?: Array<{ name: string; arguments: any }> }> {
    // Cloudflare AI run no soporta tools directamente en el SDK de Workers de la misma forma que Ollama chat
    // Por ahora devolvemos generación normal
    const content = await this.generate(prompt, undefined, systemPrompt);
    return { content };
  }
}
