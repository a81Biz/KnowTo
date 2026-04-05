// src/shared/endpoints.ts
// SSOT: Única fuente de verdad para todas las URLs de la API.
//
// ┌─ CÓMO FUNCIONA ──────────────────────────────────────────────────────────┐
// │  La URL base del backend se resuelve EN RUNTIME a partir de              │
// │  window.location, sin depender de variables de build ni de configuración │
// │  manual. El mismo bundle compilado funciona en cualquier dominio.        │
// │                                                                           │
// │  Regla de convención:                                                     │
// │    Frontend  →  {protocol}//{hostname}[:{puerto}]                         │
// │    Backend   →  {protocol}//api.{hostname}                                │
// │                                                                           │
// │  Ejemplos:                                                                │
// │    localhost:5173    →  API en http://localhost:8787                      │
// │    knowto.dev        →  API en https://api.knowto.dev                     │
// │    knowto.mx         →  API en https://api.knowto.mx                      │
// │    elsitio.com.mx    →  API en https://api.elsitio.com.mx                 │
// │                                                                           │
// │  En desarrollo el puerto del backend (8787) es la única convención        │
// │  de infraestructura. Se puede sobrescribir con VITE_DEV_API_PORT.        │
// └──────────────────────────────────────────────────────────────────────────┘

function resolveApiBase(): string {
  const { hostname, protocol } = window.location;

  // Desarrollo local — cualquier variante de localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    const port = (import.meta.env['VITE_DEV_API_PORT'] as string | undefined) ?? '8787';
    return `${protocol}//${hostname}:${port}`;
  }

  // Producción / staging — convenio api.{dominio}
  return `${protocol}//api.${hostname}`;
}

// Se evalúa una sola vez al cargar el módulo.
const API_BASE = resolveApiBase();

// ── Rutas de la API (solo la parte del path, sin base) ───────────────────────
export const ENDPOINTS = {
  auth: {
    me:     '/api/auth/me',
    login:  '/api/auth/login',
    logout: '/api/auth/logout',
  },
  wizard: {
    createProject: '/api/wizard/project',
    saveStep:      '/api/wizard/step',
    generate:      '/api/wizard/generate',
    extract:       '/api/wizard/extract',
    getProject:    (projectId: string) => `/api/wizard/project/${projectId}`,
    listProjects:  '/api/wizard/projects',
    getProgress:   '/api/wizard/progress',
  },
  documents: {
    generate: '/api/documents/generate',
    get:  (documentId: string) => `/api/documents/${documentId}`,
    list: (projectId: string)  => `/api/documents/project/${projectId}`,
  },
  health: '/api/health',
} as const;

// ── Helper — construye URL absoluta ──────────────────────────────────────────
export function buildEndpoint(
  path: string,
  params?: Record<string, string | number>,
): string {
  let resolved = path;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      resolved = resolved.replace(`:${k}`, String(v));
    }
  }
  return `${API_BASE}${resolved}`;
}
