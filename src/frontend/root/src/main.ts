// frontend/root/src/main.ts
// Directorio dinámico de microsites.
//
// Para añadir un nuevo microsite, agregar su slug a MICROSITE_SLUGS.
// El sitio buscará automáticamente microsite.json en su dominio.

interface MicrositeMetadata {
  slug: string;
  name: string;
  description: string;
  localDomain: string;
  prodDomain: string;
  icon: string;
  accentColor?: string;
  status?: string;
  tags?: string[];
}

// ── Registro de microsites ───────────────────────────────────────────────────
// Al añadir un nuevo microsite, agregar su slug aquí. Solo este archivo cambia.
const MICROSITE_SLUGS = [
  'dcfl',
  'cce',
  // 'foo',  // ejemplo: añadir 'foo' cuando se cree el microsite foo
];

// ── Resolución de URLs ───────────────────────────────────────────────────────
function getMicrositeBaseUrl(slug: string): string {
  const { hostname, protocol } = window.location;

  // Desarrollo local: los microsites están en slug.localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${slug}.localhost`;
  }

  // Producción: root en dominio-apex, microsites en slug.dominio-apex
  return `${protocol}//${slug}.${hostname}`;
}

function getApiDocsUrl(): string {
  const { hostname, protocol } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//api.localhost/docs`;
  }
  return `${protocol}//api.${hostname}/docs`;
}

// ── Carga de metadata ────────────────────────────────────────────────────────
async function fetchMicrositeMetadata(slug: string): Promise<MicrositeMetadata | null> {
  const baseUrl = getMicrositeBaseUrl(slug);
  try {
    const res = await fetch(`${baseUrl}/microsite.json`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    return await res.json() as MicrositeMetadata;
  } catch {
    // Microsite no accesible (no desplegado, servidor caído, etc.) — aislamiento garantizado
    return null;
  }
}

// ── Renderizado ──────────────────────────────────────────────────────────────
function renderCard(meta: MicrositeMetadata): string {
  const url = getMicrositeBaseUrl(meta.slug);
  const statusBadge = meta.status === 'active'
    ? '<span class="badge">activo</span>'
    : '';

  return `
    <a href="${url}" class="microsite-card">
      <div class="icon">
        <span class="material-symbols-outlined">${meta.icon ?? 'web'}</span>
      </div>
      <div>
        <h3>${meta.name}</h3>
        ${statusBadge}
      </div>
      <p>${meta.description}</p>
    </a>
  `;
}

// ── Bootstrap ────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const grid = document.getElementById('microsites-grid')!;
  const apiLink = document.getElementById('api-docs-link') as HTMLAnchorElement;

  // Actualizar enlace a la API
  const apiUrl = getApiDocsUrl();
  apiLink.href = apiUrl;
  apiLink.textContent = apiUrl;

  // Cargar todos los microsites en paralelo, fallos aislados
  const results = await Promise.allSettled(
    MICROSITE_SLUGS.map((slug) => fetchMicrositeMetadata(slug))
  );

  const microsites = results
    .filter((r): r is PromiseFulfilledResult<MicrositeMetadata> =>
      r.status === 'fulfilled' && r.value !== null
    )
    .map((r) => r.value);

  if (microsites.length === 0) {
    grid.innerHTML = '<p class="loading">No hay plataformas disponibles en este momento.</p>';
    return;
  }

  grid.innerHTML = microsites.map(renderCard).join('');
}

void main();
