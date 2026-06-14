import { Context } from 'hono';
import { SupabaseService } from '../services/supabase.service';

export async function handleGetF4Productos(c: Context) {
  const { projectId } = (c.req as any).valid('param');
  const supabase = new SupabaseService(c.env);
  const productos = await supabase.getF4Productos(projectId);
  return c.json({ success: true, data: { productos }, timestamp: new Date().toISOString() }, 200 as 200);
}
