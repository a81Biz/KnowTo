// src/shared/endpoints.ts
// SSOT: Única fuente de verdad para todas las URLs de la API
// NO escribas URLs directamente en los controladores. Usa siempre este archivo.

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8787';

export const ENDPOINTS = {
  health: `${BASE_URL}/api/health`,

  wizard: {
    createProject: `${BASE_URL}/api/wizard/project`,
    getProject: (id: string) => `${BASE_URL}/api/wizard/project/${id}`,
    listProjects: `${BASE_URL}/api/wizard/projects`,
    saveStep: `${BASE_URL}/api/wizard/step`,
    generate: `${BASE_URL}/api/wizard/generate`,
  },

  auth: {
    me: `${BASE_URL}/api/auth/me`,
  },
} as const;
