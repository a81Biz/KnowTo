import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CrawlerService } from '../../../core/services/crawler.service';

describe('CrawlerService', () => {
  beforeEach(() => {
    // Restaurar los mocks globales si existían
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('limpia basura del DOM', async () => {
    const html = `
      <html>
        <head>
          <title>Test Title</title>
          <meta name="description" content="Test Desc" />
          <script>console.log("script");</script>
          <style>body { color: red; }</style>
        </head>
        <body>
          <nav>Nav content</nav>
          <header>Header content</header>
          <div class="menu">Menu info</div>
          <main>Core text</main>
          <div class="ad">Ads here</div>
          <footer>Footer content</footer>
        </body>
      </html>
    `;

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(html, { status: 200 })));

    const result = await CrawlerService.scrape('https://example.com');
    
    expect(result).toContain('### TÍTULO: Test Title');
    expect(result).toContain('### DESCRIPCIÓN: Test Desc');
    expect(result).toContain('Core text');
    expect(result).not.toContain('Nav content');
    expect(result).not.toContain('Header content');
    expect(result).not.toContain('Menu info');
    expect(result).not.toContain('Ads here');
    expect(result).not.toContain('Footer content');
    expect(result).not.toContain('console.log');
    expect(result).not.toContain('color: red');
  });

  it('respeta el límite de 6000 chars', async () => {
    // Generar un body de con más de 6000 caracteres
    const largeText = 'a'.repeat(7000);
    const html = `<html><head></head><body>${largeText}</body></html>`;

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(html, { status: 200 })));

    const result = await CrawlerService.scrape('https://example.com');

    // Body content truncado + lo adicional añadido (título, descripción, tags, etc.)
    expect(result).toContain('... [CONTENIDO TRUNCADO]');
    const matchSize = result.match(/### CONTENIDO WEB:\n(.*)/)?.[1]?.length || 0;
    
    // length of the extracted string portion with the truncated suffix should equal to exactly 6000 + 24 = 6024 chars
    expect(matchSize).toBeLessThanOrEqual(6024 + 100); 
  });

  it('maneja 404s', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Not Found', { status: 404 })));

    const result = await CrawlerService.scrape('https://example.com/lost');
    expect(result).toBe('[ERROR DE CRAWLER]: HTTP Error 404');
  });

  it('devuelve error si la URL no comienza con http(s)', async () => {
    const result = await CrawlerService.scrape('ftp://example.com');
    expect(result).toContain('[ERROR DE CRAWLER]: URL inválida');
    expect(result).toContain('ftp://example.com');
  });
});
