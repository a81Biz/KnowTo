/**
 * Helper para estructurar resultados de Tavily como array de objetos (VERSIÓN PROFUNDA)
 */
export const extractStructured = (tavilyRes: any): any[] => {
  if (!tavilyRes || !tavilyRes.results) return [];

  return tavilyRes.results.slice(0, 2).map((r: any, index: number) => ({
    i: index + 1,
    t: r.title ? r.title.substring(0, 120) : 'Sin título',
    u: r.url || '',
    c: r.content ? r.content.substring(0, 800) : '',
    f: r.score || 0
  }));
};

/**
 * Realiza el enriquecimiento del contexto mediante búsqueda web y OSINT.
 */
export async function enrichContextWithOSINT(
  context: any,
  jobId: string,
  projectId: string,
  services: {
    ai: any;
    webSearch: any;
    pipelineService: any;
    supabase: any;
  }
): Promise<any> {
  const enrichedContext = { ...context };
  const { ai, webSearch, pipelineService, supabase } = services;

  console.log('[OSINT-HELPER] ========== INICIANDO ENRIQUECIMIENTO OSINT ==========');

  let topic = enrichedContext.courseTopic || enrichedContext.projectName || '';
  let industry = enrichedContext.industry || '';
  let projectName = enrichedContext.projectName || '';

  try {
    console.log('[OSINT-HELPER] Pre-extrayendo variables del proyecto...');
    const extractorPrompt = `
Extrae del contexto: projectName, industry, courseTopic.
Devuelve SOLO JSON: {"projectName": "...", "industry": "...", "courseTopic": "..."}
Contexto: ${JSON.stringify({ projectName, industry, courseTopic: topic })}
`;
    const extractionRes = await ai.runAgent(extractorPrompt, 'qwen2.5:14b', '');
    const parsed = JSON.parse(extractionRes.replace(/```json\n?|```\n?/g, '').trim());
    projectName = parsed.projectName || projectName;
    industry = parsed.industry || industry;
    topic = parsed.courseTopic || topic;

    // Actualizar contexto con valores normalizados
    enrichedContext.projectName = projectName;
    enrichedContext.industry = industry;
    enrichedContext.courseTopic = topic;
  } catch (e) {
    console.warn('[OSINT-HELPER] Error en pre-extracción, usando valores originales');
  }

  // Generar queries dinámicas (Obligando Inglés y Macro-Nicho)
  const queriesPrompt = `
You are an OSINT expert. Generate 7 search queries for Tavily.

Project context:
- Topic: ${topic}
- Industry: ${industry}

CRITICAL RULES:
1. LANGUAGE: All search terms MUST BE IN ENGLISH (e.g., "miniature painting market size").
2. COMPETITOR SEARCH: DO NOT hardcode specific platforms like Udemy or Coursera. Use boolean logic combining the English macro-niche with educational intent keywords. Example: "${industry}" AND (course OR tutorial OR class OR workshop OR masterclass)
3. NO QUOTES around the full project title. Never search for the literal Spanish title.
4. JSON FORMAT: Return ONLY a valid JSON object. Do NOT use markdown code blocks (\`\`\`json). 

Use these EXACT keys in English:
{
  "market_size": "...",
  "trends": "...",
  "regulations": "...",
  "certifications": "...",
  "competitors": "...",
  "practices": "...",
  "references": "..."
}
`;
  const queriesResponse = await ai.runAgent(queriesPrompt, 'qwen2.5:14b', '');

  // Fallback de seguridad en Inglés
  let searchQueries = {
    market_size: `"${industry}" market size revenue report`,
    trends: `"${industry}" industry trends shifts`,
    regulations: `"${industry}" regulations laws compliance`,
    certifications: `"${industry}" professional certifications standards`,
    competitors: `"${industry}" AND (course OR tutorial OR class OR workshop OR masterclass)`,
    practices: `"${industry}" instructional design best practices`,
    references: `"${industry}" bibliography books guides`
  };

  try {
    const cleanJson = queriesResponse.replace(/```json\n?|```\n?/g, '').trim();
    searchQueries = JSON.parse(cleanJson);
  } catch (e) {
    console.warn('[OSINT-HELPER] Error parseando queries, usando fallback');
  }

  console.log('[OSINT-HELPER] Queries generadas:', searchQueries);
  await pipelineService.saveAgentOutput(jobId, 'generador_queries', JSON.stringify(searchQueries));

  // Ejecutar búsquedas paralelas
  console.log('[OSINT-HELPER] Ejecutando búsquedas en paralelo...');
  const [
    marketResults,
    trendsResults,
    regulationsResults,
    certificationsResults,
    competitorResults,
    practicesResults,
    referencesResults
  ] = await Promise.all([
    webSearch.search(searchQueries.market_size, { maxResults: 3 }),
    webSearch.search(searchQueries.trends, { maxResults: 3 }),
    webSearch.search(searchQueries.regulations, { maxResults: 3 }),
    webSearch.search(searchQueries.certifications, { maxResults: 3 }),
    webSearch.search(searchQueries.competitors, { maxResults: 3 }),
    webSearch.search(searchQueries.practices, { maxResults: 3 }),
    webSearch.search(searchQueries.references, { maxResults: 3 })
  ]);

  // Búsqueda de desafíos
  const challengesQuery = `"${topic}" AND (common mistakes OR why is it so hard OR beginner struggles OR flat contrast OR bad blending OR frustrating)`;
  const challengesResults = await webSearch.search(challengesQuery, { maxResults: 3 });

  const fullTavilyResults = {
    market_size: marketResults,
    trends: trendsResults,
    regulations: regulationsResults,
    certifications: certificationsResults,
    competitors: competitorResults,
    practices: practicesResults,
    references: referencesResults,
    challenges: challengesResults
  };
  await pipelineService.saveAgentOutput(jobId, 'tavily_results', JSON.stringify(fullTavilyResults));

  // Estructurar resultados
  enrichedContext.webSearchResults = {
    market_size: extractStructured(marketResults),
    trends: extractStructured(trendsResults),
    regulations: extractStructured(regulationsResults),
    certifications: extractStructured(certificationsResults),
    competitors: extractStructured(competitorResults),
    practices: extractStructured(practicesResults),
    references: extractStructured(referencesResults),
    challenges: extractStructured(challengesResults)
  };

  // Guardar contexto enriquecido
  await supabase.saveEnrichedContext(projectId, 'F0', enrichedContext);
  console.log('[OSINT-HELPER] ========== FIN ENRIQUECIMIENTO OSINT ==========');

  return enrichedContext;
}
