import { PipelineRepository } from '../repositories/pipeline.repository';
import { SupabaseService } from './supabase.service';

export class PipelineService {
  constructor(
    private pipelineRepository: PipelineRepository,
    private supabaseService: SupabaseService,
  ) {}

  async getAgentOutput(jobId: string, agentName: string): Promise<string | null> {
    return this.pipelineRepository.getAgentOutput(jobId, agentName);
  }

  async saveAgentOutput(jobId: string, agentName: string, output: string): Promise<void> {
    return this.pipelineRepository.saveAgentOutput(jobId, agentName, output);
  }

  async getF2JuezDecisiones(jobId: string) {
    return this.supabaseService.getF2JuezDecisiones(jobId);
  }
}
