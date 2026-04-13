// src/cce/services/supabase.service.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../../core/types/env';

export class SupabaseService {
  private client: SupabaseClient | null;
  private isDev: boolean;
  private devOutputs: Map<string, Record<string, any>> = new Map();

  constructor(env: Env) {
    this.isDev = env.ENVIRONMENT !== 'production';
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
    companyName?: string | undefined;
    sector?: string | undefined;
    email?: string | undefined;
  }): Promise<{ projectId: string }> {
    if (this.isDev) {
      return { projectId: crypto.randomUUID() };
    }

    const { data, error } = await this.client!.rpc('sp_cce_create_project', {
      p_user_id: params.userId,
      p_name: params.name,
      p_client_name: params.clientName,
      p_company_name: params.companyName ?? null,
      p_sector: params.sector ?? null,
      p_email: params.email ?? null,
    });

    if (error) throw new Error(`sp_cce_create_project failed: ${error.message}`);
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

    const { data, error } = await this.client!.rpc('sp_cce_save_step', {
      p_project_id: params.projectId,
      p_step_number: params.stepNumber,
      p_input_data: params.inputData,
    });

    if (error) throw new Error(`sp_cce_save_step failed: ${error.message}`);
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

    const { data, error } = await this.client!.rpc('sp_cce_save_document', {
      p_project_id: params.projectId,
      p_step_id: params.stepId,
      p_phase_id: params.phaseId,
      p_title: params.title,
      p_content: params.content,
    });

    if (error) throw new Error(`sp_cce_save_document failed: ${error.message}`);
    if (!data.success) throw new Error(data.error);
    return { documentId: data.document_id };
  }

  async getProjectContext(projectId: string): Promise<Record<string, unknown>> {
    if (this.isDev) {
      return { project: null };
    }

    const { data, error } = await this.client!.rpc('sp_cce_get_project_context', {
      p_project_id: projectId,
    });

    if (error) throw new Error(`sp_cce_get_project_context failed: ${error.message}`);
    return data as Record<string, unknown>;
  }

  async getUserProjects(userId: string) {
    if (this.isDev) return [];

    const { data, error } = await this.client!
      .from('vw_cce_project_progress')
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

    const { data, error } = await this.client!.rpc('sp_cce_save_extracted_context', {
      p_project_id: params.projectId,
      p_extractor_id: params.extractorId,
      p_from_phases: params.fromPhases,
      p_to_phase: params.toPhase,
      p_content: params.content,
      p_parser_used: params.parserUsed,
    });

    if (error) throw new Error(`sp_cce_save_extracted_context failed: ${error.message}`);
    if (!data.success) throw new Error(data.error);
    return { extractedContextId: data.extracted_context_id };
  }

  async getStepOutputs(projectId: string, keys?: string[]): Promise<Record<string, any>> {
    if (this.isDev) {
      const proj = this.devOutputs.get(projectId) || {};
      if (!keys || keys.length === 0) return proj;
      const res: Record<string, any> = {};
      for (const k of keys) {
        if (proj[k] !== undefined) res[k] = proj[k];
      }
      return res;
    }

    let query = this.client!.from('cce_step_outputs').select('output_key, output_value').eq('project_id', projectId);
    if (keys && keys.length > 0) {
      query = query.in('output_key', keys);
    }

    const { data: stepData, error: stepError } = await query;
    if (stepError) throw new Error(`getStepOutputs failed: ${stepError.message}`);
    
    const result: Record<string, any> = {};
    for (const row of stepData || []) {
      result[row.output_key] = row.output_value;
    }
    return result;
  }

  async saveStepOutput(params: {
    projectId: string;
    pipelineId: string;
    stageId: string;
    outputKey: string;
    outputValue: any;
  }): Promise<void> {
    if (this.isDev) {
      const proj = this.devOutputs.get(params.projectId) || {};
      proj[params.outputKey] = params.outputValue;
      this.devOutputs.set(params.projectId, proj);
      return;
    }

    const { error: insError } = await this.client!.from('cce_step_outputs').insert({
      project_id: params.projectId,
      pipeline_id: params.pipelineId,
      stage_id: params.stageId,
      output_key: params.outputKey,
      output_value: params.outputValue
    });

    if (insError) throw new Error(`saveStepOutput failed: ${insError.message}`);
  }

  async getPrompt(promptId: string): Promise<any> {
    if (this.isDev) {
      // In dev without DB, we might mock or return a basic structure if not connected to a remote dev DB.
      // But standard Supabase local instances will have DB. 
      // Let's assume we do hit the DB for prompts as long as client exists.
      if (!this.client) {
         // Fallback dev mocks if no client at all
         return {
           system_prompt: 'Dev mock system prompt',
           user_prompt_template: 'Dev mock user prompt: {{inputs}}',
           model: 'llama3.2:3b',
           agent_type: 'specialist_a'
         };
      }
    }

    if (!this.client) throw new Error("Supabase client is null");
    const { data, error } = await this.client.from('cce_prompts').select('*').eq('id', promptId).single();
    if (error) throw new Error(`getPrompt failed: ${error.message}`);
    return data;
  }

  async listPromptsByFase(fasePrefix: string): Promise<any[]> {
    if (this.isDev && !this.client) {
      return [{ id: `${fasePrefix}_MOCK_1` }, { id: `${fasePrefix}_MOCK_2` }];
    }
    if (!this.client) throw new Error("Supabase client is null");
    const { data, error } = await this.client.from('cce_prompts').select('*').like('id', `${fasePrefix}_%`);
    if (error) throw new Error(`listPromptsByFase failed: ${error.message}`);
    return data;
  }
}


