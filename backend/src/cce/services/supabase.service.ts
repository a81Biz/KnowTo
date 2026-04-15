// src/cce/services/supabase.service.ts
// Extensión del BaseSupabaseService para el microsite CCE (EC0249).
// Añade métodos de pipeline (step outputs) y acceso a prompts desde BD.

import { BaseSupabaseService } from '../../core/services/supabase.service';
import type { Env } from '../../core/types/env';

export class SupabaseService extends BaseSupabaseService {
  // RPCs del schema CCE (prefijo sp_cce_)
  protected override readonly spSaveStep             = 'sp_cce_save_step';
  protected override readonly spSaveDocument         = 'sp_cce_save_document';
  protected override readonly spGetProjectContext    = 'sp_cce_get_project_context';
  protected override readonly spSaveExtractedContext = 'sp_cce_save_extracted_context';
  protected override readonly spMarkStepError        = 'sp_mark_step_error';
  protected override readonly projectProgressView    = 'vw_cce_project_progress';

  // Almacén en memoria para dev (pipeline outputs)
  private devOutputs: Map<string, Record<string, unknown>> = new Map();

  constructor(env: Env) {
    super(env);
  }

  async createProject(params: {
    userId: string;
    name: string;
    clientName: string;
    companyName?: string | undefined;
    sector?: string | undefined;
    email?: string | undefined;
  }): Promise<{ projectId: string }> {
    if (!this.client) return { projectId: crypto.randomUUID() };

    const { data, error } = await this.client!.rpc('sp_cce_create_project', {
      p_user_id:      params.userId,
      p_name:         params.name,
      p_client_name:  params.clientName,
      p_company_name: params.companyName ?? null,
      p_sector:       params.sector ?? null,
      p_email:        params.email ?? null,
    });

    if (error) throw new Error(`sp_cce_create_project failed: ${error.message}`);
    if (!data.success) throw new Error(data.error);
    return { projectId: data.project_id };
  }

  // ── Pipeline output methods ───────────────────────────────────────────────

  async getStepOutputs(projectId: string, keys?: string[]): Promise<Record<string, unknown>> {
    if (!this.client) {
      const proj = this.devOutputs.get(projectId) ?? {};
      if (!keys || keys.length === 0) return proj;
      const res: Record<string, unknown> = {};
      for (const k of keys) {
        if (proj[k] !== undefined) res[k] = proj[k];
      }
      return res;
    }

    let query = this.client!
      .from('cce_step_outputs')
      .select('output_key, output_value')
      .eq('project_id', projectId);

    if (keys && keys.length > 0) {
      query = query.in('output_key', keys);
    }

    const { data, error } = await query;
    if (error) throw new Error(`getStepOutputs failed: ${error.message}`);

    const result: Record<string, unknown> = {};
    for (const row of data ?? []) {
      result[row.output_key] = row.output_value;
    }
    return result;
  }

  async saveStepOutput(params: {
    projectId: string;
    pipelineId: string;
    stageId: string;
    outputKey: string;
    outputValue: unknown;
  }): Promise<void> {
    if (!this.client) {
      const proj = this.devOutputs.get(params.projectId) ?? {};
      proj[params.outputKey] = params.outputValue;
      this.devOutputs.set(params.projectId, proj);
      return;
    }

    const { error } = await this.client!.from('cce_step_outputs').insert({
      project_id:   params.projectId,
      pipeline_id:  params.pipelineId,
      stage_id:     params.stageId,
      output_key:   params.outputKey,
      output_value: params.outputValue,
    });

    if (error) throw new Error(`saveStepOutput failed: ${error.message}`);
  }

  // ── Prompt access (tabla legada cce_prompts + tabla unificada site_prompts) ─

  async getPrompt(promptId: string): Promise<Record<string, unknown>> {
    // Intentar primero en tabla unificada site_prompts (post-migración 008)
    const fromSiteTable = await this.getPromptFromSiteTable('cce', promptId);
    if (fromSiteTable) return fromSiteTable;

    // Fallback a tabla legada cce_prompts (pre-migración)
    if (!this.client) {
      return {
        system_prompt:         'Dev mock system prompt',
        user_prompt_template:  'Dev mock user prompt: {{inputs}}',
        model:                 'llama3.2:3b',
        agent_type:            'specialist_a',
      };
    }
    const { data, error } = await this.client.from('cce_prompts').select('*').eq('id', promptId).single();
    if (error) throw new Error(`getPrompt failed: ${error.message}`);
    return data as Record<string, unknown>;
  }

  async listPromptsByFase(fasePrefix: string): Promise<Record<string, unknown>[]> {
    if (!this.client) {
      return [{ id: `${fasePrefix}_MOCK_1` }, { id: `${fasePrefix}_MOCK_2` }];
    }
    const { data, error } = await this.client.from('cce_prompts').select('*').like('id', `${fasePrefix}_%`);
    if (error) throw new Error(`listPromptsByFase failed: ${error.message}`);
    return (data ?? []) as Record<string, unknown>[];
  }
}
