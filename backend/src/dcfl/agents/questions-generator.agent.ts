import { AIService } from '../../core/services/ai.service';

export async function generateStrategicQuestions(
  ai: AIService,
  context: {
    projectName: string;
    industry?: string;
    courseTopic?: string;
  }
): Promise<string[]> {
  const prompt = `
You are an instructional design consultant aligned with EC0366 standard. You are advising an expert who wants to create and sell an online course.

Project context:
- Name: ${context.projectName}
- Industry: ${context.industry || 'Not specified'}
- Topic: ${context.courseTopic || context.projectName}

Generate 9 STRATEGIC questions for the client (the course creator). DO NOT ask about the course topic. Ask about COURSE DESIGN:

- Technical infrastructure (cameras, platform, equipment)
- Distance learning assessment methods
- Monetization strategy
- Follow-up and feedback mechanisms
- Content format that works best for their audience
- Unique value proposition against competitors
- Student support and community building
- Accessibility and inclusivity considerations
- Quality assurance and continuous improvement

Return ONLY a JSON array of 9 strings. Example: ["Question 1?", "Question 2?", ...]
`;

  const response = await ai.runAgent(prompt, 'qwen2.5:14b', '');
  try {
    const cleanJson = response.replace(/```json\n?|```\n?/g, '').trim();
    return JSON.parse(cleanJson) as string[];
  } catch (error) {
    console.error('[questions-generator] Error parseando preguntas:', error);
    return [
      "¿Qué infraestructura técnica utilizarás?",
      "¿Cómo evaluarás el aprendizaje?",
      "¿Cuál es tu estrategia de monetización?",
      "¿Cómo darás retroalimentación?",
      "¿Qué formato de contenido prefieres?",
      "¿Cuál es tu propuesta de valor?",
      "¿Cómo fomentarás la comunidad?",
      "¿Qué medidas de accesibilidad incluirás?",
      "¿Cómo medirás la calidad del curso?"
    ];
  }
}
