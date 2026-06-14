import { Context } from 'hono';
import { SupabaseService } from '../services/supabase.service';
import { DEV_USER_ID } from '../../core/middleware/auth.middleware';

export async function handleCreateProject(c: Context) {
  try {
    const { name, clientName, industry, email } = (c.req as any).valid('json');
    const supabase = new SupabaseService(c.env);
    const userId = (c as any).get('userId') as string ?? DEV_USER_ID;
    const data = await supabase.createProject({ userId, name, clientName, industry, email });
    return c.json({ success: true, data, timestamp: new Date().toISOString() }, 201 as 201);
  } catch (error: any) {
    console.error('[PROJECT-CREATE-ERROR]', error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

export async function handleGetProject(c: Context) {
  try {
    const { projectId } = (c.req as any).valid('param');
    const supabase = new SupabaseService(c.env);
    const data = await supabase.getProjectContext(projectId);
    return c.json({ success: true, data, timestamp: new Date().toISOString() }, 200 as 200);
  } catch (error: any) {
    console.error('[PROJECT-GET-ERROR]', error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

export async function handleListProjects(c: Context) {
  try {
    const supabase = new SupabaseService(c.env);
    const userId = (c as any).get('userId') as string ?? DEV_USER_ID;
    const data = await supabase.getUserProjects(userId);
    return c.json({ success: true, data, timestamp: new Date().toISOString() }, 200 as 200);
  } catch (error: any) {
    console.error('[PROJECTS-LIST-ERROR]', error);
    return c.json({ success: false, error: error.message }, 500);
  }
}


