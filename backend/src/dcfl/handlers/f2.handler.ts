import { SupabaseService } from '../services/supabase.service';
import { PipelineService } from '../services/pipeline.service';
import { getF2Header, extractF2Section } from '../helpers/section-extractor';
import { cleanAgentOutput } from '../helpers/json-cleaner';

export async function handleF2Assembler(params: {
  jobId: string;
  projectId: string;
  projectName: string;
  pipelineService: PipelineService;
  supabase: SupabaseService;
  borradorA: string;
  borradorB: string;
  parsed: any;
}): Promise<string> {
  const { jobId, projectId, projectName, pipelineService, supabase, borradorA, borradorB, parsed } = params;
  
  console.log(`[pipeline] Iniciando ensamblaje F2 granular...`);
  
  const decisiones = await supabase.getF2JuezDecisiones(jobId);
  
  const secciones = [
    { key: 'modalidad',  titulo: '1. DECISIÓN DE MODALIDAD' },
    { key: 'scorm',      titulo: '2. NIVEL DE INTERACTIVIDAD (SCORM)' },
    { key: 'estructura', titulo: '3. ESTRUCTURA TEMÁTICA PRELIMINAR' },
    { key: 'perfil',     titulo: '4. PERFIL DE INGRESO' },
    { key: 'estrategias', titulo: '5. ESTRATEGIAS INSTRUCCIONALES' },
    { key: 'supuestos',  titulo: '6. SUPUESTOS Y RESTRICCIONES' }
  ];
  
  let documentoFinal = getF2Header(projectName);
  const seccionesAgregadas = new Set<string>();
  
  for (const s of secciones) {
    const headerKey = s.titulo.match(/^\d+/)?.[0] ?? s.key;
    if (seccionesAgregadas.has(headerKey)) continue;
    seccionesAgregadas.add(headerKey);

    const d = decisiones[s.key];
    const elegido = d?.seleccion === 'B' ? 'B' : 'A';
    const source = elegido === 'B' ? borradorB : borradorA;
    
    let contenido = extractF2Section(source, s.titulo);
    contenido = cleanAgentOutput(contenido);

    if (s.key === 'perfil') {
      const rows = contenido.match(/\|.*\|.*\|.*\|/g);
      if (rows && rows.length >= 5) {
        contenido = '| Categoría | Requisito | Fuente |\n|:---|:---|:---|\n' + 
                   rows.filter(r => !r.includes('Categoría') && !r.includes(':---')).slice(0, 5).join('\n');
      } else {
        console.warn(`[F2] Perfil de ingreso con filas insuficientes (${rows?.length ?? 0}) en Borrador ${elegido}`);
      }
    }

    documentoFinal += `\n\n---\n\n## ${s.titulo}\n\n${contenido}`;
    console.log(`[ensamblador_f2] Sección '${s.key}' [${headerKey}] tomada de Borrador ${elegido}`);
  }
  
  // Limpieza final de encabezados duplicados
  const lines = documentoFinal.split('\n');
  const finalSeenHeaders = new Set<string>();
  const filteredLines = [];
  let skipping = false;

  for (const line of lines) {
    const headerMatch = line.match(/^## (\d+\.[^#\n]+)/);
    if (headerMatch) {
      const header = headerMatch[1]!;
      if (finalSeenHeaders.has(header)) {
        skipping = true;
        continue;
      }
      finalSeenHeaders.add(header);
      skipping = false;
    }
    if (!skipping) filteredLines.push(line);
  }
  documentoFinal = filteredLines.join('\n');
  
  const interactividadRecord = parsed.interactividad 
    ? (Array.isArray(parsed.interactividad) 
        ? Object.fromEntries(parsed.interactividad.map((item: any, idx: number) => [`item_${idx}`, item]))
        : parsed.interactividad as Record<string, unknown>)
    : null;

  const estrategiasNormalizadas = (parsed.estrategias as any[])?.map((e: any) => ({
    estrategia: e.estrategia,
    descripcion: e.descripcion,
    modulos: e.modulos || e.modulo,
    bloom: e.bloom
  })) ?? null;

  await supabase.saveF2Analisis({
    projectId,
    jobId,
    documento_final: documentoFinal,
    modalidad: parsed.modalidad ?? null,
    interactividad: interactividadRecord,
    estructura_tematica: parsed.estructura_tematica ?? null,
    perfil_ingreso: parsed.perfil_ingreso ?? null,
    estrategias: estrategiasNormalizadas,
    supuestos_restricciones: parsed.supuestos_restricciones ?? null,
    perfil_ajustado: parsed.perfil_ajustado ?? null
  });
  
  console.log(`[pipeline] sintetizador_final_f2 F2 → Ensamblado granular completado`);
  return documentoFinal;
}
