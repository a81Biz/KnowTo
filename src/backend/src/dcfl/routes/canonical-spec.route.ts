import { Hono } from 'hono';
import { SupabaseService } from '../services/supabase.service';
import type { Env } from '../../core/types/env';

const canonicalSpecRoutes = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

// GET /dcfl/api/canonical-spec/:projectId
// Returns whether the canonical production spec has been confirmed.
canonicalSpecRoutes.get('/:projectId', async (c) => {
  const projectId = c.req.param('projectId');
  const supabase = new SupabaseService(c.env);
  try {
    const frozen = await supabase.getCanonicalSpecFrozen(projectId);
    return c.json({ canonical_spec_frozen: frozen });
  } catch (err) {
    console.error('[canonical-spec-route] getCanonicalSpecFrozen error:', err);
    return c.json({ canonical_spec_frozen: false, error: String(err) }, 500);
  }
});

// PATCH /dcfl/api/canonical-spec/:projectId/confirm
// Confirms the canonical production spec (temario + F2.5 + F3 specs are locked).
// Required gate before any F4/F5/F6/F7 pipeline job can run.
canonicalSpecRoutes.patch('/:projectId/confirm', async (c) => {
  const projectId = c.req.param('projectId');
  const userId = c.get('userId');
  const supabase = new SupabaseService(c.env);

  // Ownership check
  try {
    const { data: proj } = await supabase.client!
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!proj) return c.json({ error: 'Forbidden' }, 403);
  } catch (err) {
    console.error('[canonical-spec-route] ownership check error:', err);
    return c.json({ error: 'Error al verificar permisos' }, 500);
  }

  try {
    await supabase.confirmCanonicalSpecFrozen(projectId);
    return c.json({ ok: true });
  } catch (err) {
    console.error('[canonical-spec-route] confirmCanonicalSpecFrozen error:', err);
    return c.json({ ok: false, error: String(err) }, 500);
  }
});

export { canonicalSpecRoutes };
