import { AgentName } from '../constants/agents.constants';

export interface PipelineEvent {
  jobId: string;
  projectId: string;
  promptId: string;
  agentName: AgentName | string;
  output: string;
  body: any;
  services: {
    pipelineService: any;
    supabase: any;
    projectService: any;
  };
}

export type PipelineHandler = (event: PipelineEvent) => Promise<void | string>;