import { Context } from 'hono';
import { SupabaseService } from '../services/supabase.service';

export async function handleGetF1Informe(c: Context) {
  const { projectId } = (c.req as any).valid('param');
  const supabase = new SupabaseService(c.env);
  const data = await supabase.getF1Informe(projectId);
  return c.json({ success: true, data, timestamp: new Date().toISOString() }, 200 as 200);
}

export async function handleGetF2Analisis(c: Context) {
  const { projectId } = (c.req as any).valid('param');
  const supabase = new SupabaseService(c.env);
  const raw = await supabase.getF2Analisis(projectId);
  const data = raw ? { ...raw, perfil_ajustado: raw.perfil_ajustado ?? null } : null;
  return c.json({ success: true, data, timestamp: new Date().toISOString() }, 200 as 200);
}

export async function handleGetF2_5Recomendaciones(c: Context) {
  const { projectId } = (c.req as any).valid('param');
  const supabase = new SupabaseService(c.env);
  const data = await supabase.getF2_5Recomendaciones(projectId);
  return c.json({ success: true, data, timestamp: new Date().toISOString() }, 200 as 200);
}

export async function handleGetF3Especificaciones(c: Context) {
  const { projectId } = (c.req as any).valid('param');
  const supabase = new SupabaseService(c.env);
  const raw = await supabase.getF3Especificaciones(projectId);
  const data = raw ? {
    plataforma_navegador: raw.plataforma_navegador as Record<string, unknown> | null,
    reporteo:             raw.reporteo             as Record<string, unknown> | null,
    formatos_multimedia:  raw.formatos_multimedia  as Record<string, unknown> | null,
    navegacion_identidad: raw.navegacion_identidad as Record<string, unknown> | null,
    criterios_aceptacion: raw.criterios_aceptacion as Record<string, unknown> | null,
    calculo_duracion:     raw.calculo_duracion     as Record<string, unknown> | null,
    documento_final:      raw.documento_final,
    juez_decision:        raw.juez_decision,
    juez_similitud:       raw.juez_similitud as number | null,
  } : null;
  return c.json({ success: true, data, timestamp: new Date().toISOString() }, 200 as 200);
}
