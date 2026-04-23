import { Context } from 'hono';
import { SupabaseService } from '../services/supabase.service';
import { detectDiscrepancias } from '../services/discrepancy-detector';

export async function handleGetF2Discrepancias(c: Context) {
  const { projectId } = (c.req as any).valid('param');
  const supabase = new SupabaseService(c.env);

  const [f1Data, f2Data] = await Promise.all([
    supabase.getF1Informe(projectId),
    supabase.getF2Analisis(projectId),
  ]);

  if (!f1Data || !f2Data) {
    return c.json({ success: true, data: { discrepancias: [], total: 0 }, timestamp: new Date().toISOString() }, 200 as 200);
  }

  const discrepancias = detectDiscrepancias(f1Data as any, f2Data as any);
  return c.json({ success: true, data: { discrepancias, total: discrepancias.length }, timestamp: new Date().toISOString() }, 200 as 200);
}

export async function handlePostResolverDiscrepancias(c: Context) {
  const { projectId } = (c.req as any).valid('param');
  const { resoluciones, discrepancias } = (c.req as any).valid('json');
  const supabase = new SupabaseService(c.env);

  await supabase.saveResolucionDiscrepancias({
    projectId,
    discrepancias: discrepancias ?? [],
    resoluciones,
    listoParaF3: true,
  });

  return c.json({ success: true, timestamp: new Date().toISOString() }, 200 as 200);
}

export async function handleGetF2Resolucion(c: Context) {
  const { projectId } = (c.req as any).valid('param');
  const supabase = new SupabaseService(c.env);
  const raw = await supabase.getResolucionDiscrepancias(projectId);
  const data = raw ? { resoluciones: raw.resoluciones, listo_para_f3: raw.listo_para_f3 } : null;
  return c.json({ success: true, data, timestamp: new Date().toISOString() }, 200 as 200);
}
