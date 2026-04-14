// src/core/services/pipeline-orchestrator.service.ts
//
// Orquestador de pipelines multi-agente (movido desde cce/).
//
// DIFERENCIA vs. versión CCE:
//   El flow-map ya NO se lee con fs.readFileSync hardcodeado.
//   Se inyecta como `SiteConfig` en el constructor, permitiendo que
//   cualquier microsite use el mismo orquestador con su propio pipeline.
//
// Uso:
//   const orchestrator = new PipelineOrchestratorService(siteConfig, aiService, supabaseService);
//   const result = await orchestrator.executePipeline(projectId, pipelineId, userInputs);

import type { SiteConfig, Stage } from '../types/pipeline.types';

// Importamos los tipos de los servicios que se inyectan via duck typing
// para evitar acoplamiento circular con imports directos.

interface AIServiceLike {
  runAgent(promptText: string, modelType: string, systemPrompt: string): Promise<string>;
}

interface SupabaseServiceLike {
  getStepOutputs(projectId: string, keys?: string[]): Promise<Record<string, unknown>>;
  saveStepOutput(params: {
    projectId: string;
    pipelineId: string;
    stageId: string;
    outputKey: string;
    outputValue: unknown;
  }): Promise<void>;
  getPrompt(promptId: string): Promise<Record<string, unknown>>;
}

export class PipelineOrchestratorService {
  constructor(
    private readonly config: SiteConfig,
    private readonly aiService: AIServiceLike,
    private readonly supabaseService: SupabaseServiceLike
  ) {}

  async executePipeline(
    projectId: string,
    pipelineId: string,
    userInputs: Record<string, unknown> = {}
  ): Promise<Record<string, unknown>> {
    const pipeline = this.config.flow_map.pipelines[pipelineId];
    if (!pipeline) {
      throw new Error(`Pipeline '${pipelineId}' no encontrado en flow-map del site '${this.config.site_id}'.`);
    }

    const dbContext = await this.supabaseService.getStepOutputs(projectId);
    const context: Record<string, unknown> = { ...dbContext, userInputs };

    let currentStageId: string | undefined = pipeline.stages[0]?.id;

    while (currentStageId) {
      const stage = pipeline.stages.find((s) => s.id === currentStageId);
      if (!stage) break;

      // Ejecución paralela
      if (stage.parallel_with) {
        const parallelStage = pipeline.stages.find((s) => s.id === stage.parallel_with);
        if (!parallelStage) throw new Error(`Parallel stage '${stage.parallel_with}' no encontrado.`);

        const [outA, outB] = await Promise.all([
          this._executeStage(projectId, pipelineId, stage, context),
          this._executeStage(projectId, pipelineId, parallelStage, context),
        ]);

        await this.supabaseService.saveStepOutput({ projectId, pipelineId, stageId: stage.id,         outputKey: stage.output_guard,         outputValue: outA });
        await this.supabaseService.saveStepOutput({ projectId, pipelineId, stageId: parallelStage.id, outputKey: parallelStage.output_guard, outputValue: outB });

        context[stage.output_guard]         = outA;
        context[parallelStage.output_guard] = outB;

        currentStageId = stage.next ?? parallelStage.next;
        continue;
      }

      // Ejecución secuencial con retry
      let finalOutput: unknown = null;
      let success = false;
      const retries = stage.max_retries ?? 1;

      for (let attempt = 1; attempt <= retries; attempt++) {
        const output = await this._executeStage(projectId, pipelineId, stage, context);

        if (stage.agent === 'judge') {
          try {
            const validation = typeof output === 'string' ? JSON.parse(output) : output;
            if ((validation as { status?: string }).status === 'ok') {
              finalOutput = (validation as { output_final?: unknown }).output_final;
              success = true;
              break;
            } else if (attempt === retries && stage.fallthrough_on_error) {
              finalOutput = output;
              success = true;
              break;
            }
          } catch {
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
        throw new Error(`Stage '${stage.id}' failed after ${retries} attempts.`);
      }

      await this.supabaseService.saveStepOutput({
        projectId,
        pipelineId,
        stageId:    stage.id,
        outputKey:  stage.output_guard,
        outputValue: finalOutput,
      });
      context[stage.output_guard] = finalOutput;

      currentStageId = stage.next;
    }

    return context;
  }

  private async _executeStage(
    projectId: string,
    pipelineId: string,
    stage: Stage,
    fullContext: Record<string, unknown>
  ): Promise<unknown> {
    const promptRecord = await this.supabaseService.getPrompt(stage.prompt_id);
    if (!promptRecord) throw new Error(`Prompt '${stage.prompt_id}' not found.`);

    let promptText = (promptRecord['user_prompt_template'] as string) ?? '';

    // Sustitución de variables del contexto en el template
    if (stage.inputs) {
      for (const inputKey of stage.inputs) {
        const val = fullContext[inputKey];
        const regex = new RegExp(`\\{\\{${inputKey}\\}\\}`, 'g');
        promptText = promptText.replace(
          regex,
          typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')
        );
      }
    }

    if (fullContext['userInputs']) {
      promptText = promptText.replace(/\{\{userInputs\}\}/g, JSON.stringify(fullContext['userInputs']));
    }

    return this.aiService.runAgent(
      promptText,
      (promptRecord['model'] as string) ?? '@cf/meta/llama-3.2-3b-instruct',
      (promptRecord['system_prompt'] as string) ?? ''
    );
  }
}
