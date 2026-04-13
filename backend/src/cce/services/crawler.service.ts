import * as cheerio from 'cheerio';

export class CrawlerService {
  /**
   * Extrae, sanitiza y recorta el contenido principal de una página web
   * para inyectarlo de forma estructurada y segura en el pipeline de la IA.
   */
  static async scrape(url: string): Promise<string> {
    if (!url.startsWith('http')) {
      return `https://www.spanishdict.com/translate/inv%C3%A1lida: ${url}`;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        return `[ERROR DE CRAWLER]: HTTP Error ${response.status}`;
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Limpieza agresiva de elementos no deseados
      const selectorsToRemove = [
        'script', 'style', 'noscript', 'iframe', 'svg', 'canvas',
        'nav', 'footer', 'header', 'aside',
        '.menu', '.ad', '.sidebar'
      ];
      
      selectorsToRemove.forEach((sel) => {
        $(sel).remove();
      });

      const rawTitle = $('title').text() || '';
      const rawDescription = $('meta[name="description"]').attr('content') || '';
      
      const title = rawTitle.replace(/\s+/g, ' ').trim();
      const description = rawDescription.replace(/\s+/g, ' ').trim();

      // Extracción del contenido del body ya sanitizado
      let bodyText = $('body').text() || '';
      bodyText = bodyText.replace(/\s+/g, ' ').trim();

      // Límite de tokens por seguridad de ventana de contexto
      if (bodyText.length > 6000) {
        bodyText = bodyText.substring(0, 6000) + '... [CONTENIDO TRUNCADO]';
      }

      return `### TÍTULO: ${title}\n### DESCRIPCIÓN: ${description}\n### CONTENIDO WEB:\n${bodyText}`;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return `[ERROR DE CRAWLER]: ${msg}`;
    }
  }
}
