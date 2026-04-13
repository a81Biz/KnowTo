// src/cce/services/pipeline-orchestrator.service.ts
import * as yaml from 'yaml';
import * as fs from 'fs';
import * as path from 'path';
import { AIService } from './ai.service';
import { SupabaseService } from './supabase.service';

export interface Stage {
  id: string;
  agent: string;
  prompt_id: string;
  inputs?: string[];
  output_guard: string;
  next?: string;
  parallel_with?: string;
  retry_on_reject?: boolean;
  max_retries?: number;
  fallthrough_on_error?: boolean;
}

export interface Pipeline {
  description: string;
  stages: Stage[];
}

export interface FlowMap {
  version: string;
  pipelines: Record<string, Pipeline>;
}

export class PipelineOrchestratorService {
  private flowMap: FlowMap | null = null;
  
  constructor(private aiService: AIService, private supabaseService: SupabaseService) {}

  private loadFlowMap(): FlowMap {
    if (!this.flowMap) {
      const filePath = path.join(process.cwd(), 'src', 'cce', 'prompts', 'flow-map.yaml');
      const file = fs.readFileSync(filePath, 'utf8');
      this.flowMap = yaml.parse(file) as FlowMap;
    }
    return this.flowMap;
  }

  async executePipeline(projectId: string, pipelineId: string, userInputs: Record<string, any> = {}): Promise<Record<string, any>> {
    const flowMap = this.loadFlowMap();
    const pipeline = flowMap.pipelines[pipelineId];
    if (!pipeline) throw new Error(`Pipeline ${pipelineId} no encontrado en flow-map.`);

    const dbContext = await this.supabaseService.getStepOutputs(projectId);
    const context = { ...dbContext, userInputs };
    
    let currentStageId: string | undefined = pipeline.stages[0]?.id;

    while (currentStageId) {
      const stage = pipeline.stages.find(s => s.id === currentStageId);
      if (!stage) break;

      if (stage.parallel_with) {
        const parallelStage = pipeline.stages.find(s => s.id === stage.parallel_with);
        if (!parallelStage) throw new Error(`Parallel stage ${stage.parallel_with} no encontrado.`);

        const [outA, outB] = await Promise.all([
          this.executeStage(projectId, pipelineId, stage, context),
          this.executeStage(projectId, pipelineId, parallelStage, context)
        ]);

        await this.supabaseService.saveStepOutput({ projectId, pipelineId, stageId: stage.id, outputKey: stage.output_guard, outputValue: outA });
        await this.supabaseService.saveStepOutput({ projectId, pipelineId, stageId: parallelStage.id, outputKey: parallelStage.output_guard, outputValue: outB });
        
        context[stage.output_guard] = outA;
        context[parallelStage.output_guard] = outB;

        currentStageId = stage.next || parallelStage.next;
        continue;
      }

      let finalOutput = null;
      let success = false;
      const retries = stage.max_retries || 1;

      for (let attempt = 1; attempt <= retries; attempt++) {
        const output = await this.executeStage(projectId, pipelineId, stage, context);

        if (stage.agent === 'judge') {
          // Judges return JSON according to spec: { "status": "ok", "output_final": ... }
          try {
            const validation = typeof output === 'string' ? JSON.parse(output) : output;
            if (validation.status === 'ok') {
              finalOutput = validation.output_final;
              success = true;
              break;
            } else if (attempt === retries && stage.fallthrough_on_error) {
              finalOutput = output; // Fallback
              success = true;
              break;
            }
          } catch (e) {
            // failed to parse validation json, assume rejected unless fallthrough
            if (attempt === retries && stage.fallthrough_on_error) {
              finalOutput = output;
              success = true;
              break;
            }
          }
        } else {
          finalOutput = output;
          success = true;
          break;
        }
      }

      if (!success && !stage.fallthrough_on_error) {
        throw new Error(`Stage ${stage.id} failed after ${retries} attempts.`);
      }

      await this.supabaseService.saveStepOutput({
        projectId,
        pipelineId,
        stageId: stage.id,
        outputKey: stage.output_guard,
        outputValue: finalOutput
      });
      context[stage.output_guard] = finalOutput;

      currentStageId = stage.next;
    }

    return context;
  }

  private async executeStage(projectId: string, pipelineId: string, stage: Stage, fullContext: Record<string, any>): Promise<any> {
    const promptRecord = await this.supabaseService.getPrompt(stage.prompt_id);
    if (!promptRecord) throw new Error(`Prompt ${stage.prompt_id} not found.`);

    let promptText = promptRecord.user_prompt_template;
    
    // Simplistic handlebars-style replacement for inputs
    if (stage.inputs) {
      for (const inputKey of stage.inputs) {
        const val = fullContext[inputKey];
        // replace {{inputKey}} dynamically in text
        const regex = new RegExp(`\\{\\{${inputKey}\\}\\}`, 'g');
        promptText = promptText.replace(regex, typeof val === 'object' ? JSON.stringify(val) : String(val || ''));
      }
    }
    // Also inject userInputs generically if it was not explicitly in arguments array
    if (fullContext.userInputs) {
       promptText = promptText.replace(/\{\{userInputs\}\}/g, JSON.stringify(fullContext.userInputs));
    }

    // Call AIService with the raw model constraints from the DB record
    const output = await this.aiService.runAgent(
      promptText,
      promptRecord.model,
      promptRecord.system_prompt
    );

    return output;
  }
}
