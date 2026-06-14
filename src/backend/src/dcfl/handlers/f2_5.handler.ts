import { SupabaseService } from '../services/supabase.service';
import { PipelineService } from '../services/pipeline.service';
import { cleanAgentOutput } from '../helpers/json-cleaner';

export async function handleF2_5Assembler(params: {
  jobId: string;
  projectId: string;
  projectName: string;
  pipelineService: PipelineService;
  supabase: SupabaseService;
}): Promise<string> {
  const { jobId, projectId, projectName, pipelineService, supabase } = params;
  
  console.log(`[pipeline] Iniciando ensamblaje F2.5 estructurado (JSON Unificado)...`);
  
  // 1. Determinar el borrador ganador
  const juezOutput = await pipelineService.getAgentOutput(jobId, 'juez_produccion');
  let ganador = 'A';
  if (juezOutput) {
    try {
      const decisionObj = JSON.parse(juezOutput);
      if (decisionObj.seleccion === 'B') ganador = 'B';
    } catch {
      if (juezOutput.includes('"seleccion": "B"') || juezOutput.includes("'seleccion': 'B'")) {
        ganador = 'B';
      }
    }
  }

  // 2. Extraer JSON unificado del especialista ganador
  const borradorA = await pipelineService.getAgentOutput(jobId, 'especialista_produccion_a') ?? '{}';
  const borradorB = await pipelineService.getAgentOutput(jobId, 'especialista_produccion_b') ?? '{}';
  const rawOutput = ganador === 'B' ? borradorB : borradorA;
  
  let f2_5Payload: any = {};
  
  try {
    // Extraer solo el bloque JSON (ignora texto previo o posterior)
    const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
    let cleanJsonString = jsonMatch ? jsonMatch[0] : rawOutput;

    try {
      f2_5Payload = JSON.parse(cleanJsonString);
    } catch (parseError) {
      console.warn("[F2.5] Parseo estricto falló, intentando reparar JSON...");
      const trimmed = cleanJsonString.trim();
      if (!trimmed.endsWith('}')) {
          cleanJsonString = trimmed + '}';
      }
      f2_5Payload = JSON.parse(cleanJsonString);
    }
  } catch (error) {
    console.error("[F2.5] Error irrecuperable al parsear JSON unificado:", error);
    f2_5Payload = {
      actividades_recomendadas: [],
      metricas_seguimiento: [],
      produccion_audiovisual: {
        numero_total_videos: 0,
        duracion_minima_minutos: 0,
        duracion_maxima_minutos: 0
      },
      referencias_bibliograficas: []
    };
  }

  // 3. Generar Markdown determinístico para el frontend
  let documentoFinal = `# RECOMENDACIONES PEDAGÓGICAS DE PRODUCCIÓN\n**Proyecto:** ${projectName}\n**Fase:** F2.5\n**Fecha:** ${new Date().toLocaleDateString('es-MX')}\n\n---\n\n`;

  if (f2_5Payload.actividades_recomendadas && f2_5Payload.actividades_recomendadas.length > 0) {
    documentoFinal += `## 1. ACTIVIDADES DE APRENDIZAJE RECOMENDADAS\n\n`;
    documentoFinal += `| Tipo | Propósito | Frecuencia | Justificación |\n`;
    documentoFinal += `|:---|:---|:---|:---|\n`;
    f2_5Payload.actividades_recomendadas.forEach((act: any) => {
      documentoFinal += `| ${act.tipo || '-'} | ${act.proposito || '-'} | ${act.frecuencia || '-'} | ${act.justificacion || '-'} |\n`;
    });
    documentoFinal += `\n---\n\n`;
  }

  if (f2_5Payload.metricas_seguimiento && f2_5Payload.metricas_seguimiento.length > 0) {
    documentoFinal += `## 2. MÉTRICAS A REPORTEAR Y FRECUENCIA DE SEGUIMIENTO\n\n`;
    documentoFinal += `| Métrica | Descripción | Importancia | Frecuencia |\n`;
    documentoFinal += `|:---|:---|:---|:---|\n`;
    f2_5Payload.metricas_seguimiento.forEach((met: any) => {
      documentoFinal += `| ${met.metrica || '-'} | ${met.descripcion || '-'} | ${met.importancia || '-'} | ${met.frecuencia_revision || '-'} |\n`;
    });
    documentoFinal += `\n---\n\n`;
  }

  const pd = f2_5Payload.produccion_audiovisual || {};
  documentoFinal += `## 3. ESTRUCTURA DE VIDEOS RECOMENDADA\n\n`;
  documentoFinal += `- **Número Total de Videos**: ${pd.numero_total_videos || 0}\n`;
  documentoFinal += `- **Duración Estimada Total**: ${pd.duracion_minima_minutos || 0} a ${pd.duracion_maxima_minutos || 0} minutos\n`;
  documentoFinal += `\n---\n\n`;

  if (f2_5Payload.referencias_bibliograficas && f2_5Payload.referencias_bibliograficas.length > 0) {
    documentoFinal += `## 4. REFERENCIAS\n\n`;
    f2_5Payload.referencias_bibliograficas.forEach((ref: string) => {
      documentoFinal += `> ${ref}\n\n`;
    });
  }
  
  // 4. Guardar en Base de Datos y retrocompatibilidad de videos
  const estructuraVideos = {
    intro: { cantidad: 1, duracion: "3-5", total: "3-5" },
    contenido: { cantidad: (pd.numero_total_videos || 3) - 2 > 0 ? (pd.numero_total_videos || 3) - 2 : 1, duracion: "5-7", total: `${pd.duracion_minima_minutos}-${pd.duracion_maxima_minutos}` },
    resumen: { cantidad: 1, duracion: "4-6", total: "4-6" },
    total_videos: pd.numero_total_videos || 3
  };
  
  await supabase.saveF2_5EstructuraVideos(jobId, estructuraVideos);

  await supabase.saveF2_5Recomendaciones({
    projectId,
    jobId,
    documento_final: documentoFinal,
    actividades: f2_5Payload.actividades_recomendadas || null,
    metricas: f2_5Payload.metricas_seguimiento || null,
    frecuencia_revision: null,
    total_videos: pd.numero_total_videos || 0,
    duracion_promedio_minutos: Math.round(((pd.duracion_minima_minutos || 0) + (pd.duracion_maxima_minutos || 0)) / 2) || 0,
    borrador_A: borradorA,
    borrador_B: borradorB,
    juez_decision: ganador,
  });
  
  console.log(`[pipeline] sintetizador_final_f2_5 F2.5 → Ensamblado estructurado (JSON Unificado) completado usando borrador ${ganador}`);
  return documentoFinal;
}
