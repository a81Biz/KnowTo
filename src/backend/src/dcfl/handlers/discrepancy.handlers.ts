import { Context } from 'hono';
import { SupabaseService } from '../services/supabase.service';
import { detectDiscrepancias } from '../services/discrepancy-detector';

export async function handleGetF2Discrepancias(c: Context) {
  try {
    const { projectId } = (c.req as any).valid('param');
    const supabase = new SupabaseService(c.env);

    const [f1Data, f2Data] = await Promise.all([
      supabase.getF1Informe(projectId),
      supabase.getF2Analisis(projectId),
    ]);

    if (!f1Data || !f2Data) {
      return c.json({ success: true, data: { discrepancias: [], total: 0 }, timestamp: new Date().toISOString() }, 200 as 200);
    }

    // Adaptación a la nueva estructura estricta JSON de F1 y F2
    const f1Estructurado = typeof f1Data === 'string' ? {} : (f1Data as any) || {};
    const f2Estructurado = typeof f2Data === 'string' ? {} : (f2Data as any) || {};

    const f1Perfil = f1Estructurado.perfil_participante || f1Estructurado.perfil || {};
    const f2Perfil = f2Estructurado.perfil_ingreso_ec0366 || f2Estructurado.perfil_ingreso || {};

    // Mapeo defensivo para el detector original
    const f1Safe = {
      ...f1Estructurado,
      perfil_participante: f1Perfil
    };
    const f2Safe = {
      ...f2Estructurado,
      perfil_ingreso: f2Perfil
    };

    const discrepancias = detectDiscrepancias(f1Safe, f2Safe);
    
    return c.json({ success: true, data: { discrepancias, total: discrepancias.length }, timestamp: new Date().toISOString() }, 200 as 200);
  } catch (error) {
    console.error("[Discrepancias] Error comparando F1 y F2:", error);
    // Fallback seguro en lugar de HTTP 500
    return c.json({ success: true, data: { discrepancias: [], total: 0 }, timestamp: new Date().toISOString() }, 200 as 200);
  }
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
