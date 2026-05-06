import { Context } from 'hono';
import { SupabaseService } from '../services/supabase.service';

export async function handleCreateProject(c: Context) {
  try {
    const { name, clientName, industry, email } = (c.req as any).valid('json');
    const supabase = new SupabaseService(c.env);
    const data = await supabase.createProject({ userId: '00000000-0000-0000-0000-000000000001', name, clientName, industry, email });
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
    
    if (!supabase.client) {
      console.error('[PROJECTS-LIST-ERROR] Supabase client is not initialized.');
      return c.json({ success: false, error: 'Database client not initialized' }, 500);
    }

    // Tabla estandarizada: projects
    const { data, error } = await supabase.client
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (data && data.length > 0) {
      console.log('[DEBUG-PROJECTS-SCHEMA] Columnas detectadas:', JSON.stringify(Object.keys(data[0])));
    }

    // MAPEO AGRESIVO: Forzar la existencia de la propiedad 'id'
    const normalizedProjects = (data || []).map(p => {
      const realId = p.id || p.project_id || p.projectId || Object.entries(p).find(([k]) => k.toLowerCase().endsWith('id'))?.[1];
      
      return {
        ...p,
        id: realId, // Aseguramos que 'id' exista para el front
        project_id: realId // Retrocompatibilidad
      };
    });

    return c.json({ success: true, data: normalizedProjects, timestamp: new Date().toISOString() }, 200 as 200);
  } catch (error: any) {
    console.error('[PROJECTS-LIST-ERROR]', error);
    return c.json({ success: false, error: error.message }, 500);
  }
}


