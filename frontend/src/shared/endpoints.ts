// src/shared/endpoints.ts
// SSOT: Única fuente de verdad para todas las URLs de la API
// FRONTEND ARCHITECTURE DOCUMENT sección 8

export const ENDPOINTS = {
  // Base del backend
  backend: import.meta.env.VITE_API_URL ?? 'http://localhost:8787',

  // Auth
  auth: {
    me: '/api/auth/me',
    login: '/api/auth/login',
    logout: '/api/auth/logout',
  },

  // Wizard
  wizard: {
    createProject: '/api/wizard/project',
    saveStep: '/api/wizard/step',
    generate: '/api/wizard/generate',
    getProject: (projectId: string) => `/api/wizard/project/${projectId}`,
    listProjects: '/api/wizard/projects',
    getProgress: '/api/wizard/progress',
  },

  // Documents
  documents: {
    generate: '/api/documents/generate',
    get: (documentId: string) => `/api/documents/${documentId}`,
    list: (projectId: string) => `/api/documents/project/${projectId}`,
  },

  // Health
  health: '/api/health',
} as const;

// Helper para construir URLs completas (FRONTEND ARCHITECTURE DOCUMENT)
export function buildEndpoint(
  path: string,
  params?: Record<string, string | number>
): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      url = url.replace(`:${k}`, String(v));
    });
  }
  return `${ENDPOINTS.backend}${url}`;
}
