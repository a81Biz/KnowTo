// src/dcfl/services/supabase.service.ts
// Extensión del BaseSupabaseService para el microsite DCFL (EC0366).
// Solo sobreescribe los nombres de RPC específicos de DCFL e implementa
// createProject con los parámetros del estándar de certificación.

import { BaseSupabaseService } from '../../core/services/supabase.service';
import type { Env } from '../../core/types/env';

export class SupabaseService extends BaseSupabaseService {
  // RPCs del schema DCFL (sin prefijo cce_)
  protected override readonly spSaveStep = 'sp_save_step';
  protected override readonly spSaveDocument = 'sp_save_document';
  protected override readonly spGetProjectContext = 'sp_get_project_context';
  protected override readonly spSaveExtractedContext = 'sp_save_extracted_context';
  protected override readonly spMarkStepError = 'sp_mark_step_error';
  protected override readonly projectProgressView = 'vw_project_progress';

  constructor(env: Env) {
    super(env);
  }

  async createProject(params: {
    userId: string;
    name: string;
    clientName: string;
    industry?: string | undefined;
    email?: string | undefined;
  }): Promise<{ projectId: string }> {
    if (!this.client) return { projectId: crypto.randomUUID() };

    const { data, error } = await this.client!.rpc('sp_create_project', {
      p_user_id: params.userId,
      p_name: params.name,
      p_client_name: params.clientName,
      p_industry: params.industry ?? null,
      p_email: params.email ?? null,
    });

    if (error) throw new Error(`sp_create_project failed: ${error.message}`);
    if (!data.success) throw new Error(data.error);
    return { projectId: data.project_id };
  }

  async saveF0Componentes(params: {
    project_id: string;
    job_id: string;
    sector: any;
    practicas: any[];
    competencia: any[];
    estandares: any[];
    gaps: any;
    preguntas: string[];
    recomendaciones: string[];
    referencias: any[];
    documento_final: string;
  }): Promise<void> {
    if (!this.client) return;
    const { error } = await this.client
      .from('fase0_componentes')
      .upsert(params, { onConflict: 'project_id, job_id' });

    if (error) {
      console.error('[SupabaseService] saveF0Componentes failed:', error.message);
      throw error;
    }
  }

  async getFase0Estructurado(projectId: string): Promise<any> {
    if (!this.client) return {};
    
    const { data, error } = await this.client
      .from('fase0_componentes')
      .select('sector, practicas, competencia, gaps, preguntas, recomendaciones, referencias')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (error || !data) {
      console.warn(`[supabase] getFase0Estructurado: not found for project ${projectId}`);
      return {};
    }
    
    // Normalizar nulls a strings vacíos para evitar errores en prompt render
    return Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v ?? ''])
    );
  }

  async getFaseAnswersDetailed(projectId: string, faseDestino: number): Promise<Array<{ pregunta: string; respuesta: string }>> {
    if (!this.client) return [];
    
    // 1. Obtener preguntas de preguntas_fase
    const { data: preguntas, error: errP } = await this.client
      .from('preguntas_fase')
      .select('id, texto, orden')
      .eq('project_id', projectId)
      .eq('fase_destino', faseDestino)
      .order('orden', { ascending: true });
      
    if (errP || !preguntas?.length) return [];
    
    // 2. Obtener respuestas de respuestas_preguntas_fase
    const preguntaIds = preguntas.map(p => p.id);
    const { data: respuestas, error: errR } = await this.client
      .from('respuestas_preguntas_fase')
      .select('pregunta_id, respuesta')
      .in('pregunta_id', preguntaIds);
      
    if (errR) return preguntas.map(p => ({ pregunta: p.texto, respuesta: '' }));
    
    // 3. Unir preguntas + respuestas
    const respuestasMap = new Map(respuestas?.map(r => [r.pregunta_id, r.respuesta]) || []);
    
    return preguntas.map(p => ({
      pregunta: p.texto,
      respuesta: respuestasMap.get(p.id) || ''
    }));
  }

  async getF0Componentes(projectId: string) {
    if (!this.client) return null;
    const { data, error } = await this.client
      .from('fase0_componentes')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[SupabaseService] getF0Componentes failed:', error.message);
      return null;
    }
    return data;
  }
}
