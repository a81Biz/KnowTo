// frontend/dcfl/src/shared/endpoints.ts
// SSOT: Única fuente de verdad para todas las URLs de la API del microsite DCFL.
//
// ┌─ CÓMO FUNCIONA ──────────────────────────────────────────────────────────┐
// │  La URL base del backend se resuelve EN RUNTIME desde window.location.   │
// │  El mismo bundle compilado funciona en dev y producción sin cambios.      │
// │                                                                           │
// │  Convención de dominios:                                                  │
// │    Frontend  →  dcfl.{dominio}        (ej: dcfl.localhost, dcfl.sitio)   │
// │    Backend   →  api.{dominio}/{slug}  (ej: api.localhost/dcfl)           │
// │                                                                           │
// │  Ejemplos de resolución automática:                                       │
// │    dcfl.localhost  →  API en http://api.localhost/dcfl                   │
// │    dcfl.sitio      →  API en https://api.sitio/dcfl                      │
// │    localhost       →  API en http://api.localhost/dcfl  (dev sin nginx)  │
// └──────────────────────────────────────────────────────────────────────────┘

const MICROSITE_SLUG = 'dcfl';

function resolveApiBase(): string {
  // Variable de entorno de Vite: permite sobreescribir en cualquier entorno
  const envOverride = import.meta.env['VITE_API_BASE_URL'] as string | undefined;
  if (envOverride) return `${envOverride}/${MICROSITE_SLUG}`;

  const { hostname, protocol } = window.location;

  // localhost sin subdominio (dev nativo fuera de Docker, o root site)
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return `${protocol}//api.localhost/${MICROSITE_SLUG}`;
  }

  // Subdominio: 'dcfl.localhost' o 'dcfl.sitio'
  // Extraer el dominio-apex quitando el primer segmento
  const parts = hostname.split('.');
  const apex = parts.length > 1 ? parts.slice(1).join('.') : hostname;
  return `${protocol}//api.${apex}/${MICROSITE_SLUG}`;
}

// Se evalúa una sola vez al cargar el módulo.
const API_BASE = resolveApiBase();

// ── Rutas de la API (path relativo al base) ──────────────────────────────────
export const ENDPOINTS = {
  wizard: {
    createProject: '/wizard/project',
    saveStep:      '/wizard/step',
    generate:      '/wizard/generate',
    generateAsync: '/wizard/generate-async',
    generateForm:  '/wizard/generate-form',
    extract:       '/wizard/extract',
    getProject:    (projectId: string) => `/wizard/project/${projectId}`,
    f0Context:      (projectId: string) => `/wizard/project/${projectId}/f0-context`,
    fase1Informe:   (projectId: string) => `/wizard/project/${projectId}/fase1/informe`,
    fase2Analisis:         (projectId: string) => `/wizard/project/${projectId}/fase2/analisis`,
    fase2Discrepancias:    (projectId: string) => `/wizard/project/${projectId}/fase2/discrepancias`,
    fase2Resolver:         (projectId: string) => `/wizard/project/${projectId}/fase2/resolver`,
    fase2Resolucion:       (projectId: string) => `/wizard/project/${projectId}/fase2/resolucion`,
    fase2_5Recomendaciones: (projectId: string) => `/wizard/project/${projectId}/fase2_5/recomendaciones`,
    fase3Especificaciones: (projectId: string) => `/wizard/project/${projectId}/fase3/especificaciones`,
    fase4Productos:        (projectId: string) => `/wizard/project/${projectId}/fase4/productos`,
    phaseQuestions: (projectId: string, phaseDestino: number) =>
      `/wizard/project/${projectId}/phase-questions/${phaseDestino}`,
    phaseAnswers:   (projectId: string) => `/wizard/project/${projectId}/phase-answers`,
    fase1PreguntasRespuestas: (projectId: string) => `/wizard/project/${projectId}/fase1/preguntas-respuestas`,
    f0Estructurado: (projectId: string) => `/wizard/project/${projectId}/f0-estructurado`,
    listProjects:  '/wizard/projects',
    job:           (jobId: string) => `/wizard/job/${jobId}`,
  },
  health: '/health',
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
