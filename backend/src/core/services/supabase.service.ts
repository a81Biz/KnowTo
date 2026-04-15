// src/core/services/supabase.service.ts
//
// Clase base abstracta para SupabaseService.
// Contiene toda la lógica de conexión y los métodos CRUD comunes.
// Las subclases sobreescriben los nombres de RPC/vistas según su estándar (DCFL, CCE…).
//
// Patrón de uso:
//   class DcflSupabaseService extends BaseSupabaseService { ... }
//   class CceSupabaseService  extends BaseSupabaseService { ... }

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../types/env';

export abstract class BaseSupabaseService {
  protected client: SupabaseClient | null;
  protected isDev: boolean;

  // ── Nombres de RPC / vistas — sobreescribir en subclases ─────────────────
  protected readonly spSaveStep                = 'sp_save_step';
  protected readonly spSaveDocument            = 'sp_save_document';
  protected readonly spGetProjectContext       = 'sp_get_project_context';
  protected readonly spSaveExtractedContext    = 'sp_save_extracted_context';
  protected readonly spMarkStepError           = 'sp_mark_step_error';
  protected readonly projectProgressView       = 'vw_project_progress';

  constructor(protected readonly env: Env) {
    this.isDev = env.ENVIRONMENT !== 'production';

    // Crear el cliente Supabase siempre que haya una URL real apuntando a la instancia.
    // En desarrollo local apunta al Kong interno (http://supabase-kong:8000).
    // En producción apunta al proyecto Supabase cloud.
    // Si la URL contiene 'dummy' o está vacía, se deja null y los métodos usan mocks.
    const url = env.SUPABASE_URL ?? '';
    const key = env.SUPABASE_SERVICE_ROLE_KEY ?? '';
    const hasRealSupabase = url.length > 0 && !url.includes('dummy') && key.length > 0 && !key.includes('dummy');

    this.client = hasRealSupabase
      ? createClient(url, key, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : null;
  }

  /** Devuelve el cliente Supabase. Solo disponible en producción. */
  getClient(): SupabaseClient | null {
    return this.client;
  }

  // ── createProject es abstracto: los parámetros difieren por estándar ───────
  abstract createProject(params: Record<string, unknown> & { userId: string; name: string; clientName: string }): Promise<{ projectId: string }>;

  async saveStep(params: {
    projectId: string;
    stepNumber: number;
    inputData: Record<string, unknown>;
  }): Promise<{ stepId: string }> {
    if (!this.client) return { stepId: crypto.randomUUID() };

    const { data, error } = await this.client!.rpc(this.spSaveStep, {
      p_project_id:   params.projectId,
      p_step_number:  params.stepNumber,
      p_input_data:   params.inputData,
    });

    if (error) throw new Error(`${this.spSaveStep} failed: ${error.message}`);
    if (!data.success) throw new Error(data.error);
    return { stepId: data.step_id };
  }

  async saveDocument(params: {
    projectId: string;
    stepId: string;
    phaseId: string;
    title: string;
    content: string;
  }): Promise<{ documentId: string }> {
    if (!this.client) return { documentId: crypto.randomUUID() };

    const { data, error } = await this.client!.rpc(this.spSaveDocument, {
      p_project_id: params.projectId,
      p_step_id:    params.stepId,
      p_phase_id:   params.phaseId,
      p_title:      params.title,
      p_content:    params.content,
    });

    if (error) throw new Error(`${this.spSaveDocument} failed: ${error.message}`);
    if (!data.success) throw new Error(data.error);
    return { documentId: data.document_id };
  }

  async getProjectContext(projectId: string): Promise<Record<string, unknown>> {
    if (!this.client) return { project: null };

    const { data, error } = await this.client!.rpc(this.spGetProjectContext, {
      p_project_id: projectId,
    });

    if (error) throw new Error(`${this.spGetProjectContext} failed: ${error.message}`);
    return data as Record<string, unknown>;
  }

  async getUserProjects(userId: string) {
    if (!this.client) return [];

    const { data, error } = await this.client!
      .from(this.projectProgressView)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`getUserProjects failed: ${error.message}`);
    return data ?? [];
  }

  async saveExtractedContext(params: {
    projectId: string;
    extractorId: string;
    fromPhases: string[];
    toPhase: string;
    content: string;
    parserUsed: Record<string, boolean>;
  }): Promise<{ extractedContextId: string }> {
    if (!this.client) return { extractedContextId: crypto.randomUUID() };

    const { data, error } = await this.client!.rpc(this.spSaveExtractedContext, {
      p_project_id:    params.projectId,
      p_extractor_id:  params.extractorId,
      p_from_phases:   params.fromPhases,
      p_to_phase:      params.toPhase,
      p_content:       params.content,
      p_parser_used:   params.parserUsed,
    });

    if (error) throw new Error(`${this.spSaveExtractedContext} failed: ${error.message}`);
    if (!data.success) throw new Error(data.error);
    return { extractedContextId: data.extracted_context_id };
  }

  async markStepError(stepId: string, errorMsg: string): Promise<void> {
    if (!this.client) return;
    await this.client!.rpc(this.spMarkStepError, {
      p_step_id:  stepId,
      p_error_msg: errorMsg,
    });
  }

  async getExtractedContext(params: {
    projectId: string;
    extractorId: string;
  }): Promise<{ content: string } | null> {
    if (!this.client) return null;

    const { data, error } = await this.client!
      .from('extracted_contexts')
      .select('content')
      .eq('project_id', params.projectId)
      .eq('extractor_id', params.extractorId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`getExtractedContext failed: ${error.message}`);
    if (!data) return null;
    return { content: (data as { content: string }).content };
  }

  /**
   * Obtiene un prompt de la tabla unificada `site_prompts` (migración 008).
   * Fallback: devuelve null si la tabla no existe aún (compatibilidad durante migración).
   */
  async getPromptFromSiteTable(siteId: string, promptId: string): Promise<Record<string, unknown> | null> {
    if (!this.client) return null;

    const { data, error } = await this.client
      .from('site_prompts')
      .select('content, metadata')
      .eq('site_id', siteId)
      .eq('prompt_id', promptId)
      .eq('active', true)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return null; // tabla puede no existir aún
    if (!data) return null;
    return data as Record<string, unknown>;
  }
}
