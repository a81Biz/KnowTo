import { Context } from 'hono';
import { SupabaseService } from '../services/supabase.service';

export async function handleGetPhaseQuestions(c: Context) {
  const { projectId, phaseDestino } = (c.req as any).valid('param');
  const supabase = new SupabaseService(c.env);
  const questions = await supabase.getFaseQuestions(projectId, phaseDestino);
  return c.json({ success: true, data: { questions }, timestamp: new Date().toISOString() }, 200 as 200);
}

export async function handlePostPhaseAnswers(c: Context) {
  const { projectId } = (c.req as any).valid('param');
  const { answers } = (c.req as any).valid('json');
  const supabase = new SupabaseService(c.env);
  await supabase.saveFaseAnswers({ projectId, answers });
  return c.json({ success: true, timestamp: new Date().toISOString() }, 200 as 200);
}

export async function handleGetFase1PreguntasRespuestas(c: Context) {
  const projectId = c.req.param('projectId');
  if (!projectId) return c.json({ success: false, error: 'projectId is required' }, 400);
  
  const supabase = new SupabaseService(c.env);
  
  const preguntas = await supabase.getFaseQuestions(projectId, 1);
  const respuestas = await supabase.getFaseAnswers(projectId, 1);
  
  const preguntasRespuestas = preguntas.map((p: any) => ({
    id: p.id,
    pregunta: p.texto,
    respuesta: respuestas.find((r: any) => r.pregunta_id === p.id)?.respuesta ?? 'No especificada'
  }));
  
  return c.json({ success: true, data: { preguntasRespuestas } }, 200 as 200);
}
