import { AIService } from '../../core/services/ai.service';

export async function generateRecommendations(
  ai: AIService,
  context: {
    projectName: string;
    industry?: string;
    courseTopic?: string;
    marketResults?: string;
    competitorResults?: string;
  }
): Promise<string[]> {
  const prompt = `
You are an instructional design consultant aligned with EC0366 standard. You are advising an expert who wants to create and sell an online course.

Based on the following research, generate 3 ACTIONABLE recommendations about INSTRUCTIONAL DESIGN, not about the course topic.

Market research: ${context.marketResults?.substring(0, 1000) || 'No market data available'}

Competitor research: ${context.competitorResults?.substring(0, 1000) || 'No competitor data available'}

Project context:
- Name: ${context.projectName}
- Topic: ${context.courseTopic || context.projectName}

Return ONLY a JSON array of 3 strings. Example: ["Recommendation 1", "Recommendation 2", "Recommendation 3"]
`;

  const response = await ai.runAgent(prompt, 'qwen2.5:14b', '');
  try {
    const cleanJson = response.replace(/```json\n?|```\n?/g, '').trim();
    return JSON.parse(cleanJson) as string[];
  } catch (error) {
    console.error('[recommendations-generator] Error parseando recomendaciones:', error);
    return [
      "Implementa microaprendizaje con videos cortos.",
      "Incluye actividades prácticas evaluables.",
      "Crea un foro de dudas para los alumnos."
    ];
  }
}
