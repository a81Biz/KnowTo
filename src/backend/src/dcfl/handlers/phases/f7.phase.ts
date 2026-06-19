import { PipelineEvent } from '../../types/pipeline-event.types';
import { sanitizeForClosure } from '../../helpers/doc-sanitizer.helper';

function extractJson(raw: string): any {
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
  } catch {}
  return {};
}

function pickWinner(juezRaw: string): 'A' | 'B' {
  let decision: { seleccion?: string } = { seleccion: 'A' };
  try {
    const m = juezRaw.match(/\{[\s\S]*\}/);
    if (m) decision = JSON.parse(m[0]);
  } catch {}
  return decision.seleccion === 'B' ? 'B' : 'A';
}

function formatDate(): string {
  return new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export async function handleF7Events(event: PipelineEvent): Promise<string | void> {
  if (event.agentName === 'ensamblador_f7' && event.promptId === 'F7') {
    return handleF7ResumenAssembler(event);
  }
}

async function handleF7ResumenAssembler(event: PipelineEvent): Promise<string> {
  const { jobId, projectId, services } = event;
  const ctx = (event.body?.context ?? {}) as any;
  const projectName = ctx.projectName ?? ctx._frozen?.nombreOficialCurso ?? 'Proyecto';
  const folioSugerido = ctx.folioSugerido ?? `EXP-${new Date().getFullYear()}-0001`;
  const fechaActual = formatDate();

  const juezRaw = (await services.pipelineService.getAgentOutput(jobId, 'juez_resumen_proceso')) ?? '';
  const winner = pickWinner(juezRaw);
  const winnerAgent = winner === 'B' ? 'agente_resumen_B' : 'agente_resumen_A';
  const raw = (await services.pipelineService.getAgentOutput(jobId, winnerAgent)) ?? '';

  const parsed = extractJson(raw);
  const resumen = parsed.resumen_proceso ?? parsed;

  let doc = `# RESUMEN CUALITATIVO DEL PROCESO DE DISEÑO INSTRUCCIONAL\n\n`;
  doc += `**Proyecto:** ${projectName}\n`;
  doc += `**Folio de expediente:** ${folioSugerido}\n`;
  doc += `**Fecha de finalización:** ${fechaActual}\n\n---\n\n`;

  doc += `## 1. BRECHA DE CAPACITACIÓN Y OBJETIVO\n\n`;
  doc += `${resumen.brecha_y_objetivo || '[Basándote en el contexto de F1, explica detalladamente qué problema de capacitación (brecha) tenía el cliente originalmente y cuál fue el objetivo principal para resolverlo.]'}\n\n---\n\n`;

  doc += `## 2. DECISIONES PEDAGÓGICAS Y DESARROLLO\n\n`;
  doc += `${resumen.decisiones_pedagogicas || '[Narra de forma profesional qué pasó durante el proceso (F2 a F4): cómo se decidió organizar la información en módulos, por qué se eligieron ciertas evaluaciones o formatos, y cómo se estructuraron las herramientas para asegurar el aprendizaje.]'}\n\n---\n\n`;

  doc += `## 3. CONCLUSIÓN Y VALOR APORTADO\n\n`;
  doc += `${resumen.conclusion_valor || '[Resume de manera ejecutiva el significado de este logro: qué valor aporta ahora este curso al cliente y cómo el proceso de certificación garantiza la calidad de este producto.]'}\n`;

  const { doc: docSanitized, blocking } = sanitizeForClosure(doc, 'F7');
  doc = docSanitized;
  if (blocking.length > 0) {
    console.error('[f7.phase] F7 bloqueado por placeholders:', blocking);
    throw new Error(`F7 contiene placeholders no resueltos: ${blocking.join('; ')}`);
  }

  try {
    await services.supabase.saveDocument({
      projectId,
      stepId: event.body?.stepId ?? '',
      phaseId: 'F7',
      title: 'Resumen Cualitativo del Proceso',
      content: doc,
    });
    console.log(`[f7.phase] F7 resumen guardado para proyecto ${projectId}`);
  } catch (err) {
    console.warn('[f7.phase] saveDocument F7 falló:', err);
  }

  return doc;
}
