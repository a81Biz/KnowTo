import { tavily, TavilyClient } from '@tavily/core';
import type { Env } from '../types/env';

/**
 * Servicio de búsqueda web real usando Tavily API
 * Diseñado específicamente para LLMs, devuelve resultados estructurados y relevantes
 */
export class WebSearchService {
  private client: TavilyClient;
  private isProd: boolean;

  constructor(env: Env) {
    this.isProd = env.ENVIRONMENT === 'production';

    // Fallback: leer directamente de process.env si env no tiene la key
    const apiKey = env.TAVILY_API_KEY || process.env.TAVILY_API_KEY;

    if (!apiKey) {
      console.warn('[WebSearchService] TAVILY_API_KEY no configurada. Las búsquedas fallarán.');
      console.warn('[WebSearchService] env.TAVILY_API_KEY:', env.TAVILY_API_KEY);
      console.warn('[WebSearchService] process.env.TAVILY_API_KEY:', process.env.TAVILY_API_KEY);
    }

    this.client = tavily({ apiKey: apiKey || '' });
  }

  /**
   * Normaliza la query a string
   */
  private normalizeQuery(query: any): string | null {
    if (!query) return null;
    if (typeof query === 'string') return query.trim();
    if (typeof query === 'object') {
      if (typeof query.query === 'string') return query.query.trim();
      if (typeof query.q === 'string') return query.q.trim();
      if (typeof query.description === 'string') return query.description.trim();
    }
    return null;
  }

  /**
   * Busca información en internet usando Tavily
   * @param query - Consulta de búsqueda
   * @param options - Opciones adicionales (maxResults, searchDepth, includeDomains, excludeDomains)
   * @returns Resultados formateados como string para el LLM
   */
  async search(
    query: any,
    options?: {
      maxResults?: number;
      searchDepth?: 'basic' | 'advanced';
      includeDomains?: string[];
      excludeDomains?: string[];
    }
  ): Promise<any> {
    console.log('[TAVILY] ========== INICIO ==========');
    console.log('[TAVILY] Query recibida:', JSON.stringify(query, null, 2));

    const searchTerms = this.normalizeQuery(query);

    if (!searchTerms || searchTerms.length < 3) {
      console.log('[TAVILY] Consulta demasiado corta o inválida');
      return {
        error: 'Consulta de búsqueda inválida',
        results: []
      };
    }

    console.log('[TAVILY] Términos de búsqueda:', searchTerms);

    try {
      const searchOptions: any = {
        maxResults: options?.maxResults || 5,
        searchDepth: options?.searchDepth || 'advanced',
        includeAnswer: true,
        includeRawContent: false,
      };

      if (options?.includeDomains) searchOptions.includeDomains = options.includeDomains;
      if (options?.excludeDomains) searchOptions.excludeDomains = options.excludeDomains;

      const response = await this.client.search(searchTerms, searchOptions);


      console.log('[TAVILY] Resultados obtenidos:', response.results?.length ?? 0);
      console.log('[TAVILY] Answer generada:', response.answer ? 'Sí' : 'No');

      // Construir respuesta estructurada para el LLM
      const output = {
        query: searchTerms,
        answer: response.answer || null,
        results: response.results.map(r => ({
          title: r.title,
          url: r.url,
          content: r.content,
          score: r.score
        }))
      };

      console.log('[TAVILY] Resultado obtenido con éxito');
      console.log('[TAVILY] ========== FIN ==========');

      return output;

    } catch (error) {

      console.error('[TAVILY] Error en búsqueda:', error);

      // En desarrollo, fallback con error claro
      if (!this.isProd) {
        return JSON.stringify({
          error: `Error en búsqueda Tavily: ${error instanceof Error ? error.message : String(error)}`,
          query: searchTerms,
          results: []
        });
      }

      return JSON.stringify({
        error: 'No se pudo completar la búsqueda',
        query: searchTerms,
        results: []
      });
    }
  }

  /**
   * Busca información específica para el análisis de sector
   */
  async searchSectorInfo(industry: string, topic: string): Promise<string> {
    const query = `mercado tendencias regulaciones certificaciones industria ${industry} ${topic}`;
    return this.search(query, { maxResults: 6, searchDepth: 'advanced' });
  }

  /**
   * Busca competidores en plataformas de cursos
   */
  async searchCompetitors(topic: string): Promise<string> {
    const query = `cursos "${topic}" Udemy Coursera Skillshare precios alumnos`;
    return this.search(query, { maxResults: 8 });
  }

  /**
   * Busca mejores prácticas educativas para el sector
   */
  async searchBestPractices(industry: string): Promise<string> {
    const query = `mejores prácticas cursos en línea diseño instruccional ${industry}`;
    return this.search(query, { maxResults: 5 });
  }
  
  /**
   * Busca información específica para una unidad de un curso
   */
  async searchUnitTopic(unitName: string, projectName: string): Promise<any> {
    const query = `información técnica y mejores prácticas para "${unitName}" en el contexto de ${projectName}`;
    const res = await this.search(query, { maxResults: 3 });
    
    // Devolvemos estructura compatible con lo que espera el assembler
    return {
      practicas: res.results?.map((r: any) => r.content) || [],
      referencias: res.results?.map((r: any) => r.url) || [],
      tendencias: res.answer ? [res.answer] : [],
      contexto_industria: res.answer || ''
    };
  }
}
