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
  
  // 1. Intentar obtener de fase0_componentes (nueva fuente de verdad consolidada en DCFL)
  const componentes = await supabase.getF0Componentes(projectId);
  if (componentes) {
    return c.json({ 
      success: true, 
      data: { 
        ...componentes,
        brechas: componentes.gaps,           // Mapeo para compatibilidad con Step1NeedsController
        content: componentes.documento_final // Mapeo solicitado por el usuario
      } 
    }, 200 as 200);
  }

  // 2. Fallback a fase0_estructurado (legacy o usado por otros módulos)
  const legacy = await supabase.getFase0Estructurado(projectId);
  if (legacy) {
    return c.json({ 
      success: true, 
      data: { 
        ...legacy,
        content: legacy.documento_final 
      } 
    }, 200 as 200);
  }

  return c.json({ success: false, error: 'No se encontraron datos estructurados F0' }, 404);
}
