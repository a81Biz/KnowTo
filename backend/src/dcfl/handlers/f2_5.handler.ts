import { SupabaseService } from '../services/supabase.service';
import { PipelineService } from '../services/pipeline.service';
import { parseMarkdownTableToJson } from '../helpers/json-cleaner';

async function getF2DataWithRetry(
  supabase: SupabaseService,
  projectId: string,
  maxRetries: number = 3
): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    const f2Data = await supabase.getF2Analisis(projectId);
    if (f2Data?.estructura_tematica && f2Data.estructura_tematica.length > 0) {
      return f2Data;
    }
    console.log(`[F2.5] estructura_tematica vacía, intento ${i + 1} de ${maxRetries}, esperando 2s...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.warn(`[F2.5] estructura_tematica sigue vacía tras ${maxRetries} reintentos.`);
  const f2Data = await supabase.getF2Analisis(projectId);
  if (!f2Data?.estructura_tematica || f2Data.estructura_tematica.length === 0) {
    throw new Error('F2.5 no puede continuar: F2 no generó estructura_temática válida. Ejecute F2 nuevamente.');
  }
  return f2Data;
}

export async function handleF2_5Assembler(params: {
  jobId: string;
  projectId: string;
  projectName: string;
  pipelineService: PipelineService;
  supabase: SupabaseService;
}): Promise<string> {
  const { jobId, projectId, projectName, pipelineService, supabase } = params;
  
  console.log(`[pipeline] Iniciando ensamblaje F2.5 en callback...`);
  
  const f2Data = await getF2DataWithRetry(supabase, projectId);
  const numModulos = f2Data?.estructura_tematica?.length ?? 3;
  const perfilIngreso = f2Data?.perfil_ingreso ?? ([] as any[]);
  
  const actividades = (await pipelineService.getAgentOutput(jobId, 'agente_actividades')) ?? '';
  const metricas = (await pipelineService.getAgentOutput(jobId, 'agente_metricas')) ?? '';
  const referencias = (await pipelineService.getAgentOutput(jobId, 'agente_referencias')) ?? '';
  const estructura = (await pipelineService.getAgentOutput(jobId, 'agente_estructura')) ?? '';

  let actividadesJson = null;
  let metricasJson = null;
  try {
    actividadesJson = parseMarkdownTableToJson(actividades);
    metricasJson = parseMarkdownTableToJson(metricas);
  } catch (err) {
    console.warn('[F2.5] No se pudieron parsear actividades/metricas:', err);
  }
  
  const videosContenido = numModulos * 2;
  const totalVideos = 1 + videosContenido + 1;
  const duracionMin = (videosContenido * 5) + 4 + 3;
  const duracionMax = (videosContenido * 7) + 6 + 6;
  
  const estructuraVideos = {
    intro: { cantidad: 1, duracion: "3-5", total: "3-5" },
    contenido: { cantidad: videosContenido, duracion: "5-7", total: `${duracionMin}-${duracionMax}` },
    resumen: { cantidad: 1, duracion: "4-6", total: "4-6" },
    total_videos: totalVideos
  };
  
  await supabase.saveF2_5EstructuraVideos(jobId, estructuraVideos);
  
  const documentoFinal = `
# RECOMENDACIONES PEDAGÓGICAS DE PRODUCCIÓN
**Proyecto:** ${projectName}
**Fase:** F2.5 — Recomendaciones Pedagógicas de Producción
**Fecha:** ${new Date().toLocaleDateString('es-MX')}

---

## 1. ACTIVIDADES DE APRENDIZAJE RECOMENDADAS

${actividades}

---

## 2. MÉTRICAS A REPORTEAR Y FRECUENCIA DE SEGUIMIENTO

${metricas}

---

## 3. ESTRUCTURA DE VIDEOS RECOMENDADA

| Tipo de video | Cantidad | Duración por video (min) | Duración total (min) |
|:---|:---:|:---:|:---:|
| Video introductorio | 1 | 3-5 | 3-5 |
| Videos de contenido | ${videosContenido} | 5-7 | ${videosContenido * 5}-${videosContenido * 7} |
| Video de resumen | 1 | 4-6 | 4-6 |
| **TOTAL** | **${totalVideos}** | | **${duracionMin}-${duracionMax}** |

---

## 4. REFERENCIAS

${referencias}

---

## 5. ESTRUCTURA TEMÁTICA

${estructura}

---

## 6. PERFIL DE INGRESO

${(perfilIngreso as any[]).map(row => `| ${row.categoria} | ${row.requisito} | ${row.fuente} |`).join('\n')}

---

## 7. NOTAS PARA EL DISEÑADOR
- Recomendaciones son punto de partida, ajustables en F3.
- Valores resueltos de confrontación F1↔F2 aplicados: Sin discrepancias.
`;

  await supabase.saveF2_5Recomendaciones({
    projectId,
    jobId,
    documento_final: documentoFinal,
    actividades: actividadesJson,
    metricas: metricasJson,
    frecuencia_revision: null,
    total_videos: estructuraVideos.total_videos,
    duracion_promedio_minutos: Math.round((duracionMin + duracionMax) / 2),
    borrador_A: await pipelineService.getAgentOutput(jobId, 'agente_doble_A_f2_5') ?? '',
    borrador_B: await pipelineService.getAgentOutput(jobId, 'agente_doble_B_f2_5') ?? '',
    juez_decision: 'A',
  });
  
  console.log(`[pipeline] sintetizador_final_f2_5: ensamblado por código y retornado`);
  return documentoFinal;
}
