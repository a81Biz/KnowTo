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
  const { jobId, projectId, pipelineService, supabase, borradorA, borradorB } = params;
  
  console.log(`[pipeline] Iniciando ensamblaje F2 estructurado (JSON Unificado)...`);
  
  // 1. Determinar el borrador ganador
  const juezTemarioOutput = await pipelineService.getAgentOutput(jobId, 'juez_temario');
  let ganador = 'A';
  if (juezTemarioOutput) {
    try {
      const decisionObj = JSON.parse(juezTemarioOutput);
      if (decisionObj.seleccion === 'B') ganador = 'B';
    } catch {
      if (juezTemarioOutput.includes('"seleccion": "B"') || juezTemarioOutput.includes("'seleccion': 'B'")) {
        ganador = 'B';
      }
    }
  }

  // 2. Extraer JSON unificado del especialista ganador
  const rawOutput = ganador === 'B' ? borradorB : borradorA;
  let f2Payload: any = {};
  
  try {
    // 2.1 Extraer solo el bloque JSON (ignora texto previo o posterior)
    const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
    let cleanJsonString = jsonMatch ? jsonMatch[0] : rawOutput;

    try {
      f2Payload = JSON.parse(cleanJsonString);
    } catch (parseError) {
      // 2.2 Intento de rescate si el LLM cortó el JSON al final
      console.warn("[F2] Parseo estricto falló, intentando reparar JSON...");
      const trimmed = cleanJsonString.trim();
      if (!trimmed.endsWith('}')) {
          cleanJsonString = trimmed + '}';
      }
      f2Payload = JSON.parse(cleanJsonString);
    }
  } catch (error) {
    console.error("[F2] Error irrecuperable al parsear JSON unificado:", error);
    // 2.3 Fallback de emergencia para que el sistema no se caiga
    f2Payload = {
        modalidad_curso: { seleccion: "Error de formato", justificacion: "El sistema no pudo procesar la respuesta estructurada de la IA." },
        grado_interactividad: { nivel: "Medio", justificacion: "Fallback por error de parseo" },
        estructura_tematica: [],
        perfil_ingreso_ec0366: {}
    };
  }

  // 3. Generar Markdown determinístico para el frontend
  let documentoFinal = `# ESPECIFICACIONES DE ANÁLISIS Y DISEÑO (EC0366)\n\n`;
  
  if (f2Payload.perfil_ingreso_ec0366) {
    documentoFinal += `## 1. PERFIL DE INGRESO EC0366\n`;
    const p = f2Payload.perfil_ingreso_ec0366;
    if (p.escolaridad_minima) documentoFinal += `- **Escolaridad mínima**: ${p.escolaridad_minima.requisito} (${p.escolaridad_minima.justificacion})\n`;
    if (p.conocimientos_previos) documentoFinal += `- **Conocimientos previos**: ${p.conocimientos_previos.requisito} (${p.conocimientos_previos.justificacion})\n`;
    if (p.habilidades_digitales) documentoFinal += `- **Habilidades digitales**: ${p.habilidades_digitales.requisito} (${p.habilidades_digitales.justificacion})\n`;
    if (p.equipo_computo) documentoFinal += `- **Equipo de cómputo**: ${p.equipo_computo.requisito} (${p.equipo_computo.justificacion})\n`;
    if (p.conexion_internet) documentoFinal += `- **Conexión a internet**: ${p.conexion_internet.requisito} (${p.conexion_internet.justificacion})\n`;
    if (p.software_requerido) documentoFinal += `- **Software requerido**: ${p.software_requerido.requisito} (${p.software_requerido.justificacion})\n`;
    if (p.disponibilidad_sugerida) documentoFinal += `- **Disponibilidad**: ${p.disponibilidad_sugerida.requisito} (${p.disponibilidad_sugerida.justificacion})\n`;
    documentoFinal += `\n`;
    if (f2Payload.validacion_perfil) {
      documentoFinal += `> **Validación de Realidad:** ${f2Payload.validacion_perfil.es_realista ? 'Viable' : 'Requiere ajuste'} - ${f2Payload.validacion_perfil.razon_o_ajuste}\n\n`;
    }
  }
  
  if (f2Payload.modalidad_curso) {
    documentoFinal += `## 2. DECISIÓN DE MODALIDAD E INTERACTIVIDAD\n`;
    documentoFinal += `- **Modalidad**: ${f2Payload.modalidad_curso.seleccion}\n`;
    documentoFinal += `  *Justificación: ${f2Payload.modalidad_curso.justificacion}*\n`;
    if (f2Payload.grado_interactividad) {
      documentoFinal += `- **Nivel de Interactividad**: ${f2Payload.grado_interactividad.nivel}\n`;
      documentoFinal += `  *Justificación: ${f2Payload.grado_interactividad.justificacion}*\n`;
    }
    documentoFinal += `\n`;
  }

  if (f2Payload.estructura_tematica && Array.isArray(f2Payload.estructura_tematica) && f2Payload.estructura_tematica.length > 0) {
    documentoFinal += `## 3. ESTRUCTURA TEMÁTICA PRELIMINAR\n`;
    documentoFinal += `| Módulo | Nombre | Objetivo | Duración |\n`;
    documentoFinal += `|:---|:---|:---|:---|\n`;
    
    f2Payload.estructura_tematica.forEach((mod: any) => {
      documentoFinal += `| ${mod.modulo || '-'} | ${mod.nombre || '-'} | ${mod.objetivo || '-'} | ${mod.duracion_estimada_horas ? `${mod.duracion_estimada_horas} hrs` : '-'} |\n`;
    });
    documentoFinal += `\n`;
  }

  // 4. Guardar en Base de Datos
  await supabase.saveF2Analisis({
    projectId,
    jobId,
    documento_final: documentoFinal,
    modalidad: f2Payload.modalidad_curso?.seleccion || null,
    estructura_tematica: f2Payload.estructura_tematica || null,
    perfil_ingreso: f2Payload.perfil_ingreso_ec0366 || null,
    interactividad: f2Payload.grado_interactividad || null,
    estrategias: null,
    supuestos_restricciones: null,
    perfil_ajustado: f2Payload.validacion_perfil || null
  });
  
  console.log(`[pipeline] sintetizador_final_f2 F2 → Ensamblado estructurado (JSON Unificado) completado usando borrador ${ganador}`);
  return documentoFinal;
}
