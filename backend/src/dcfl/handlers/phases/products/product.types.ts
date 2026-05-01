import { PipelineEvent } from '../../../types/pipeline-event.types';

export interface ProductContext {
  jobId: string;
  projectId: string;
  projectName: string;
  promptId: string;
  services: any;
  event: PipelineEvent;
}
