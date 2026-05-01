import { BaseRepository } from '../../core/repositories/base.repository';
import { SupabaseClient } from '@supabase/supabase-js';

export interface PipelineJob {
  id: string;
  project_id: string;
  phase_id: string;
  status: string;
  created_at: string;
}

export class PipelineRepository extends BaseRepository<PipelineJob> {
  constructor(client: SupabaseClient) {
    super(client, 'pipeline_jobs');
  }
  
  async getAgentOutput(jobId: string, agentName: string): Promise<string | null> {
    const { data, error } = await this.client
      .from('pipeline_agent_outputs')
      .select('output')
      .eq('job_id', jobId)
      .eq('agent_name', agentName)
      .single();
    
    if (error) return null;
    return data?.output ?? null;
  }
  
  async saveAgentOutput(jobId: string, agentName: string, output: string): Promise<void> {
    const { error } = await this.client
      .from('pipeline_agent_outputs')
      .upsert({
        job_id: jobId,
        agent_name: agentName,
        output: output
      }, { onConflict: 'job_id,agent_name' });
    if (error) {
      console.error(`[pipeline-repo] saveAgentOutput failed (${agentName}):`, error.message);
    }
  }
}
