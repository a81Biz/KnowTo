import { AIService } from '../../core/services/ai.service';

export interface SearchQueries {
  market: string;
  competitors: string;
  practices: string;
  references: string;
}

export async function generateSearchQueries(
  ai: AIService,
  context: {
    projectName: string;
    industry?: string;
    courseTopic?: string;
  }
): Promise<SearchQueries> {
  const prompt = `
You are an OSINT expert and semantic search specialist. Your ONLY task is to generate 4 optimal search queries for Tavily API.

Project context:
- Name: ${context.projectName}
- Industry: ${context.industry || 'Not specified'}
- Topic: ${context.courseTopic || context.projectName}

Generate queries in ENGLISH. Rules:
- 3-6 keywords maximum per query
- No questions, no "how to", no "what is"
- Use quotes for exact phrases if needed

Categories:
1. MARKET: market size, trends, regulations, certifications
2. COMPETITORS: similar courses, platforms, prices, syllabi  
3. PRACTICES: instructional design best practices for this course type
4. REFERENCES: academic articles, books, bibliographic references

Return ONLY valid JSON:
{
  "market": "query",
  "competitors": "query",
  "practices": "query",
  "references": "query"
}
`;

  const response = await ai.runAgent(prompt, 'qwen2.5:14b', '');
  try {
    const cleanJson = response.replace(/```json\n?|```\n?/g, '').trim();
    return JSON.parse(cleanJson) as SearchQueries;
  } catch (error) {
    console.error('[query-generator] Error parseando queries:', error);
    return {
      market: `market size trends ${context.industry || context.projectName}`,
      competitors: `online courses ${context.courseTopic || context.projectName} competitors`,
      practices: `instructional design best practices ${context.industry || context.projectName}`,
      references: `books articles bibliography ${context.courseTopic || context.projectName}`
    };
  }
}
