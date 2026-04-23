import { Context } from 'hono';
import { SupabaseService } from '../services/supabase.service';

export async function handleCreateProject(c: Context) {
  const { name, clientName, industry, email } = (c.req as any).valid('json');
  const supabase = new SupabaseService(c.env);
  const data = await supabase.createProject({ userId: c.get('userId'), name, clientName, industry, email });
  return c.json({ success: true, data, timestamp: new Date().toISOString() }, 201 as 201);
}

export async function handleGetProject(c: Context) {
  const { projectId } = (c.req as any).valid('param');
  const supabase = new SupabaseService(c.env);
  const data = await supabase.getProjectContext(projectId);
  return c.json({ success: true, data, timestamp: new Date().toISOString() }, 200 as 200);
}

export async function handleListProjects(c: Context) {
  const supabase = new SupabaseService(c.env);
  const data = await supabase.getUserProjects(c.get('userId'));
  return c.json({ success: true, data, timestamp: new Date().toISOString() }, 200 as 200);
}
