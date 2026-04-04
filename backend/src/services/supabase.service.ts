// src/services/supabase.service.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../types/env';

export class SupabaseService {
  private client: SupabaseClient;

  constructor(env: Env) {
    this.client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async createProject(params: {
    userId: string;
    name: string;
    clientName: string;
    industry?: string;
    email?: string;
  }): Promise<{ projectId: string }> {
    const { data, error } = await this.client.rpc('sp_create_project', {
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
    const { data, error } = await this.client.rpc('sp_save_step', {
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
    const { data, error } = await this.client.rpc('sp_save_document', {
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
    const { data, error } = await this.client.rpc('sp_get_project_context', {
      p_project_id: projectId,
    });

    if (error) throw new Error(`sp_get_project_context failed: ${error.message}`);
    return data as Record<string, unknown>;
  }

  async markStepError(stepId: string, errorMsg: string): Promise<void> {
    await this.client.rpc('sp_mark_step_error', {
      p_step_id: stepId,
      p_error_msg: errorMsg,
    });
  }

  async getUserProjects(userId: string) {
    const { data, error } = await this.client
      .from('vw_project_progress')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`getUserProjects failed: ${error.message}`);
    return data ?? [];
  }
}
