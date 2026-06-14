import { Hono } from 'hono';
import { SupabaseService } from '../services/supabase.service';
import type { Env } from '../../core/types/env';

const temarioRoutes = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

// GET /dcfl/api/temario/:projectId
// Devuelve el temario base del proyecto, o { confirmado_por_usuario: false } si no existe.
temarioRoutes.get('/:projectId', async (c) => {
  const projectId = c.req.param('projectId');
  const supabase = new SupabaseService(c.env);
  try {
    const data = await supabase.getTemarioBase(projectId);
    return c.json(data ?? { confirmado_por_usuario: false, temario: [], total_unidades: 0 });
  } catch (err) {
    console.error('[temario-route] getTemarioBase error:', err);
    return c.json({ confirmado_por_usuario: false, temario: [], total_unidades: 0, error: String(err) }, 500);
  }
});

// PATCH /dcfl/api/temario/:projectId/confirm
// Confirma el temario. Body opcional: { ediciones: { temario?: object[], tiempos?: object[] } }
temarioRoutes.patch('/:projectId/confirm', async (c) => {
  const projectId = c.req.param('projectId');
  const userId = c.get('userId');
  const supabase = new SupabaseService(c.env);

  // Ownership check — only the project owner can confirm the temario
  try {
    const { data: proj } = await supabase.client!
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!proj) return c.json({ error: 'Forbidden' }, 403);
  } catch (err) {
    console.error('[temario-route] ownership check error:', err);
    return c.json({ error: 'Error al verificar permisos' }, 500);
  }

  let ediciones: object | undefined;
  try {
    const body = await c.req.json().catch(() => ({}));
    ediciones = (body as any).ediciones;
  } catch {}
  try {
    await supabase.confirmarTemario(projectId, ediciones);
    return c.json({ ok: true });
  } catch (err) {
    console.error('[temario-route] confirmarTemario error:', err);
    return c.json({ ok: false, error: String(err) }, 500);
  }
});

export { temarioRoutes };
