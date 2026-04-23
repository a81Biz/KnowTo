import { Context } from 'hono';
import { SupabaseService } from '../services/supabase.service';

export async function handleGetF0Context(c: Context) {
  const { projectId } = (c.req as any).valid('param');
  const supabase = new SupabaseService(c.env);
  const data = await supabase.getF0AgentOutputs(projectId);
  return c.json({ success: true, data, timestamp: new Date().toISOString() }, 200 as 200);
}

export async function handleGetF0Estructurado(c: Context) {
  const projectId = c.req.param('projectId');
  if (!projectId) return c.json({ success: false, error: 'projectId is required' }, 400);
  const supabase = new SupabaseService(c.env);
  const data = await supabase.getFase0Estructurado(projectId);
  if (!data) return c.json({ success: false, error: 'No se encontraron datos estructurados F0' }, 404);
  return c.json({ success: true, data }, 200 as 200);
}
