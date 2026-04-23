import { Context } from 'hono';
import { SupabaseService } from '../services/supabase.service';

export async function handleSaveStep(c: Context) {
  const { projectId, stepNumber, inputData } = (c.req as any).valid('json');
  const supabase = new SupabaseService(c.env);
  const data = await supabase.saveStep({ projectId, stepNumber, inputData });
  return c.json({ success: true, data, timestamp: new Date().toISOString() }, 200 as 200);
}
