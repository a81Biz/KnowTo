// src/types/env.ts
// Tipado del entorno de Cloudflare Workers

export interface Env {
  AI: Ai;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_JWT_SECRET: string;
  ENVIRONMENT: string;
  OLLAMA_URL?: string;
}
