// frontend/cce/src/shared/endpoints.ts
// SSOT: Única fuente de verdad para todas las URLs de la API del microsite CCE.
//
// ┌─ CÓMO FUNCIONA ──────────────────────────────────────────────────────────┐
// │  La URL base del backend se resuelve EN RUNTIME desde window.location.   │
// │  El mismo bundle compilado funciona en dev y producción sin cambios.      │
// │                                                                           │
// │  Convención de dominios:                                                  │
// │    Frontend  →  cce.{dominio}         (ej: cce.localhost, cce.sitio)     │
// │    Backend   →  api.{dominio}/{slug}  (ej: api.localhost/cce)            │
// └──────────────────────────────────────────────────────────────────────────┘

const MICROSITE_SLUG = 'cce';

function resolveApiBase(): string {
  const envOverride = import.meta.env['VITE_API_BASE_URL'] as string | undefined;
  if (envOverride) return `${envOverride}/${MICROSITE_SLUG}`;

  const { hostname, protocol } = window.location;

  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return `${protocol}//api.localhost/${MICROSITE_SLUG}`;
  }

  const parts = hostname.split('.');
  const apex = parts.length > 1 ? parts.slice(1).join('.') : hostname;
  return `${protocol}//api.${apex}/${MICROSITE_SLUG}`;
}

const API_BASE = resolveApiBase();

export const ENDPOINTS = {
  wizard: {
    createProject: '/wizard/project',
    saveStep:      '/wizard/step',
    generate:      '/wizard/generate',
    generateForm:  '/wizard/generate-form',
    extract:       '/wizard/extract',
    upload:        '/wizard/upload',
    ocr:           '/wizard/ocr',
    getProject:    (projectId: string) => `/wizard/project/${projectId}`,
    listProjects:  '/wizard/projects',
    // Nuevos endpoints de pipeline y crawler
    pipelineStatus: (pipelineId: string) => `/wizard/pipeline/${pipelineId}/status`,
    crawl:         '/wizard/crawl',
    crawlStatus:   (crawlId: string) => `/wizard/crawl/${crawlId}/status`,
  },
  health: '/health',
} as const;

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
