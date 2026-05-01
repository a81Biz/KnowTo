import { parseJsonSafely } from './json-cleaner';

export async function resolveJudge(
  jobId: string,
  judgeKey: string,
  agentA: string,
  agentB: string,
  fallback: any,
  services: { pipelineService: { getAgentOutput(jobId: string, agentKey: string): Promise<string | null> } }
): Promise<any> {
  const rawJudge = (await services.pipelineService.getAgentOutput(jobId, judgeKey)) || '{}';
  const parsedJudge = parseJsonSafely<any>(rawJudge, {});
  const pointerStr = String(parsedJudge.seleccion || parsedJudge.ganador || parsedJudge.winner || rawJudge).toUpperCase();
  const targetAgent = (pointerStr.includes('B') || pointerStr.includes(agentB.toUpperCase())) ? agentB : agentA;
  const realRaw = (await services.pipelineService.getAgentOutput(jobId, targetAgent)) || '{}';
  return parseJsonSafely(realRaw, fallback);
}
