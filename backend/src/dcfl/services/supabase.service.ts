// src/dcfl/services/supabase.service.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../../core/types/env';

export class SupabaseService {
  private client: SupabaseClient | null;
  private isDev: boolean;

  constructor(env: Env) {
    this.isDev = env.ENVIRONMENT !== 'production';
    // En dev no se necesita conexión real; evitar crash si las vars no están definidas.
    this.client = this.isDev
      ? null
      : createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
  }

  async createProject(params: {
    userId: string;
    name: string;
    clientName: string;
    industry?: string | undefined;
    email?: string | undefined;
  }): Promise<{ projectId: string }> {
    if (this.isDev) {
      return { projectId: crypto.randomUUID() };
    }

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

  async saveStep(params: {
    projectId: string;
    stepNumber: number;
    inputData: Record<string, unknown>;
  }): Promise<{ stepId: string }> {
    if (this.isDev) {
      return { stepId: crypto.randomUUID() };
    }

    const { data, error } = await this.client!.rpc('sp_save_step', {
      p_project_id: params.projectId,
      p_step_number: params.stepNumber,
      p_input_data: params.inputData,
    });

    if (error) throw new Error(`sp_save_step failed: ${error.message}`);
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
    if (this.isDev) {
      return { documentId: crypto.randomUUID() };
    }

    const { data, error } = await this.client!.rpc('sp_save_document', {
      p_project_id: params.projectId,
      p_step_id: params.stepId,
      p_phase_id: params.phaseId,
      p_title: params.title,
      p_content: params.content,
    });

    if (error) throw new Error(`sp_save_document failed: ${error.message}`);
    if (!data.success) throw new Error(data.error);
    return { documentId: data.document_id };
  }

  async getProjectContext(projectId: string): Promise<Record<string, unknown>> {
    if (this.isDev) {
      return { project: null };
    }

    const { data, error } = await this.client!.rpc('sp_get_project_context', {
      p_project_id: projectId,
    });

    if (error) throw new Error(`sp_get_project_context failed: ${error.message}`);
    return data as Record<string, unknown>;
  }

  async markStepError(stepId: string, errorMsg: string): Promise<void> {
    if (this.isDev) return;

    await this.client!.rpc('sp_mark_step_error', {
      p_step_id: stepId,
      p_error_msg: errorMsg,
    });
  }

  async getUserProjects(userId: string) {
    if (this.isDev) return [];

    const { data, error } = await this.client!
      .from('vw_project_progress')
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
    if (this.isDev) {
      return { extractedContextId: crypto.randomUUID() };
    }

    const { data, error } = await this.client!.rpc('sp_save_extracted_context', {
      p_project_id: params.projectId,
      p_extractor_id: params.extractorId,
      p_from_phases: params.fromPhases,
      p_to_phase: params.toPhase,
      p_content: params.content,
      p_parser_used: params.parserUsed,
    });

    if (error) throw new Error(`sp_save_extracted_context failed: ${error.message}`);
    if (!data.success) throw new Error(data.error);
    return { extractedContextId: data.extracted_context_id };
  }

  async getExtractedContext(params: {
    projectId: string;
    extractorId: string;
  }): Promise<{ content: string } | null> {
    if (this.isDev) return null;

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
}
