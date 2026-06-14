// src/__tests__/cce/services/crawler.cce.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { CrawlerService } from '../../../core/services/crawler.service';

function mockFetchHTML(html: string, ok = true, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(html, {
      status,
      headers: { 'Content-Type': 'text/html' },
    })
  );
}

describe('CCE CrawlerService', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('extrae el título, descripción y contenido limpio de un HTML válido', async () => {
    mockFetchHTML(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>TECHIC Agency - Creatividad</title>
          <meta name="description" content="Agencia de producción audiovisual en CDMX.">
        </head>
        <body>
          <nav>Inicio | Servicios | Contacto</nav>
          <header>Bienvenidos a TECHIC</header>
          <main>
            <h1>Nuestros Servicios</h1>
            <p>Hacemos videos corporativos y campañas publicitarias.</p>
          </main>
          <aside>Anuncio publicitario</aside>
          <script>console.log('ruido');</script>
          <style>body { color: red; }</style>
          <footer>Derechos reservados 2026</footer>
        </body>
      </html>
    `);

    const result = await CrawlerService.scrape('https://techic.agency');

    expect(result).toContain('TÍTULO: TECHIC Agency - Creatividad');
    expect(result).toContain('DESCRIPCIÓN: Agencia de producción audiovisual en CDMX.');

    // Verifica que se extrajo el contenido principal
    expect(result).toContain('Nuestros Servicios Hacemos videos corporativos');

    // Verifica la eliminación de basura (nav, header, aside, script, style, footer)
    expect(result).not.toContain('Inicio | Servicios');
    expect(result).not.toContain('Bienvenidos a TECHIC');
    expect(result).not.toContain('Anuncio publicitario');
    expect(result).not.toContain('console.log');
    expect(result).not.toContain('Derechos reservados');
  });

  it('devuelve error de URL inválida si no empieza con http', async () => {
    const result = await CrawlerService.scrape('www.techic.agency');
    expect(result).toContain('[ERROR DE CRAWLER]: URL inválida');
    expect(result).toContain('www.techic.agency');
  });

  it('devuelve error si la petición HTTP falla (ej. 404)', async () => {
    mockFetchHTML('Not Found', false, 404);
    const result = await CrawlerService.scrape('https://techic.agency/no-existe');
    expect(result).toContain('[ERROR DE CRAWLER]');
    expect(result).toContain('404');
  });

  it('trunca el contenido si excede el límite de 6000 caracteres de seguridad', async () => {
    // Generamos un body gigante de 10,000 caracteres
    const hugeText = 'A'.repeat(10000);
    mockFetchHTML(`<html><head><title>Test</title></head><body>${hugeText}</body></html>`);

    const result = await CrawlerService.scrape('https://techic.agency/huge');

    // El tamaño total debe ser el título + descripción + 6000 chars + el mensaje de truncado
    expect(result.length).toBeLessThan(6500);
    expect(result).toContain('[CONTENIDO TRUNCADO]');
  });
});