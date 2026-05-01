import { Context } from 'hono';
import { SupabaseService } from '../services/supabase.service';

export async function handleSaveStep(c: Context) {
  const { projectId, stepNumber, inputData } = (c.req as any).valid('json');
  const supabase = new SupabaseService(c.env);
  const data = await supabase.saveStep({ projectId, stepNumber, inputData });
  return c.json({ success: true, data, timestamp: new Date().toISOString() }, 200 as 200);
}

export async function handleCompleteStep(c: Context) {
  const { stepId } = await c.req.json() as { stepId: string };
  const supabase = new SupabaseService(c.env);
  const { error } = await supabase.client!
    .from('wizard_steps')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', stepId);
  if (error) return c.json({ success: false, error: error.message }, 500);
  return c.json({ success: true, timestamp: new Date().toISOString() });
}
