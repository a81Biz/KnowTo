// src/core/types/env.ts
// Tipado del entorno de Cloudflare Workers

export interface Env {
  AI: Ai;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_JWT_SECRET: string;
  ENVIRONMENT: string;
  OLLAMA_URL?: string;
  OLLAMA_MODEL?: string;
  TAVILY_API_KEY?: string;
}
