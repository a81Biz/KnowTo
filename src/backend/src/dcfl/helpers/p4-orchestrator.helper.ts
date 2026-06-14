import { SupabaseService } from '../services/supabase.service';
import { PipelineJobsService } from '../../core/services/pipeline-jobs.service';
import { PipelineRepository } from '../repositories/pipeline.repository';
import { WebSearchService } from '../../core/services/web-search.service';
import type { Env } from '../../core/types/env';

export interface CapituloGenerado {
  index: number;
  md: string;
}

const CHAPTER_TIMEOUT_MS = 20 * 60 * 1_000; // 20 min per chapter (Realtime + 30s fallback poll)

/**
 * Orquesta N jobs F4_P4_CHAPTER secuenciales (uno por unidad del temario),
 * colecta los capítulos ensamblados y los devuelve listos para el assembler final.
 *
 * Acepta runPipeline como callback para evitar dependencia circular con document.handlers.
 *
 * @param projectId  UUID del proyecto
 * @param baseContext  Contexto base (proyecto, cliente, industria…)
 * @param valoresParaDoc  Valores del form schema del usuario para P4
 * @param env  Variables de entorno Hono/Cloudflare
 * @param userId  UUID del usuario que lanzó el job
 * @param runPipeline  Callback que lanza un pipeline dado (= runPipelineAsync de document.handlers)
 */
export async function orchestrateP4Chapters(
  projectId: string,
  baseContext: Record<string, any>,
  valoresParaDoc: Record<string, any>,
  env: Env,
  userId: string,
  runPipeline: (jobId: string, body: any, env: Env) => Promise<void>,
): Promise<CapituloGenerado[]> {
  const supabase = new SupabaseService(env);
  const jobsSvc = new PipelineJobsService(env);
  const pipelineRepo = new PipelineRepository(supabase.client!);
  const webSearch = new WebSearchService(env);

  const temario = await supabase.getTemarioBase(projectId);
  const modulos: any[] = (temario?.temario as any[]) || [];
  const todasUnidades: Array<{ nombre: string; objetivo_bloom?: string }> =
    modulos.flatMap((m: any) => m.unidades || []);

  if (todasUnidades.length === 0) {
    console.warn(`[p4-orchestrator] proyecto ${projectId.slice(0, 8)}: temario vacío o no confirmado`);
    return [];
  }

  const capitulos_generados: CapituloGenerado[] = [];
  console.log(`[p4-orchestrator] lanzando ${todasUnidades.length} jobs de capítulo para ${projectId.slice(0, 8)}`);

  for (let i = 0; i < todasUnidades.length; i++) {
    const unidad = todasUnidades[i];

    let webSearchResults: any = null;
    try {
      webSearchResults = await webSearch.searchUnitTopic(unidad.nombre, baseContext.projectName || '');
    } catch {
      console.warn(`[p4-orchestrator] cap${i}: Tavily falló — continuando sin investigación`);
    }

    const chapterContext: Record<string, any> = {
      ...baseContext,
      capitulo_index: i,
      capitulo_numero: i + 1,
      unidad_nombre: unidad.nombre,
      unidad_objetivo: (unidad as any).objetivo_bloom || '',
      webSearchResults: webSearchResults || {},
    };
    const chapterUserInputs: Record<string, any> = {
      ...valoresParaDoc,
      capitulo_index: i,
      capitulo_numero: i + 1,
      unidad_nombre: unidad.nombre,
      unidad_objetivo: (unidad as any).objetivo_bloom || '',
      _producto: 'P4',
    };

    const chapterJobId = await jobsSvc.createJob({
      siteId: 'dcfl',
      projectId,
      phaseId: 'F4',
      promptId: 'F4_P4_CHAPTER',
      context: chapterContext,
      userInputs: chapterUserInputs,
      userId,
    });

    runPipeline(chapterJobId, {
      projectId,
      stepId: '',
      phaseId: 'F4',
      promptId: 'F4_P4_CHAPTER',
      context: chapterContext,
      userInputs: chapterUserInputs,
    }, env).catch(err => console.error(`[p4-orchestrator] cap${i}: error al lanzar pipeline`, err));

    const outcome = await jobsSvc.waitForJob(chapterJobId, CHAPTER_TIMEOUT_MS);
    console.log(`[p4-orchestrator] cap${i} (${unidad.nombre}): ${outcome} (job ${chapterJobId})`);

    if (outcome === 'completed') {
      const capMd = await pipelineRepo.getAgentOutput(chapterJobId, `capitulo_ensamblado_cap${i}`);
      if (capMd) {
        capitulos_generados.push({ index: i, md: capMd });
        console.log(`[p4-orchestrator] cap${i}: ${capMd.length} chars colectados`);
      } else {
        console.warn(`[p4-orchestrator] cap${i}: job completado pero output vacío`);
      }
    } else {
      console.warn(`[p4-orchestrator] cap${i}: ${outcome} — capítulo omitido`);
    }
  }

  console.log(`[p4-orchestrator] ${capitulos_generados.length}/${todasUnidades.length} capítulos listos`);
  return capitulos_generados;
}
